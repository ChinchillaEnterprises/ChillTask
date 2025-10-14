# ChillTask Documentation

Welcome to the ChillTask documentation. This folder contains comprehensive guides for setting up and using the Slack to GitHub conversation archiving system.

## Quick Start

**Webhook URL**: `https://cxd4hozpld.execute-api.us-east-1.amazonaws.com/slack/events`

**New to ChillTask?** Start here:
1. Read [SLACK_EVENTS_SETUP.md](./SLACK_EVENTS_SETUP.md) for complete setup instructions
2. Use [SLACK_QUICK_REFERENCE.md](./SLACK_QUICK_REFERENCE.md) for quick configuration values
3. Follow [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) to verify everything works

## Documentation Index

### 1. Setup & Configuration

#### [SLACK_EVENTS_SETUP.md](./SLACK_EVENTS_SETUP.md)
**Complete step-by-step setup guide**

Contains:
- Prerequisites and requirements
- Detailed Slack app configuration steps
- OAuth scope requirements
- Event subscription setup
- AWS Secrets Manager configuration
- End-to-end verification steps
- Troubleshooting common issues

**When to use**: First time setup, troubleshooting issues

**Estimated time**: 15-20 minutes

---

#### [SLACK_QUICK_REFERENCE.md](./SLACK_QUICK_REFERENCE.md)
**Quick reference card for common values and commands**

Contains:
- Webhook URL
- Required bot events list
- Required OAuth scopes list
- Secret names and formats
- Testing commands
- Architecture diagram
- Monitoring commands
- Troubleshooting commands

**When to use**: Looking up specific values, testing, debugging

**Estimated time**: 2-3 minutes to find what you need

---

### 2. Testing & Validation

#### [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)
**Comprehensive testing checklist**

Contains:
- 20 test cases covering all scenarios
- Unit tests (webhook validation, error handling)
- Integration tests (end-to-end message flow)
- Performance tests (high volume, concurrency)
- Security tests (permissions, secrets)
- Monitoring tests (logs, alarms)
- Test status tracking

**When to use**: After setup, before production, regression testing

**Estimated time**: 1-2 hours for full test suite

---

### 3. Architecture & Technical Details

#### [WEBHOOK_ARCHITECTURE.md](./WEBHOOK_ARCHITECTURE.md)
**Deep dive into system architecture**

Contains:
- High-level architecture diagram
- Detailed request flow
- Step-by-step processing breakdown
- Error handling strategies
- Security model
- Performance characteristics
- Cost estimates
- Monitoring setup

**When to use**: Understanding how it works, troubleshooting complex issues, optimization

**Estimated time**: 15-20 minutes to read, longer to master

---

## Common Tasks

### Initial Setup
```bash
# 1. Configure Slack app (see SLACK_EVENTS_SETUP.md)
# 2. Store secrets
aws secretsmanager create-secret \
  --name chinchilla-ai-academy/slack \
  --secret-string '{"bot_token":"xoxb-YOUR-TOKEN"}' \
  --region us-east-1

# 3. Test webhook
curl -X POST https://cxd4hozpld.execute-api.us-east-1.amazonaws.com/slack/events \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test_123"}'
```

### Testing
```bash
# Run basic webhook test
curl -X POST https://cxd4hozpld.execute-api.us-east-1.amazonaws.com/slack/events \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test_123"}'

# Check CloudWatch logs
aws logs tail /aws/lambda/slack-webhook --follow --region us-east-1
```

### Troubleshooting
```bash
# Check Lambda logs
aws logs tail /aws/lambda/slack-webhook --follow --region us-east-1

# Verify Slack secret
aws secretsmanager get-secret-value \
  --secret-id chinchilla-ai-academy/slack \
  --region us-east-1

# Verify GitHub secret
aws secretsmanager get-secret-value \
  --secret-id github-token \
  --region us-east-1
```

## Architecture Overview

```
Slack Message → Slack Events API → API Gateway → Lambda
                                                    ↓
                                    ┌───────────────┴─────────────┐
                                    ↓                              ↓
                            Secrets Manager                   DynamoDB
                            (Tokens)                      (Channel Mappings)
                                    ↓
                        ┌───────────┴──────────┐
                        ↓                      ↓
                   Slack API              GitHub API
                   (User Info)            (Commit File)
```

## Required Resources

### AWS Resources
- **Lambda Function**: `slack-webhook`
- **API Gateway**: HTTP API with `/slack/events` route
- **DynamoDB**: Managed by Amplify Data (ChannelMapping table)
- **Secrets Manager**: 2 secrets (Slack token, GitHub token)
- **CloudWatch**: Logs and alarms

### Slack Resources
- **Slack App**: Installed in workspace
- **Bot Token**: Starts with `xoxb-`
- **Event Subscriptions**: Enabled with webhook URL
- **OAuth Scopes**: 6 required scopes (see Quick Reference)

### GitHub Resources
- **Personal Access Token**: Starts with `ghp_` or `github_pat_`
- **Repository**: Where conversations are archived
- **Branch**: Usually `main` or `develop`
- **Folder**: `context/slackconversation/`

## Configuration Summary

| Setting | Value | Location |
|---------|-------|----------|
| Webhook URL | `https://cxd4hozpld.execute-api.us-east-1.amazonaws.com/slack/events` | Slack App Settings |
| Bot Events | `message.channels`, `message.groups` | Slack Event Subscriptions |
| OAuth Scopes | 6 scopes (see Quick Reference) | Slack OAuth & Permissions |
| Slack Secret | `chinchilla-ai-academy/slack` | AWS Secrets Manager |
| GitHub Secret | `github-token` | AWS Secrets Manager |
| Lambda Timeout | 60 seconds | Amplify backend config |
| DynamoDB Table | Auto-managed | Amplify Data |

## Event Flow

1. **User sends message** in Slack channel
2. **Slack Events API** sends POST request to webhook
3. **API Gateway** receives request, invokes Lambda
4. **Lambda** processes event:
   - Validates input
   - Queries DynamoDB for channel mapping
   - Fetches secrets from Secrets Manager
   - Calls Slack API to get user info
   - Calls Slack API to get thread (if applicable)
   - Formats message as Markdown
   - Commits file to GitHub
   - Updates mapping stats in DynamoDB
5. **Lambda** returns 200 OK to Slack
6. **Slack** marks event as delivered

## File Naming Convention

Archived conversations are saved with this pattern:
```
context/slackconversation/YYYY-MM-DD-message-preview-timestamp.md
```

Example:
```
context/slackconversation/2025-10-09-hello-team-lets-discuss-1728504320.123456.md
```

## Security Best Practices

- Store all tokens in AWS Secrets Manager (never in code)
- Rotate tokens quarterly
- Use least-privilege IAM permissions
- Monitor CloudWatch logs for suspicious activity
- Consider implementing Slack request signing verification
- Keep Amplify and dependencies updated

## Monitoring & Maintenance

### Daily
- Review CloudWatch error logs (if any)

### Weekly
- Check Lambda invocation metrics
- Review archived conversation quality

### Monthly
- Analyze cost metrics
- Review performance metrics
- Check for Amplify/dependency updates

### Quarterly
- Rotate Slack bot token
- Rotate GitHub token
- Review and archive old conversations
- Update documentation if needed

## Cost Estimation

**Estimated monthly cost** (10,000 messages/month):
- Lambda: ~$0.50
- API Gateway: ~$0.01
- DynamoDB: ~$0.25
- CloudWatch Logs: ~$0.50
- Secrets Manager: ~$0.80
- **Total**: ~$2.08/month

Scale linearly with message volume.

## Support & Troubleshooting

### Quick Diagnostics

**Webhook not receiving events?**
→ See [SLACK_EVENTS_SETUP.md](./SLACK_EVENTS_SETUP.md#troubleshooting) - "Events Not Being Received"

**Messages not appearing in GitHub?**
→ See [SLACK_EVENTS_SETUP.md](./SLACK_EVENTS_SETUP.md#troubleshooting) - "Messages Not Appearing in GitHub"

**Authentication errors?**
→ See [SLACK_EVENTS_SETUP.md](./SLACK_EVENTS_SETUP.md#troubleshooting) - "Authentication Errors"

**URL verification fails?**
→ See [SLACK_EVENTS_SETUP.md](./SLACK_EVENTS_SETUP.md#troubleshooting) - "URL Verification Fails"

### Getting Help

1. Check the troubleshooting section in [SLACK_EVENTS_SETUP.md](./SLACK_EVENTS_SETUP.md#troubleshooting)
2. Review CloudWatch logs: `aws logs tail /aws/lambda/slack-webhook --follow`
3. Run test cases from [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)
4. Review architecture in [WEBHOOK_ARCHITECTURE.md](./WEBHOOK_ARCHITECTURE.md)

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-09 | 1.0.0 | Initial documentation created |

## Related Files

### Application Code
- `/amplify/functions/slack-webhook/handler.ts` - Lambda function code
- `/amplify/functions/slack-webhook/resource.ts` - Lambda configuration
- `/amplify/backend.ts` - Infrastructure definition

### Configuration
- `/amplify_outputs.json` - Deployed webhook URL and resources
- `/amplify/data/resource.ts` - DynamoDB schema definition

### Frontend
- `/src/app/channel-mappings/page.tsx` - Channel mapping UI

## Next Steps

1. **First time setup?** → [SLACK_EVENTS_SETUP.md](./SLACK_EVENTS_SETUP.md)
2. **Need quick values?** → [SLACK_QUICK_REFERENCE.md](./SLACK_QUICK_REFERENCE.md)
3. **Want to test?** → [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)
4. **Curious how it works?** → [WEBHOOK_ARCHITECTURE.md](./WEBHOOK_ARCHITECTURE.md)

## Feedback

Found an issue or have suggestions? Please update the documentation and commit your changes.
