import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

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

export const handler = async (event: any) => {
  console.log('Received Slack event:', JSON.stringify(event, null, 2));

  const body: SlackEvent = JSON.parse(event.body || '{}');

  // Handle Slack URL verification challenge
  if (body.type === 'url_verification') {
    return {
      statusCode: 200,
      body: JSON.stringify({ challenge: body.challenge }),
    };
  }

  // Handle message events
  if (body.type === 'event_callback' && body.event.type === 'message') {
    try {
      await processSlackMessage(body.event);

      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true }),
      };
    } catch (error: any) {
      console.error('Error processing Slack message:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }
  }

  // Ignore other events
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true }),
  };
};

async function processSlackMessage(event: any) {
  const { channel, user, text, ts, thread_ts } = event;

  console.log(`Processing message from channel ${channel}`);

  // Find active mapping for this channel
  const mapping = await findMappingByChannel(channel);

  if (!mapping) {
    console.log(`No active mapping found for channel ${channel}`);
    return;
  }

  console.log(`Found mapping:`, mapping);

  // Get Slack and GitHub secrets
  const secrets = await getSecrets();

  // Fetch user info from Slack
  const userName = await fetchSlackUserName(secrets.slackToken, user);

  // Fetch thread messages if this is part of a thread
  const threadMessages = thread_ts ? await fetchThreadMessages(secrets.slackToken, channel, thread_ts) : [];

  // Format message as Markdown
  const markdown = formatMessageAsMarkdown({
    userName,
    text,
    timestamp: ts,
    threadMessages,
  });

  // Commit to GitHub
  await commitToGitHub({
    githubToken: secrets.githubToken,
    repoFullName: mapping.githubUrl,
    branch: mapping.githubBranch,
    filePath: `context/slackconversation/${generateFileName(event)}`,
    content: markdown,
    commitMessage: `Add Slack conversation from ${userName}`,
  });

  // Update mapping stats
  await updateMappingStats(mapping.id);

  console.log('Message successfully archived to GitHub');
}

async function findMappingByChannel(channelId: string) {
  const tableName = process.env.AMPLIFY_DATA_DYNAMODB_TABLE_NAME || 'ChannelMapping';

  const result = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: 'slackChannelId = :channelId AND isActive = :active',
      ExpressionAttributeValues: {
        ':channelId': channelId,
        ':active': true,
      },
    })
  );

  return result.Items?.[0];
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
  const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data.user?.real_name || data.user?.name || 'Unknown User';
}

async function fetchThreadMessages(token: string, channel: string, threadTs: string): Promise<any[]> {
  const response = await fetch(
    `https://slack.com/api/conversations.replies?channel=${channel}&ts=${threadTs}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();
  return data.messages || [];
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

  // Check if file exists
  const existingFile = await getGitHubFile(githubToken, repoFullName, branch, filePath);

  let newContent = content;
  let sha: string | undefined;

  if (existingFile) {
    // File exists, append to it
    const existingContent = Buffer.from(existingFile.content, 'base64').toString('utf-8');
    newContent = existingContent + '\n\n---\n\n' + content;
    sha = existingFile.sha;
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

async function updateMappingStats(mappingId: string) {
  const tableName = process.env.AMPLIFY_DATA_DYNAMODB_TABLE_NAME || 'ChannelMapping';

  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { id: mappingId },
      UpdateExpression: 'SET lastSync = :now, messageCount = if_not_exists(messageCount, :zero) + :one',
      ExpressionAttributeValues: {
        ':now': new Date().toISOString(),
        ':zero': 0,
        ':one': 1,
      },
    })
  );
}
