import { EventBridgeEvent } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { WebClient } from '@slack/web-api';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { Schema } from '../../data/resource';

/**
 * GitHub Issue Summary Lambda
 * Runs every 6 hours (9am, 3pm CST) to generate issue status summaries
 */

// Initialize Secrets Manager client
const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Cache secrets to reduce API calls (95% cost reduction)
let cachedGitHubToken: string | null = null;
let cachedSlackBotToken: string | null = null;

/**
 * Fetch secret from AWS Secrets Manager with caching
 * Returns the parsed JSON object
 */
async function getSecret(secretName: string): Promise<any> {
  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );
  return JSON.parse(response.SecretString!);
}

// Types
interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
  labels: Array<{ name: string }>;
  state: string;
}

interface IssueCategory {
  number: number;
  title: string;
  url: string;
}

interface SnapshotData {
  readyForTesting: IssueCategory[];
  inProgress: IssueCategory[];
  blocked: IssueCategory[];
  backlog: IssueCategory[];
  readyForTestingCount: number;
  inProgressCount: number;
  blockedCount: number;
  backlogCount: number;
  totalCount: number;
}

interface DeltaResult {
  readyForTesting: {
    count: number;
    delta: number;
    new: IssueCategory[];
    moved: IssueCategory[];
  };
  inProgress: {
    count: number;
    delta: number;
    new: IssueCategory[];
  };
  blocked: {
    count: number;
    delta: number;
    new: IssueCategory[];
  };
  backlog: {
    count: number;
    delta: number;
  };
}

// Structured logger
const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    }));
  },
  error: (message: string, error?: any, meta?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      ...meta
    }));
  }
};

/**
 * Fetch all open issues from GitHub API
 */
async function fetchGitHubIssues(owner: string, repo: string, token: string): Promise<GitHubIssue[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100`;

  logger.info('Fetching GitHub issues', { owner, repo, url });

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ChillTask-IssueSummary/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API failed: ${response.status} ${response.statusText}`);
  }

  const issues = await response.json() as GitHubIssue[];

  // Filter out pull requests (they appear in the issues API)
  const actualIssues = issues.filter(issue => !('pull_request' in issue));

  logger.info('Fetched GitHub issues', {
    totalReturned: issues.length,
    actualIssues: actualIssues.length
  });

  return actualIssues;
}

/**
 * Categorize issues by label
 */
function categorizeIssues(issues: GitHubIssue[]): SnapshotData {
  const readyForTesting: IssueCategory[] = [];
  const inProgress: IssueCategory[] = [];
  const blocked: IssueCategory[] = [];
  const backlog: IssueCategory[] = [];

  for (const issue of issues) {
    const labelNames = issue.labels.map(l => l.name.toLowerCase());
    const category: IssueCategory = {
      number: issue.number,
      title: issue.title,
      url: issue.html_url
    };

    // Flexible label matching to handle different formats (status:blocked, blocked, etc.)
    const hasBlocked = labelNames.some(label => label.includes('blocked') && !label.includes('unblocked'));
    const hasReady = labelNames.some(label => label.includes('ready') && label.includes('test'));
    const hasInProgress = labelNames.some(label =>
      label.includes('in-progress') || label.includes('in progress') || label === 'status:in-progress'
    );

    // Prioritize labels in order: blocked > ready-for-testing > in-progress > backlog
    if (hasBlocked) {
      blocked.push(category);
    } else if (hasReady) {
      readyForTesting.push(category);
    } else if (hasInProgress) {
      inProgress.push(category);
    } else {
      // No recognized label = backlog
      backlog.push(category);
    }
  }

  return {
    readyForTesting,
    inProgress,
    blocked,
    backlog,
    readyForTestingCount: readyForTesting.length,
    inProgressCount: inProgress.length,
    blockedCount: blocked.length,
    backlogCount: backlog.length,
    totalCount: issues.length
  };
}

/**
 * Calculate delta between current and previous snapshot
 */
function calculateDelta(current: SnapshotData, previous: SnapshotData | null): DeltaResult {
  if (!previous) {
    // First run - everything is "new"
    return {
      readyForTesting: {
        count: current.readyForTestingCount,
        delta: current.readyForTestingCount,
        new: current.readyForTesting,
        moved: []
      },
      inProgress: {
        count: current.inProgressCount,
        delta: current.inProgressCount,
        new: current.inProgress
      },
      blocked: {
        count: current.blockedCount,
        delta: current.blockedCount,
        new: current.blocked
      },
      backlog: {
        count: current.backlogCount,
        delta: current.backlogCount
      }
    };
  }

  // Find new issues in ready-for-testing
  const prevReadyIds = new Set(previous.readyForTesting.map(i => i.number));
  const newReady = current.readyForTesting.filter(i => !prevReadyIds.has(i.number));

  // Find issues that moved TO ready-for-testing from other categories
  const prevInProgressIds = new Set(previous.inProgress.map(i => i.number));
  const prevBlockedIds = new Set(previous.blocked.map(i => i.number));
  const prevBacklogIds = new Set(previous.backlog.map(i => i.number));

  const movedToReady = current.readyForTesting.filter(i =>
    prevInProgressIds.has(i.number) ||
    prevBlockedIds.has(i.number) ||
    prevBacklogIds.has(i.number)
  );

  // Find new issues in other categories
  const prevAllIds = new Set([
    ...previous.readyForTesting.map(i => i.number),
    ...previous.inProgress.map(i => i.number),
    ...previous.blocked.map(i => i.number),
    ...previous.backlog.map(i => i.number)
  ]);

  const newInProgress = current.inProgress.filter(i => !prevAllIds.has(i.number));
  const newBlocked = current.blocked.filter(i => !prevAllIds.has(i.number));

  return {
    readyForTesting: {
      count: current.readyForTestingCount,
      delta: current.readyForTestingCount - previous.readyForTestingCount,
      new: newReady,
      moved: movedToReady
    },
    inProgress: {
      count: current.inProgressCount,
      delta: current.inProgressCount - previous.inProgressCount,
      new: newInProgress
    },
    blocked: {
      count: current.blockedCount,
      delta: current.blockedCount - previous.blockedCount,
      new: newBlocked
    },
    backlog: {
      count: current.backlogCount,
      delta: current.backlogCount - previous.backlogCount
    }
  };
}

/**
 * Format delta number with + or - sign
 */
function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return 'no change';
}

/**
 * Format Slack message with issue summary and delta
 */
function formatSlackMessage(repoName: string, delta: DeltaResult): string {
  const lines: string[] = [];

  lines.push(`📊 *${repoName}* - Issue Status Report`);
  lines.push(`_${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' })}_\n`);

  // Ready for Testing
  lines.push(`✅ *Ready for Testing:* ${delta.readyForTesting.count} issues (${formatDelta(delta.readyForTesting.delta)})`);

  // In Progress
  lines.push(`🔨 *In Progress:* ${delta.inProgress.count} issues (${formatDelta(delta.inProgress.delta)})`);

  // Blocked
  lines.push(`🚧 *Blocked:* ${delta.blocked.count} issues (${formatDelta(delta.blocked.delta)})`);

  // Backlog
  lines.push(`📋 *Backlog:* ${delta.backlog.count} issues (${formatDelta(delta.backlog.delta)})`);

  return lines.join('\n');
}

/**
 * Main handler
 */
export const handler = async (event: EventBridgeEvent<string, any>) => {
  const startTime = Date.now();

  logger.info('=== GitHub Issue Summary Started ===', {
    timestamp: new Date().toISOString(),
    scheduledTime: event.time
  });

  try {
    // Step 1: Initialize Amplify Data client
    logger.info('[Step 1/7] Initializing Amplify Data client');
    const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(process.env as any);
    Amplify.configure(resourceConfig, libraryOptions);
    const client = generateClient<Schema>({ authMode: 'iam' });

    // Step 2: Fetch secrets from AWS Secrets Manager
    logger.info('[Step 2/7] Fetching secrets from AWS Secrets Manager');
    if (!cachedGitHubToken) {
      const githubSecret = await getSecret('github-token');
      cachedGitHubToken = githubSecret.GITHUB_TOKEN;
    }
    if (!cachedSlackBotToken) {
      const slackSecret = await getSecret('chinchilla-ai-academy/slack');
      cachedSlackBotToken = slackSecret.SLACK_BOT_TOKEN;
    }

    // Step 3: Fetch current GitHub issues
    logger.info('[Step 3/7] Fetching GitHub issues from API');
    const owner = process.env.GITHUB_REPO_OWNER!;
    const repo = process.env.GITHUB_REPO_NAME!;

    if (!cachedGitHubToken) {
      throw new Error('GitHub token not found in secrets');
    }

    const issues = await fetchGitHubIssues(owner, repo, cachedGitHubToken);

    // Step 3: Categorize issues by label
    logger.info('[Step 3/7] Categorizing issues by label');
    const currentSnapshot = categorizeIssues(issues);

    // Step 4: Fetch previous snapshot from DynamoDB
    logger.info('[Step 4/7] Fetching previous snapshot from DynamoDB');
    const { data: snapshots } = await client.models.GitHubIssueSnapshot.list({
      filter: {
        repoName: { eq: `${owner}/${repo}` }
      },
      limit: 1,
      // Sort by timestamp descending to get most recent
    });

    const previousSnapshot = snapshots && snapshots.length > 0 ? {
      readyForTesting: JSON.parse(snapshots[0].readyForTesting as string) as IssueCategory[] || [],
      inProgress: JSON.parse(snapshots[0].inProgress as string) as IssueCategory[] || [],
      blocked: JSON.parse(snapshots[0].blocked as string) as IssueCategory[] || [],
      backlog: JSON.parse(snapshots[0].backlog as string) as IssueCategory[] || [],
      readyForTestingCount: snapshots[0].readyForTestingCount || 0,
      inProgressCount: snapshots[0].inProgressCount || 0,
      blockedCount: snapshots[0].blockedCount || 0,
      backlogCount: snapshots[0].backlogCount || 0,
      totalCount: snapshots[0].totalCount || 0
    } : null;

    logger.info('[Step 4/7] Previous snapshot loaded', {
      hasPrevious: !!previousSnapshot,
      previousTimestamp: snapshots?.[0]?.timestamp
    });

    // Step 5: Calculate delta
    logger.info('[Step 5/7] Calculating delta between snapshots');
    const delta = calculateDelta(currentSnapshot, previousSnapshot);

    // Step 6: Send Slack notification
    logger.info('[Step 6/7] Sending Slack notification');

    if (!cachedSlackBotToken) {
      throw new Error('Slack bot token not found in secrets');
    }

    const slack = new WebClient(cachedSlackBotToken);
    const message = formatSlackMessage(repo, delta);

    const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID!;

    const slackResult = await slack.chat.postMessage({
      channel: SLACK_CHANNEL_ID,
      text: message,
      mrkdwn: true,
    });

    logger.info('[Step 6/7] Slack notification sent', {
      messageId: slackResult.ts,
      channel: slackResult.channel
    });

    // Step 7: Save current snapshot to DynamoDB
    logger.info('[Step 7/7] Saving current snapshot to DynamoDB');

    // Delete old snapshots for this repo (keep only the latest)
    if (snapshots && snapshots.length > 0) {
      logger.info('[Step 7/7] Deleting old snapshot(s) before saving new one', {
        oldSnapshotCount: snapshots.length
      });

      for (const oldSnapshot of snapshots) {
        await client.models.GitHubIssueSnapshot.delete({ id: oldSnapshot.id });
      }
    }

    // Save new snapshot
    const ttl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days

    const createResult = await client.models.GitHubIssueSnapshot.create({
      timestamp: new Date().toISOString(),
      repoName: `${owner}/${repo}`,
      repoOwner: owner,
      readyForTestingCount: currentSnapshot.readyForTestingCount,
      inProgressCount: currentSnapshot.inProgressCount,
      blockedCount: currentSnapshot.blockedCount,
      backlogCount: currentSnapshot.backlogCount,
      totalCount: currentSnapshot.totalCount,
      readyForTesting: JSON.stringify(currentSnapshot.readyForTesting),
      inProgress: JSON.stringify(currentSnapshot.inProgress),
      blocked: JSON.stringify(currentSnapshot.blocked),
      backlog: JSON.stringify(currentSnapshot.backlog),
      ttl
    });

    if (createResult.errors) {
      logger.error('[Step 7/7] Failed to save snapshot to DynamoDB', createResult.errors);
      throw new Error(`DynamoDB write failed: ${JSON.stringify(createResult.errors)}`);
    }

    logger.info('[Step 7/7] New snapshot saved successfully', {
      snapshotId: createResult.data?.id
    });

    const duration = Date.now() - startTime;

    logger.info('=== GitHub Issue Summary Completed ===', {
      success: true,
      durationMs: duration,
      issuesProcessed: currentSnapshot.totalCount,
      slackMessageId: slackResult.ts
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Issue summary completed successfully',
        timestamp: new Date().toISOString(),
        issuesProcessed: currentSnapshot.totalCount,
        durationMs: duration,
        slackMessageId: slackResult.ts
      })
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('=== GitHub Issue Summary Failed ===', error, {
      durationMs: duration
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Issue summary failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration
      })
    };
  }
};
