# Implementation Checklist - Archive Messages Feature

## Overview
Complete checklist of all files to create, modify, and configure for the archive-messages Lambda function.

---

## Phase 1: Prerequisites (Before Coding)

### AWS Secrets Verification
- [ ] **Verify Slack secret exists**
  ```bash
  aws secretsmanager get-secret-value --secret-id chinchilla-ai-academy/slack --region us-east-1
  ```
  - Secret should contain: `SLACK_BOT_TOKEN` or `bot_token`

- [ ] **Verify GitHub secret exists**
  ```bash
  aws secretsmanager get-secret-value --secret-id github-token --region us-east-1
  ```
  - Secret should contain: `GITHUB_TOKEN` or `token`

- [ ] **Update secrets if needed**
  ```bash
  aws secretsmanager update-secret \
    --secret-id chinchilla-ai-academy/slack \
    --secret-string '{"SLACK_BOT_TOKEN":"xoxb-...","bot_token":"xoxb-..."}' \
    --region us-east-1
  ```

### Slack Bot Configuration
- [ ] **Verify bot has required OAuth scopes:**
  - `channels:history` - Read public channel messages
  - `channels:read` - List public channels
  - `users:read` - Get user information
  - `files:read` - Download files (optional)

- [ ] **Verify bot is invited to target channels:**
  - Invite bot to each Slack channel you want to archive
  - Test with: `/invite @YourBotName` in channel

### GitHub Token Configuration
- [ ] **Verify token has required permissions:**
  - `repo` - Full control of repositories
  - `workflow` - Update workflows (if needed)

- [ ] **Test token with curl:**
  ```bash
  curl -H "Authorization: Bearer ghp_..." \
    https://api.github.com/repos/ChinchillaEnterprises/ChillTask
  ```

---

## Phase 2: Create New Files

### Lambda Function Files

- [ ] **Create function directory**
  ```bash
  mkdir -p /Users/ricardo/Documents/Repos/CHI/ChillTask/amplify/functions/archive-messages
  ```

- [ ] **Create resource.ts**
  - **File:** `/Users/ricardo/Documents/Repos/CHI/ChillTask/amplify/functions/archive-messages/resource.ts`
  - **Content:** Lambda function definition with environment variables
  - **Template:** See `03-code-templates.md` → Template 1

- [ ] **Create handler.ts**
  - **File:** `/Users/ricardo/Documents/Repos/CHI/ChillTask/amplify/functions/archive-messages/handler.ts`
  - **Content:** Main Lambda handler logic
  - **Template:** See `03-code-templates.md` → Template 2

- [ ] **Create package.json** (optional, only if function needs specific dependencies)
  - **File:** `/Users/ricardo/Documents/Repos/CHI/ChillTask/amplify/functions/archive-messages/package.json`
  - **Content:** DynamoDB and Secrets Manager client dependencies
  - **Template:** See `03-code-templates.md` → Template 5
  - **Then run:**
    ```bash
    cd amplify/functions/archive-messages
    npm install
    cd ../../..
    ```

---

## Phase 3: Modify Existing Files

### Backend Configuration

- [ ] **Update `/amplify/backend.ts`**
  - **Line to add (after imports):**
    ```typescript
    import { archiveMessages } from './functions/archive-messages/resource.js';
    ```
  - **Line to add (in defineBackend):**
    ```typescript
    const backend = defineBackend({
      auth,
      data,
      getSlackChannels,
      getGitHubRepos,
      archiveMessages, // ← Add this line
    });
    ```
  - **Append at end:** IAM permissions for Secrets Manager and DynamoDB
  - **Append at end:** EventBridge schedule configuration
  - **Template:** See `03-code-templates.md` → Template 4

### Data Schema (Optional - for manual trigger)

- [ ] **Update `/amplify/data/resource.ts`** (only if adding manual trigger mutation)
  - **Line to add (after imports):**
    ```typescript
    import { archiveMessages } from '../functions/archive-messages/resource';
    ```
  - **Add to schema:** `triggerArchive` mutation
  - **Template:** See `03-code-templates.md` → Template 7

### Frontend UI (Optional - for sync status display)

- [ ] **Update `/src/app/channel-mappings/page.tsx`**
  - **Add:** Sync status indicators
  - **Add:** "Sync Now" button
  - **Add:** Last sync timestamp display
  - **Template:** See `03-code-templates.md` → Template 6

---

## Phase 4: Install Dependencies

### Root Project Dependencies

- [ ] **Install DynamoDB client** (if not already installed)
  ```bash
  cd /Users/ricardo/Documents/Repos/CHI/ChillTask
  npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
  ```

- [ ] **Verify Secrets Manager client** (should already be installed)
  ```bash
  npm list @aws-sdk/client-secrets-manager
  ```

### Verify package.json includes:
- [ ] `@aws-sdk/client-secrets-manager` - ✓ Already present
- [ ] `@aws-sdk/client-dynamodb` - To be added
- [ ] `@aws-sdk/lib-dynamodb` - To be added
- [ ] `@types/aws-lambda` - ✓ Already present

---

## Phase 5: Deploy and Test

### Sandbox Deployment

- [ ] **Deploy to Amplify sandbox**
  ```bash
  npx ampx sandbox
  ```

- [ ] **Wait for deployment to complete** (~2-3 minutes)
  - Watch terminal for "Deployed resources" message
  - Check that `amplify_outputs.json` is updated

- [ ] **Verify Lambda function created**
  - Go to AWS Lambda Console
  - Find: `archive-messages-{sandbox-id}`
  - Check configuration (timeout, memory, environment variables)

- [ ] **Verify EventBridge rule created**
  - Go to AWS EventBridge Console → Rules
  - Find: `ArchiveMessagesHourlySchedule-{id}`
  - Check schedule expression and target

- [ ] **Verify IAM permissions**
  - Go to Lambda function → Configuration → Permissions
  - Check execution role has policies for:
    - Secrets Manager: `GetSecretValue`
    - DynamoDB: `Scan`, `UpdateItem`

### Manual Testing

- [ ] **Test via AWS Lambda Console**
  - Go to Lambda function → Test tab
  - Create test event (JSON):
    ```json
    {
      "source": "aws.events",
      "detail-type": "Scheduled Event"
    }
    ```
  - Click "Test"
  - Check execution results and logs

- [ ] **Test via AWS CLI**
  ```bash
  aws lambda invoke \
    --function-name archive-messages-sandbox-{id} \
    --payload '{"source":"aws.events"}' \
    response.json

  cat response.json
  ```

### Verify Results

- [ ] **Check CloudWatch Logs**
  - Log Group: `/aws/lambda/archive-messages-{env}`
  - Look for:
    - "🚀 Archive Messages Lambda triggered"
    - "📋 Found X active channel mapping(s)"
    - "✅ Archive complete"
  - Check for any ERROR messages

- [ ] **Verify GitHub commit**
  - Go to GitHub repository
  - Navigate to `/context/` (or configured folder)
  - Look for markdown file: `{channel-name}-{date}.md`
  - Open file and verify content format

- [ ] **Verify DynamoDB update**
  - Go to DynamoDB Console
  - Find table: `ChannelMapping-{env}-{hash}`
  - Check that `lastSync` field was updated
  - Check that `messageCount` was incremented

### End-to-End Testing

- [ ] **Create test channel mapping**
  - Open app: `http://localhost:3000/channel-mappings`
  - Click "Add New Mapping"
  - Select a test Slack channel
  - Select a test GitHub repo
  - Save mapping

- [ ] **Wait for next scheduled run** (or trigger manually)
  - Check CloudWatch Logs for processing
  - Verify GitHub commit appears

- [ ] **Post test messages in Slack**
  - Post 2-3 messages in the mapped channel
  - Wait for next sync (or trigger manually)
  - Verify new messages appear in GitHub

---

## Phase 6: Production Deployment

### Pre-deployment Checks

- [ ] **Review all code changes**
  ```bash
  git status
  git diff
  ```

- [ ] **Ensure all tests pass**
  - Manual Lambda invocation successful
  - GitHub commits working
  - DynamoDB updates working
  - No errors in CloudWatch Logs

- [ ] **Update environment variables if needed**
  - Check if production uses different:
    - Secret names
    - GitHub org
    - Region

### Git Commit

- [ ] **Stage all changes**
  ```bash
  git add amplify/functions/archive-messages/
  git add amplify/backend.ts
  git add amplify/data/resource.ts  # if modified
  git add src/app/channel-mappings/page.tsx  # if modified
  git add package.json
  git add package-lock.json
  ```

- [ ] **Commit with descriptive message**
  ```bash
  git commit -m "Add archive-messages Lambda function

  - Created scheduled Lambda to sync Slack messages to GitHub
  - Processes all active ChannelMapping entries hourly
  - Commits messages as markdown files to GitHub repos
  - Updates lastSync and messageCount in DynamoDB
  - Added IAM permissions for Secrets Manager and DynamoDB
  - Added EventBridge schedule for hourly execution"
  ```

### Deploy to Production

- [ ] **Push to main branch**
  ```bash
  git push origin main
  ```

- [ ] **Deploy via Amplify Hosting** (if configured)
  - Go to AWS Amplify Console
  - Check deployment status
  - Wait for build to complete

- [ ] **Or deploy manually**
  ```bash
  npx ampx pipeline-deploy --branch main
  ```

### Post-deployment Verification

- [ ] **Verify production Lambda exists**
  - AWS Lambda Console → Find function
  - Check configuration matches sandbox

- [ ] **Verify production EventBridge rule**
  - AWS EventBridge Console → Check schedule

- [ ] **Monitor first scheduled run**
  - Wait for next hour boundary
  - Check CloudWatch Logs
  - Verify GitHub commits

- [ ] **Check for errors**
  - CloudWatch Logs → Filter for "ERROR"
  - CloudWatch Metrics → Check error count

---

## Phase 7: Monitoring Setup

### CloudWatch Alarms

- [ ] **Create error alarm** (optional but recommended)
  - Metric: Lambda Errors
  - Threshold: > 0
  - Period: 5 minutes
  - Action: Send SNS notification

- [ ] **Create duration alarm** (optional)
  - Metric: Lambda Duration
  - Threshold: > 240000 ms (4 minutes, before timeout)
  - Period: 5 minutes

### CloudWatch Dashboard

- [ ] **Create dashboard** (optional)
  - Add widget for Invocations
  - Add widget for Errors
  - Add widget for Duration
  - Add widget for DynamoDB read/write metrics
  - **Template:** See `03-code-templates.md` → Template 8

---

## Phase 8: Documentation

### Code Documentation

- [ ] **Add inline comments** to complex functions
  - `processChannelMapping`
  - `transformMessagesToMarkdown`
  - `commitToGitHub`

- [ ] **Add JSDoc comments** to public functions
  ```typescript
  /**
   * Fetches messages from Slack channel since last sync
   * @param channelId - Slack channel ID (e.g., "C1234567890")
   * @param token - Slack bot token
   * @param since - ISO timestamp of last sync (optional)
   * @returns Array of Slack messages
   */
  async function fetchSlackMessages(...) { }
  ```

### User Documentation

- [ ] **Update project README** with:
  - Archive feature description
  - How to configure channel mappings
  - Expected behavior and schedule

- [ ] **Create troubleshooting guide** with:
  - Common errors and solutions
  - How to check sync status
  - How to manually trigger sync

---

## Phase 9: Future Enhancements Checklist

### Planned Features (Not for Initial Release)

- [ ] **Thread support** - Archive entire conversation threads
- [ ] **Attachment downloads** - Save Slack files to GitHub
- [ ] **Incremental sync** - Only fetch messages since last sync (already implemented)
- [ ] **Manual trigger UI** - "Sync Now" button in UI
- [ ] **Sync status dashboard** - Real-time sync progress
- [ ] **Error retry logic** - Exponential backoff on failures
- [ ] **Message deduplication** - Prevent duplicate archiving
- [ ] **Multi-channel batching** - Combine multiple channels in one commit
- [ ] **Rich message formatting** - Preserve Slack formatting (bold, italics, etc.)
- [ ] **User mentions** - Convert Slack user IDs to @mentions
- [ ] **Channel links** - Convert Slack channel IDs to #channel-names
- [ ] **Emoji rendering** - Convert Slack emoji codes to Unicode/images

---

## Summary of Files

### New Files Created (3 files)
1. `/amplify/functions/archive-messages/resource.ts`
2. `/amplify/functions/archive-messages/handler.ts`
3. `/amplify/functions/archive-messages/package.json` (optional)

### Files Modified (2-3 files)
1. `/amplify/backend.ts` - Add function import, permissions, schedule
2. `/amplify/data/resource.ts` - Add manual trigger mutation (optional)
3. `/src/app/channel-mappings/page.tsx` - Add sync UI (optional)

### Dependencies Added
1. `@aws-sdk/client-dynamodb`
2. `@aws-sdk/lib-dynamodb`

### AWS Resources Created
1. Lambda function: `archive-messages-{env}`
2. EventBridge rule: `ArchiveMessagesHourlySchedule-{id}`
3. IAM policies: Secrets Manager, DynamoDB
4. CloudWatch Log Group: `/aws/lambda/archive-messages-{env}`

---

## Estimated Timeline

| Phase | Task | Time |
|-------|------|------|
| 1 | Prerequisites verification | 30 min |
| 2 | Create Lambda files | 1 hour |
| 3 | Modify backend files | 30 min |
| 4 | Install dependencies | 10 min |
| 5 | Deploy and test in sandbox | 1-2 hours |
| 6 | Production deployment | 30 min |
| 7 | Monitoring setup | 1 hour |
| 8 | Documentation | 1 hour |
| **Total** | | **5-7 hours** |

---

## Success Criteria

✅ **Feature is complete when:**

1. Lambda function deploys without errors
2. EventBridge schedule triggers on time
3. Slack messages are fetched successfully
4. GitHub commits are created with correct content
5. DynamoDB is updated with lastSync timestamp
6. No errors in CloudWatch Logs
7. Manual testing shows expected behavior
8. Production deployment is stable

---

## Rollback Plan

If something goes wrong:

1. **Disable EventBridge rule:**
   ```bash
   aws events disable-rule --name ArchiveMessagesHourlySchedule-{id}
   ```

2. **Delete Lambda function** (if needed):
   ```bash
   aws lambda delete-function --function-name archive-messages-{env}
   ```

3. **Revert Git changes:**
   ```bash
   git revert HEAD
   git push
   ```

4. **Redeploy previous version:**
   ```bash
   npx ampx pipeline-deploy --branch main
   ```

---

**Use this checklist to track progress and ensure nothing is missed during implementation!**
