# Testing Strategy - Archive Messages Lambda

## Overview
Comprehensive testing guide for the archive-messages Lambda function, covering local development, sandbox testing, and production validation.

---

## 1. Pre-Development Testing

### 1.1 Test Slack API Access

**Purpose:** Verify Slack bot token works and has correct permissions.

**Test Script:**

```bash
# Export your Slack token
export SLACK_TOKEN="xoxb-your-token-here"

# Test 1: List channels (verify channels:read scope)
curl -X GET "https://slack.com/api/conversations.list" \
  -H "Authorization: Bearer $SLACK_TOKEN" \
  | jq '.ok, .channels[0:3] | .[] | {id, name}'

# Test 2: Fetch messages from a specific channel (verify channels:history scope)
export CHANNEL_ID="C1234567890"  # Replace with actual channel ID
curl -X GET "https://slack.com/api/conversations.history?channel=$CHANNEL_ID&limit=5" \
  -H "Authorization: Bearer $SLACK_TOKEN" \
  | jq '.ok, .messages[0:2]'

# Test 3: Get user info (verify users:read scope)
export USER_ID="U1234567890"  # Replace with actual user ID
curl -X GET "https://slack.com/api/users.info?user=$USER_ID" \
  -H "Authorization: Bearer $SLACK_TOKEN" \
  | jq '.ok, .user | {id, name, real_name}'
```

**Expected Results:**
- All requests return `"ok": true`
- Channel list returns array of channels
- Message history returns array of messages
- User info returns user details

**Troubleshooting:**
- `"ok": false, "error": "invalid_auth"` → Token is invalid
- `"ok": false, "error": "missing_scope"` → Bot needs additional OAuth scopes
- `"ok": false, "error": "channel_not_found"` → Bot not invited to channel

---

### 1.2 Test GitHub API Access

**Purpose:** Verify GitHub token works and can commit files.

**Test Script:**

```bash
# Export your GitHub token and repo details
export GITHUB_TOKEN="ghp_your-token-here"
export GITHUB_ORG="ChinchillaEnterprises"
export GITHUB_REPO="ChillTask"
export BRANCH="main"

# Test 1: List repositories (verify token works)
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/user/repos" \
  | jq '.[0:3] | .[] | {name, full_name}'

# Test 2: Get repository details
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$GITHUB_ORG/$GITHUB_REPO" \
  | jq '{name, default_branch, permissions}'

# Test 3: Create a test file (verify write permissions)
CONTENT=$(echo "# Test file created $(date)" | base64)
curl -X PUT \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$GITHUB_ORG/$GITHUB_REPO/contents/test-$(date +%s).md" \
  -d "{
    \"message\": \"Test commit from API\",
    \"content\": \"$CONTENT\",
    \"branch\": \"$BRANCH\"
  }" \
  | jq '.commit.message, .content.name'

# Clean up: Delete test file
# (Get SHA from previous response, then):
export FILE_SHA="abc123..."  # From previous response
curl -X DELETE \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$GITHUB_ORG/$GITHUB_REPO/contents/test-file.md" \
  -d "{
    \"message\": \"Clean up test file\",
    \"sha\": \"$FILE_SHA\",
    \"branch\": \"$BRANCH\"
  }"
```

**Expected Results:**
- Repository list returns your repos
- Repository details show correct permissions
- File creation succeeds and returns commit SHA
- File deletion succeeds

**Troubleshooting:**
- `401 Unauthorized` → Token is invalid or expired
- `403 Forbidden` → Token lacks necessary permissions
- `404 Not Found` → Repository doesn't exist or token can't access it

---

### 1.3 Test AWS Secrets Manager

**Purpose:** Verify secrets are accessible and correctly formatted.

**Test Script:**

```bash
# Test Slack secret
aws secretsmanager get-secret-value \
  --secret-id chinchilla-ai-academy/slack \
  --region us-east-1 \
  | jq '.SecretString | fromjson'

# Expected output:
# {
#   "SLACK_BOT_TOKEN": "xoxb-...",
#   "bot_token": "xoxb-..."
# }

# Test GitHub secret
aws secretsmanager get-secret-value \
  --secret-id github-token \
  --region us-east-1 \
  | jq '.SecretString | fromjson'

# Expected output:
# {
#   "GITHUB_TOKEN": "ghp_...",
#   "token": "ghp_..."
# }
```

**Troubleshooting:**
- `ResourceNotFoundException` → Secret doesn't exist
- `AccessDeniedException` → Your AWS credentials lack permission
- Invalid JSON → Secret is not properly formatted

---

## 2. Local Testing (Limited)

**Note:** Amplify Gen 2 doesn't support true local Lambda execution. These tests validate individual components.

### 2.1 Test Message Transformation Function

**Create test file:** `/test/transform-messages.test.ts`

```typescript
import { transformMessagesToMarkdown } from '../amplify/functions/archive-messages/handler';

const mockMessages = [
  {
    type: 'message',
    user: 'U123',
    text: 'Hello world!',
    ts: '1699564800.000000',
  },
  {
    type: 'message',
    user: 'U456',
    text: 'This is a test message',
    ts: '1699564900.000000',
  },
];

const mockSlackToken = 'xoxb-test-token';

async function testTransform() {
  const markdown = await transformMessagesToMarkdown(
    mockMessages,
    mockSlackToken,
    'test-channel'
  );

  console.log('Generated markdown:');
  console.log(markdown);

  // Assertions
  if (!markdown.includes('# test-channel')) {
    throw new Error('Missing channel name in markdown');
  }

  if (!markdown.includes('Hello world!')) {
    throw new Error('Missing first message content');
  }

  console.log('✅ Transform test passed!');
}

testTransform().catch(console.error);
```

**Run:**
```bash
npx tsx test/transform-messages.test.ts
```

---

### 2.2 Test Slack API Client

**Create test file:** `/test/slack-api.test.ts`

```typescript
async function testSlackAPI() {
  const token = process.env.SLACK_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;

  if (!token || !channelId) {
    throw new Error('Missing SLACK_TOKEN or SLACK_CHANNEL_ID env vars');
  }

  // Test fetching messages
  const url = `https://slack.com/api/conversations.history?channel=${channelId}&limit=5`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }

  console.log(`✅ Fetched ${data.messages.length} messages`);
  console.log('Sample message:', data.messages[0]);
}

testSlackAPI().catch(console.error);
```

**Run:**
```bash
export SLACK_TOKEN="xoxb-..."
export SLACK_CHANNEL_ID="C1234567890"
npx tsx test/slack-api.test.ts
```

---

### 2.3 Test GitHub API Client

**Create test file:** `/test/github-api.test.ts`

```typescript
async function testGitHubAPI() {
  const token = process.env.GITHUB_TOKEN;
  const org = process.env.GITHUB_ORG || 'ChinchillaEnterprises';
  const repo = process.env.GITHUB_REPO || 'ChillTask';

  if (!token) {
    throw new Error('Missing GITHUB_TOKEN env var');
  }

  // Test creating a file
  const fileName = `test-${Date.now()}.md`;
  const content = `# Test File\n\nCreated at ${new Date().toISOString()}`;
  const base64Content = Buffer.from(content).toString('base64');

  const url = `https://api.github.com/repos/${org}/${repo}/contents/${fileName}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Test commit',
      content: base64Content,
      branch: 'main',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  console.log('✅ Created file:', result.content.name);
  console.log('Commit URL:', result.commit.html_url);

  // Clean up
  const deleteResponse = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({
      message: 'Clean up test file',
      sha: result.content.sha,
      branch: 'main',
    }),
  });

  if (deleteResponse.ok) {
    console.log('✅ Cleaned up test file');
  }
}

testGitHubAPI().catch(console.error);
```

**Run:**
```bash
export GITHUB_TOKEN="ghp_..."
npx tsx test/github-api.test.ts
```

---

## 3. Sandbox Testing

### 3.1 Deploy to Sandbox

```bash
# Start Amplify sandbox
npx ampx sandbox

# Wait for deployment (2-3 minutes)
# Look for: "Deployed resources"
```

### 3.2 Manual Lambda Invocation (AWS Console)

**Steps:**

1. **Open AWS Lambda Console**
   - Navigate to: https://console.aws.amazon.com/lambda

2. **Find your function**
   - Search for: `archive-messages-sandbox-{id}`
   - Click on function name

3. **Create test event**
   - Click "Test" tab
   - Click "Create new event"
   - Event name: `TestScheduledEvent`
   - Event JSON:
     ```json
     {
       "version": "0",
       "id": "test-event-id",
       "detail-type": "Scheduled Event",
       "source": "aws.events",
       "account": "123456789012",
       "time": "2024-01-01T00:00:00Z",
       "region": "us-east-1",
       "resources": [],
       "detail": {}
     }
     ```
   - Click "Save"

4. **Invoke function**
   - Click "Test" button
   - Wait for execution to complete
   - Check "Execution results" tab

5. **Verify output**
   - **Success:** Response contains `statusCode: 200`
   - **Logs:** Expand "Log output" to see console.log statements
   - **Duration:** Should be under 300 seconds (5 min timeout)

---

### 3.3 Manual Lambda Invocation (AWS CLI)

```bash
# Get function name
aws lambda list-functions \
  --query "Functions[?contains(FunctionName, 'archive-messages')].FunctionName" \
  --output text

# Invoke function
aws lambda invoke \
  --function-name archive-messages-sandbox-{id} \
  --payload '{"source":"aws.events","detail-type":"Scheduled Event"}' \
  --cli-binary-format raw-in-base64-out \
  response.json

# Check response
cat response.json | jq '.'

# Check logs
aws logs tail /aws/lambda/archive-messages-sandbox-{id} --follow
```

---

### 3.4 Test with Real Data

**Prerequisites:**
- At least one active ChannelMapping in DynamoDB
- Slack bot invited to the mapped channel
- GitHub repo exists and is accessible

**Test Steps:**

1. **Create a test channel mapping** (via UI or DynamoDB console)
   ```json
   {
     "id": "test-mapping-001",
     "slackChannel": "test-channel",
     "slackChannelId": "C1234567890",
     "githubRepo": "ChillTask",
     "githubUrl": "github.com/ChinchillaEnterprises/ChillTask",
     "githubBranch": "main",
     "contextFolder": "/context/test/",
     "isActive": true
   }
   ```

2. **Post test messages in Slack**
   - Open Slack channel
   - Post 3-5 test messages
   - Include variety: plain text, mentions, emoji

3. **Invoke Lambda manually**
   - Use AWS Console or CLI (see above)
   - Watch CloudWatch Logs

4. **Verify GitHub commit**
   - Go to: `https://github.com/ChinchillaEnterprises/ChillTask/tree/main/context/test`
   - Look for file: `test-channel-{date}.md`
   - Open file and verify:
     - Channel name in header
     - All messages present
     - Timestamps formatted correctly
     - Usernames resolved (not user IDs)

5. **Verify DynamoDB update**
   - Go to DynamoDB Console
   - Find ChannelMapping table
   - Find your test mapping
   - Check:
     - `lastSync` has new timestamp
     - `messageCount` incremented by number of messages

---

### 3.5 CloudWatch Logs Analysis

**Key Log Patterns to Look For:**

```
✅ Success Indicators:
- "🚀 Archive Messages Lambda triggered"
- "📋 Found X active channel mapping(s)"
- "📱 Processing channel: {name}"
- "📨 Found X new message(s)"
- "📄 Creating new file: {filename}"
- "✅ Archived to: {filename}"
- "✅ Archive complete: X/X succeeded"

❌ Error Indicators:
- "ERROR"
- "Failed to process {channel}"
- "Slack API error:"
- "GitHub API error:"
- "Missing required tokens"
```

**Filter CloudWatch Logs:**

```bash
# Show only errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/archive-messages-sandbox-{id} \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000

# Show processing summary
aws logs filter-log-events \
  --log-group-name /aws/lambda/archive-messages-sandbox-{id} \
  --filter-pattern "Archive complete" \
  --start-time $(date -u -d '24 hours ago' +%s)000
```

---

## 4. Integration Testing

### 4.1 Test EventBridge Schedule

**Verify schedule is active:**

```bash
# List EventBridge rules
aws events list-rules \
  --name-prefix ArchiveMessages \
  --query "Rules[*].{Name:Name,State:State,Schedule:ScheduleExpression}"

# Expected output:
# [
#   {
#     "Name": "ArchiveMessagesHourlySchedule-{id}",
#     "State": "ENABLED",
#     "Schedule": "rate(1 hour)"
#   }
# ]
```

**Test schedule trigger:**

```bash
# Manually trigger the EventBridge rule
aws events put-events \
  --entries "[{
    \"Source\": \"aws.events\",
    \"DetailType\": \"Scheduled Event\",
    \"Detail\": \"{}\"
  }]"
```

**Wait and verify:**
- Check CloudWatch Logs for new invocation
- Verify GitHub commit was created
- Check DynamoDB for updated lastSync

---

### 4.2 Test Multiple Channel Mappings

**Setup:**
- Create 3-5 channel mappings
- Mix of active and inactive
- Different GitHub repos/branches

**Test:**
1. Invoke Lambda manually
2. Verify each active mapping is processed
3. Verify inactive mappings are skipped
4. Check GitHub commits in each repo
5. Verify DynamoDB updates for each

**Expected Results:**
- Logs show `"Found X active channel mapping(s)"` (only active)
- One GitHub commit per active mapping
- DynamoDB updated only for active mappings
- No errors in logs

---

### 4.3 Test Error Handling

**Scenario 1: Invalid Slack Channel ID**

1. Create mapping with non-existent channel ID
2. Invoke Lambda
3. **Expected:** Error logged, other mappings still process

**Scenario 2: Invalid GitHub Repo**

1. Create mapping with non-existent repo
2. Invoke Lambda
3. **Expected:** Error logged, other mappings still process

**Scenario 3: Missing Secrets**

1. Temporarily rename secret in Secrets Manager
2. Invoke Lambda
3. **Expected:** Lambda fails with "Missing required tokens" error
4. Restore secret

**Scenario 4: Rate Limiting**

1. Create 20+ channel mappings
2. Invoke Lambda
3. **Expected:** Some requests may be rate-limited
4. **Future enhancement:** Add retry logic

---

## 5. Performance Testing

### 5.1 Measure Execution Time

**CloudWatch Metrics:**

```bash
# Get average duration over last 24 hours
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=archive-messages-sandbox-{id} \
  --start-time $(date -u -d '24 hours ago' --iso-8601) \
  --end-time $(date -u --iso-8601) \
  --period 3600 \
  --statistics Average,Maximum
```

**Expected Results:**
- Average duration: < 30 seconds for 1-2 mappings
- Maximum duration: < 60 seconds
- If > 240 seconds: Risk of timeout

---

### 5.2 Test with Large Message Volume

**Setup:**
- Channel with 100+ messages
- Set `lastSync` to null (fetch all history)

**Test:**
1. Invoke Lambda
2. Monitor:
   - Execution time
   - Memory usage
   - API rate limits

**Expected Results:**
- Slack API limit: 200 messages per request
- If > 200 messages: Need pagination (future enhancement)
- Memory usage: < 512 MB

---

### 5.3 Stress Test

**Setup:**
- 10+ active channel mappings
- Each with 50+ new messages
- Invoke Lambda

**Monitor:**
- Total execution time
- API rate limits
- GitHub commit success rate
- Lambda concurrent executions

**Expected Results:**
- Total time: < 300 seconds (timeout)
- All commits succeed
- All DynamoDB updates succeed

**If timeout occurs:**
- Increase timeout: `timeoutSeconds: 600`
- Increase memory: `memoryMB: 1024`
- Or: Reduce mappings processed per invocation

---

## 6. Production Validation

### 6.1 Smoke Tests (Post-Deployment)

**After deploying to production:**

1. **Verify function exists**
   ```bash
   aws lambda get-function --function-name archive-messages-prod-{id}
   ```

2. **Verify EventBridge rule active**
   ```bash
   aws events describe-rule --name ArchiveMessagesHourlySchedule-{id}
   ```

3. **Check IAM permissions**
   ```bash
   aws lambda get-policy --function-name archive-messages-prod-{id}
   ```

4. **Test manual invocation**
   ```bash
   aws lambda invoke \
     --function-name archive-messages-prod-{id} \
     --payload '{"source":"aws.events"}' \
     response.json
   ```

5. **Monitor first scheduled run**
   - Wait for next hour boundary
   - Check CloudWatch Logs
   - Verify GitHub commits

---

### 6.2 Monitoring Checklist

**Daily checks (first week):**
- [ ] CloudWatch Logs - No errors
- [ ] GitHub commits - Expected frequency
- [ ] DynamoDB - lastSync timestamps updated
- [ ] CloudWatch Metrics - No throttling
- [ ] Lambda errors - Count = 0

**Weekly checks (ongoing):**
- [ ] Total invocations match schedule (24/day for hourly)
- [ ] Average duration stable
- [ ] GitHub repo size growth manageable
- [ ] No Slack API rate limit errors

---

## 7. Debugging Guide

### 7.1 Common Issues

**Issue:** "Missing required tokens"

**Debug Steps:**
1. Check Secrets Manager values:
   ```bash
   aws secretsmanager get-secret-value --secret-id chinchilla-ai-academy/slack
   ```
2. Verify IAM permissions for Secrets Manager
3. Check environment variables in Lambda config

---

**Issue:** "Slack API error: channel_not_found"

**Debug Steps:**
1. Verify channel ID in ChannelMapping table
2. Check bot is invited to channel
3. Test channel access with curl (see section 1.1)

---

**Issue:** "GitHub API error: 404"

**Debug Steps:**
1. Verify repo name in ChannelMapping
2. Check GitHub token permissions
3. Verify branch exists
4. Test GitHub API with curl (see section 1.2)

---

**Issue:** Lambda timeout after 300 seconds

**Debug Steps:**
1. Check number of active mappings
2. Check message count per channel
3. Increase timeout or reduce mappings
4. Add pagination for large message sets

---

### 7.2 Debug Logging

**Add verbose logging to handler:**

```typescript
// At start of processChannelMapping
console.log('DEBUG: Processing mapping:', JSON.stringify(mapping, null, 2));

// Before Slack API call
console.log('DEBUG: Fetching messages since:', mapping.lastSync);

// After Slack API response
console.log('DEBUG: Slack API response:', JSON.stringify(data, null, 2));

// Before GitHub API call
console.log('DEBUG: Committing file:', fileName, 'to', repo);
```

**Disable after debugging to reduce CloudWatch costs.**

---

## Summary

### Testing Phases Checklist

- [ ] **Phase 1:** Pre-development API testing (Slack, GitHub, Secrets Manager)
- [ ] **Phase 2:** Local component testing (message transformation, API clients)
- [ ] **Phase 3:** Sandbox deployment and manual invocation
- [ ] **Phase 4:** Integration testing (EventBridge, multiple mappings, errors)
- [ ] **Phase 5:** Performance testing (large volumes, stress tests)
- [ ] **Phase 6:** Production validation (smoke tests, monitoring)
- [ ] **Phase 7:** Debug and resolve any issues

### Success Metrics

✅ **All tests pass when:**
- Slack API returns messages successfully
- GitHub API creates commits successfully
- DynamoDB updates succeed
- Lambda executes without errors
- EventBridge schedule triggers on time
- CloudWatch Logs show expected output
- All active mappings are processed
- No timeout or memory errors

---

**Estimated Testing Time:**
- Pre-development: 1 hour
- Local testing: 1 hour
- Sandbox testing: 2-3 hours
- Integration testing: 2 hours
- Performance testing: 1 hour
- Production validation: 1 hour
- **Total: 8-10 hours**
