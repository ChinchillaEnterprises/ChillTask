# Slack Webhook Error Handling & Monitoring Guide

## Overview

This document describes the production-ready error handling, retry logic, and monitoring implemented for the Slack webhook system.

## Error Handling Features

### 1. Structured Logging

All logs are output in JSON format for easy parsing with CloudWatch Insights:

```typescript
{
  "level": "INFO" | "WARN" | "ERROR",
  "timestamp": "2025-10-09T12:34:56.789Z",
  "message": "Description of the event",
  "channelId": "C1234567890",
  "userId": "U9876543210",
  // ... additional context
}
```

**Log Levels:**
- `INFO`: Successful operations, processing steps
- `WARN`: Non-fatal issues, retries, fallback behavior
- `ERROR`: Critical failures with full error details and stack traces

### 2. Input Validation

All incoming Slack events are validated before processing:

- Request body must be valid JSON
- Required fields are checked (`type`, `event`, `channel`, `user`, `text`, `ts`)
- Invalid requests return HTTP 400 with descriptive error messages
- Validation errors are logged with request preview for debugging

### 3. Retry Logic with Exponential Backoff

All external API calls (Slack, GitHub, Secrets Manager, DynamoDB) use automatic retry logic:

**Configuration:**
- Max retries: 3 attempts
- Initial delay: 1 second
- Backoff multiplier: 2x (1s, 2s, 4s)

**Retry Strategy:**
- Retries transient failures (network errors, 5xx responses)
- Does NOT retry validation errors (4xx responses)
- Logs each retry attempt with delay and error details

**Example:**
```typescript
await retryWithBackoff(
  () => commitToGitHub(params),
  'commitToGitHub'
);
```

### 4. Timeout Protection

All operations have timeouts to prevent Lambda from hanging:

**Timeouts:**
- Overall request timeout: 25 seconds (Lambda timeout is 30s)
- External API calls: 10-15 seconds each
- Slack API calls: 10 seconds
- GitHub API calls: 10-15 seconds

**Behavior:**
- Timeout errors are caught and logged
- Returns HTTP 500 to allow Slack to retry
- CloudWatch alarms trigger if timeouts occur frequently

### 5. Graceful Degradation

Non-critical failures use fallback values:

**Examples:**
- If Slack user fetch fails → Use "User {userId}" as fallback
- If thread messages fetch fails → Continue with single message only
- Logs warning but continues processing

### 6. Smart Error Responses

HTTP status codes tell Slack whether to retry:

- **200 OK**: Success, don't retry
- **400 Bad Request**: Invalid input, don't retry (validation errors)
- **500 Internal Server Error**: Temporary failure, Slack will retry

**Security:**
- Error messages to Slack are generic ("Temporary error, please retry")
- Detailed error information is only in CloudWatch logs
- No sensitive data exposed to external systems

## CloudWatch Alarms

### Alarm 1: Lambda Errors

**Name:** `slack-webhook-errors`

**Triggers when:**
- More than 5 errors in any 5-minute period

**What to check:**
- View CloudWatch Logs for error details
- Check if errors are transient (network) or persistent (bug)
- Look for error patterns in structured logs

**Query to investigate:**
```
fields @timestamp, message, errorType, errorMessage, channelId
| filter level = "ERROR"
| sort @timestamp desc
| limit 100
```

### Alarm 2: Lambda Throttles

**Name:** `slack-webhook-throttles`

**Triggers when:**
- Function is throttled 3+ times in 5 minutes

**What to check:**
- Review Lambda concurrency settings
- Check if message volume is unusually high
- Consider increasing reserved concurrency

**Actions:**
- Increase function's reserved concurrency
- Review Slack message volume patterns
- Check for potential spam/abuse

### Alarm 3: High Invocation Count

**Name:** `slack-webhook-high-invocations`

**Triggers when:**
- More than 100 invocations in 5 minutes (for 2 consecutive periods)

**What to check:**
- Potential spam or abuse
- Slack bot loops (bot replying to itself)
- Misconfigured channel mapping

**Actions:**
- Review Slack message patterns
- Check for bot loop scenarios
- Verify channel mapping configuration
- Consider rate limiting if needed

### Alarm 4: Long Execution Time

**Name:** `slack-webhook-long-duration`

**Triggers when:**
- Average execution time > 20 seconds (for 2 consecutive periods)

**What to check:**
- Slow GitHub API responses
- Slow Slack API responses
- Database query performance
- Network latency issues

**Query to investigate:**
```
fields @timestamp, processingTimeMs, channelId, githubRepo
| filter level = "INFO" and message = "Message processed successfully"
| stats avg(processingTimeMs), max(processingTimeMs), count() by bin(5m)
```

### Alarm 5: DLQ Message Count

**Name:** `slack-webhook-dlq-messages`

**Triggers when:**
- Any message appears in the Dead Letter Queue

**What to check:**
- View messages in DLQ via AWS Console
- Messages in DLQ represent failures after all retries
- Check error patterns to identify root cause

**Actions to inspect DLQ:**

1. **Via AWS Console:**
   - Navigate to SQS → `slack-webhook-dlq`
   - Click "Send and receive messages"
   - Click "Poll for messages"
   - View message body and attributes

2. **Via AWS CLI:**
   ```bash
   aws sqs receive-message \
     --queue-url https://sqs.us-east-1.amazonaws.com/YOUR-ACCOUNT/slack-webhook-dlq \
     --max-number-of-messages 10 \
     --wait-time-seconds 5
   ```

3. **Purge DLQ after fixing issues:**
   ```bash
   aws sqs purge-queue \
     --queue-url https://sqs.us-east-1.amazonaws.com/YOUR-ACCOUNT/slack-webhook-dlq
   ```

## Monitoring Dashboard Queries

### CloudWatch Insights Queries

**1. Error Summary (Last Hour)**
```
fields @timestamp, errorType, errorMessage, functionName, channelId
| filter level = "ERROR"
| stats count() as errorCount by errorType, errorMessage
| sort errorCount desc
```

**2. Performance Metrics**
```
fields @timestamp, processingTimeMs, channelId
| filter message = "Message processed successfully"
| stats avg(processingTimeMs) as avgMs,
        max(processingTimeMs) as maxMs,
        min(processingTimeMs) as minMs,
        count() as totalRequests
  by bin(5m)
```

**3. Retry Analysis**
```
fields @timestamp, message, attempt, error
| filter message like /retrying/
| stats count() as retryCount by bin(5m)
```

**4. Channel Activity**
```
fields @timestamp, channelId, userName
| filter message = "Message successfully archived to GitHub"
| stats count() as messageCount by channelId
| sort messageCount desc
```

**5. Failed Operations by Type**
```
fields @timestamp, functionName, errorMessage
| filter level = "ERROR"
| stats count() as failures by functionName
| sort failures desc
```

## Testing Error Scenarios

### 1. Test Invalid Input

Send malformed JSON to webhook:
```bash
curl -X POST https://YOUR-API-URL/slack/events \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
```

**Expected:**
- HTTP 400 response
- Error logged with validation details
- No retries from Slack

### 2. Test Missing Required Fields

```bash
curl -X POST https://YOUR-API-URL/slack/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "event_callback",
    "event": {
      "type": "message"
    }
  }'
```

**Expected:**
- HTTP 400 response
- Clear error message about missing fields
- Logged as validation error

### 3. Test Timeout Handling

Temporarily increase processing time or reduce timeout threshold, then:
- Send normal Slack message
- Function should timeout and return 500
- Slack will retry automatically

### 4. Test Retry Logic

Temporarily break GitHub token or repository URL, then:
- Send Slack message
- Watch logs for retry attempts
- Should see 3 retry attempts with exponential backoff
- Final error logged after all retries exhausted

### 5. Test Rate Limiting

Send 150+ messages within 5 minutes:
- High invocation alarm should trigger
- All messages should still process
- Check for throttling warnings

## Production Monitoring Checklist

### Daily Checks
- [ ] Review CloudWatch Alarms status
- [ ] Check DLQ for any failed messages
- [ ] Verify no throttling occurred
- [ ] Review error rate (should be < 1%)

### Weekly Checks
- [ ] Analyze performance trends (average duration)
- [ ] Review retry patterns
- [ ] Check for unusual channel activity
- [ ] Verify all channel mappings are working

### Monthly Checks
- [ ] Review and purge old DLQ messages
- [ ] Analyze cost trends
- [ ] Optimize timeout and retry settings if needed
- [ ] Update alarm thresholds based on actual usage

## Troubleshooting Common Issues

### Issue: High Error Rate

**Symptoms:** `slack-webhook-errors` alarm triggered

**Investigation:**
1. Check CloudWatch Logs for error patterns
2. Identify if errors are from Slack API, GitHub API, or database
3. Look for error clustering by channel or time

**Common Causes:**
- Slack API rate limiting
- GitHub API rate limiting
- Invalid GitHub credentials
- Network connectivity issues

**Solutions:**
- Verify API tokens are valid
- Check rate limit headers in API responses
- Implement additional backoff if rate limited
- Contact support if persistent

### Issue: Slow Performance

**Symptoms:** `slack-webhook-long-duration` alarm triggered

**Investigation:**
```
fields @timestamp, processingTimeMs, channelId
| filter message = "Message processed successfully"
| stats avg(processingTimeMs) by bin(1h)
```

**Common Causes:**
- Large thread messages (many replies)
- Slow GitHub API responses
- Network latency spikes

**Solutions:**
- Optimize thread message fetching (pagination)
- Cache Slack user information
- Increase Lambda memory allocation
- Review GitHub repository size

### Issue: Messages Not Archiving

**Symptoms:** No errors but messages not appearing in GitHub

**Investigation:**
1. Check if channel has active mapping
2. Verify GitHub credentials
3. Check repository and branch exist
4. Review logs for processing confirmations

**Query:**
```
fields @timestamp, message, channelId, githubRepo
| filter channelId = "C1234567890"
| sort @timestamp desc
```

### Issue: DLQ Messages Accumulating

**Symptoms:** `slack-webhook-dlq-messages` alarm triggered

**Investigation:**
1. View messages in DLQ
2. Identify error pattern
3. Check if systemic issue or isolated failures

**Actions:**
1. Fix root cause (bad config, permissions, etc.)
2. Manually reprocess DLQ messages if needed
3. Purge DLQ after verification

## Cost Optimization

### Current Configuration

**Lambda:**
- Memory: 512 MB (default)
- Timeout: 30 seconds
- Estimated cost: ~$0.20 per 1M requests

**SQS DLQ:**
- 14-day retention
- Estimated cost: Negligible (only failed messages)

**CloudWatch:**
- Alarms: 5 alarms × $0.10 = $0.50/month
- Logs: ~$0.50 per GB ingested + storage

### Optimization Tips

1. **Reduce Lambda memory** if CPU usage is low:
   ```typescript
   // In resource.ts
   timeout: 30,
   memorySize: 256 // Reduce from 512
   ```

2. **Adjust log retention:**
   - Default: Never expire
   - Recommended: 30-90 days for production

3. **Optimize alarm periods:**
   - Increase evaluation period if too many false positives
   - Decrease if missing real issues

## Security Best Practices

1. **Never log sensitive data:**
   - Tokens are never logged
   - User emails are partially masked in logs
   - Request bodies limited to 200 characters in error logs

2. **Error message sanitization:**
   - Generic errors returned to Slack
   - Detailed errors only in CloudWatch

3. **DLQ encryption:**
   - Consider enabling KMS encryption for DLQ
   - Add in backend.ts: `encryption: QueueEncryption.KMS`

4. **Alarm notifications:**
   - Set up SNS topic for alarm notifications
   - Configure email/SMS alerts for critical alarms

## Next Steps

### Recommended Enhancements

1. **Add SNS notifications:**
   ```typescript
   const alarmTopic = new sns.Topic(backend.stack, 'AlarmTopic');
   errorAlarm.addAlarmAction(new SnsAction(alarmTopic));
   ```

2. **Add custom metrics:**
   - Track successful archival rate
   - Monitor API call duration separately
   - Count retries per operation type

3. **Implement circuit breaker:**
   - Temporarily disable processing if error rate too high
   - Prevent cascading failures

4. **Add health check endpoint:**
   - Test Slack API connectivity
   - Test GitHub API connectivity
   - Test database connectivity

5. **Enhance DLQ processing:**
   - Add Lambda to automatically reprocess DLQ messages
   - Send notifications when DLQ messages arrive

## Support Contacts

**For alarm notifications:**
- Set up SNS topic with email subscription
- Configure PagerDuty/Slack notifications

**For urgent issues:**
- Check CloudWatch Logs first
- Review this document for common issues
- Contact AWS support for infrastructure issues
