# Code Templates for Archive Messages Implementation

## Overview
This document provides copy-paste ready code templates for all components needed to implement the archive-messages Lambda function.

---

## Template 1: Lambda Function Resource Definition

**File:** `/amplify/functions/archive-messages/resource.ts`

```typescript
import { defineFunction } from '@aws-amplify/backend';

export const archiveMessages = defineFunction({
  name: 'archive-messages',
  entry: './handler.ts',
  timeoutSeconds: 300, // 5 minutes for batch processing
  memoryMB: 512, // Enough memory for message transformations
  environment: {
    SLACK_SECRET_NAME: 'chinchilla-ai-academy/slack',
    GITHUB_SECRET_NAME: 'github-token',
    GITHUB_ORG: 'ChinchillaEnterprises',
    TABLE_NAME_PREFIX: 'ChannelMapping', // For DynamoDB table discovery
  },
});
```

---

## Template 2: Complete Lambda Handler with DynamoDB Integration

**File:** `/amplify/functions/archive-messages/handler.ts`

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { EventBridgeEvent } from 'aws-lambda';

// Initialize AWS clients
const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Type definitions
interface SlackMessage {
  type: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  files?: any[];
  reactions?: Array<{
    name: string;
    count: number;
    users: string[];
  }>;
}

interface ChannelMapping {
  id: string;
  slackChannelId: string;
  slackChannel: string;
  githubRepo: string;
  githubBranch: string;
  contextFolder: string;
  isActive: boolean;
  lastSync?: string;
  messageCount?: number;
}

interface SlackUserCache {
  [userId: string]: string;
}

// Main handler
export const handler = async (event: EventBridgeEvent<string, any>) => {
  console.log('🚀 Archive Messages Lambda triggered', {
    time: new Date().toISOString(),
    eventSource: event.source,
  });

  try {
    // Step 1: Fetch secrets
    const [slackSecrets, githubSecrets] = await Promise.all([
      getSecret(process.env.SLACK_SECRET_NAME!),
      getSecret(process.env.GITHUB_SECRET_NAME!),
    ]);

    const slackToken = slackSecrets.SLACK_BOT_TOKEN || slackSecrets.bot_token;
    const githubToken = githubSecrets.GITHUB_TOKEN || githubSecrets.token;

    if (!slackToken || !githubToken) {
      throw new Error('Missing required authentication tokens');
    }

    // Step 2: Get active channel mappings
    const mappings = await getActiveChannelMappings();
    console.log(`📋 Found ${mappings.length} active channel mapping(s)`);

    if (mappings.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No active mappings to process' }),
      };
    }

    // Step 3: Process each mapping
    const results = [];
    for (const mapping of mappings) {
      try {
        const result = await processChannelMapping(mapping, slackToken, githubToken);
        results.push({ channel: mapping.slackChannel, status: 'success', ...result });
      } catch (error: any) {
        console.error(`❌ Failed to process ${mapping.slackChannel}:`, error.message);
        results.push({
          channel: mapping.slackChannel,
          status: 'error',
          error: error.message,
        });
      }
    }

    // Step 4: Summary
    const successCount = results.filter((r) => r.status === 'success').length;
    console.log(`✅ Archive complete: ${successCount}/${mappings.length} succeeded`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Archive process completed',
        totalMappings: mappings.length,
        successful: successCount,
        results,
      }),
    };
  } catch (error: any) {
    console.error('💥 Critical error in archive process:', error);
    throw error;
  }
};

// Helper: Get secret from AWS Secrets Manager
async function getSecret(secretId: string): Promise<any> {
  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretId })
  );
  return JSON.parse(response.SecretString || '{}');
}

// Helper: Get active channel mappings from DynamoDB
async function getActiveChannelMappings(): Promise<ChannelMapping[]> {
  // Find the ChannelMapping table (name includes environment suffix)
  const tableName = await findDynamoDBTable('ChannelMapping');

  const response = await docClient.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: 'isActive = :active',
      ExpressionAttributeValues: {
        ':active': true,
      },
    })
  );

  return (response.Items || []) as ChannelMapping[];
}

// Helper: Find DynamoDB table by prefix
async function findDynamoDBTable(prefix: string): Promise<string> {
  // In Amplify, table names follow pattern: {ModelName}-{env}-{hash}
  // We can get this from environment variable or construct it
  // For now, assume it's passed or discoverable via AWS SDK

  // Simplified: Use environment variable pattern
  const envTables = process.env.AMPLIFY_DATA_TABLE_NAMES || '{}';
  const tables = JSON.parse(envTables);

  // Find table starting with prefix
  const tableName = Object.values(tables).find((name: any) =>
    name.startsWith(prefix)
  ) as string;

  if (!tableName) {
    // Fallback: construct expected name
    // This would need to be adjusted based on your Amplify environment
    throw new Error(`Could not find DynamoDB table for ${prefix}`);
  }

  return tableName;
}

// Helper: Process a single channel mapping
async function processChannelMapping(
  mapping: ChannelMapping,
  slackToken: string,
  githubToken: string
): Promise<{ messagesArchived: number; fileName: string }> {
  console.log(`📱 Processing channel: ${mapping.slackChannel}`);

  // Step 1: Fetch messages from Slack
  const messages = await fetchSlackMessages(
    mapping.slackChannelId,
    slackToken,
    mapping.lastSync
  );

  if (messages.length === 0) {
    console.log(`   ℹ️  No new messages since ${mapping.lastSync || 'beginning'}`);
    return { messagesArchived: 0, fileName: 'N/A' };
  }

  console.log(`   📨 Found ${messages.length} new message(s)`);

  // Step 2: Transform to markdown
  const markdown = await transformMessagesToMarkdown(
    messages,
    slackToken,
    mapping.slackChannel
  );

  // Step 3: Commit to GitHub
  const fileName = await commitToGitHub(
    mapping.githubRepo,
    mapping.githubBranch,
    mapping.contextFolder,
    mapping.slackChannel,
    markdown,
    githubToken
  );

  // Step 4: Update DynamoDB
  await updateChannelMapping(mapping.id, {
    lastSync: new Date().toISOString(),
    messageCount: (mapping.messageCount || 0) + messages.length,
  });

  console.log(`   ✅ Archived to: ${fileName}`);

  return {
    messagesArchived: messages.length,
    fileName,
  };
}

// Helper: Fetch messages from Slack API
async function fetchSlackMessages(
  channelId: string,
  token: string,
  since?: string
): Promise<SlackMessage[]> {
  const url = new URL('https://slack.com/api/conversations.history');
  url.searchParams.set('channel', channelId);
  url.searchParams.set('limit', '200'); // Max per request

  if (since) {
    // Convert ISO timestamp to Unix timestamp (Slack format)
    const unixTimestamp = new Date(since).getTime() / 1000;
    url.searchParams.set('oldest', unixTimestamp.toString());
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Slack API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  return (data.messages || []).filter((msg: SlackMessage) => msg.type === 'message');
}

// Helper: Transform messages to markdown format
async function transformMessagesToMarkdown(
  messages: SlackMessage[],
  slackToken: string,
  channelName: string
): Promise<string> {
  // Sort chronologically (oldest first)
  const sorted = messages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));

  // Build user cache
  const userCache: SlackUserCache = {};

  let markdown = `# ${channelName} - Slack Archive\n\n`;
  markdown += `> **Archived:** ${new Date().toLocaleString()}\n`;
  markdown += `> **Messages:** ${sorted.length}\n\n`;
  markdown += `---\n\n`;

  for (const msg of sorted) {
    // Get username (cached)
    if (!userCache[msg.user]) {
      userCache[msg.user] = await getUserName(msg.user, slackToken);
    }
    const userName = userCache[msg.user];

    // Format timestamp
    const timestamp = new Date(parseFloat(msg.ts) * 1000).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    // Message header
    markdown += `## **${userName}** — *${timestamp}*\n\n`;

    // Message content
    markdown += `${msg.text || '*[No text content]*'}\n\n`;

    // Thread indicator
    if (msg.thread_ts && msg.thread_ts !== msg.ts) {
      markdown += `> 💬 *Reply in thread*\n\n`;
    }

    // Reactions
    if (msg.reactions && msg.reactions.length > 0) {
      const reactionStr = msg.reactions
        .map((r) => `${r.name} (${r.count})`)
        .join(' • ');
      markdown += `**Reactions:** ${reactionStr}\n\n`;
    }

    // Attachments
    if (msg.files && msg.files.length > 0) {
      markdown += `**📎 Attachments:**\n`;
      msg.files.forEach((file) => {
        markdown += `- ${file.name || 'Unnamed file'}\n`;
      });
      markdown += `\n`;
    }

    markdown += `---\n\n`;
  }

  return markdown;
}

// Helper: Get Slack user's display name
async function getUserName(userId: string, token: string): Promise<string> {
  try {
    const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (data.ok && data.user) {
      return data.user.real_name || data.user.name || userId;
    }
  } catch (error) {
    console.warn(`Failed to fetch user ${userId}:`, error);
  }

  return userId; // Fallback to user ID
}

// Helper: Commit markdown file to GitHub
async function commitToGitHub(
  repo: string,
  branch: string,
  folder: string,
  channelName: string,
  content: string,
  token: string
): Promise<string> {
  const org = process.env.GITHUB_ORG || 'ChinchillaEnterprises';
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const fileName = `${channelName.replace(/[^a-zA-Z0-9-]/g, '-')}-${date}.md`;
  const filePath = `${folder.replace(/^\//, '').replace(/\/$/, '')}/${fileName}`;

  const url = `https://api.github.com/repos/${org}/${repo}/contents/${filePath}`;

  // Check if file already exists (to update instead of create)
  let existingSha: string | undefined;
  try {
    const checkResponse = await fetch(`${url}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (checkResponse.ok) {
      const existing = await checkResponse.json();
      existingSha = existing.sha;
      console.log(`   📝 Updating existing file: ${fileName}`);
    }
  } catch (error) {
    console.log(`   📄 Creating new file: ${fileName}`);
  }

  // Create or update file
  const requestBody = {
    message: `📦 Archive Slack messages from ${channelName}`,
    content: Buffer.from(content).toString('base64'),
    branch,
    ...(existingSha && { sha: existingSha }),
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub commit failed: ${JSON.stringify(error)}`);
  }

  return fileName;
}

// Helper: Update channel mapping in DynamoDB
async function updateChannelMapping(
  id: string,
  updates: { lastSync: string; messageCount: number }
): Promise<void> {
  const tableName = await findDynamoDBTable('ChannelMapping');

  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { id },
      UpdateExpression: 'SET lastSync = :lastSync, messageCount = :messageCount',
      ExpressionAttributeValues: {
        ':lastSync': updates.lastSync,
        ':messageCount': updates.messageCount,
      },
    })
  );
}
```

---

## Template 3: Error Handling Wrapper

**Optional enhancement for handler.ts**

```typescript
// Wrap main handler with error tracking
export const handler = async (event: EventBridgeEvent<string, any>) => {
  try {
    return await mainHandler(event);
  } catch (error: any) {
    // Log to CloudWatch
    console.error('FATAL ERROR:', {
      message: error.message,
      stack: error.stack,
      event,
    });

    // Optionally: Send to SNS, write to DynamoDB error log, etc.

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Archive process failed',
        error: error.message,
      }),
    };
  }
};

async function mainHandler(event: EventBridgeEvent<string, any>) {
  // ... existing handler logic
}
```

---

## Template 4: Backend Integration

**File:** `/amplify/backend.ts` (additions)

```typescript
import { archiveMessages } from './functions/archive-messages/resource.js';

const backend = defineBackend({
  auth,
  data,
  getSlackChannels,
  getGitHubRepos,
  archiveMessages, // Add this
});

// ... existing permissions for other functions ...

// ========================================
// Archive Messages Lambda Permissions
// ========================================

const archiveFunction = backend.archiveMessages.resources.lambda;

// Grant Secrets Manager access
archiveFunction.addToRolePolicy(
  new (await import('aws-cdk-lib/aws-iam')).PolicyStatement({
    actions: ['secretsmanager:GetSecretValue'],
    resources: [
      'arn:aws:secretsmanager:us-east-1:*:secret:chinchilla-ai-academy/slack-*',
      'arn:aws:secretsmanager:us-east-1:*:secret:github-token-*',
    ],
  })
);

// Grant DynamoDB access to ChannelMapping table
archiveFunction.addToRolePolicy(
  new (await import('aws-cdk-lib/aws-iam')).PolicyStatement({
    actions: [
      'dynamodb:GetItem',
      'dynamodb:Query',
      'dynamodb:Scan',
      'dynamodb:UpdateItem',
      'dynamodb:PutItem',
    ],
    resources: [
      // Matches any ChannelMapping table in any environment
      'arn:aws:dynamodb:us-east-1:*:table/ChannelMapping-*',
    ],
  })
);

// Add EventBridge schedule (runs every hour)
const schedule = new (await import('aws-cdk-lib/aws-events')).Rule(
  backend.archiveMessages.stack,
  'ArchiveMessagesHourlySchedule',
  {
    schedule: (await import('aws-cdk-lib/aws-events')).Schedule.rate(
      (await import('aws-cdk-lib')).Duration.hours(1)
    ),
    description: 'Trigger archive-messages Lambda every hour',
  }
);

// Add Lambda as target for EventBridge rule
schedule.addTarget(
  new (await import('aws-cdk-lib/aws-events-targets')).LambdaFunction(archiveFunction)
);
```

**Alternative schedules:**

```typescript
// Every 15 minutes
Schedule.rate(Duration.minutes(15))

// Every 6 hours
Schedule.rate(Duration.hours(6))

// Daily at 2 AM UTC
Schedule.cron({ hour: '2', minute: '0' })

// Weekdays at 9 AM UTC
Schedule.cron({ hour: '9', minute: '0', weekDay: 'MON-FRI' })
```

---

## Template 5: Package.json Update (if needed)

**File:** `/amplify/functions/archive-messages/package.json`

Only create this if you need function-specific dependencies:

```json
{
  "name": "archive-messages",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.888.0",
    "@aws-sdk/lib-dynamodb": "^3.888.0",
    "@aws-sdk/client-secrets-manager": "^3.888.0"
  }
}
```

Then run:
```bash
cd amplify/functions/archive-messages
npm install
```

---

## Template 6: UI Component for Sync Status

**File:** `/src/app/channel-mappings/page.tsx` (additions)

Add a "Sync Now" button and status display:

```typescript
// Add to component state
const [syncing, setSyncing] = React.useState<string | null>(null);

// Add sync handler
const handleSyncNow = async (mappingId: string) => {
  setSyncing(mappingId);
  try {
    // Invoke Lambda directly (requires API Gateway integration)
    // OR trigger via a mutation that invokes Lambda
    // For now, this is a placeholder

    alert('Manual sync triggered! Check back in a few minutes.');
  } catch (error) {
    console.error('Sync failed:', error);
    alert('Sync failed. Check console for details.');
  } finally {
    setSyncing(null);
  }
};

// Add to mapping row actions
<IconButton
  size="small"
  onClick={() => handleSyncNow(mapping.id)}
  disabled={syncing === mapping.id}
  sx={{
    '&:hover': {
      backgroundColor: 'success.light',
      color: 'success.main'
    }
  }}
>
  {syncing === mapping.id ? (
    <CircularProgress size={20} />
  ) : (
    <i className="material-symbols-outlined" style={{ fontSize: '20px' }}>sync</i>
  )}
</IconButton>
```

---

## Template 7: Manual Trigger Mutation (Optional)

**File:** `/amplify/data/resource.ts` (additions)

Add a mutation to manually trigger archive:

```typescript
// Add custom mutation
triggerArchive: a
  .mutation()
  .arguments({
    channelMappingId: a.string().required(),
  })
  .returns(a.customType({
    success: a.boolean().required(),
    message: a.string().required(),
    messagesArchived: a.integer(),
  }))
  .handler(a.handler.function(archiveMessages))
  .authorization((allow) => [allow.authenticated()]),
```

**Corresponding handler update:**

```typescript
// In handler.ts, check event for manual trigger
export const handler = async (event: any) => {
  // Check if manually triggered vs scheduled
  const isManualTrigger = event.arguments?.channelMappingId;

  if (isManualTrigger) {
    // Process single mapping
    const mapping = await getChannelMappingById(event.arguments.channelMappingId);
    const result = await processChannelMapping(mapping, slackToken, githubToken);
    return {
      success: true,
      message: `Archived ${result.messagesArchived} messages`,
      messagesArchived: result.messagesArchived,
    };
  }

  // Otherwise, run scheduled job for all mappings
  // ... existing logic
};
```

---

## Template 8: CloudWatch Dashboard (Optional)

**File:** `/amplify/backend.ts` (additions)

Create a dashboard for monitoring:

```typescript
// Create CloudWatch Dashboard
const dashboard = new (await import('aws-cdk-lib/aws-cloudwatch')).Dashboard(
  backend.archiveMessages.stack,
  'ArchiveMessagesDashboard',
  {
    dashboardName: 'ChillTask-Archive-Messages',
  }
);

// Add widgets
dashboard.addWidgets(
  new (await import('aws-cdk-lib/aws-cloudwatch')).GraphWidget({
    title: 'Archive Function Invocations',
    left: [archiveFunction.metricInvocations()],
  }),
  new (await import('aws-cdk-lib/aws-cloudwatch')).GraphWidget({
    title: 'Archive Function Errors',
    left: [archiveFunction.metricErrors()],
  }),
  new (await import('aws-cdk-lib/aws-cloudwatch')).GraphWidget({
    title: 'Archive Function Duration',
    left: [archiveFunction.metricDuration()],
  })
);
```

---

## Template 9: Test Event for Manual Invocation

**Use in AWS Lambda Console → Test tab:**

```json
{
  "version": "0",
  "id": "test-event-id",
  "detail-type": "Scheduled Event",
  "source": "aws.events",
  "account": "123456789012",
  "time": "2024-01-01T00:00:00Z",
  "region": "us-east-1",
  "resources": [
    "arn:aws:events:us-east-1:123456789012:rule/ArchiveMessagesSchedule"
  ],
  "detail": {}
}
```

---

## Summary

These templates provide:
1. ✅ Complete Lambda handler with all features
2. ✅ Resource definition matching ChillTask patterns
3. ✅ Backend integration with permissions and scheduling
4. ✅ UI components for manual sync triggers
5. ✅ Testing and monitoring configurations

Copy-paste as needed and customize for your specific requirements!
