import { EventBridgeEvent } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import type { Schema } from '../../data/resource';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

/**
 * Sync Slack Messages to GitHub
 *
 * Scheduled Lambda that processes unprocessed Slack messages from DynamoDB
 * and syncs them to GitHub repositories.
 */

// GitHub API types
interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  content: string;
}

interface GitHubFileResponse {
  sha: string;
  content: GitHubFile;
}

// Secrets Manager client
const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

/**
 * Get GitHub token from Secrets Manager
 */
async function getGitHubToken(): Promise<string> {
  const command = new GetSecretValueCommand({
    SecretId: 'github-token',
  });

  const response = await secretsClient.send(command);
  if (!response.SecretString) {
    throw new Error('GitHub token not found in Secrets Manager');
  }

  const secret = JSON.parse(response.SecretString);
  return secret.token;
}

/**
 * Get file from GitHub repo
 */
async function getGitHubFile(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token: string
): Promise<GitHubFile | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (response.status === 404) {
    return null; // File doesn't exist
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Create or update file in GitHub repo
 */
async function createOrUpdateGitHubFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  token: string,
  sha?: string
): Promise<void> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const body: any = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch,
  };

  if (sha) {
    body.sha = sha; // Required for updates
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorBody}`);
  }
}

/**
 * Format Slack timestamp to readable time
 */
function formatTime(timestamp: string): string {
  const date = new Date(parseFloat(timestamp) * 1000);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format Slack timestamp to date string (YYYY-MM-DD)
 */
function formatDate(timestamp: string): string {
  const date = new Date(parseFloat(timestamp) * 1000);
  return date.toISOString().split('T')[0];
}

export const handler = async (event: EventBridgeEvent<string, any>) => {
  const startTime = Date.now();

  console.log('=== Sync Slack to GitHub Started ===');
  console.log('🕒 Event Time:', event.time);
  console.log('🔍 Environment:', process.env.ENV || 'unknown');

  try {
    // STEP 1: Initialize Amplify Data client with IAM authentication
    console.log('🔧 Initializing Amplify client...');
    const env = process.env as any;
    const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
    Amplify.configure(resourceConfig, libraryOptions);

    const client = generateClient<Schema>({ authMode: 'iam' });
    console.log('✅ Amplify client initialized');

    // STEP 1b: Get GitHub token
    console.log('🔑 Fetching GitHub token...');
    const githubToken = await getGitHubToken();
    console.log('✅ GitHub token retrieved');

    // STEP 2: Query unprocessed Slack messages
    console.log('📬 Querying unprocessed Slack messages...');
    const { data: unprocessedMessages, errors } = await client.models.SlackEvent.list({
      filter: {
        processed: { eq: false },
      },
    });

    if (errors) {
      console.error('❌ Error querying SlackEvent:', errors);
      throw new Error('Failed to query SlackEvent table');
    }

    console.log(`📊 Found ${unprocessedMessages.length} unprocessed messages`);

    if (unprocessedMessages.length === 0) {
      console.log('✅ No messages to process');
      return {
        statusCode: 200,
        body: {
          message: 'No unprocessed messages',
          timestamp: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
        },
      };
    }

    // STEP 3: Process each message
    let successCount = 0;
    let failureCount = 0;

    for (const message of unprocessedMessages) {
      try {
        console.log(`\n📝 Processing message ${message.id}...`);
        console.log(`   Channel: ${message.channelId}`);
        console.log(`   User: ${message.userId}`);
        console.log(`   Text: ${message.messageText?.substring(0, 50)}...`);

        // STEP 3a: Look up channel mapping
        if (!message.channelId) {
          console.warn(`⚠️  Message ${message.id} has no channelId`);
          await client.models.SlackEvent.update({
            id: message.id,
            processed: true,
          });
          failureCount++;
          continue;
        }

        const { data: mappings } = await client.models.ChannelMapping.list({
          filter: {
            slackChannelId: { eq: message.channelId },
          },
        });

        if (!mappings || mappings.length === 0) {
          console.warn(`⚠️  No channel mapping found for ${message.channelId}`);
          // Mark as processed even if no mapping (to avoid re-processing)
          await client.models.SlackEvent.update({
            id: message.id,
            processed: true,
          });
          failureCount++;
          continue;
        }

        const mapping = mappings[0];
        console.log(`   Mapped to: ${mapping.githubOwner}/${mapping.githubRepo}/${mapping.githubBranch}`);

        // STEP 3b: Sync message to GitHub
        if (!message.timestamp) {
          console.warn(`⚠️  Message ${message.id} has no timestamp`);
          await client.models.SlackEvent.update({
            id: message.id,
            processed: true,
          });
          failureCount++;
          continue;
        }

        // Build file path: context/communications/slack/{channel}/{date}.md
        const dateStr = formatDate(message.timestamp);
        const filePath = `context/communications/slack/${mapping.slackChannel}/${dateStr}.md`;

        console.log(`   📄 File path: ${filePath}`);

        try {
          // Get existing file (if exists)
          const existingFile = await getGitHubFile(
            mapping.githubOwner || '',
            mapping.githubRepo,
            filePath,
            mapping.githubBranch,
            githubToken
          );

          let newContent: string;
          let commitMessage: string;

          if (existingFile) {
            // File exists - decode and append
            console.log(`   📝 Appending to existing file (SHA: ${existingFile.sha.substring(0, 7)})`);
            const currentContent = Buffer.from(existingFile.content, 'base64').toString('utf-8');
            const timeStr = formatTime(message.timestamp);
            const messageEntry = `\n### ${timeStr} - @${message.userId || 'unknown'}\n${message.messageText || '(no text)'}\n`;

            newContent = currentContent + messageEntry;
            commitMessage = `Add message from @${message.userId || 'unknown'} at ${timeStr}`;

            // Update file with SHA
            await createOrUpdateGitHubFile(
              mapping.githubOwner || '',
              mapping.githubRepo,
              filePath,
              newContent,
              commitMessage,
              mapping.githubBranch,
              githubToken,
              existingFile.sha
            );
          } else {
            // File doesn't exist - create new
            console.log(`   ✨ Creating new file`);
            const timeStr = formatTime(message.timestamp);
            newContent = `# ${dateStr} - ${mapping.slackChannel}\n\n### ${timeStr} - @${message.userId || 'unknown'}\n${message.messageText || '(no text)'}\n`;
            commitMessage = `Create daily log for ${mapping.slackChannel} on ${dateStr}`;

            // Create new file (no SHA needed)
            await createOrUpdateGitHubFile(
              mapping.githubOwner || '',
              mapping.githubRepo,
              filePath,
              newContent,
              commitMessage,
              mapping.githubBranch,
              githubToken
            );
          }

          console.log(`   ✅ Synced to GitHub`);

          // STEP 3c: Mark as processed
          await client.models.SlackEvent.update({
            id: message.id,
            processed: true,
          });

          console.log(`✅ Message ${message.id} processed successfully`);
          successCount++;
        } catch (githubError: any) {
          console.error(`   ❌ GitHub API error:`, githubError.message);
          // Don't mark as processed - will retry on next run
          failureCount++;
        }
      } catch (error: any) {
        console.error(`❌ Failed to process message ${message.id}:`, error.message);
        failureCount++;
      }
    }

    const totalProcessingTime = Date.now() - startTime;
    console.log('\n=== Sync Completed ===');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`⏱️  Total time: ${totalProcessingTime}ms`);

    return {
      statusCode: 200,
      body: {
        message: 'Sync completed',
        timestamp: new Date().toISOString(),
        messagesProcessed: unprocessedMessages.length,
        successCount,
        failureCount,
        processingTimeMs: totalProcessingTime,
      },
    };
  } catch (error: any) {
    const totalProcessingTime = Date.now() - startTime;
    console.error('❌ Sync failed:', error.message);
    console.error('Stack trace:', error.stack);

    return {
      statusCode: 500,
      body: {
        error: 'Sync failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        processingTimeMs: totalProcessingTime,
      },
    };
  }
};
