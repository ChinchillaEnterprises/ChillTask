# Slack Event Subscriptions Setup Guide

## Overview
This guide will walk you through configuring Slack Event Subscriptions to enable ChillTask to automatically archive Slack conversations to GitHub.

## Prerequisites
- Admin access to your Slack workspace
- A Slack App created (or permission to create one)
- ChillTask application deployed and running

## Webhook URL
Your deployed webhook endpoint is:
```
https://cxd4hozpld.execute-api.us-east-1.amazonaws.com/slack/events
```

## Step-by-Step Setup Instructions

### 1. Access Your Slack App Settings

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Sign in to your Slack workspace
3. Select your existing Slack app (or create a new one if needed)
   - If creating a new app:
     - Click "Create New App"
     - Choose "From scratch"
     - Enter an App Name (e.g., "ChillTask")
     - Select your workspace
     - Click "Create App"

### 2. Configure Event Subscriptions

1. In the left sidebar of your app settings, click on **Event Subscriptions**
2. Toggle **Enable Events** to ON
3. In the **Request URL** field, enter:
   ```
   https://cxd4hozpld.execute-api.us-east-1.amazonaws.com/slack/events
   ```
4. Wait for Slack to verify the URL
   - You should see a green "Verified" checkmark
   - If verification fails, check the [Troubleshooting](#troubleshooting) section below

### 3. Subscribe to Bot Events

Scroll down to the **Subscribe to bot events** section and add the following event types:

#### Required Events:
- **message.channels** - Listen for messages posted to public channels
- **message.groups** - Listen for messages posted to private channels

#### Optional Events (recommended):
- **message.im** - Listen for direct messages
- **message.mpim** - Listen for messages in group DMs

#### How to add events:
1. Click **Add Bot User Event**
2. Search for and select each event type listed above
3. Repeat for all required events

### 4. Save Changes

1. Scroll to the bottom of the page
2. Click **Save Changes**
3. You may see a banner at the top saying "Please reinstall your app for changes to take effect"
   - If you see this banner, click **reinstall your app** or go to **Install App** in the left sidebar
   - Click **Reinstall to Workspace**
   - Review the permissions and click **Allow**

### 5. Configure OAuth Scopes (if not already done)

1. In the left sidebar, click on **OAuth & Permissions**
2. Scroll down to **Bot Token Scopes**
3. Ensure the following scopes are added:
   - `channels:history` - View messages in public channels
   - `groups:history` - View messages in private channels
   - `users:read` - View user information
   - `conversations.replies:read` - View thread replies
   - `channels:read` - View basic channel information
   - `groups:read` - View basic private channel information

4. If you added any new scopes, you'll need to reinstall the app (see step 4 above)

### 6. Get Your Bot Token

1. Still in **OAuth & Permissions**, locate the **Bot User OAuth Token**
2. It should start with `xoxb-`
3. Copy this token - you'll need to store it in AWS Secrets Manager

### 7. Store Credentials in AWS Secrets Manager

#### Slack Bot Token:
```bash
aws secretsmanager update-secret \
  --secret-id chinchilla-ai-academy/slack \
  --secret-string '{"bot_token":"xoxb-YOUR-TOKEN-HERE"}' \
  --region us-east-1
```

Or create a new secret if it doesn't exist:
```bash
aws secretsmanager create-secret \
  --name chinchilla-ai-academy/slack \
  --description "Slack Bot Token for ChillTask" \
  --secret-string '{"bot_token":"xoxb-YOUR-TOKEN-HERE"}' \
  --region us-east-1
```

#### GitHub Token (if not already stored):
```bash
aws secretsmanager create-secret \
  --name github-token \
  --description "GitHub Personal Access Token for ChillTask" \
  --secret-string '{"GITHUB_TOKEN":"ghp_YOUR-TOKEN-HERE"}' \
  --region us-east-1
```

### 8. Invite the Bot to Channels

For each Slack channel you want to monitor:

1. Go to the channel in Slack
2. Type `/invite @YourBotName` (replace with your actual bot name)
3. The bot must be in the channel to receive events

## Verification

### Test the Webhook
The webhook has been tested and verified to work correctly with Slack's URL verification challenge.

Test command (already verified):
```bash
curl -X POST https://cxd4hozpld.execute-api.us-east-1.amazonaws.com/slack/events \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test_challenge_123"}'
```

Expected response:
```json
{"challenge":"test_challenge_123"}
```

### Test End-to-End Flow

1. Create a channel mapping in ChillTask:
   - Go to your ChillTask application
   - Navigate to Channel Mappings page
   - Create a new mapping linking a Slack channel to a GitHub repository

2. Send a test message in the mapped Slack channel

3. Check your GitHub repository:
   - Look in the `context/slackconversation/` folder
   - You should see a new Markdown file with the conversation
   - File name format: `YYYY-MM-DD-message-preview-timestamp.md`

## What Events Are Captured

The webhook currently processes:

- **Regular messages** in channels
- **Thread replies** (entire thread is captured)
- **User information** (real name or username)
- **Timestamps** for all messages

Messages are formatted as Markdown and committed to GitHub with:
- Message content
- User name
- Timestamp
- Thread replies (if applicable)

## Event Flow

```
Slack Channel Message
    ↓
Slack Event API
    ↓
Webhook Endpoint (API Gateway)
    ↓
Lambda Function (slack-webhook)
    ↓
┌─────────────┬───────────────┬──────────────┐
│ Query       │ Fetch         │ Commit       │
│ DynamoDB    │ Slack API     │ to GitHub    │
│ (mapping)   │ (user/thread) │ (markdown)   │
└─────────────┴───────────────┴──────────────┘
```

## Architecture Details

### Components:
- **API Gateway HTTP API**: Public endpoint for Slack events
- **Lambda Function**: `slack-webhook` (Node.js)
- **DynamoDB**: Stores channel mappings via Amplify Data
- **Secrets Manager**: Stores Slack Bot Token and GitHub Token
- **GitHub API**: Commits conversation files

### IAM Permissions:
The webhook Lambda has permissions to:
- Read from Secrets Manager (Slack and GitHub tokens)
- Query DynamoDB (via Amplify Data with IAM auth)
- Access the internet (to call Slack and GitHub APIs)

### Environment Variables:
The Lambda automatically receives:
- `SLACK_SECRET_NAME`: Reference to Slack token in Secrets Manager
- `GITHUB_SECRET_NAME`: Reference to GitHub token in Secrets Manager
- Amplify Data configuration (auto-injected by `getAmplifyDataClientConfig`)

## Troubleshooting

### URL Verification Fails

**Problem**: Slack shows "Your URL didn't respond with the value of the `challenge` parameter"

**Solutions**:
1. Verify the webhook URL is correct (check `amplify_outputs.json` for latest URL)
2. Check Lambda function logs in CloudWatch:
   ```bash
   aws logs tail /aws/lambda/slack-webhook --follow --region us-east-1
   ```
3. Ensure the Lambda is deployed and running
4. Test the endpoint manually using the curl command above

### Events Not Being Received

**Problem**: Messages sent in Slack don't trigger the webhook

**Solutions**:
1. Verify Event Subscriptions are enabled and saved
2. Check that you subscribed to the correct event types (`message.channels`, etc.)
3. Ensure the bot is invited to the channel (use `/invite @BotName`)
4. Check CloudWatch logs for any errors
5. Verify the Slack app is reinstalled after making changes

### Messages Not Appearing in GitHub

**Problem**: Webhook receives events but nothing appears in GitHub

**Solutions**:
1. Check that an active channel mapping exists:
   - Go to ChillTask Channel Mappings page
   - Verify the Slack channel is mapped and `isActive` is true
2. Verify GitHub token has correct permissions:
   - `repo` scope for private repositories
   - `public_repo` scope for public repositories
3. Check Lambda logs for GitHub API errors:
   ```bash
   aws logs tail /aws/lambda/slack-webhook --follow --region us-east-1
   ```
4. Verify the repository and branch exist in GitHub
5. Test GitHub token manually:
   ```bash
   curl -H "Authorization: Bearer ghp_YOUR_TOKEN" \
     https://api.github.com/user
   ```

### Authentication Errors

**Problem**: Lambda logs show "403 Forbidden" or authentication errors

**Solutions**:
1. Verify Secrets Manager secrets exist and contain correct tokens:
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id chinchilla-ai-academy/slack \
     --region us-east-1
   ```
2. Check that the Lambda has permission to read secrets (IAM policy in `backend.ts`)
3. Verify bot token starts with `xoxb-`
4. Verify GitHub token starts with `ghp_` or `github_pat_`

### DynamoDB Query Errors

**Problem**: Lambda logs show errors querying channel mappings

**Solutions**:
1. Verify Amplify Data is deployed:
   ```bash
   aws appsync list-graphql-apis --region us-east-1
   ```
2. Check that the Lambda has the correct `resourceGroupName: 'data'` configuration
3. Verify channel mapping exists in the database (check via ChillTask UI)

## Security Considerations

### Webhook Security
- The webhook endpoint is public (required by Slack)
- Slack events include a verification token (future enhancement: validate this)
- Consider implementing request signing verification for production

### Token Security
- Bot tokens and GitHub tokens are stored in AWS Secrets Manager
- Tokens are only accessible to Lambda functions with explicit IAM permissions
- Tokens are never exposed in client-side code or logs

### Data Privacy
- Only messages from channels with active mappings are processed
- The bot must be explicitly invited to channels (it cannot read all channels)
- Messages are stored in your own GitHub repository under your control

## Rate Limits

### Slack API
- Standard rate limit: 1+ requests per second per token
- Burst limit: 100 requests per minute
- Current implementation: One API call per message (user info + optional thread replies)

### GitHub API
- Authenticated requests: 5,000 per hour
- Current implementation: One API call per message (create/update file)

### Recommendations
- For high-volume channels (>100 messages/hour), consider batching commits
- Monitor CloudWatch metrics for Lambda throttling
- Implement retry logic for rate limit errors (future enhancement)

## Next Steps

1. Configure channel mappings in ChillTask
2. Invite the bot to desired channels
3. Send test messages to verify the flow
4. Monitor CloudWatch logs for any errors
5. Review archived conversations in GitHub

## Support

For issues or questions:
- Check CloudWatch logs: `/aws/lambda/slack-webhook`
- Review Amplify sandbox logs: `npx ampx sandbox --stream-function-logs`
- Verify configuration in `amplify/backend.ts`
- Check handler code in `amplify/functions/slack-webhook/handler.ts`

## Future Enhancements

Potential improvements to consider:
- [ ] Validate Slack request signatures for security
- [ ] Implement retry logic for API failures
- [ ] Batch GitHub commits for high-volume channels
- [ ] Support for file attachments and images
- [ ] Rich text formatting preservation
- [ ] Configurable commit message templates
- [ ] Support for reactions and emoji
- [ ] Thread branching visualization in Markdown
- [ ] Automated testing of the webhook endpoint
