# Archive Messages Lambda - Step-by-Step Build Procedure

## Overview
This document provides detailed instructions for implementing the `archive-messages` Lambda function that syncs Slack conversations to GitHub repositories.

---

## Phase 1: Prerequisites Setup

### 1.1 Verify AWS Secrets Manager Secrets

**Required Secrets:**

1. **Slack Secret:** `chinchilla-ai-academy/slack`
   ```json
   {
     "SLACK_BOT_TOKEN": "xoxb-your-token-here",
     "bot_token": "xoxb-your-token-here"
   }
   ```

2. **GitHub Secret:** `github-token`
   ```json
   {
     "GITHUB_TOKEN": "ghp_your-token-here",
     "token": "ghp_your-token-here"
   }
   ```

**Verification Steps:**
```bash
# Check Slack secret exists
aws secretsmanager get-secret-value --secret-id chinchilla-ai-academy/slack --region us-east-1

# Check GitHub secret exists
aws secretsmanager get-secret-value --secret-id github-token --region us-east-1
```

### 1.2 Slack Bot Permissions Required

Ensure your Slack bot has these OAuth scopes:
- `channels:history` - Read public channel messages
- `channels:read` - List public channels
- `groups:history` - Read private channel messages (if needed)
- `groups:read` - List private channels (if needed)
- `users:read` - Get user information for message attribution
- `files:read` - Download shared files (if archiving attachments)

**How to verify:**
1. Go to https://api.slack.com/apps
2. Select your app
3. Navigate to "OAuth & Permissions"
4. Check "Scopes" → "Bot Token Scopes"

### 1.3 GitHub Token Permissions Required

GitHub Personal Access Token needs:
- `repo` - Full control of private repositories
  - `repo:status` - Access commit status
  - `repo_deployment` - Access deployment status
  - `public_repo` - Access public repositories
  - `repo:invite` - Access repository invitations
- `workflow` - Update GitHub Action workflows

**How to create:**
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with above scopes
3. Copy token and update AWS Secrets Manager

---

## Phase 2: Create Lambda Function

### 2.1 Create Function Folder

```bash
cd /Users/ricardo/Documents/Repos/CHI/ChillTask
mkdir -p amplify/functions/archive-messages
```

### 2.2 Create `resource.ts`

**File:** `/amplify/functions/archive-messages/resource.ts`

```typescript
import { defineFunction } from '@aws-amplify/backend';

export const archiveMessages = defineFunction({
  name: 'archive-messages',
  entry: './handler.ts',
  timeoutSeconds: 300, // 5 minutes for processing multiple messages
  memoryMB: 512, // More memory for processing large message batches
  environment: {
    SLACK_SECRET_NAME: 'chinchilla-ai-academy/slack',
    GITHUB_SECRET_NAME: 'github-token',
    GITHUB_ORG: 'ChinchillaEnterprises',
  },
});
```

**Key Differences from Other Functions:**
- Longer timeout (300s vs 30s) - processing many messages
- More memory (512MB vs default 128MB) - handling message transformations
- No query/mutation binding (scheduled function, not API-triggered)

### 2.3 Create `handler.ts`

**File:** `/amplify/functions/archive-messages/handler.ts`

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { EventBridgeEvent } from 'aws-lambda';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

interface SlackMessage {
  type: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  files?: any[];
}

interface ChannelMapping {
  slackChannelId: string;
  slackChannel: string;
  githubRepo: string;
  githubBranch: string;
  contextFolder: string;
  lastSync?: string;
}

export const handler = async (event: EventBridgeEvent<string, any>) => {
  console.log('Archive Messages Lambda triggered', { event });

  try {
    // 1. Fetch secrets
    const [slackSecrets, githubSecrets] = await Promise.all([
      getSecret(process.env.SLACK_SECRET_NAME!),
      getSecret(process.env.GITHUB_SECRET_NAME!),
    ]);

    const slackToken = slackSecrets.SLACK_BOT_TOKEN || slackSecrets.bot_token;
    const githubToken = githubSecrets.GITHUB_TOKEN || githubSecrets.token;

    if (!slackToken || !githubToken) {
      throw new Error('Missing required tokens');
    }

    // 2. Get active channel mappings from DynamoDB
    const mappings = await getActiveChannelMappings();
    console.log(`Found ${mappings.length} active channel mappings`);

    // 3. Process each mapping
    for (const mapping of mappings) {
      try {
        await processChannelMapping(mapping, slackToken, githubToken);
      } catch (error: any) {
        console.error(`Failed to process mapping ${mapping.slackChannel}:`, error);
        // Continue with other mappings
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Archive process completed',
        mappingsProcessed: mappings.length,
      }),
    };
  } catch (error: any) {
    console.error('Archive messages error:', error);
    throw error;
  }
};

async function getSecret(secretId: string): Promise<any> {
  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretId })
  );
  return JSON.parse(response.SecretString || '{}');
}

async function getActiveChannelMappings(): Promise<ChannelMapping[]> {
  // TODO: Query DynamoDB for ChannelMapping table
  // Filter by isActive = true
  // This will be implemented using AWS SDK DynamoDB client
  return [];
}

async function processChannelMapping(
  mapping: ChannelMapping,
  slackToken: string,
  githubToken: string
): Promise<void> {
  console.log(`Processing channel: ${mapping.slackChannel}`);

  // 1. Fetch messages from Slack since lastSync
  const messages = await fetchSlackMessages(
    mapping.slackChannelId,
    slackToken,
    mapping.lastSync
  );

  if (messages.length === 0) {
    console.log(`No new messages for ${mapping.slackChannel}`);
    return;
  }

  // 2. Transform messages to markdown
  const markdown = await transformMessagesToMarkdown(messages, slackToken);

  // 3. Commit to GitHub
  await commitToGitHub(
    mapping.githubRepo,
    mapping.githubBranch,
    mapping.contextFolder,
    mapping.slackChannel,
    markdown,
    githubToken
  );

  // 4. Update lastSync in DynamoDB
  await updateLastSync(mapping.slackChannelId, new Date().toISOString());

  console.log(`Successfully archived ${messages.length} messages from ${mapping.slackChannel}`);
}

async function fetchSlackMessages(
  channelId: string,
  token: string,
  since?: string
): Promise<SlackMessage[]> {
  const url = new URL('https://slack.com/api/conversations.history');
  url.searchParams.set('channel', channelId);
  url.searchParams.set('limit', '100');

  if (since) {
    // Convert ISO timestamp to Slack timestamp
    const slackTs = new Date(since).getTime() / 1000;
    url.searchParams.set('oldest', slackTs.toString());
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Slack API failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  return data.messages || [];
}

async function transformMessagesToMarkdown(
  messages: SlackMessage[],
  slackToken: string
): Promise<string> {
  // Sort messages chronologically (oldest first)
  const sorted = messages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));

  let markdown = `# Slack Conversation Archive\n\n`;
  markdown += `**Archived on:** ${new Date().toISOString()}\n\n`;
  markdown += `**Message Count:** ${sorted.length}\n\n`;
  markdown += `---\n\n`;

  for (const msg of sorted) {
    // Get user info
    const userName = await getUserName(msg.user, slackToken);
    const timestamp = new Date(parseFloat(msg.ts) * 1000).toLocaleString();

    markdown += `### ${userName} - ${timestamp}\n\n`;
    markdown += `${msg.text}\n\n`;

    if (msg.thread_ts && msg.thread_ts !== msg.ts) {
      markdown += `*[Thread Reply]*\n\n`;
    }

    if (msg.files && msg.files.length > 0) {
      markdown += `**Attachments:** ${msg.files.length} file(s)\n\n`;
    }

    markdown += `---\n\n`;
  }

  return markdown;
}

async function getUserName(userId: string, token: string): Promise<string> {
  try {
    const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return data.user?.real_name || data.user?.name || userId;
  } catch (error) {
    return userId; // Fallback to user ID
  }
}

async function commitToGitHub(
  repo: string,
  branch: string,
  folder: string,
  channelName: string,
  content: string,
  token: string
): Promise<void> {
  const org = process.env.GITHUB_ORG || 'ChinchillaEnterprises';
  const fileName = `${channelName}-${new Date().toISOString().split('T')[0]}.md`;
  const filePath = `${folder}/${fileName}`.replace('//', '/');

  // GitHub API endpoint for creating/updating files
  const url = `https://api.github.com/repos/${org}/${repo}/contents/${filePath}`;

  // Check if file exists
  let sha: string | undefined;
  try {
    const checkResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
      },
    });

    if (checkResponse.ok) {
      const existing = await checkResponse.json();
      sha = existing.sha;
    }
  } catch (error) {
    // File doesn't exist, will create new
  }

  // Create or update file
  const requestBody = {
    message: `Archive Slack messages from ${channelName}`,
    content: Buffer.from(content).toString('base64'),
    branch,
    ...(sha && { sha }), // Include sha if updating
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API failed: ${JSON.stringify(error)}`);
  }
}

async function updateLastSync(channelId: string, timestamp: string): Promise<void> {
  // TODO: Update DynamoDB ChannelMapping table
  // Set lastSync = timestamp for this channelId
  console.log(`Would update lastSync for ${channelId} to ${timestamp}`);
}
```

### 2.4 Install Required Dependencies

The function uses only built-in SDK clients already in the project:
- `@aws-sdk/client-secrets-manager` ✓ Already installed
- No additional dependencies needed (uses native `fetch`)

**If you need DynamoDB access later:**
```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

---

## Phase 3: Update Amplify Backend

### 3.1 Import Function in `backend.ts`

**File:** `/amplify/backend.ts`

Add import:
```typescript
import { archiveMessages } from './functions/archive-messages/resource.js';
```

Add to backend definition:
```typescript
const backend = defineBackend({
  auth,
  data,
  getSlackChannels,
  getGitHubRepos,
  archiveMessages, // Add this
});
```

### 3.2 Add IAM Permissions

**File:** `/amplify/backend.ts` (append after existing permissions)

```typescript
// Grant archive-messages function permissions
const archiveFunction = backend.archiveMessages.resources.lambda;

// Secrets Manager permissions
archiveFunction.addToRolePolicy(
  new (await import('aws-cdk-lib/aws-iam')).PolicyStatement({
    actions: ['secretsmanager:GetSecretValue'],
    resources: [
      'arn:aws:secretsmanager:us-east-1:*:secret:chinchilla-ai-academy/slack-*',
      'arn:aws:secretsmanager:us-east-1:*:secret:github-token-*',
    ],
  })
);

// DynamoDB permissions (to read ChannelMapping table)
archiveFunction.addToRolePolicy(
  new (await import('aws-cdk-lib/aws-iam')).PolicyStatement({
    actions: [
      'dynamodb:GetItem',
      'dynamodb:Query',
      'dynamodb:Scan',
      'dynamodb:UpdateItem',
    ],
    resources: [
      'arn:aws:dynamodb:us-east-1:*:table/ChannelMapping-*',
    ],
  })
);
```

**Note:** DynamoDB table name follows pattern `ChannelMapping-{env}-{hash}`, wildcard catches all.

---

## Phase 4: EventBridge Scheduler Setup

### 4.1 Add EventBridge Schedule Using CDK

**File:** `/amplify/backend.ts` (append)

```typescript
// Schedule archive-messages to run every hour
const schedule = new (await import('aws-cdk-lib/aws-events')).Rule(
  backend.archiveMessages.stack,
  'ArchiveMessagesSchedule',
  {
    schedule: (await import('aws-cdk-lib/aws-events')).Schedule.rate(
      (await import('aws-cdk-lib')).Duration.hours(1)
    ),
    targets: [
      new (await import('aws-cdk-lib/aws-events-targets')).LambdaFunction(archiveFunction),
    ],
  }
);
```

**Alternative Schedules:**
- Every 15 minutes: `Duration.minutes(15)`
- Every 6 hours: `Duration.hours(6)`
- Daily at midnight: `Schedule.cron({ hour: '0', minute: '0' })`

### 4.2 Grant EventBridge Invoke Permission

This is automatically granted by the `LambdaFunction` target, but you can verify with:

```typescript
archiveFunction.grantInvoke(
  new (await import('aws-cdk-lib/aws-iam')).ServicePrincipal('events.amazonaws.com')
);
```

---

## Phase 5: Update Data Schema (Optional for Now)

The `ChannelMapping` model already has:
- `lastSync: a.string()` - Timestamp of last successful sync
- `messageCount: a.integer()` - Total messages archived

No immediate schema changes needed. Future enhancements could add:

```typescript
ChannelMapping: a
  .model({
    // ... existing fields
    lastSyncStatus: a.enum(['success', 'error', 'pending']),
    lastSyncError: a.string(),
    totalSyncs: a.integer(),
    nextScheduledSync: a.datetime(),
  })
```

---

## Phase 6: Testing

### 6.1 Local Testing (Limited)

Amplify Gen 2 doesn't support local Lambda invocation. Use sandbox deployment.

### 6.2 Sandbox Deployment Testing

```bash
# Deploy to sandbox
npx ampx sandbox

# Watch logs
# CloudWatch Logs → /aws/lambda/archive-messages-{sandbox-id}
```

### 6.3 Manual Invocation (AWS Console)

1. Go to AWS Lambda Console
2. Find function: `archive-messages-{env}`
3. Click "Test" tab
4. Create test event:
   ```json
   {
     "source": "aws.events",
     "detail-type": "Scheduled Event"
   }
   ```
5. Click "Test" - watch CloudWatch logs

### 6.4 Manual Invocation (AWS CLI)

```bash
aws lambda invoke \
  --function-name archive-messages-sandbox-{id} \
  --payload '{}' \
  response.json

cat response.json
```

### 6.5 Verify GitHub Commit

1. Go to GitHub repository
2. Navigate to `{contextFolder}` (e.g., `/context/`)
3. Look for markdown file: `{channel-name}-{date}.md`
4. Check commit history

---

## Phase 7: Monitoring and Debugging

### 7.1 CloudWatch Logs

**Log Group:** `/aws/lambda/archive-messages-{env}`

**Key Log Patterns:**
- `Archive Messages Lambda triggered` - Function started
- `Found X active channel mappings` - Mapping count
- `Processing channel: {name}` - Per-channel processing
- `Successfully archived X messages` - Success confirmation
- `Failed to process mapping` - Error for specific channel

### 7.2 CloudWatch Metrics

Monitor:
- **Invocations** - Should match schedule (e.g., 24/day for hourly)
- **Errors** - Should be 0 or near 0
- **Duration** - Should be under timeout (300s)
- **Throttles** - Should be 0

### 7.3 Alarms (Optional)

Create CloudWatch Alarm for errors:

```typescript
new (await import('aws-cdk-lib/aws-cloudwatch')).Alarm(
  backend.archiveMessages.stack,
  'ArchiveMessagesErrorAlarm',
  {
    metric: archiveFunction.metricErrors(),
    threshold: 1,
    evaluationPeriods: 1,
  }
);
```

---

## Phase 8: Production Deployment

### 8.1 Deploy to Production

```bash
# Commit all changes
git add .
git commit -m "Add archive-messages Lambda function"
git push

# Deploy via Amplify hosting (if configured)
# Or deploy manually:
npx ampx pipeline-deploy --branch main
```

### 8.2 Verify Deployment

1. Check Lambda function exists
2. Check EventBridge rule is active
3. Check IAM permissions are correct
4. Monitor first scheduled run
5. Verify GitHub commits appear

---

## Common Issues and Solutions

### Issue 1: "Missing required tokens"

**Solution:** Verify secrets in AWS Secrets Manager:
```bash
aws secretsmanager get-secret-value --secret-id chinchilla-ai-academy/slack
aws secretsmanager get-secret-value --secret-id github-token
```

### Issue 2: "Access Denied" errors

**Solution:** Check IAM permissions in `backend.ts`:
- Secrets Manager ARNs match secret names
- DynamoDB ARN matches table name pattern
- EventBridge has invoke permission

### Issue 3: Function timeout

**Solution:** Increase timeout in `resource.ts`:
```typescript
timeoutSeconds: 600, // 10 minutes
```

### Issue 4: "Channel not found" Slack error

**Solution:**
- Verify bot is invited to channel
- Check channel ID is correct in ChannelMapping
- Ensure bot has `channels:history` scope

### Issue 5: GitHub API rate limiting

**Solution:**
- Reduce schedule frequency
- Batch commits (one file with all channels)
- Use GitHub App instead of PAT (higher rate limits)

---

## Next Steps

After basic implementation:

1. **Add DynamoDB integration** - Read/write ChannelMapping table
2. **Add error tracking** - Store sync errors in database
3. **Add UI for sync status** - Show last sync time, error messages
4. **Add manual trigger button** - "Sync Now" in UI
5. **Add attachment archiving** - Download and commit Slack files
6. **Add thread support** - Archive threaded conversations
7. **Add incremental sync** - Only fetch new messages
8. **Add retry logic** - Exponential backoff for failures

---

## Summary Checklist

- [ ] Verify AWS Secrets Manager secrets exist
- [ ] Create `amplify/functions/archive-messages/` folder
- [ ] Create `resource.ts` with function definition
- [ ] Create `handler.ts` with implementation
- [ ] Update `amplify/backend.ts` with import and permissions
- [ ] Add EventBridge schedule in `backend.ts`
- [ ] Deploy to sandbox: `npx ampx sandbox`
- [ ] Test manual invocation
- [ ] Verify GitHub commits
- [ ] Monitor CloudWatch logs
- [ ] Deploy to production

**Estimated Time:**
- Initial setup: 1-2 hours
- Testing and debugging: 2-3 hours
- Full DynamoDB integration: 2-4 hours
- Total: 5-9 hours for complete implementation
