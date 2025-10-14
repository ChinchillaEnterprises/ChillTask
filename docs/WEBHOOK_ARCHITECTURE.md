# Slack Event Subscriptions Webhook Architecture

## Overview
ChillTask uses AWS Lambda and API Gateway to receive Slack events in real-time and archive conversations to GitHub.

## Webhook URL
```
https://cxd4hozpld.execute-api.us-east-1.amazonaws.com/slack/events
```

## High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                         SLACK WORKSPACE                               │
│                                                                       │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               │
│  │  #general   │   │  #support   │   │ #dev-team   │               │
│  │             │   │             │   │             │               │
│  │ User sends  │   │ Bot invited │   │ Bot invited │               │
│  │ message     │   │ to channel  │   │ to channel  │               │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘               │
│         │                 │                 │                       │
│         └─────────────────┴─────────────────┘                       │
│                           │                                          │
│                           ▼                                          │
│                  ┌────────────────┐                                  │
│                  │  Slack Events  │                                  │
│                  │      API       │                                  │
│                  └────────┬───────┘                                  │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
                           │ POST /slack/events
                           │ Content-Type: application/json
                           │ {
                           │   "type": "event_callback",
                           │   "event": {
                           │     "type": "message",
                           │     "channel": "C123...",
                           │     "user": "U456...",
                           │     "text": "Hello!",
                           │     "ts": "1728504320.123456"
                           │   }
                           │ }
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                          AWS CLOUD                                  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │              API Gateway HTTP API                         │    │
│  │                                                            │    │
│  │  • Public endpoint (no auth required for Slack)          │    │
│  │  • Route: POST /slack/events                             │    │
│  │  • Invokes Lambda synchronously                          │    │
│  │  • Returns response to Slack immediately                 │    │
│  └────────────────────────┬──────────────────────────────────┘    │
│                           │                                        │
│                           ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐     │
│  │         Lambda Function: slack-webhook                   │     │
│  │                                                           │     │
│  │  1. Parse & validate incoming event                      │     │
│  │  2. Handle URL verification challenge                    │     │
│  │  3. Process message events:                              │     │
│  │     ┌─────────────────────────────────────────┐          │     │
│  │     │ a) Query DynamoDB for channel mapping  │          │     │
│  │     │ b) Get secrets (Slack + GitHub tokens) │          │     │
│  │     │ c) Fetch user info from Slack API      │          │     │
│  │     │ d) Fetch thread messages (if thread)   │          │     │
│  │     │ e) Format as Markdown                  │          │     │
│  │     │ f) Commit to GitHub                    │          │     │
│  │     │ g) Update mapping stats in DynamoDB    │          │     │
│  │     └─────────────────────────────────────────┘          │     │
│  │  4. Return 200 OK to Slack                               │     │
│  │                                                           │     │
│  │  Configuration:                                          │     │
│  │  • Runtime: Node.js (managed by Amplify)                │     │
│  │  • Timeout: 60 seconds                                  │     │
│  │  • Memory: Default (128 MB)                             │     │
│  │  • Environment Variables:                               │     │
│  │    - SLACK_SECRET_NAME                                  │     │
│  │    - GITHUB_SECRET_NAME                                 │     │
│  │    - Amplify Data config (auto-injected)               │     │
│  └────┬────────┬─────────┬──────────┬──────────┬───────────┘     │
│       │        │         │          │          │                 │
│       │        │         │          │          │                 │
│  ┌────▼───┐ ┌─▼──────┐ ┌▼────────┐ ┌▼────────┐ ┌▼──────────┐   │
│  │Secrets │ │DynamoDB│ │CloudWatch│ │ Slack   │ │  GitHub   │   │
│  │Manager │ │        │ │  Logs    │ │   API   │ │    API    │   │
│  │        │ │        │ │          │ │         │ │           │   │
│  │• Slack │ │Channel │ │Structured│ │Get user │ │Commit file│   │
│  │  token │ │Mapping │ │  JSON    │ │info +   │ │to repo    │   │
│  │• GitHub│ │records │ │  logs    │ │threads  │ │           │   │
│  │  token │ │        │ │          │ │         │ │           │   │
│  └────────┘ └────────┘ └──────────┘ └─────────┘ └───────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
                                      │
                                      │
                                      ▼
                        ┌──────────────────────────┐
                        │   GitHub Repository      │
                        │                          │
                        │  context/                │
                        │    slackconversation/    │
                        │      2025-10-09-         │
                        │      hello-team.md       │
                        └──────────────────────────┘
```

## Request Flow

### 1. Slack Sends Event
```http
POST /slack/events HTTP/1.1
Host: cxd4hozpld.execute-api.us-east-1.amazonaws.com
Content-Type: application/json

{
  "type": "event_callback",
  "event": {
    "type": "message",
    "channel": "C1234567890",
    "user": "U9876543210",
    "text": "Hello, team! Let's discuss the new feature.",
    "ts": "1728504320.123456",
    "thread_ts": null
  }
}
```

### 2. Lambda Processes Event

#### Step 1: Validate Input
- Parse JSON body
- Check event type
- Validate required fields
- Return 400 if invalid

#### Step 2: Handle URL Verification (First Time Setup)
```javascript
if (body.type === 'url_verification') {
  return {
    statusCode: 200,
    body: JSON.stringify({ challenge: body.challenge })
  };
}
```

#### Step 3: Query Channel Mapping
```javascript
const mapping = await client.models.ChannelMapping.list({
  filter: {
    slackChannelId: { eq: channelId },
    isActive: { eq: true }
  }
});
```

**DynamoDB Query Result**:
```json
{
  "id": "abc-123",
  "slackChannel": "#dev-team",
  "slackChannelId": "C1234567890",
  "githubRepo": "owner/repo",
  "githubUrl": "owner/repo",
  "githubBranch": "main",
  "contextFolder": "context/slackconversation",
  "isActive": true,
  "messageCount": 42,
  "lastSync": "2025-10-09T20:00:00Z"
}
```

#### Step 4: Fetch Secrets
```javascript
// Slack Bot Token
const slackSecrets = await secretsManager.getSecretValue({
  SecretId: 'chinchilla-ai-academy/slack'
});
// Returns: { bot_token: "xoxb-..." }

// GitHub Token
const githubSecrets = await secretsManager.getSecretValue({
  SecretId: 'github-token'
});
// Returns: { GITHUB_TOKEN: "ghp_..." }
```

#### Step 5: Fetch User Info from Slack
```javascript
const response = await fetch(
  `https://slack.com/api/users.info?user=U9876543210`,
  {
    headers: {
      Authorization: `Bearer xoxb-...`
    }
  }
);
```

**Slack API Response**:
```json
{
  "ok": true,
  "user": {
    "id": "U9876543210",
    "name": "john.doe",
    "real_name": "John Doe",
    "profile": {
      "email": "john@example.com"
    }
  }
}
```

#### Step 6: Fetch Thread Messages (If Thread)
```javascript
if (thread_ts) {
  const response = await fetch(
    `https://slack.com/api/conversations.replies?channel=C1234567890&ts=${thread_ts}`,
    {
      headers: {
        Authorization: `Bearer xoxb-...`
      }
    }
  );
}
```

#### Step 7: Format as Markdown
```markdown
# Slack Conversation

**Date:** Oct 9, 2025, 08:05 PM

---

### John Doe
Hello, team! Let's discuss the new feature.

#### Thread Replies:

**Jane Smith** - 08:06 PM:
Great idea! I have some thoughts on the implementation.

**Bob Johnson** - 08:07 PM:
+1, let's schedule a meeting.
```

#### Step 8: Commit to GitHub
```javascript
const url = `https://api.github.com/repos/owner/repo/contents/context/slackconversation/2025-10-09-hello-team-lets-1728504320.123456.md`;

await fetch(url, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ghp_...`,
    Accept: 'application/vnd.github+json'
  },
  body: JSON.stringify({
    message: 'Add Slack conversation from John Doe',
    content: Buffer.from(markdown).toString('base64'),
    branch: 'main'
  })
});
```

**GitHub API Response**:
```json
{
  "commit": {
    "sha": "7fd1a60b01f91b314f59955a4e4d4e80d8edf11d",
    "message": "Add Slack conversation from John Doe"
  },
  "content": {
    "name": "2025-10-09-hello-team-lets-1728504320.123456.md",
    "path": "context/slackconversation/2025-10-09-hello-team-lets-1728504320.123456.md",
    "sha": "95b966ae1c166bd92f8ae7d1c313e738c731dfc0",
    "size": 234,
    "url": "https://api.github.com/repos/owner/repo/contents/context/slackconversation/2025-10-09-hello-team-lets-1728504320.123456.md"
  }
}
```

#### Step 9: Update Mapping Stats
```javascript
await client.models.ChannelMapping.update({
  id: 'abc-123',
  lastSync: new Date().toISOString(),
  messageCount: 43  // Incremented from 42
});
```

#### Step 10: Return Response to Slack
```javascript
return {
  statusCode: 200,
  body: JSON.stringify({ ok: true })
};
```

### 3. Slack Receives Response
- Status 200: Event acknowledged
- Slack marks event as delivered
- No further retries

## Error Handling

### Retry Logic
The Lambda implements exponential backoff for transient errors:

```
Attempt 1: Immediate
  ↓ (fail)
Attempt 2: Wait 1 second
  ↓ (fail)
Attempt 3: Wait 2 seconds
  ↓ (fail)
Attempt 4: Wait 4 seconds
  ↓ (success)
```

### Error Responses

| Error Type | Status | Retry? | Example |
|------------|--------|--------|---------|
| Invalid JSON | 400 | No | Malformed request body |
| Missing fields | 400 | No | Event missing channel ID |
| Slack API error | 500 | Yes | Token expired, network error |
| GitHub API error | 500 | Yes | Repository not found |
| DynamoDB error | 500 | Yes | Throttling, network error |
| Lambda timeout | 500 | Yes | Operation took > 60 seconds |

### Logging
All operations are logged to CloudWatch in structured JSON format:

```json
{
  "level": "INFO",
  "timestamp": "2025-10-09T20:05:23.456Z",
  "message": "Message processed successfully",
  "channelId": "C1234567890",
  "processingTimeMs": 1234
}
```

```json
{
  "level": "ERROR",
  "timestamp": "2025-10-09T20:05:23.456Z",
  "message": "Error processing Slack message",
  "error": "GitHub API error: 401 - Bad credentials",
  "errorType": "Error",
  "stack": "Error: GitHub API error...",
  "functionName": "slack-webhook-handler",
  "eventType": "message",
  "channelId": "C1234567890",
  "userId": "U9876543210",
  "timestamp": "1728504320.123456",
  "processingTimeMs": 2345
}
```

## Security

### Authentication Flow
```
Slack → API Gateway → Lambda → Secrets Manager → External APIs
  ↓                      ↓            ↓
  No auth          No auth        IAM role
  required        (public)       permissions
```

### IAM Permissions
The Lambda execution role has:

```yaml
Permissions:
  - secretsmanager:GetSecretValue
    Resources:
      - arn:aws:secretsmanager:us-east-1:*:secret:chinchilla-ai-academy/slack-*
      - arn:aws:secretsmanager:us-east-1:*:secret:github-token-*

  - dynamodb:GetItem
  - dynamodb:PutItem
  - dynamodb:Query
  - dynamodb:UpdateItem
    Resources:
      - [Amplify Data managed DynamoDB table]

  - logs:CreateLogGroup
  - logs:CreateLogStream
  - logs:PutLogEvents
    Resources:
      - /aws/lambda/slack-webhook
```

### Secret Storage
```
┌──────────────────────────────────┐
│   AWS Secrets Manager            │
│                                  │
│  chinchilla-ai-academy/slack     │
│  {                               │
│    "bot_token": "xoxb-..."       │
│  }                               │
│                                  │
│  github-token                    │
│  {                               │
│    "GITHUB_TOKEN": "ghp_..."     │
│  }                               │
│                                  │
│  Encrypted at rest              │
│  Encrypted in transit           │
│  Automatic rotation supported   │
└──────────────────────────────────┘
```

## Performance Characteristics

### Latency
- **API Gateway**: ~10ms
- **Lambda Cold Start**: ~1-2 seconds (first invocation)
- **Lambda Warm**: ~50ms initialization
- **DynamoDB Query**: ~10-50ms
- **Secrets Manager**: ~100-200ms (cached for 5 minutes)
- **Slack API**: ~200-500ms per call
- **GitHub API**: ~300-800ms per call
- **Total (warm)**: ~1-3 seconds
- **Total (cold)**: ~3-5 seconds

### Throughput
- **Concurrent executions**: Default 10 (can increase)
- **Max payload size**: 6 MB (API Gateway limit)
- **DynamoDB capacity**: On-demand (auto-scales)
- **Slack rate limit**: 1 req/sec per token
- **GitHub rate limit**: 5,000 req/hour

### Cost Estimate (Monthly)
Assuming 10,000 messages/month:

- **Lambda invocations**: 10,000 × $0.0000002 = $0.002
- **Lambda duration**: 10,000 × 3s × $0.0000166667 = $0.50
- **API Gateway**: 10,000 × $0.000001 = $0.01
- **DynamoDB**: On-demand reads/writes ≈ $0.25
- **CloudWatch Logs**: 1 GB ≈ $0.50
- **Secrets Manager**: 2 secrets × $0.40 = $0.80
- **Total**: ~$2.08/month

## Monitoring

### Key Metrics
1. **Lambda Invocations**: Number of webhook calls
2. **Lambda Errors**: Failed executions
3. **Lambda Duration**: Processing time
4. **Lambda Throttles**: Concurrent limit reached
5. **API Gateway 4xx**: Client errors
6. **API Gateway 5xx**: Server errors
7. **DynamoDB Read/Write**: Database operations
8. **CloudWatch Logs**: Log volume

### Alarms (if configured)
- Error rate > 5 in 5 minutes
- Throttle count > 3 in 5 minutes
- Invocation count > 100 in 5 minutes
- Average duration > 20 seconds
- DLQ messages > 0

## Maintenance

### Regular Tasks
- [ ] Review CloudWatch logs weekly
- [ ] Monitor error rates and alarms
- [ ] Rotate Slack bot token quarterly
- [ ] Rotate GitHub token quarterly
- [ ] Review and archive old conversation files
- [ ] Check Lambda memory usage and optimize if needed
- [ ] Review DynamoDB capacity metrics

### Deployment Updates
When deploying changes:
1. Update Lambda code in `amplify/functions/slack-webhook/handler.ts`
2. Run `npx ampx sandbox` to test locally
3. Deploy to production: `npx ampx pipeline-deploy --branch main`
4. Monitor CloudWatch for errors
5. Test with real Slack message

## Troubleshooting Guide

See [SLACK_EVENTS_SETUP.md](./SLACK_EVENTS_SETUP.md) for detailed troubleshooting steps.

Quick checklist:
- [ ] Webhook URL is correct in Slack
- [ ] Event subscriptions are enabled
- [ ] Bot is invited to channel
- [ ] Channel mapping exists and is active
- [ ] Secrets exist in Secrets Manager
- [ ] Lambda has IAM permissions
- [ ] CloudWatch logs show no errors

## References

- [Main Setup Guide](./SLACK_EVENTS_SETUP.md)
- [Quick Reference](./SLACK_QUICK_REFERENCE.md)
- [Testing Checklist](./TESTING_CHECKLIST.md)
- [Slack Events API Documentation](https://api.slack.com/events-api)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
