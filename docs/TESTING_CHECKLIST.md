# Slack Event Subscriptions Testing Checklist

## Pre-Testing Verification

### 1. Environment Setup
- [ ] Amplify sandbox is running and deployed
- [ ] `amplify_outputs.json` exists and contains `slackWebhookUrl`
- [ ] Webhook URL is accessible: `https://cxd4hozpld.execute-api.us-east-1.amazonaws.com/slack/events`

### 2. AWS Resources
- [ ] Lambda function `slack-webhook` is deployed
- [ ] Secrets Manager contains `chinchilla-ai-academy/slack` secret with bot token
- [ ] Secrets Manager contains `github-token` secret with GitHub token
- [ ] DynamoDB table for ChannelMapping exists (via Amplify Data)

### 3. Slack App Configuration
- [ ] Slack app is created in workspace
- [ ] Event Subscriptions are enabled
- [ ] Request URL is configured and verified
- [ ] Required bot events are subscribed
- [ ] Required OAuth scopes are granted
- [ ] App is installed/reinstalled in workspace

## Unit Tests

### Test 1: URL Verification Challenge
**Purpose**: Verify webhook responds correctly to Slack's URL verification

```bash
curl -X POST https://cxd4hozpld.execute-api.us-east-1.amazonaws.com/slack/events \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test_challenge_123"}'
```

**Expected Result**:
```json
{"challenge":"test_challenge_123"}
```

**Status**: ✅ PASSED (verified working)

---

### Test 2: Invalid JSON Payload
**Purpose**: Verify webhook handles malformed requests gracefully

```bash
curl -X POST https://cxd4hozpld.execute-api.us-east-1.amazonaws.com/slack/events \
  -H "Content-Type: application/json" \
  -d 'this is not json'
```

**Expected Result**:
- Status: 400 Bad Request
- Body contains error message

**Status**: ⏸️ PENDING

---

### Test 3: Missing Required Fields
**Purpose**: Verify validation catches incomplete message events

```bash
curl -X POST https://cxd4hozpld.execute-api.us-east-1.amazonaws.com/slack/events \
  -H "Content-Type: application/json" \
  -d '{"type":"event_callback","event":{"type":"message"}}'
```

**Expected Result**:
- Status: 400 Bad Request
- Error indicates missing required fields

**Status**: ⏸️ PENDING

---

### Test 4: Unsupported Event Type
**Purpose**: Verify webhook ignores non-message events

```bash
curl -X POST https://cxd4hozpld.execute-api.us-east-1.amazonaws.com/slack/events \
  -H "Content-Type: application/json" \
  -d '{"type":"event_callback","event":{"type":"app_home_opened","user":"U123"}}'
```

**Expected Result**:
- Status: 200 OK
- Message logged and ignored

**Status**: ⏸️ PENDING

---

## Integration Tests

### Test 5: End-to-End Message Flow
**Purpose**: Verify complete message archiving workflow

**Steps**:
1. Create a channel mapping in ChillTask UI:
   - Slack Channel: `#test-channel`
   - GitHub Repo: `owner/repo`
   - GitHub Branch: `main`
   - Context Folder: `context/slackconversation`
   - Active: ✅

2. Invite bot to #test-channel:
   ```
   /invite @ChillTask
   ```

3. Send a test message:
   ```
   Hello! This is a test message for archiving.
   ```

4. Check GitHub repository:
   - Navigate to `context/slackconversation/`
   - Verify new Markdown file exists
   - Verify file contains message content, username, and timestamp

**Expected Result**:
- File created in GitHub within 5-10 seconds
- File format: `YYYY-MM-DD-hello-this-is-a-TIMESTAMP.md`
- File contains proper Markdown formatting

**Status**: ⏸️ PENDING

---

### Test 6: Thread Message Handling
**Purpose**: Verify thread replies are captured

**Steps**:
1. Send a message in #test-channel
2. Reply to that message (create a thread)
3. Add multiple replies
4. Check GitHub file

**Expected Result**:
- File contains original message
- File contains "Thread Replies:" section
- All replies are listed with usernames and timestamps

**Status**: ⏸️ PENDING

---

### Test 7: Multiple Messages in Same Conversation
**Purpose**: Verify messages with same thread_ts append to same file

**Steps**:
1. Send a message
2. Reply in thread (same thread_ts)
3. Check GitHub
4. Send another reply
5. Check GitHub again

**Expected Result**:
- First message creates file
- Second message appends to same file (separated by `---`)
- No duplicate files created

**Status**: ⏸️ PENDING

---

### Test 8: Channel Without Mapping
**Purpose**: Verify messages in unmapped channels are ignored

**Steps**:
1. Create a new Slack channel
2. Invite bot to channel
3. Send a message
4. Check CloudWatch logs

**Expected Result**:
- Log message: "No active mapping found for channel"
- No GitHub commit attempted
- Status 200 returned to Slack

**Status**: ⏸️ PENDING

---

### Test 9: Inactive Mapping
**Purpose**: Verify isActive flag is respected

**Steps**:
1. Set existing channel mapping to `isActive: false`
2. Send a message in that channel
3. Check CloudWatch logs

**Expected Result**:
- No mapping found (query filters by isActive: true)
- No GitHub commit attempted

**Status**: ⏸️ PENDING

---

## Error Handling Tests

### Test 10: Invalid Slack Token
**Purpose**: Verify graceful handling of authentication errors

**Steps**:
1. Temporarily update Slack secret with invalid token
2. Send a message in mapped channel
3. Check CloudWatch logs

**Expected Result**:
- Error logged: "Slack API returned error"
- Retry attempts logged
- Status 500 returned (Slack will retry)

**Status**: ⏸️ PENDING

---

### Test 11: Invalid GitHub Token
**Purpose**: Verify graceful handling of GitHub auth errors

**Steps**:
1. Temporarily update GitHub secret with invalid token
2. Send a message in mapped channel
3. Check CloudWatch logs

**Expected Result**:
- Error logged: "GitHub API error: 401"
- Retry attempts logged
- Status 500 returned

**Status**: ⏸️ PENDING

---

### Test 12: GitHub Repository Not Found
**Purpose**: Verify handling of non-existent GitHub repo

**Steps**:
1. Create mapping with non-existent GitHub repo
2. Send a message
3. Check CloudWatch logs

**Expected Result**:
- Error logged: "GitHub API error: 404"
- Status 500 returned

**Status**: ⏸️ PENDING

---

### Test 13: Lambda Timeout
**Purpose**: Verify timeout handling

**Steps**:
1. Create large thread (50+ messages)
2. Send new message in thread
3. Monitor CloudWatch for timeout

**Expected Result**:
- Operation completes within 60 seconds (Lambda timeout)
- If timeout occurs, status 500 returned
- Timeout error logged

**Status**: ⏸️ PENDING

---

## Performance Tests

### Test 14: High Volume Messages
**Purpose**: Verify system handles burst traffic

**Steps**:
1. Send 20 messages rapidly in mapped channel
2. Monitor CloudWatch metrics
3. Verify all messages archived

**Expected Result**:
- All messages processed
- No throttling errors
- Average processing time < 5 seconds

**Status**: ⏸️ PENDING

---

### Test 15: Concurrent Channels
**Purpose**: Verify handling of messages from multiple channels

**Steps**:
1. Create 3 channel mappings
2. Send messages simultaneously in all 3 channels
3. Verify all archives correctly

**Expected Result**:
- All messages processed independently
- No race conditions
- All files created correctly

**Status**: ⏸️ PENDING

---

## Security Tests

### Test 16: Request Signing (Future Enhancement)
**Purpose**: Verify only Slack can invoke webhook

**Status**: ❌ NOT IMPLEMENTED (future enhancement)

**Notes**:
- Current implementation: Webhook is public, no signing verification
- Future: Implement Slack request signing verification

---

### Test 17: Secrets Access
**Purpose**: Verify Lambda can only access required secrets

**Steps**:
1. Review Lambda IAM policy
2. Verify policy only allows reading specific secrets

**Expected Result**:
- Policy allows: `chinchilla-ai-academy/slack-*` and `github-token-*`
- Policy denies: Other secrets

**Status**: ⏸️ PENDING

---

## Monitoring Tests

### Test 18: CloudWatch Logs
**Purpose**: Verify structured logging is working

**Steps**:
1. Send a test message
2. Check CloudWatch logs

**Expected Result**:
- Logs are JSON formatted
- Logs include: level, timestamp, message, context
- Error logs include stack traces

**Status**: ⏸️ PENDING

---

### Test 19: CloudWatch Alarms (if configured)
**Purpose**: Verify alarms trigger on errors

**Steps**:
1. Trigger an error condition (invalid token)
2. Send 6+ messages (exceed alarm threshold)
3. Check CloudWatch Alarms

**Expected Result**:
- Error alarm triggers after 5 errors in 5 minutes
- Alarm notification sent (if SNS configured)

**Status**: ⏸️ PENDING

---

## Cleanup and Rollback Tests

### Test 20: Secret Rotation
**Purpose**: Verify system continues working after token rotation

**Steps**:
1. Generate new Slack bot token
2. Update secret in Secrets Manager
3. Send test message
4. Verify archives correctly

**Expected Result**:
- Lambda picks up new token
- No errors
- Message archives successfully

**Status**: ⏸️ PENDING

---

## Test Results Summary

| Test # | Test Name | Status | Date | Notes |
|--------|-----------|--------|------|-------|
| 1 | URL Verification | ✅ PASSED | 2025-10-09 | Working correctly |
| 2 | Invalid JSON | ⏸️ PENDING | - | - |
| 3 | Missing Fields | ⏸️ PENDING | - | - |
| 4 | Unsupported Event | ⏸️ PENDING | - | - |
| 5 | End-to-End Flow | ⏸️ PENDING | - | - |
| 6 | Thread Handling | ⏸️ PENDING | - | - |
| 7 | Multiple Messages | ⏸️ PENDING | - | - |
| 8 | Unmapped Channel | ⏸️ PENDING | - | - |
| 9 | Inactive Mapping | ⏸️ PENDING | - | - |
| 10 | Invalid Slack Token | ⏸️ PENDING | - | - |
| 11 | Invalid GitHub Token | ⏸️ PENDING | - | - |
| 12 | Repo Not Found | ⏸️ PENDING | - | - |
| 13 | Lambda Timeout | ⏸️ PENDING | - | - |
| 14 | High Volume | ⏸️ PENDING | - | - |
| 15 | Concurrent Channels | ⏸️ PENDING | - | - |
| 16 | Request Signing | ❌ NOT IMPLEMENTED | - | Future enhancement |
| 17 | Secrets Access | ⏸️ PENDING | - | - |
| 18 | CloudWatch Logs | ⏸️ PENDING | - | - |
| 19 | CloudWatch Alarms | ⏸️ PENDING | - | - |
| 20 | Secret Rotation | ⏸️ PENDING | - | - |

## Running the Tests

### Automated Testing (Future)
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Full test suite
npm run test:all
```

### Manual Testing
1. Follow steps in each test case above
2. Mark test as PASSED or FAILED
3. Record date and any notes
4. If FAILED, create issue for investigation

## Test Environment Requirements

- **AWS Account**: Sandbox or dev environment
- **Slack Workspace**: Test workspace (not production)
- **GitHub Repository**: Test repository
- **Test Data**: Sample messages, threads, users

## Notes

- Tests 1-4 can be run immediately with curl
- Tests 5-15 require Slack app setup and channel mappings
- Tests 16-20 require AWS Console access
- Consider creating automated test suite for regression testing
