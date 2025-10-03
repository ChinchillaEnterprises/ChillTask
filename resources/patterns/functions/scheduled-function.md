# Add Scheduled Function (Cron Jobs)

**Step-by-step pattern for creating Lambda functions that run on a schedule using EventBridge**

---

## ✅ Prerequisites

- Amplify Gen 2 project initialized
- Understanding of cron expressions
- `amplify/backend.ts` exists
- **READ FIRST:** `authorize-lambda-with-data.md` for database access setup

---

## 📋 Step 1: Create Function Files

Create the function folder:

```bash
mkdir -p amplify/functions/daily-sync
```

### Create `amplify/functions/daily-sync/resource.ts`:

```typescript
import { defineFunction } from '@aws-amplify/backend';

export const dailySync = defineFunction({
  name: 'daily-sync',
  entry: './handler.ts',
  resourceGroupName: 'data', // Grants database access
  timeoutSeconds: 300, // 5 minutes (max 900 seconds)
  environment: {
    ENV: 'dev',
    EXTERNAL_API_URL: 'https://api.example.com',
  },
});
```

**Key Points:**
- ✅ `resourceGroupName: 'data'` grants DynamoDB IAM permissions
- ✅ You ALSO need schema-level `allow.resource()` - see `authorize-lambda-with-data.md`
- ✅ Higher timeout for long-running operations (max 900 seconds)
- ✅ Environment variables for configuration

---

## 📋 Step 2: Create Event Handler

### Create `amplify/functions/daily-sync/handler.ts`:

```typescript
import type { EventBridgeEvent } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';
import { env } from '$amplify/env/daily-sync';

// Configure Amplify
Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint: env.AMPLIFY_DATA_GRAPHQL_ENDPOINT,
        region: env.AWS_REGION,
        defaultAuthMode: 'iam',
      },
    },
  },
  { ssr: true }
);

const client = generateClient<Schema>({
  authMode: 'iam',
});

// EventBridge handler type
export const handler = async (event: EventBridgeEvent<string, any>) => {
  console.log('Daily sync started:', new Date().toISOString());

  const startTime = Date.now();

  try {
    // Step 1: Fetch data from external API
    const externalData = await fetchExternalData();

    // Step 2: Store in database
    const syncRecord = await storeSyncData(externalData);

    // Step 3: Cleanup old records
    await cleanupOldRecords();

    const duration = Date.now() - startTime;

    console.log('Daily sync completed successfully:', {
      recordsProcessed: externalData.length,
      duration,
      syncId: syncRecord.id,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Daily sync completed',
        recordsProcessed: externalData.length,
        duration,
      }),
    };
  } catch (error: any) {
    console.error('Daily sync failed:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Sync failed',
        error: error.message,
      }),
    };
  }
};

async function fetchExternalData(): Promise<any[]> {
  const response = await fetch(process.env.EXTERNAL_API_URL!, {
    headers: {
      'Authorization': `Bearer ${process.env.API_KEY}`,
    },
    signal: AbortSignal.timeout(30000), // 30 second timeout
  });

  if (!response.ok) {
    throw new Error(`API failed: ${response.status}`);
  }

  return await response.json();
}

async function storeSyncData(data: any[]) {
  const { data: syncRecord } = await client.models.DailySync.create({
    date: new Date().toISOString().split('T')[0],
    source: 'external-api',
    data: JSON.stringify(data),
    status: 'success',
    recordCount: data.length,
    executedAt: new Date().toISOString(),
    isActive: true,
  });

  return syncRecord;
}

async function cleanupOldRecords() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days

  const { data: oldRecords } = await client.models.DailySync.list({
    filter: {
      createdAt: { lt: cutoffDate.toISOString() },
      isActive: { eq: true },
    },
  });

  // Mark as inactive instead of deleting (for audit trail)
  await Promise.all(
    oldRecords.map(record =>
      client.models.DailySync.update({
        id: record.id,
        isActive: false,
      })
    )
  );

  console.log(`Archived ${oldRecords.length} old records`);
}
```

**Key Points:**
- ✅ Use `EventBridgeEvent<string, any>` type
- ✅ Return structured response (not required, but good for monitoring)
- ✅ Handle errors gracefully
- ✅ Log everything for CloudWatch

---

## 📋 Step 3: Add Database Model

Update `amplify/data/resource.ts`:

```typescript
import { dailySync } from '../functions/daily-sync/resource';

const schema = a.schema({
  DailySync: a
    .model({
      date: a.string().required(),
      source: a.string().required(),
      data: a.string().required(), // JSON string
      status: a.enum(['success', 'failed', 'partial']),
      recordCount: a.integer(),
      executedAt: a.string().required(),
      isActive: a.boolean(),
      processingTime: a.integer(),
    })
    .authorization((allow) => [
      allow.resource(dailySync), // Allow function access
    ]),
});
```

---

## 📋 Step 4: Create EventBridge Schedule

Update `amplify/backend.ts`:

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { Stack, Duration } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { dailySync } from './functions/daily-sync/resource';

const backend = defineBackend({
  auth,
  data,
  dailySync, // MUST register function here
});

// Get the stack for creating EventBridge rule
const functionStack = Stack.of(backend.dailySync.resources.lambda);

// Create EventBridge rule for scheduling
const dailySyncRule = new events.Rule(functionStack, 'DailySyncSchedule', {
  schedule: events.Schedule.cron({
    minute: '0',
    hour: '2',    // 2 AM UTC
    day: '*',     // Every day
    month: '*',
    year: '*',
  }),
  description: 'Daily data synchronization at 2 AM UTC',
});

// Add Lambda function as target
dailySyncRule.addTarget(
  new targets.LambdaFunction(backend.dailySync.resources.lambda)
);
```

**CRITICAL:**
- ✅ Must import `Duration` from `aws-cdk-lib` (NOT `aws-events`)
- ✅ Function MUST be in `defineBackend()` for permissions
- ✅ Use `Stack.of()` to get the correct stack

---

## 📋 Step 5: Deploy and Monitor

```bash
npx ampx sandbox
```

### View CloudWatch Logs:

```bash
# Find log group
aws logs tail /aws/lambda/daily-sync --follow

# Or search for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/daily-sync \
  --filter-pattern "ERROR"
```

---

## 🕒 Common Schedule Patterns

### Daily Schedules

```typescript
// Every day at 2 AM UTC (low-traffic hours)
Schedule.cron({ minute: '0', hour: '2' })

// Twice daily at 6 AM and 6 PM UTC
Schedule.cron({ minute: '0', hour: '6,18' })

// Weekdays only at 9 AM UTC (business hours)
Schedule.cron({ minute: '0', hour: '9', weekDay: 'MON-FRI' })
```

### High-Frequency Schedules

```typescript
// Every 15 minutes
Schedule.rate(Duration.minutes(15))

// Every 30 minutes during business hours
Schedule.cron({ minute: '0,30', hour: '9-17', weekDay: 'MON-FRI' })

// Every hour on the hour
Schedule.cron({ minute: '0' })
```

### Periodic Maintenance

```typescript
// Weekly on Sunday at 3 AM UTC
Schedule.cron({ minute: '0', hour: '3', weekDay: 'SUN' })

// Monthly on 1st of month at 1 AM UTC
Schedule.cron({ minute: '0', hour: '1', day: '1' })

// Quarterly (1st of Jan, Apr, Jul, Oct at 2 AM UTC)
Schedule.cron({ minute: '0', hour: '2', day: '1', month: '1,4,7,10' })
```

---

## 🎯 Common Use Cases

### Data Synchronization

```typescript
// Fetch and store external data
const response = await fetch(externalApiUrl);
const data = await response.json();

await client.models.SyncedData.create({
  source: 'external-api',
  data: JSON.stringify(data),
  syncedAt: new Date().toISOString(),
});
```

### Data Cleanup

```typescript
// Delete old records
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days old

const { data: oldRecords } = await client.models.Record.list({
  filter: { createdAt: { lt: cutoffDate.toISOString() } },
});

await Promise.all(
  oldRecords.map(record =>
    client.models.Record.delete({ id: record.id })
  )
);
```

### Report Generation

```typescript
// Generate daily analytics
const { data: users } = await client.models.User.list();
const { data: orders } = await client.models.Order.list();

await client.models.DailyReport.create({
  date: new Date().toISOString().split('T')[0],
  totalUsers: users.length,
  totalOrders: orders.length,
  revenue: orders.reduce((sum, o) => sum + o.amount, 0),
});
```

### Batch Processing

```typescript
// Process items in batches
const BATCH_SIZE = 100;
const items = await fetchItemsToProcess();

for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);

  await Promise.allSettled(
    batch.map(item => processItem(item))
  );

  // Optional: delay between batches
  if (i + BATCH_SIZE < items.length) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

---

## ⚠️ Common Pitfalls

1. **Missing function in defineBackend()** → EventBridge can't invoke function
2. **Wrong Duration import** → Import from `aws-cdk-lib` not `aws-events`
3. **Timeout too short** → Increase for long operations (max 900 seconds)
4. **No error handling** → Function fails silently
5. **Not logging** → Can't debug in CloudWatch
6. **Hardcoded secrets** → Use environment variables or Secrets Manager

---

## 📊 Monitoring Best Practices

### Structured Logging

```typescript
function log(level: string, event: string, metadata: any = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    metadata,
    functionName: 'daily-sync',
  }));
}

// Usage
log('INFO', 'SYNC_STARTED', { source: 'external-api' });
log('ERROR', 'API_FAILURE', { url: apiUrl, error: error.message });
log('SUCCESS', 'SYNC_COMPLETED', { recordsProcessed: 42, duration: 5432 });
```

### Performance Tracking

```typescript
const startTime = Date.now();

try {
  await processData();

  const duration = Date.now() - startTime;
  console.log('Performance:', {
    durationMs: duration,
    recordsProcessed: count,
    avgTimePerRecord: duration / count,
  });
} catch (error) {
  const duration = Date.now() - startTime;
  console.log('Failed after:', { durationMs: duration });
  throw error;
}
```

---

## ✅ Checklist

Before moving on, verify:
- [ ] Function created in `amplify/functions/` with resource.ts and handler.ts
- [ ] Database model added to schema (if needed)
- [ ] Function registered in `amplify/backend.ts`
- [ ] EventBridge rule created with cron schedule
- [ ] Lambda added as target to EventBridge rule
- [ ] `resourceGroupName: 'data'` set for database access
- [ ] Appropriate timeout configured
- [ ] Error handling implemented
- [ ] Structured logging in place
- [ ] Sandbox deployed successfully
- [ ] CloudWatch logs verified

---

**You're done! Your app now has scheduled background jobs! ⏰**
