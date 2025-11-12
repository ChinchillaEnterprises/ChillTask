# GitHub Issue Summary - Implementation Plan
## Enhanced with Amplify Gen 2 Patterns

## Overview
Replace noisy real-time GitHub issue notifications with intelligent 6-hour status summaries that show what changed.

## Current State
- GitHub webhook sends immediate Slack notifications for:
  - Push events (commits) ✅ Keep these
  - Issues events (opened, closed, edited) ❌ Remove
  - Issue comment events ❌ Remove
- All events go to same Slack channel in real-time
- Creates notification spam for testers

## Proposed Solution (Amplify Gen 2 Native)

### Phase 1: Filter Webhook Events
**File:** `src/app/api/github-webhook/route.ts`

- Keep `push` events → real-time notifications (devs still see commits)
- Filter out `issues` and `issue_comment` events from webhook
- Update `supportedEvents` array (line 182)

### Phase 2: Create Scheduled Lambda
**New file:** `amplify/functions/github-issue-summary/`

**Schedule:** Every 6 hours during business hours (9am, 3pm CST)

**Lambda responsibilities:**
1. Query GitHub API for all issues in repository
2. Group issues by status labels:
   - `ready-for-testing`
   - `in-progress`
   - `blocked`
   - `backlog` (or unlabeled)
3. Load previous snapshot from DynamoDB (from 6 hours ago)
4. Calculate delta/diff:
   - What issues are NEW in each category
   - What issues moved between categories
   - Count changes (+2, -1, etc.)
5. Format summary message with changes highlighted
6. Send to Slack channel
7. Save current snapshot to DynamoDB for next comparison

### Phase 3: DynamoDB Schema (Amplify Gen 2 Pattern)
**Add to:** `amplify/data/resource.ts`

```typescript
GitHubIssueSnapshot: a.model({
  snapshotId: a.id().required(),        // Auto-generated ID
  timestamp: a.datetime().required(),    // When snapshot was taken
  repoName: a.string().required(),       // "ChinchillaEnterprises/ChillTask"

  // Issue counts by label
  readyForTestingCount: a.integer().default(0),
  inProgressCount: a.integer().default(0),
  blockedCount: a.integer().default(0),
  backlogCount: a.integer().default(0),
  totalCount: a.integer().required(),

  // Detailed issue lists (stored as JSON)
  readyForTesting: a.json(),  // Array of {number, title, url}
  inProgress: a.json(),
  blocked: a.json(),
  backlog: a.json(),

  // TTL for auto-cleanup (keep for 30 days)
  ttl: a.integer(),
})
.authorization((allow) => [
  allow.resource(githubIssueSummary),  // Lambda function access
])
```

### Example Output Message

```
📊 ChillTask - 6-Hour Status Update (3:00 PM)

✅ Ready for Testing: 5 issues (+2 from 9am)
  NEW:
  • #127 - User profile page layout fixes
  • #128 - Export button not working on mobile

🔨 In Progress: 3 issues (no change)

🚧 Blocked: 2 issues (+1)
  NEWLY BLOCKED:
  • #124 - Waiting on API endpoint from backend team

📋 Backlog: 12 issues (-1)
  MOVED TO IN PROGRESS:
  • #130 - Refactor authentication service
```

## Benefits
- **Less noise**: 2 messages/day instead of 20+ notifications
- **Actionable**: Testers see exactly what's NEW to test
- **Context**: Team sees progress/velocity over time
- **Proactive**: Shows current state, not just events
- **Change detection**: Highlights what moved/changed

## Environment Variables Needed
- `GITHUB_TOKEN` - For GitHub API access (read:issues permission)
- `GITHUB_REPO_OWNER` - Repository owner (e.g., "ChinchillaEnterprises")
- `GITHUB_REPO_NAME` - Repository name (e.g., "ChillTask")
- `SLACK_BOT_TOKEN` - Already configured
- `SLACK_SUMMARY_CHANNEL_ID` - Channel for summaries (can be same as current)

## Implementation Steps
1. Filter webhook to exclude issue events
2. Create DynamoDB model for IssueSnapshot
3. Create scheduled Lambda function
4. Implement GitHub API client
5. Implement snapshot comparison logic
6. Implement Slack message formatter
7. Add cron schedule (every 6 hours, business hours only)
8. Test and deploy

## Technical Notes
- Use GitHub REST API (`octokit`) or GraphQL API
- Lambda needs IAM permissions for DynamoDB read/write
- Consider rate limiting for GitHub API (5000 requests/hour)
- TTL on snapshots: keep for 30 days then auto-delete
- Error handling: if GitHub API fails, send alert to Slack
