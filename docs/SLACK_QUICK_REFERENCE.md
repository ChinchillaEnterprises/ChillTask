# Slack Event Subscriptions Quick Reference

## Webhook URL
```
https://cxd4hozpld.execute-api.us-east-1.amazonaws.com/slack/events
```

## Required Bot Events
Subscribe to these events in Slack App settings > Event Subscriptions:

- `message.channels` - Messages in public channels
- `message.groups` - Messages in private channels

## Required OAuth Scopes
Add these scopes in Slack App settings > OAuth & Permissions:

- `channels:history` - View messages in public channels
- `groups:history` - View messages in private channels
- `users:read` - View user information
- `conversations.replies:read` - View thread replies
- `channels:read` - View basic channel information
- `groups:read` - View basic private channel information

## Secret Names in AWS Secrets Manager

### Slack Bot Token
- **Secret Name**: `chinchilla-ai-academy/slack`
- **Format**: `{"bot_token":"xoxb-YOUR-TOKEN-HERE"}`
- **Token starts with**: `xoxb-`

### GitHub Personal Access Token
- **Secret Name**: `github-token`
- **Format**: `{"GITHUB_TOKEN":"ghp_YOUR-TOKEN-HERE"}`
- **Token starts with**: `ghp_` or `github_pat_`
- **Required scopes**: `repo` (for private repos) or `public_repo` (for public repos)

## Testing the Webhook

### 1. Test URL Verification
```bash
curl -X POST https://cxd4hozpld.execute-api.us-east-1.amazonaws.com/slack/events \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test_123"}'
```

Expected response:
```json
{"challenge":"test_123"}
```

### 2. Test End-to-End Flow
1. Create a channel mapping in ChillTask UI
2. Invite bot to the Slack channel: `/invite @YourBotName`
3. Send a test message in the channel
4. Check GitHub repo in `context/slackconversation/` folder

## Architecture Overview

```
┌─────────────────┐
│  Slack Channel  │
└────────┬────────┘
         │ Event
         ▼
┌─────────────────────────┐
│  Slack Events API       │
│  (Sends POST request)   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  API Gateway HTTP API               │
│  /slack/events                      │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Lambda: slack-webhook              │
│  • Parse & validate event           │
│  • Handle URL verification          │
│  • Process message events           │
└────┬──────────┬──────────┬──────────┘
     │          │          │
     │          │          ▼
     │          │     ┌──────────────────┐
     │          │     │  Secrets Manager │
     │          │     │  • Slack token   │
     │          │     │  • GitHub token  │
     │          │     └──────────────────┘
     │          │
     │          ▼
     │     ┌──────────────────────┐
     │     │  DynamoDB            │
     │     │  (via Amplify Data)  │
     │     │  • Channel mappings  │
     │     └──────────────────────┘
     │
     ▼
┌────────────────────────────┐
│  External APIs             │
│  • Slack API (user info)   │
│  • GitHub API (commit)     │
└────────────────────────────┘
```

## Lambda Configuration

- **Function Name**: `slack-webhook`
- **Runtime**: Node.js (managed by Amplify)
- **Timeout**: 60 seconds
- **Memory**: Default (managed by Amplify)
- **Environment Variables**:
  - `SLACK_SECRET_NAME`: `chinchilla-ai-academy/slack`
  - `GITHUB_SECRET_NAME`: `github-token`
  - Amplify Data config (auto-injected)

## IAM Permissions

The Lambda has:
- Read access to Secrets Manager (Slack + GitHub secrets)
- DynamoDB access via Amplify Data authorization (IAM auth mode)
- Internet access to call Slack and GitHub APIs

## File Naming Convention

Messages are saved to GitHub with this pattern:
```
context/slackconversation/YYYY-MM-DD-message-preview-timestamp.md
```

Example:
```
context/slackconversation/2025-10-09-hello-team-lets-discuss-1728504320.123456.md
```

## Common Response Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Event processed or acknowledged |
| 400 | Bad Request | Invalid event data (non-retryable) |
| 500 | Server Error | Temporary error (Slack will retry) |

## Monitoring

### CloudWatch Logs
```bash
# View real-time logs
aws logs tail /aws/lambda/slack-webhook --follow --region us-east-1

# Search for errors
aws logs filter-events \
  --log-group-name /aws/lambda/slack-webhook \
  --filter-pattern "ERROR" \
  --region us-east-1
```

### Key Metrics to Monitor
- Lambda invocations
- Lambda errors
- Lambda duration (should be < 30s)
- API Gateway 4xx/5xx errors

## Troubleshooting Commands

### Verify Slack Secret
```bash
aws secretsmanager get-secret-value \
  --secret-id chinchilla-ai-academy/slack \
  --region us-east-1 \
  | jq -r .SecretString
```

### Verify GitHub Secret
```bash
aws secretsmanager get-secret-value \
  --secret-id github-token \
  --region us-east-1 \
  | jq -r .SecretString
```

### Test GitHub Token
```bash
# Get your token
TOKEN=$(aws secretsmanager get-secret-value --secret-id github-token --region us-east-1 | jq -r '.SecretString | fromjson | .GITHUB_TOKEN')

# Test it
curl -H "Authorization: Bearer $TOKEN" https://api.github.com/user
```

### Test Slack Token
```bash
# Get your token
TOKEN=$(aws secretsmanager get-secret-value --secret-id chinchilla-ai-academy/slack --region us-east-1 | jq -r '.SecretString | fromjson | .bot_token')

# Test it
curl -H "Authorization: Bearer $TOKEN" https://slack.com/api/auth.test
```

## Event Payload Examples

### URL Verification Challenge
```json
{
  "type": "url_verification",
  "challenge": "3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P"
}
```

### Message Event
```json
{
  "type": "event_callback",
  "event": {
    "type": "message",
    "channel": "C1234567890",
    "user": "U1234567890",
    "text": "Hello, world!",
    "ts": "1728504320.123456",
    "thread_ts": "1728504000.000000"
  }
}
```

## Rate Limits

### Slack API
- Standard: 1+ req/sec per token
- Burst: 100 req/min
- Current usage: 1-2 calls per message (user info + optional thread)

### GitHub API
- Authenticated: 5,000 req/hour
- Current usage: 1-2 calls per message (check + create/update file)

### Recommendations
- High-volume channels (>100 msg/hour): Consider batching
- Monitor Lambda concurrency to avoid Slack rate limits
- Implement exponential backoff (already done in handler)

## Security Best Practices

1. **Webhook Validation**: Consider implementing Slack request signing verification
2. **Token Rotation**: Regularly rotate Slack and GitHub tokens
3. **Least Privilege**: Only grant required OAuth scopes
4. **Audit Logs**: Monitor CloudWatch for suspicious activity
5. **Encryption**: Secrets are encrypted at rest in Secrets Manager

## Next Steps Checklist

- [ ] Configure Event Subscriptions in Slack
- [ ] Add required OAuth scopes
- [ ] Reinstall Slack app
- [ ] Store bot token in Secrets Manager
- [ ] Store GitHub token in Secrets Manager
- [ ] Create channel mapping in ChillTask
- [ ] Invite bot to channel
- [ ] Send test message
- [ ] Verify file appears in GitHub
- [ ] Set up CloudWatch alarms for errors
