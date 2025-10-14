# Error Handling Testing Guide

## Overview

This guide provides step-by-step instructions for testing all error handling scenarios in the Slack webhook system.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Access to CloudWatch Logs
- Slack workspace with webhook configured
- GitHub repository configured for testing

## Test Scenarios

### 1. Input Validation Testing

#### Test 1.1: Invalid JSON

**Purpose:** Verify the function rejects malformed JSON

**Steps:**
```bash
curl -X POST https://YOUR-API-GATEWAY-URL/slack/events \
  -H "Content-Type: application/json" \
  -d 'invalid json here'
```

**Expected Results:**
- HTTP 400 status code
- Response: `{"error":"Invalid request","message":"..."}`
- CloudWatch log entry with `level: "ERROR"` and `errorType: "ValidationError"`

**Verification Query:**
```
fields @timestamp, level, errorType, message
| filter level = "ERROR" and errorType = "ValidationError"
| sort @timestamp desc
| limit 10
```

#### Test 1.2: Missing Required Fields

**Purpose:** Verify validation of required Slack event fields

**Steps:**
```bash
curl -X POST https://YOUR-API-GATEWAY-URL/slack/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "event_callback",
    "event": {
      "type": "message"
    }
  }'
```

**Expected Results:**
- HTTP 400 status code
- Error message mentioning missing fields
- Logged as validation error

#### Test 1.3: Valid URL Verification

**Purpose:** Verify URL verification challenge handling

**Steps:**
```bash
curl -X POST https://YOUR-API-GATEWAY-URL/slack/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "url_verification",
    "challenge": "test-challenge-123"
  }'
```

**Expected Results:**
- HTTP 200 status code
- Response: `{"challenge":"test-challenge-123"}`
- INFO log entry for URL verification

### 2. Retry Logic Testing

#### Test 2.1: Transient Network Failure

**Purpose:** Verify retry logic for temporary failures

**Setup:**
1. Temporarily modify GitHub token to invalid value in Secrets Manager
2. Send a test Slack message

**Steps:**
```bash
# In AWS Console: Update GitHub secret with invalid token
# Then send a test message from Slack channel
```

**Expected Results:**
- Function attempts 3 retries (logged)
- Each retry has exponential backoff (1s, 2s, 4s)
- Final error logged after all retries
- HTTP 500 returned to Slack (for retry)

**Verification Query:**
```
fields @timestamp, message, attempt, delay, error
| filter message like /retrying/
| sort @timestamp desc
```

**Expected Log Sequence:**
```json
{"level":"INFO","message":"Executing commitToGitHub","attempt":1}
{"level":"WARN","message":"commitToGitHub failed, retrying...","attempt":1,"delay":1000}
{"level":"INFO","message":"Executing commitToGitHub","attempt":2}
{"level":"WARN","message":"commitToGitHub failed, retrying...","attempt":2,"delay":2000}
{"level":"INFO","message":"Executing commitToGitHub","attempt":3}
{"level":"WARN","message":"commitToGitHub failed, retrying...","attempt":3,"delay":4000}
{"level":"ERROR","message":"commitToGitHub failed after 4 attempts"}
```

**Cleanup:** Restore correct GitHub token

#### Test 2.2: Non-Retryable Error

**Purpose:** Verify that validation errors are NOT retried

**Setup:**
1. Modify channel mapping to point to non-existent GitHub repo

**Expected Results:**
- No retry attempts
- Single error logged
- HTTP 200 returned to Slack (don't retry)

### 3. Timeout Testing

#### Test 3.1: External API Timeout

**Purpose:** Verify timeout handling for slow APIs

**Note:** This is difficult to test without mocking. Monitor production logs for natural timeout occurrences.

**Expected Behavior:**
- Request times out after configured period
- Error logged with "timed out after Xms" message
- HTTP 500 returned for retry

**Verification Query:**
```
fields @timestamp, message, errorMessage
| filter errorMessage like /timed out/
| sort @timestamp desc
```

### 4. Graceful Degradation Testing

#### Test 4.1: Slack User Fetch Failure

**Purpose:** Verify fallback when user info unavailable

**Setup:**
1. Temporarily modify Slack token to invalid value
2. Send test message

**Expected Results:**
- Warning logged about failing to fetch user name
- Continues with fallback: "User {userId}"
- Message still archived successfully
- GitHub commit uses fallback username

**Verification:**
- Check GitHub commit for "User U1234567890" format
- Verify message was archived despite user fetch failure

#### Test 4.2: Thread Fetch Failure

**Purpose:** Verify processing continues without thread data

**Setup:**
1. Reply to a thread in Slack
2. Temporarily break Slack API access

**Expected Results:**
- Warning logged about thread fetch failure
- Message archived without thread context
- Processing completes successfully

### 5. CloudWatch Alarms Testing

#### Test 5.1: Error Rate Alarm

**Purpose:** Trigger the error rate alarm

**Steps:**
1. Send 10+ messages with invalid channel mapping
2. Wait 5 minutes
3. Check CloudWatch Alarms

**Expected Results:**
- `slack-webhook-errors` alarm transitions to ALARM state
- Can view in AWS Console → CloudWatch → Alarms

**Query to verify:**
```
fields @timestamp, level
| filter level = "ERROR"
| stats count() by bin(5m)
```

**Cleanup:** Fix channel mapping, alarm should auto-resolve

#### Test 5.2: High Invocation Alarm

**Purpose:** Trigger high invocation alarm

**Steps:**
1. Send 100+ messages within 5 minutes (use script or bot)
2. Maintain this rate for 10 minutes (2 consecutive periods)

**Expected Results:**
- `slack-webhook-high-invocations` alarm triggers
- All messages still processed successfully

**Cleanup:** Stop sending messages, alarm auto-resolves

#### Test 5.3: Duration Alarm

**Purpose:** Trigger long execution time alarm

**Note:** Difficult to trigger without large thread messages

**Expected Results:**
- Alarm triggers if average duration > 20 seconds
- Check for performance bottlenecks

### 6. Dead Letter Queue Testing

#### Test 6.1: DLQ Message Creation

**Note:** DLQ is for async invocation failures. API Gateway invocations are synchronous, so DLQ won't capture normal errors.

**To test DLQ (requires async invocation):**
1. Create a test Lambda trigger that invokes slack-webhook asynchronously
2. Cause the function to throw unhandled exception
3. Check DLQ for message

**Alternative:** Monitor DLQ in production for any unexpected failures

**Verification:**
```bash
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/YOUR-ACCOUNT/slack-webhook-dlq \
  --attribute-names ApproximateNumberOfMessages
```

**Expected:** `"ApproximateNumberOfMessages": "0"` under normal conditions

### 7. Performance Testing

#### Test 7.1: Normal Load

**Purpose:** Establish baseline performance metrics

**Steps:**
1. Send 50 messages over 10 minutes
2. Query CloudWatch for performance data

**Query:**
```
fields @timestamp, processingTimeMs, channelId
| filter message = "Message processed successfully"
| stats avg(processingTimeMs) as avgMs,
        max(processingTimeMs) as maxMs,
        min(processingTimeMs) as minMs,
        pct(processingTimeMs, 95) as p95Ms,
        pct(processingTimeMs, 99) as p99Ms,
        count() as total
```

**Expected Results:**
- Average: 2-5 seconds
- P95: < 8 seconds
- P99: < 12 seconds
- Max: < 20 seconds

#### Test 7.2: Large Thread Messages

**Purpose:** Test performance with large threads

**Steps:**
1. Create a Slack thread with 20+ replies
2. Send a new message to that thread
3. Monitor processing time

**Expected:**
- Longer processing time (5-10 seconds)
- Still completes within timeout
- No errors

### 8. Error Response Testing

#### Test 8.1: Transient Error Response

**Purpose:** Verify HTTP 500 for retryable errors

**Steps:**
1. Cause a transient error (temp invalid token)
2. Check response status code

**Expected:**
- HTTP 500 status code
- Generic error message in response
- Detailed error in CloudWatch only

#### Test 8.2: Validation Error Response

**Purpose:** Verify HTTP 400 for validation errors

**Steps:**
1. Send invalid event data
2. Check response

**Expected:**
- HTTP 400 status code
- Descriptive error message
- No retry from Slack

### 9. Logging Verification

#### Test 9.1: Structured Logs

**Purpose:** Verify all logs are properly structured JSON

**Query:**
```
fields @timestamp, level, message, channelId, errorType
| sort @timestamp desc
| limit 100
```

**Verification:**
- All log entries are valid JSON
- Include timestamp, level, message
- Context fields present where appropriate
- No sensitive data (tokens, full user emails)

#### Test 9.2: Error Context

**Purpose:** Verify error logs include full context

**Query:**
```
fields @timestamp, message, errorType, errorMessage, stack, channelId, userId, functionName
| filter level = "ERROR"
| sort @timestamp desc
| limit 20
```

**Verification:**
- Error type captured
- Error message present
- Stack trace included
- Request context (channelId, userId) included
- Function name where error occurred

### 10. End-to-End Success Testing

#### Test 10.1: Complete Happy Path

**Purpose:** Verify full successful flow

**Steps:**
1. Send a simple message in mapped Slack channel
2. Verify message appears in GitHub
3. Check all logs are INFO level
4. Verify stats updated

**Expected Results:**
- Message archived within 5 seconds
- GitHub file created/updated
- ChannelMapping messageCount incremented
- lastSync timestamp updated
- Only INFO level logs

**Verification:**
```bash
# Check GitHub
git pull origin main
cat context/slackconversation/YYYY-MM-DD-*.md

# Check logs
# Query CloudWatch for request ID, verify all INFO
```

## Test Automation Script

Create a simple test script:

```bash
#!/bin/bash
# test-error-handling.sh

API_URL="YOUR-API-GATEWAY-URL/slack/events"

echo "Testing error handling scenarios..."

echo "\n1. Testing invalid JSON..."
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d 'invalid json' \
  -w "\nHTTP Status: %{http_code}\n"

echo "\n2. Testing missing fields..."
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"type":"event_callback","event":{"type":"message"}}' \
  -w "\nHTTP Status: %{http_code}\n"

echo "\n3. Testing URL verification..."
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test123"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo "\nTests complete. Check CloudWatch Logs for details."
```

## CloudWatch Insights Saved Queries

Save these queries in CloudWatch for quick access:

**1. Error Summary (Last Hour)**
```
fields @timestamp, errorType, errorMessage, channelId
| filter level = "ERROR"
| stats count() as errorCount by errorType, errorMessage
| sort errorCount desc
```

**2. Retry Analysis**
```
fields @timestamp, message, attempt, error
| filter message like /retrying/
| stats count() as retryCount by error
```

**3. Performance by Channel**
```
fields @timestamp, processingTimeMs, channelId
| filter message = "Message processed successfully"
| stats avg(processingTimeMs) as avgMs, count() as total by channelId
| sort avgMs desc
```

**4. Timeout Detection**
```
fields @timestamp, message, errorMessage, operationName
| filter errorMessage like /timed out/
| sort @timestamp desc
```

## Success Criteria

All tests should demonstrate:

✅ Input validation catches invalid requests
✅ Retry logic attempts 3 times with backoff
✅ Timeouts prevent hanging requests
✅ Graceful degradation uses fallback values
✅ Alarms trigger at appropriate thresholds
✅ Error responses use correct HTTP codes
✅ Logs are structured and include context
✅ No sensitive data in logs or responses
✅ DLQ remains empty under normal operation
✅ End-to-end flow completes successfully

## Continuous Monitoring

After initial testing, set up continuous monitoring:

1. **Daily:** Review CloudWatch Alarms dashboard
2. **Weekly:** Run performance queries to check for degradation
3. **Monthly:** Review DLQ for any accumulated messages
4. **Quarterly:** Re-run full test suite to verify behavior

## Troubleshooting Test Failures

If tests fail:

1. **Check CloudWatch Logs** for detailed error information
2. **Verify AWS credentials** and permissions
3. **Confirm Secrets Manager** values are correct
4. **Check API Gateway** URL is correct
5. **Verify channel mapping** configuration
6. **Review recent code changes** that might affect behavior

## Next Steps

After successful testing:

1. Document any findings or issues
2. Update thresholds based on actual behavior
3. Configure SNS notifications for alarms
4. Set up automated testing in CI/CD pipeline
5. Create runbook for common error scenarios
