# ChillTask Architecture Documentation

## Overview

This folder contains comprehensive implementation documentation for the ChillTask Slack-to-GitHub archiving system. All documentation is based on actual code patterns from the existing codebase.

**Last Updated:** October 9, 2024
**Project:** ChillTask - Slack to GitHub Context Archiver
**Tech Stack:** Next.js 15, AWS Amplify Gen 2, TypeScript, MUI

---

## Documentation Structure

### [01 - Code Patterns Analysis](./01-code-patterns-analysis.md)
**What it covers:**
- Existing Lambda function architecture patterns
- Secrets Manager access patterns
- GraphQL schema extension patterns
- IAM permission patterns
- How to add new Lambda functions to Amplify Gen 2

**Use this document when:**
- Learning the ChillTask codebase structure
- Understanding existing code conventions
- Planning new Lambda functions
- Reviewing architecture decisions

**Key takeaways:**
- All functions follow a consistent 3-file pattern (handler.ts, resource.ts, package.json)
- Secrets are accessed via AWS Secrets Manager with JSON parsing
- IAM permissions are added in backend.ts using CDK imports
- GraphQL schema bindings use `a.handler.function()`

---

### [02 - Build Procedure](./02-build-procedure.md)
**What it covers:**
- Step-by-step implementation instructions
- AWS Secrets Manager configuration
- Lambda function creation process
- EventBridge scheduler setup
- Testing procedures (sandbox and production)
- Monitoring and debugging strategies

**Use this document when:**
- Implementing the archive-messages Lambda
- Configuring AWS resources
- Deploying to sandbox or production
- Troubleshooting deployment issues

**Key phases:**
1. Prerequisites Setup (verify secrets, tokens, permissions)
2. Create Lambda Function (resource.ts, handler.ts)
3. Update Amplify Backend (imports, permissions)
4. EventBridge Scheduler Setup (hourly schedule)
5. Testing (sandbox, manual invocation)
6. Production Deployment
7. Monitoring Setup

**Estimated time:** 5-9 hours total implementation

---

### [03 - Code Templates](./03-code-templates.md)
**What it covers:**
- Copy-paste ready code for all components
- Lambda handler with full DynamoDB integration
- Resource definitions with environment variables
- Backend integration with IAM permissions
- EventBridge schedule configurations
- UI components for sync status
- Testing utilities

**Use this document when:**
- Actually writing the code
- Need a quick reference implementation
- Want to ensure code matches patterns
- Setting up monitoring/alerting

**Templates included:**
1. Lambda Function Resource Definition
2. Complete Lambda Handler (with DynamoDB)
3. Error Handling Wrapper
4. Backend Integration (permissions, schedules)
5. Package.json Dependencies
6. UI Components (sync status, manual trigger)
7. Manual Trigger Mutation (optional)
8. CloudWatch Dashboard (optional)
9. Test Events (for manual invocation)

---

### [04 - Implementation Checklist](./04-implementation-checklist.md)
**What it covers:**
- Detailed checklist of every file to create/modify
- AWS resources to configure
- Dependencies to install
- Testing steps at each phase
- Production deployment checklist
- Monitoring setup tasks

**Use this document when:**
- Tracking implementation progress
- Ensuring nothing is missed
- Reviewing before deployment
- Onboarding new developers

**Phases covered:**
1. Prerequisites (secrets, permissions)
2. Create New Files (Lambda function)
3. Modify Existing Files (backend, schema)
4. Install Dependencies (AWS SDK)
5. Deploy and Test (sandbox)
6. Production Deployment
7. Monitoring Setup (CloudWatch)
8. Documentation
9. Future Enhancements

**Files affected:**
- **New (3):** resource.ts, handler.ts, package.json
- **Modified (2-3):** backend.ts, data/resource.ts (optional), channel-mappings UI (optional)

---

### [05 - Testing Strategy](./05-testing-strategy.md)
**What it covers:**
- Pre-development API testing (Slack, GitHub)
- Local component testing (message transformation)
- Sandbox deployment testing
- Integration testing (EventBridge, multiple mappings)
- Performance testing (large volumes)
- Production validation
- Debugging guide

**Use this document when:**
- Verifying API access before coding
- Testing individual components
- Validating sandbox deployment
- Stress testing the system
- Debugging production issues

**Testing phases:**
1. Pre-Development (API access verification)
2. Local Testing (component validation)
3. Sandbox Testing (manual invocation)
4. Integration Testing (EventBridge, errors)
5. Performance Testing (load, stress)
6. Production Validation (smoke tests)
7. Debugging (common issues, logging)

**Estimated testing time:** 8-10 hours

---

## Quick Start Guide

### For First-Time Readers

**Start here:**
1. Read [01 - Code Patterns Analysis](./01-code-patterns-analysis.md) (30 min)
   - Understand the existing architecture
   - Learn Lambda function patterns

2. Review [04 - Implementation Checklist](./04-implementation-checklist.md) (15 min)
   - See the big picture
   - Understand what you'll be building

3. Skim [03 - Code Templates](./03-code-templates.md) (15 min)
   - See what the final code looks like
   - Identify any unclear sections

**Then proceed to implementation:**
4. Follow [02 - Build Procedure](./02-build-procedure.md) step-by-step
5. Use [03 - Code Templates](./03-code-templates.md) as reference
6. Check off tasks in [04 - Implementation Checklist](./04-implementation-checklist.md)
7. Test using [05 - Testing Strategy](./05-testing-strategy.md)

---

### For Experienced Developers

**Fast track:**
1. Quick review: [01 - Code Patterns](./01-code-patterns-analysis.md) → Section 1-2 (10 min)
2. Copy templates: [03 - Code Templates](./03-code-templates.md) → Templates 1-4 (5 min)
3. Implementation checklist: [04 - Implementation Checklist](./04-implementation-checklist.md) (ongoing)
4. Sandbox testing: [05 - Testing Strategy](./05-testing-strategy.md) → Section 3 (30 min)

---

## Architecture Overview

### System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     EventBridge Schedule                     │
│                    (Triggers every hour)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              archive-messages Lambda Function                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Fetch Slack/GitHub tokens from Secrets Manager   │   │
│  │ 2. Query DynamoDB for active ChannelMappings        │   │
│  │ 3. For each mapping:                                │   │
│  │    - Fetch new Slack messages since lastSync        │   │
│  │    - Transform messages to Markdown                 │   │
│  │    - Commit to GitHub repository                    │   │
│  │    - Update lastSync in DynamoDB                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │                │                │
           ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  Slack   │    │  GitHub  │    │ DynamoDB │
    │   API    │    │   API    │    │  Table   │
    └──────────┘    └──────────┘    └──────────┘
```

### Key Components

**Lambda Function:** `archive-messages`
- **Trigger:** EventBridge schedule (hourly)
- **Timeout:** 300 seconds (5 minutes)
- **Memory:** 512 MB
- **Runtime:** Node.js 20+ (via Amplify)

**DynamoDB Table:** `ChannelMapping`
- **Keys:** id (partition key)
- **Fields:** slackChannelId, githubRepo, githubBranch, contextFolder, isActive, lastSync, messageCount

**Secrets Manager:**
- `chinchilla-ai-academy/slack` → Slack bot token
- `github-token` → GitHub personal access token

**EventBridge Rule:** `ArchiveMessagesHourlySchedule`
- **Schedule:** Rate(1 hour)
- **Target:** archive-messages Lambda

---

## Key Design Decisions

### 1. Why EventBridge Schedule (not cron job)?
- **Native AWS integration** - No server management
- **Automatic scaling** - AWS handles concurrency
- **Built-in monitoring** - CloudWatch Logs/Metrics
- **Cost-effective** - Pay only for executions

### 2. Why Secrets Manager (not environment variables)?
- **Security** - Encrypted at rest and in transit
- **Rotation** - Supports automatic secret rotation
- **Audit** - CloudTrail logs all access
- **Separation** - Secrets separate from code

### 3. Why DynamoDB (not RDS)?
- **Serverless** - No server management
- **Amplify native** - Auto-provisioned via schema
- **Fast** - Single-digit millisecond latency
- **Cost** - Only pay for what you use

### 4. Why Markdown (not JSON)?
- **Human-readable** - Easy to review in GitHub
- **Git-friendly** - Clean diffs in version control
- **LLM-friendly** - AI can read context easily
- **Portable** - Works everywhere

---

## Common Gotchas

### 1. Amplify Table Name Pattern
- DynamoDB table names include environment suffix: `ChannelMapping-{env}-{hash}`
- Use wildcard in IAM ARN: `arn:aws:dynamodb:*:*:table/ChannelMapping-*`
- Or discover at runtime via environment variables

### 2. Slack Timestamp Format
- Slack uses Unix timestamps with microseconds: `1699564800.000000`
- JavaScript Date expects milliseconds: `new Date(parseFloat(ts) * 1000)`
- When sending to Slack API, use Unix seconds: `Date.now() / 1000`

### 3. GitHub Base64 Encoding
- GitHub API requires base64-encoded content
- Use: `Buffer.from(content).toString('base64')`
- Don't forget to include SHA when updating existing files

### 4. EventBridge Permissions
- EventBridge needs permission to invoke Lambda
- Automatically granted by CDK `LambdaFunction` target
- If manual setup, use: `lambda.grantInvoke(ServicePrincipal('events.amazonaws.com'))`

### 5. Slack User ID vs Name
- Messages contain user IDs: `"user": "U1234567890"`
- Need to call `users.info` API to get display name
- Cache user names to reduce API calls

---

## Production Considerations

### Scaling
**Current limits:**
- Slack API: 200 messages per request (need pagination for more)
- GitHub API: 5000 requests/hour (per token)
- Lambda timeout: 300 seconds (5 minutes max)
- Lambda memory: 512 MB (increase if needed)

**Recommendations:**
- Monitor GitHub API rate limit headers
- Implement pagination for channels with >200 messages
- Consider batching multiple channels per commit
- Add exponential backoff for retries

### Cost Optimization
**Lambda costs:**
- $0.20 per 1M requests
- $0.0000166667 per GB-second
- Hourly execution: ~720 requests/month = $0.14/month
- Memory usage: Minimal cost at 512 MB

**DynamoDB costs:**
- On-demand pricing: $0.25 per 1M write requests
- Minimal reads/writes per hour
- Estimated: < $1/month

**CloudWatch costs:**
- Log storage: $0.50 per GB
- Estimated: < $2/month

**Total estimated cost:** < $5/month for typical usage

### Security Best Practices
- [x] Use Secrets Manager for all tokens
- [x] Rotate secrets regularly (90 days)
- [x] Limit IAM permissions to minimum required
- [x] Enable CloudTrail for audit logging
- [ ] Add SNS notifications for errors (future)
- [ ] Implement request signing for webhooks (future)

---

## Future Enhancements

### Phase 2 Features (Not in Current Scope)
- [ ] **Thread archiving** - Archive entire conversation threads
- [ ] **Attachment downloads** - Save Slack files to GitHub/S3
- [ ] **Manual trigger UI** - "Sync Now" button in web app
- [ ] **Real-time sync status** - WebSocket updates in UI
- [ ] **Multi-channel batching** - One commit for all channels
- [ ] **Rich formatting** - Preserve Slack markdown (bold, italic, etc.)
- [ ] **User mention conversion** - Convert user IDs to @mentions
- [ ] **Channel link conversion** - Convert channel IDs to #channel-names
- [ ] **Emoji rendering** - Convert Slack emoji to Unicode
- [ ] **Message deduplication** - Prevent duplicate archiving
- [ ] **Incremental backfill** - Archive historical messages
- [ ] **Error retry logic** - Exponential backoff on failures

### Phase 3 Features (Future Vision)
- [ ] **Bi-directional sync** - GitHub → Slack notifications
- [ ] **Advanced search** - Full-text search across archived messages
- [ ] **Analytics dashboard** - Message volume, trends, stats
- [ ] **Custom transformations** - Pluggable message processors
- [ ] **Multiple archive formats** - JSON, HTML, PDF exports
- [ ] **Webhook support** - Real-time sync on message post
- [ ] **Multi-workspace** - Support multiple Slack workspaces

---

## Troubleshooting

### Common Issues Quick Reference

| Issue | Document | Section |
|-------|----------|---------|
| Secrets not accessible | 05-testing-strategy.md | 1.3, 7.1 |
| Slack API errors | 05-testing-strategy.md | 1.1, 7.1 |
| GitHub API errors | 05-testing-strategy.md | 1.2, 7.1 |
| Lambda timeout | 05-testing-strategy.md | 5.2, 7.1 |
| DynamoDB access denied | 02-build-procedure.md | Phase 3.2 |
| EventBridge not triggering | 05-testing-strategy.md | 4.1 |

### Debug Checklist

When something goes wrong:
1. Check CloudWatch Logs for error messages
2. Verify secrets exist and are correctly formatted
3. Check IAM permissions in Lambda execution role
4. Test API access with curl (Slack, GitHub)
5. Verify EventBridge rule is enabled
6. Check DynamoDB table exists and has data
7. Review Lambda configuration (timeout, memory, env vars)

---

## Contributing

### Adding to This Documentation

When extending the system:
1. Update relevant sections in existing documents
2. Add new code templates if creating new patterns
3. Update checklists with new tasks
4. Add testing procedures for new features
5. Document new AWS resources

### Documentation Standards
- Use clear, step-by-step instructions
- Include code examples with comments
- Provide "Expected Results" for all tests
- Add troubleshooting sections for common issues
- Keep templates copy-paste ready

---

## Resources

### External Documentation
- [AWS Amplify Gen 2 Docs](https://docs.amplify.aws/gen2/)
- [Slack API - conversations.history](https://api.slack.com/methods/conversations.history)
- [GitHub API - Create/Update File](https://docs.github.com/en/rest/repos/contents)
- [AWS Lambda - Node.js Runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)
- [AWS EventBridge - Schedules](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html)

### ChillTask-Specific Files
- **Lambda Functions:** `/amplify/functions/`
- **Backend Config:** `/amplify/backend.ts`
- **Data Schema:** `/amplify/data/resource.ts`
- **Frontend UI:** `/src/app/channel-mappings/page.tsx`

---

## Summary

This architecture documentation provides:
✅ Complete understanding of existing code patterns
✅ Step-by-step implementation guide
✅ Copy-paste ready code templates
✅ Comprehensive testing strategy
✅ Detailed implementation checklist
✅ Production deployment procedures
✅ Monitoring and debugging guides

**Total documentation:** 5 files, ~15,000 lines
**Estimated read time:** 2-3 hours (full)
**Quick start time:** 30-45 minutes
**Implementation time:** 5-9 hours (with testing)

---

**Last reviewed:** October 9, 2024
**Maintainer:** ChillTask Development Team
**Questions?** See troubleshooting sections or check CloudWatch Logs
