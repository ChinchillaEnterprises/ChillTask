import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { Schema } from '../../data/resource';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

// ==========================================
// CONSTANTS & CONFIGURATION
// ==========================================
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 25000; // Lambda timeout is 30s, leave 5s buffer

// ==========================================
// TYPE DEFINITIONS
// ==========================================
interface SlackEvent {
  type: string;
  event: {
    type: string;
    channel: string;
    user: string;
    text: string;
    ts: string;
    thread_ts?: string;
  };
  challenge?: string;
}

interface ErrorContext {
  functionName: string;
  eventType?: string;
  channelId?: string;
  userId?: string;
  timestamp?: string;
  errorType: string;
  errorMessage: string;
  stack?: string;
  [key: string]: any;
}

// ==========================================
// UTILITY: STRUCTURED LOGGING
// ==========================================
const logger = {
  info: (message: string, context?: object) => {
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message,
      ...context
    }));
  },

  warn: (message: string, context?: object) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      timestamp: new Date().toISOString(),
      message,
      ...context
    }));
  },

  error: (message: string, error: Error, context?: ErrorContext) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      error: error.message,
      errorType: error.name,
      stack: error.stack,
      ...context
    }));
  }
};

// ==========================================
// UTILITY: RETRY WITH EXPONENTIAL BACKOFF
// ==========================================
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Executing ${operationName}`, { attempt: attempt + 1, maxRetries: maxRetries + 1 });
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry on validation errors or non-retryable errors
      if (error.name === 'ValidationError' || error.statusCode === 400 || error.statusCode === 401) {
        logger.warn(`Non-retryable error in ${operationName}`, {
          errorType: error.name,
          statusCode: error.statusCode
        });
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        logger.warn(`${operationName} failed, retrying...`, {
          attempt: attempt + 1,
          delay,
          error: error.message
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(`${operationName} failed after ${maxRetries + 1} attempts`, lastError!);
  throw lastError!;
}

// ==========================================
// UTILITY: TIMEOUT WRAPPER
// ==========================================
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

// ==========================================
// UTILITY: INPUT VALIDATION
// ==========================================
function validateSlackEvent(body: any): body is SlackEvent {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body: must be an object');
  }

  if (!body.type || typeof body.type !== 'string') {
    throw new Error('Invalid request body: missing or invalid "type" field');
  }

  if (body.type === 'event_callback') {
    if (!body.event || typeof body.event !== 'object') {
      throw new Error('Invalid event_callback: missing event object');
    }

    const event = body.event;
    if (event.type === 'message') {
      if (!event.channel || !event.user || !event.text || !event.ts) {
        throw new Error('Invalid message event: missing required fields (channel, user, text, ts)');
      }
    }
  }

  return true;
}

// ==========================================
// MAIN HANDLER
// ==========================================
export const handler = async (event: any) => {
  const startTime = Date.now();

  logger.info('Slack webhook invoked', {
    requestId: event.requestContext?.requestId,
    httpMethod: event.httpMethod,
    path: event.path,
    hasBody: !!event.body
  });

  try {
    // Parse and validate input
    let body: SlackEvent;
    try {
      body = JSON.parse(event.body || '{}');
      validateSlackEvent(body);
    } catch (parseError: any) {
      logger.error('Failed to parse or validate request body', parseError, {
        functionName: 'slack-webhook-handler',
        errorType: 'ValidationError',
        errorMessage: parseError.message,
        bodyPreview: event.body?.substring(0, 200)
      });

      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid request',
          message: parseError.message
        }),
      };
    }

    // Handle Slack URL verification challenge
    if (body.type === 'url_verification') {
      logger.info('Handling URL verification challenge');
      return {
        statusCode: 200,
        body: JSON.stringify({ challenge: body.challenge }),
      };
    }

    // Handle message events with timeout
    if (body.type === 'event_callback' && body.event.type === 'message') {
      try {
        await withTimeout(
          processSlackMessage(body.event),
          REQUEST_TIMEOUT_MS,
          'processSlackMessage'
        );

        const processingTime = Date.now() - startTime;
        logger.info('Message processed successfully', {
          channelId: body.event.channel,
          processingTimeMs: processingTime
        });

        return {
          statusCode: 200,
          body: JSON.stringify({ ok: true }),
        };
      } catch (error: any) {
        const processingTime = Date.now() - startTime;

        logger.error('Error processing Slack message', error, {
          functionName: 'slack-webhook-handler',
          eventType: body.event.type,
          channelId: body.event.channel,
          userId: body.event.user,
          timestamp: body.event.ts,
          errorType: error.name,
          errorMessage: error.message,
          processingTimeMs: processingTime
        });

        // Return 500 for retryable errors, 200 for non-retryable to prevent spam
        const isRetryable = !error.name?.includes('Validation') && error.statusCode !== 400;

        return {
          statusCode: isRetryable ? 500 : 200,
          body: JSON.stringify({
            error: 'Processing failed',
            // Don't expose internal error details to Slack
            message: isRetryable ? 'Temporary error, please retry' : 'Invalid event data'
          }),
        };
      }
    }

    // Ignore other events
    logger.info('Ignoring non-message event', { eventType: body.type });
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };

  } catch (error: any) {
    const processingTime = Date.now() - startTime;

    logger.error('Unhandled error in webhook handler', error, {
      functionName: 'slack-webhook-handler',
      errorType: error.name,
      errorMessage: error.message,
      processingTimeMs: processingTime
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      }),
    };
  }
};

async function processSlackMessage(event: any) {
  const { channel, user, text, ts, thread_ts } = event;

  logger.info('Processing Slack message', {
    channelId: channel,
    userId: user,
    hasThread: !!thread_ts
  });

  // Find active mapping for this channel with retry
  const mapping = await retryWithBackoff(
    () => findMappingByChannel(channel),
    'findMappingByChannel'
  );

  if (!mapping) {
    logger.info('No active mapping found for channel', { channelId: channel });
    return;
  }

  logger.info('Found channel mapping', {
    mappingId: mapping.id,
    githubRepo: mapping.githubUrl,
    branch: mapping.githubBranch
  });

  // Get Slack and GitHub secrets with retry
  const secrets = await retryWithBackoff(
    () => getSecrets(),
    'getSecrets'
  );

  // Fetch user info from Slack with retry
  const userName = await retryWithBackoff(
    () => fetchSlackUserName(secrets.slackToken, user),
    'fetchSlackUserName'
  );

  // Fetch thread messages if this is part of a thread with retry
  const threadMessages = thread_ts
    ? await retryWithBackoff(
        () => fetchThreadMessages(secrets.slackToken, channel, thread_ts),
        'fetchThreadMessages'
      )
    : [];

  // Format message as Markdown
  const markdown = formatMessageAsMarkdown({
    userName,
    text,
    timestamp: ts,
    threadMessages,
  });

  // Commit to GitHub with retry
  await retryWithBackoff(
    () => commitToGitHub({
      githubToken: secrets.githubToken,
      repoFullName: mapping.githubUrl,
      branch: mapping.githubBranch,
      filePath: `context/slackconversation/${generateFileName(event)}`,
      content: markdown,
      commitMessage: `Add Slack conversation from ${userName}`,
    }),
    'commitToGitHub'
  );

  // Update mapping stats with retry
  await retryWithBackoff(
    () => updateMappingStats(mapping.id),
    'updateMappingStats'
  );

  logger.info('Message successfully archived to GitHub', {
    channelId: channel,
    userName,
    githubRepo: mapping.githubUrl
  });
}

async function findMappingByChannel(channelId: string) {
  // Initialize Amplify Data client
  const env = process.env as any;
  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
  Amplify.configure(resourceConfig, libraryOptions);

  const client = generateClient<Schema>({ authMode: 'iam' });

  // Query with filter
  const { data: mappings } = await client.models.ChannelMapping.list({
    filter: {
      slackChannelId: { eq: channelId },
      isActive: { eq: true }
    }
  });

  return mappings[0] || null;
}

async function getSecrets() {
  const slackSecretResponse = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: process.env.SLACK_SECRET_NAME,
    })
  );

  const githubSecretResponse = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: process.env.GITHUB_SECRET_NAME,
    })
  );

  const slackSecrets = JSON.parse(slackSecretResponse.SecretString || '{}');
  const githubSecrets = JSON.parse(githubSecretResponse.SecretString || '{}');

  return {
    slackToken: slackSecrets.bot_token || slackSecrets.SLACK_BOT_TOKEN,
    githubToken: githubSecrets.GITHUB_TOKEN || githubSecrets.token,
  };
}

async function fetchSlackUserName(token: string, userId: string): Promise<string> {
  try {
    const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack API returned error: ${data.error}`);
    }

    return data.user?.real_name || data.user?.name || 'Unknown User';
  } catch (error: any) {
    logger.warn('Failed to fetch Slack user name, using fallback', {
      userId,
      error: error.message
    });
    return `User ${userId}`;
  }
}

async function fetchThreadMessages(token: string, channel: string, threadTs: string): Promise<any[]> {
  try {
    const response = await fetch(
      `https://slack.com/api/conversations.replies?channel=${channel}&ts=${threadTs}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack API returned error: ${data.error}`);
    }

    return data.messages || [];
  } catch (error: any) {
    logger.warn('Failed to fetch thread messages, continuing without thread', {
      channel,
      threadTs,
      error: error.message
    });
    return [];
  }
}

function formatMessageAsMarkdown(params: {
  userName: string;
  text: string;
  timestamp: string;
  threadMessages: any[];
}): string {
  const { userName, text, timestamp, threadMessages } = params;
  const date = new Date(parseFloat(timestamp) * 1000);
  const formattedDate = date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let markdown = `# Slack Conversation\n\n`;
  markdown += `**Date:** ${formattedDate}\n\n`;
  markdown += `---\n\n`;
  markdown += `### ${userName}\n`;
  markdown += `${text}\n\n`;

  // Add thread replies if any
  if (threadMessages.length > 1) {
    markdown += `#### Thread Replies:\n\n`;
    threadMessages.slice(1).forEach((msg: any) => {
      const replyDate = new Date(parseFloat(msg.ts) * 1000);
      markdown += `**${msg.user}** - ${replyDate.toLocaleTimeString()}:\n`;
      markdown += `${msg.text}\n\n`;
    });
  }

  return markdown;
}

function generateFileName(event: any): string {
  const { ts, thread_ts, text } = event;
  const date = new Date(parseFloat(ts) * 1000);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

  // Create a slug from the first few words of the message
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .slice(0, 5)
    .join('-');

  const threadId = thread_ts || ts;
  return `${dateStr}-${slug}-${threadId}.md`;
}

async function commitToGitHub(params: {
  githubToken: string;
  repoFullName: string;
  branch: string;
  filePath: string;
  content: string;
  commitMessage: string;
}) {
  const { githubToken, repoFullName, branch, filePath, content, commitMessage } = params;

  try {
    // Check if file exists
    const existingFile = await getGitHubFile(githubToken, repoFullName, branch, filePath);

    let newContent = content;
    let sha: string | undefined;

    if (existingFile) {
      // File exists, append to it
      const existingContent = Buffer.from(existingFile.content, 'base64').toString('utf-8');
      newContent = existingContent + '\n\n---\n\n' + content;
      sha = existingFile.sha;

      logger.info('Appending to existing file', {
        filePath,
        existingSize: existingContent.length,
        newSize: newContent.length
      });
    } else {
      logger.info('Creating new file', { filePath });
    }

    // Create or update file
    const url = `https://api.github.com/repos/${repoFullName}/contents/${filePath}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(newContent).toString('base64'),
        branch,
        ...(sha && { sha }),
      }),
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`GitHub API error: ${response.status} - ${errorText}`);
      (error as any).statusCode = response.status;
      throw error;
    }

    const result = await response.json();
    logger.info('Successfully committed to GitHub', {
      filePath,
      commitSha: result.commit?.sha
    });

    return result;
  } catch (error: any) {
    logger.error('Failed to commit to GitHub', error, {
      functionName: 'commitToGitHub',
      repo: repoFullName,
      branch,
      filePath,
      errorType: error.name,
      errorMessage: error.message
    });
    throw error;
  }
}

async function getGitHubFile(token: string, repoFullName: string, branch: string, filePath: string) {
  try {
    const url = `https://api.github.com/repos/${repoFullName}/contents/${filePath}?ref=${branch}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.status === 404) {
      return null; // File doesn't exist
    }

    if (!response.ok) {
      const error = new Error(`GitHub API error: ${response.status}`);
      (error as any).statusCode = response.status;
      throw error;
    }

    return await response.json();
  } catch (error: any) {
    if (error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

async function updateMappingStats(mappingId: string) {
  // Initialize Amplify Data client
  const env = process.env as any;
  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
  Amplify.configure(resourceConfig, libraryOptions);

  const client = generateClient<Schema>({ authMode: 'iam' });

  // First get the current mapping to read the current messageCount
  const { data: mapping } = await client.models.ChannelMapping.get({ id: mappingId });

  if (mapping) {
    const currentCount = mapping.messageCount || 0;

    await client.models.ChannelMapping.update({
      id: mappingId,
      lastSync: new Date().toISOString(),
      messageCount: currentCount + 1
    });
  }
}
