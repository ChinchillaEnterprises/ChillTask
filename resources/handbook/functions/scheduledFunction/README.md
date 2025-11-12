# Scheduled Function Example

⚠️ **IMPORTANT FIXES**: This example has been updated to fix common TypeScript and CDK issues:
- ✅ Uses `EventBridgeEvent<string, any>` instead of `ScheduledHandler` for proper return types
- ✅ Imports `Duration` from `aws-cdk-lib` not `aws-events`
- ✅ Shows complete authorization setup with `resourceGroupName: 'data'`
- ✅ See `backend-setup.md` for complete, copy-paste ready backend configuration

## Purpose
This educational example demonstrates how to create AWS Lambda functions that run on a schedule using EventBridge (formerly CloudWatch Events). It showcases real-world patterns for automated data processing, external API integration, and database operations in an AWS Amplify Gen 2 environment.

## What You'll Learn

### Core Scheduling Concepts
- **EventBridge Integration** - How to trigger Lambda functions on cron schedules
- **External API Integration** - Best practices for fetching data from third-party services
- **Database Operations** - Storing and updating data via GraphQL with DynamoDB
- **IAM Authentication** - Secure Lambda-to-AppSync communication without tokens
- **Error Handling** - Comprehensive failure handling and recovery strategies
- **Batch Processing** - Efficient processing of multiple items with concurrency control
- **Data Lifecycle Management** - Active/inactive record patterns and cleanup strategies
- **Monitoring & Observability** - Structured logging and performance tracking

### Common Use Cases Covered
- Daily data synchronization from external systems (CRM, payment processors)
- Periodic cleanup of expired records and data archiving
- Automated report generation and business intelligence tasks
- Health checks and system monitoring
- Batch processing of queued items and background tasks

## Files Structure
- `handler.ts` - Main Lambda function with comprehensive educational examples
- `resource.ts` - Function configuration with scheduling patterns and best practices
- `README.md` - This comprehensive documentation

## Function Overview

### Input (EventBridge Event)
EventBridge automatically sends a scheduled event object containing:
```json
{
  "id": "event-id",
  "detail-type": "Scheduled Event", 
  "source": "aws.events",
  "account": "123456789012",
  "time": "2024-01-01T12:00:00Z",
  "region": "us-east-1",
  "resources": ["arn:aws:events:us-east-1:123456789012:rule/rule-name"]
}
```

### Environment Variables
Configurable via `resource.ts`:
- `ENV` - Environment identifier (dev, staging, prod)
- `REGION` - AWS region for consistency
- `EXTERNAL_API_URL` - External API endpoint for data fetching
- `ENABLE_BATCH_PROCESSING` - Feature flag for optional batch operations
- `BATCH_SIZE` - Number of items to process in parallel batches
- `KEEP_RECORDS_DAYS` - Data retention period for cleanup operations
- `LOG_LEVEL` - Logging verbosity control

### Output Response
Returns structured JSON response:
```json
{
  "statusCode": 200,
  "body": {
    "message": "Daily sync completed successfully",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "recordsProcessed": 42,
    "processingTimeMs": 5432,
    "syncId": "database-record-id"
  }
}
```

## How to Implement

### Step 1: Add Function to Backend
In your `amplify/backend.ts` file:

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { Stack, Duration } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { scheduledFunctionExample } from './examples/functions/scheduledFunction/resource';

const backend = defineBackend({
  // ... your other resources (auth, data, storage)
  scheduledFunctionExample, // MUST be registered here for permissions
});

// Get the stack for creating rules
const functionStack = Stack.of(backend.scheduledFunctionExample.resources.lambda);

// Create EventBridge rule for scheduling
const scheduledRule = new events.Rule(functionStack, 'DailyDataSync', {
  schedule: events.Schedule.cron({ 
    minute: '0', 
    hour: '2',    // 2 AM UTC
    day: '*',     // Every day
    month: '*',   // Every month
    year: '*'     // Every year
  }),
  description: 'Daily data synchronization at 2 AM UTC',
});

// Add Lambda as target
scheduledRule.addTarget(
  new targets.LambdaFunction(backend.scheduledFunctionExample.resources.lambda)
);
```

### Step 2: Update Database Schema
In your `amplify/data/resource.ts`, add a model for tracking sync records:

```typescript
const schema = a.schema({
  DailySync: a.model({
    date: a.string().required(),
    source: a.string().required(),
    data: a.string().required(),
    status: a.enum(['success', 'failed', 'partial']),
    recordCount: a.integer(),
    executedAt: a.string().required(),
    isActive: a.boolean().default(true),
    processingTime: a.integer(),
  })
  .authorization((allow) => [
    allow.resource(scheduledFunctionExample), // Allow Lambda function access
  ]),
});
```

### Step 3: Deploy and Test
```bash
# Deploy to AWS
npx ampx sandbox

# Test the function manually in AWS Console
# Monitor CloudWatch logs for execution details
```

## Educational Scheduling Patterns

### Daily Processing Patterns
Perfect for data synchronization, report generation, cleanup tasks:

```typescript
// Every day at 2 AM UTC (good for low-traffic hours)
Schedule.cron({ minute: '0', hour: '2' })

// Twice daily at 6 AM and 6 PM UTC
Schedule.cron({ minute: '0', hour: '6,18' })

// Weekdays only at 9 AM UTC (business data sync)
Schedule.cron({ minute: '0', hour: '9', weekDay: 'MON-FRI' })
```

### High-Frequency Patterns
Perfect for monitoring, health checks, real-time data feeds:

```typescript
// Every 15 minutes (high-frequency monitoring)
Schedule.rate(Duration.minutes(15))

// Every 30 minutes during business hours
Schedule.cron({ minute: '0,30', hour: '9-17', weekDay: 'MON-FRI' })

// Every hour on the hour
Schedule.cron({ minute: '0' })
```

### Periodic Maintenance Patterns
Perfect for cleanup, archiving, reports:

```typescript
// Weekly maintenance on Sunday at 3 AM UTC
Schedule.cron({ minute: '0', hour: '3', weekDay: 'SUN' })

// Monthly report on 1st of each month at 1 AM UTC
Schedule.cron({ minute: '0', hour: '1', day: '1' })

// Quarterly cleanup (use Lambda logic for complex scheduling)
Schedule.cron({ minute: '0', hour: '2', day: '1', month: '1,4,7,10' })
```

## Educational Code Patterns

### Pattern 1: External API Integration
```typescript
// Example: Fetching customer data from external CRM
async function fetchCustomerData(): Promise<CustomerData[]> {
  try {
    const response = await fetch(`${process.env.CRM_API_URL}/customers`, {
      headers: {
        'Authorization': `Bearer ${await getSecretValue('CRM_API_TOKEN')}`,
        'User-Agent': 'MyApp-Scheduler/1.0'
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`CRM API failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Customer data fetch failed:', error);
    throw error;
  }
}
```

### Pattern 2: Database Operations with Error Handling
```typescript
// Example: Storing processed data with proper error handling
async function storeProcessedData(client: any, data: ProcessedData[]) {
  const results = await Promise.allSettled(
    data.map(item => client.models.CustomerRecord.create({
      customerId: item.id,
      data: JSON.stringify(item),
      processedAt: new Date().toISOString(),
      isActive: true
    }))
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`Database operations: ${successful} successful, ${failed} failed`);
  return { successful, failed };
}
```

### Pattern 3: Batch Processing with Concurrency Control
```typescript
// Example: Processing large datasets in controlled batches
async function processBatchData(items: DataItem[], batchSize: number = 10) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Process batch with controlled concurrency
    const batchResults = await Promise.allSettled(
      batch.map(item => processItem(item))
    );
    
    results.push(...batchResults);
    
    // Optional: Add delay between batches to avoid rate limits
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}
```

### Pattern 4: Cleanup and Data Lifecycle Management
```typescript
// Example: Cleaning up expired records based on retention policy
async function cleanupExpiredData(client: any, retentionDays: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  const { data: expiredRecords } = await client.models.DataRecord.list({
    filter: {
      createdAt: { lt: cutoffDate.toISOString() },
      isActive: { eq: true }
    }
  });

  // Mark as inactive instead of deleting (preserves data for auditing)
  const cleanupPromises = expiredRecords.map(record =>
    client.models.DataRecord.update({
      id: record.id,
      isActive: false,
      archivedAt: new Date().toISOString()
    })
  );

  await Promise.allSettled(cleanupPromises);
  console.log(`Archived ${expiredRecords.length} expired records`);
}
```

## Monitoring and Observability

### Structured Logging Example
```typescript
// Use structured logging for better CloudWatch insights
function logEvent(level: string, event: string, metadata: any = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    metadata,
    environment: process.env.ENV,
    functionName: 'scheduledFunctionExample'
  }));
}

// Usage examples:
logEvent('INFO', 'SYNC_STARTED', { source: 'external-api' });
logEvent('ERROR', 'API_FAILURE', { url: apiUrl, error: error.message });
logEvent('SUCCESS', 'SYNC_COMPLETED', { recordsProcessed: 42, duration: 5432 });
```

### Performance Monitoring
```typescript
// Track execution time and performance metrics
const startTime = Date.now();

try {
  // Your processing logic here
  const result = await processData();
  
  const duration = Date.now() - startTime;
  logEvent('PERFORMANCE', 'EXECUTION_COMPLETED', {
    durationMs: duration,
    recordsProcessed: result.count,
    avgTimePerRecord: duration / result.count
  });
  
} catch (error) {
  const duration = Date.now() - startTime;
  logEvent('PERFORMANCE', 'EXECUTION_FAILED', {
    durationMs: duration,
    failurePoint: 'data-processing'
  });
  throw error;
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Function Not Triggering
```bash
# Check EventBridge rule status
aws events describe-rule --name "your-rule-name"

# Verify cron expression syntax
# Test at: https://crontab.guru/

# Check function permissions
aws lambda get-policy --function-name "your-function-name"
```

#### Timeout Errors
```typescript
// Optimize for better performance
// 1. Increase timeout in resource.ts
timeoutSeconds: 600, // 10 minutes

// 2. Process data in smaller chunks
const CHUNK_SIZE = 100;
for (let i = 0; i < data.length; i += CHUNK_SIZE) {
  const chunk = data.slice(i, i + CHUNK_SIZE);
  await processChunk(chunk);
}

// 3. Use more memory for CPU-intensive tasks
memoryMB: 1536, // More memory = more CPU power
```

#### External API Failures
```typescript
// Implement retry logic with exponential backoff
async function fetchWithRetry(url: string, maxRetries: number = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      
      if (response.status >= 500 && attempt < maxRetries) {
        // Server error - retry with backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
        continue;
      }
      
      throw new Error(`API failed: ${response.status}`);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Network error - retry with backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

### CloudWatch Monitoring Setup
```typescript
// Set up CloudWatch alarms in backend.ts
import { Alarm, Metric } from 'aws-cdk-lib/aws-cloudwatch';

// Monitor function errors
new Alarm(stack, 'ScheduledFunctionErrors', {
  metric: new Metric({
    namespace: 'AWS/Lambda',
    metricName: 'Errors',
    dimensionsMap: {
      FunctionName: backend.scheduledFunctionExample.resources.lambda.functionName
    }
  }),
  threshold: 1,
  evaluationPeriods: 1,
  alarmDescription: 'Scheduled function is failing'
});

// Monitor function duration
new Alarm(stack, 'ScheduledFunctionDuration', {
  metric: new Metric({
    namespace: 'AWS/Lambda',
    metricName: 'Duration',
    dimensionsMap: {
      FunctionName: backend.scheduledFunctionExample.resources.lambda.functionName
    }
  }),
  threshold: 300000, // 5 minutes in milliseconds
  evaluationPeriods: 2,
  alarmDescription: 'Scheduled function is taking too long'
});
```

## Best Practices Summary

### Security
- Store sensitive data (API keys) in AWS Secrets Manager
- Use least-privilege IAM permissions
- Validate and sanitize external data inputs
- Never log sensitive information

### Performance
- Right-size memory allocation based on CloudWatch metrics
- Use efficient data structures and algorithms
- Implement proper timeout values
- Consider ARM-based Lambda for cost savings

### Reliability
- Implement comprehensive error handling
- Use retry logic for transient failures
- Store error details for debugging
- Set up monitoring and alerting

### Cost Optimization
- Schedule functions only as frequently as needed
- Monitor execution duration and optimize code
- Use different schedules per environment
- Clean up unused or redundant schedules

## Next Steps

1. **Customize the Example**: Replace the generic API calls with your actual data sources
2. **Update Database Schema**: Modify the DailySync model to match your data structure
3. **Configure Scheduling**: Set up appropriate schedules in your backend.ts file
4. **Set Up Monitoring**: Implement CloudWatch alarms and structured logging
5. **Test Thoroughly**: Test in development environment before deploying to production
6. **Monitor Performance**: Use CloudWatch metrics to optimize memory and timeout settings

This example provides a solid foundation for building robust, production-ready scheduled functions in AWS Amplify Gen 2. Copy and modify the patterns to fit your specific use cases!