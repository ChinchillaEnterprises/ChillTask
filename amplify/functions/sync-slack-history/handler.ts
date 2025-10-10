import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { Schema } from '../../data/resource';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

type Handler = Schema['syncSlackHistory']['functionHandler'];

export const handler: Handler = async (event, context) => {
  console.log('🔄 Sync Slack History handler called');
  console.log('Event arguments:', JSON.stringify(event.arguments, null, 2));

  try {
    // Extract authenticated user from context
    const userId = (context.identity as any)?.sub;
    if (!userId) {
      console.error('❌ No authenticated user found');
      throw new Error('Unauthorized - must be signed in');
    }
    console.log('👤 Authenticated user ID:', userId);

    // Extract channelId from arguments
    const { channelId } = event.arguments;
    if (!channelId) {
      throw new Error('channelId is required');
    }

    // Initialize Amplify Data client with IAM authentication
    const env = process.env as any;
    const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
    Amplify.configure(resourceConfig, libraryOptions);

    const client = generateClient<Schema>({ authMode: 'iam' });

    // Find the mapping for this channel
    console.log('🔍 Finding mapping for channel:', channelId);
    const { data: mappings } = await client.models.ChannelMapping.list({
      filter: {
        slackChannelId: { eq: channelId },
        isActive: { eq: true }
      }
    });

    if (!mappings || mappings.length === 0) {
      throw new Error(`No active mapping found for channel ${channelId}`);
    }

    const mapping = mappings[0];
    console.log('✅ Found mapping:', {
      slackChannel: mapping.slackChannel,
      githubRepo: mapping.githubRepo,
      githubBranch: mapping.githubBranch
    });

    // Get secrets for Slack and GitHub
    console.log('🔐 Retrieving credentials...');
    const secrets = await getSecrets();

    // Fetch historical messages from Slack
    console.log('📥 Fetching Slack message history...');
    const messages = await fetchSlackHistory(
      secrets.slackToken,
      channelId
    );

    console.log(`✅ Retrieved ${messages.length} messages from Slack`);

    if (messages.length === 0) {
      return {
        success: true,
        messagesSynced: 0,
        message: 'No messages to sync',
        timestamp: new Date().toISOString()
      };
    }

    // Group messages by thread
    const threadGroups = groupMessagesByThread(messages);
    console.log(`📝 Organized into ${threadGroups.size} thread groups`);

    let syncedCount = 0;
    let errorCount = 0;

    // Process each thread group
    for (const [threadTs, threadMessages] of threadGroups.entries()) {
      try {
        // Fetch user names for all users in the thread
        const userIds = [...new Set(threadMessages.map(msg => msg.user))];
        const userNames = await fetchUserNames(secrets.slackToken, userIds);

        // Format thread as Markdown
        const markdown = formatThreadAsMarkdown(threadMessages, userNames);

        // Generate filename for the thread
        const fileName = generateFileName(threadMessages[0], mapping.contextFolder);

        // Commit to GitHub
        await commitToGitHub({
          githubToken: secrets.githubToken,
          repoFullName: mapping.githubUrl,
          branch: mapping.githubBranch,
          filePath: fileName,
          content: markdown,
          commitMessage: `Sync Slack history: ${mapping.slackChannel}`,
        });

        syncedCount += threadMessages.length;
        console.log(`✅ Synced thread ${threadTs} (${threadMessages.length} messages)`);
      } catch (error: any) {
        console.error(`❌ Failed to sync thread ${threadTs}:`, error);
        errorCount++;
      }
    }

    // Update mapping stats
    console.log('📊 Updating mapping statistics...');
    const currentCount = mapping.messageCount || 0;
    await client.models.ChannelMapping.update({
      id: mapping.id,
      lastSync: new Date().toISOString(),
      messageCount: currentCount + syncedCount
    });

    const result = {
      success: true,
      messagesSynced: syncedCount,
      threadsProcessed: threadGroups.size - errorCount,
      errors: errorCount,
      message: `Successfully synced ${syncedCount} messages in ${threadGroups.size - errorCount} threads`,
      timestamp: new Date().toISOString()
    };

    console.log('🎉 Sync completed:', result);
    return result;

  } catch (error: any) {
    console.error('❌ Error in sync handler:', error);
    return {
      success: false,
      messagesSynced: 0,
      threadsProcessed: 0,
      errors: 1,
      message: error.message || 'Failed to sync Slack history',
      timestamp: new Date().toISOString()
    };
  }
};

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

async function fetchSlackHistory(token: string, channel: string): Promise<any[]> {
  const allMessages: any[] = [];
  let cursor: string | undefined;
  const limit = 100; // Max messages per request

  do {
    const url = `https://slack.com/api/conversations.history?channel=${channel}&limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    if (data.messages) {
      allMessages.push(...data.messages);
    }

    cursor = data.response_metadata?.next_cursor;
  } while (cursor);

  return allMessages;
}

async function fetchUserNames(token: string, userIds: string[]): Promise<Map<string, string>> {
  const userNames = new Map<string, string>();

  for (const userId of userIds) {
    try {
      const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      const name = data.user?.real_name || data.user?.name || 'Unknown User';
      userNames.set(userId, name);
    } catch (error) {
      console.warn(`Failed to fetch user ${userId}:`, error);
      userNames.set(userId, 'Unknown User');
    }
  }

  return userNames;
}

function groupMessagesByThread(messages: any[]): Map<string, any[]> {
  const threads = new Map<string, any[]>();

  for (const message of messages) {
    // Use thread_ts if exists, otherwise use ts as thread identifier
    const threadId = message.thread_ts || message.ts;

    if (!threads.has(threadId)) {
      threads.set(threadId, []);
    }

    threads.get(threadId)!.push(message);
  }

  // Sort messages within each thread by timestamp
  for (const [threadId, msgs] of threads.entries()) {
    msgs.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));
  }

  return threads;
}

function formatThreadAsMarkdown(messages: any[], userNames: Map<string, string>): string {
  const firstMessage = messages[0];
  const date = new Date(parseFloat(firstMessage.ts) * 1000);
  const formattedDate = date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let markdown = `# Slack Conversation\n\n`;
  markdown += `**Date:** ${formattedDate}\n`;
  markdown += `**Thread ID:** ${firstMessage.thread_ts || firstMessage.ts}\n\n`;
  markdown += `---\n\n`;

  // Format each message in the thread
  for (const msg of messages) {
    const userName = userNames.get(msg.user) || 'Unknown User';
    const msgDate = new Date(parseFloat(msg.ts) * 1000);
    const msgTime = msgDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    markdown += `### ${userName}\n`;
    markdown += `**Time:** ${msgTime}\n\n`;
    markdown += `${msg.text}\n\n`;
    markdown += `---\n\n`;
  }

  return markdown;
}

function generateFileName(message: any, contextFolder: string): string {
  const date = new Date(parseFloat(message.ts) * 1000);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

  // Create a slug from the first few words of the message
  const slug = message.text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .slice(0, 5)
    .join('-');

  const threadId = message.thread_ts || message.ts;
  const cleanFolder = contextFolder.endsWith('/') ? contextFolder : `${contextFolder}/`;

  return `${cleanFolder}${dateStr}-${slug}-${threadId}.md`;
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

  // Check if file exists
  const existingFile = await getGitHubFile(githubToken, repoFullName, branch, filePath);

  let newContent = content;
  let sha: string | undefined;

  if (existingFile) {
    // File exists, use existing content (don't duplicate)
    console.log(`ℹ️ File already exists: ${filePath}, skipping`);
    return;
  }

  // Create new file
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
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

async function getGitHubFile(token: string, repoFullName: string, branch: string, filePath: string) {
  const url = `https://api.github.com/repos/${repoFullName}/contents/${filePath}?ref=${branch}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
    },
  });

  if (response.status === 404) {
    return null; // File doesn't exist
  }

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return await response.json();
}
