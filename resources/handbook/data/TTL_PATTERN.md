# DynamoDB TTL (Time To Live) Pattern

**Automatic data expiration and cost optimization for temporary records**

---

## What is TTL?

**DynamoDB Time To Live (TTL)** is a built-in feature that automatically deletes items after a specified timestamp, **at no additional cost**.

### Key Benefits:
- ✅ **Automatic cleanup** - No scheduled Lambda needed
- ✅ **Zero cost** - DynamoDB deletes expired items for free
- ✅ **Storage savings** - Reduces DynamoDB storage costs
- ✅ **No code required** - Just add a field to your schema

### Common Use Cases:
- Webhook events (keep for 2 weeks, then auto-delete)
- Session tokens (expire after 24 hours)
- Temporary cache data (expire after 1 hour)
- Rate limiting counters (reset daily)
- Audit logs (retain for compliance period, then delete)

---

## How It Works

1. **Add a TTL field** to your Amplify Data model (must be a number/integer)
2. **Store Unix timestamp** (seconds since epoch) when item should expire
3. **DynamoDB automatically deletes** items after expiration (usually within 48 hours)

### Important Notes:
- Items typically deleted **within 48 hours** of expiration (not instant)
- Expired items **still appear in queries** until actually deleted
- Delete operations **don't consume write capacity**
- TTL deletes **don't trigger DynamoDB Streams** (by default)

---

## Implementation

### Step 1: Add TTL Field to Schema

```typescript
// amplify/data/resource.ts
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  WebhookEvent: a.model({
    eventId: a.string().required(),
    source: a.string().required(),         // 'slack', 'stripe', 'github'
    eventType: a.string().required(),      // 'message.sent', 'payment.succeeded'
    payload: a.json().required(),
    receivedAt: a.datetime().required(),

    // TTL field - items auto-delete after this timestamp
    ttl: a.integer(),                       // Unix timestamp (seconds)

  })
  .authorization((allow) => [
    allow.publicApiKey(),
  ]),
});

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
  },
});
```

**Field Requirements:**
- Must be type `a.integer()` (not `a.datetime()`)
- Must store **Unix timestamp in seconds** (not milliseconds)
- Field name can be anything (commonly `ttl`, `expiresAt`, `deletionTime`)

### Step 2: Enable TTL on DynamoDB Table (Backend)

DynamoDB doesn't enable TTL by default. You must configure it:

```typescript
// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource';

const backend = defineBackend({
  data,
  // ... other resources
});

// Enable TTL on the WebhookEvent table
const webhookEventTable = backend.data.resources.tables['WebhookEvent'];

webhookEventTable.addTtl({
  attributeName: 'ttl',  // Must match field name in schema
  enabled: true,
});
```

**CRITICAL**: This must be done in `backend.ts`, not in `data/resource.ts`.

### Step 3: Set TTL When Creating Items

#### From Next.js API Route (Webhook Handler)

```typescript
// app/api/slack/events/route.ts
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { Amplify } from 'aws-amplify';
import outputs from '@/amplify_outputs.json';

Amplify.configure(outputs, { ssr: true });
const client = generateClient<Schema>({ authMode: 'apiKey' });

export async function POST(request: Request) {
  const body = await request.json();

  // Calculate expiration: 2 weeks from now
  const twoWeeksFromNow = Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60);

  // Store webhook event with TTL
  await client.models.WebhookEvent.create({
    eventId: body.event.id,
    source: 'slack',
    eventType: body.event.type,
    payload: body,
    receivedAt: new Date().toISOString(),
    ttl: twoWeeksFromNow,  // Auto-delete after 2 weeks
  });

  return Response.json({ ok: true });
}
```

#### From Lambda Function

```typescript
// amplify/functions/process-webhook/handler.ts
import type { Schema } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/process-webhook';

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
  {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => ({
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            sessionToken: env.AWS_SESSION_TOKEN,
          },
        }),
        clearCredentialsAndIdentityId: () => {},
      },
    },
  }
);

const client = generateClient<Schema>({ authMode: 'iam' });

export const handler = async (event: any) => {
  // Calculate expiration: 24 hours from now
  const twentyFourHoursFromNow = Math.floor(Date.now() / 1000) + (24 * 60 * 60);

  await client.models.WebhookEvent.create({
    eventId: event.id,
    source: 'stripe',
    eventType: event.type,
    payload: event,
    receivedAt: new Date().toISOString(),
    ttl: twentyFourHoursFromNow,  // Auto-delete after 24 hours
  });

  return { statusCode: 200, body: 'Event stored' };
};
```

---

## TTL Expiration Examples

### Common Expiration Periods

```typescript
const now = Math.floor(Date.now() / 1000);  // Current Unix timestamp in seconds

// 1 hour
const oneHour = now + (1 * 60 * 60);

// 24 hours (1 day)
const oneDay = now + (24 * 60 * 60);

// 7 days (1 week)
const oneWeek = now + (7 * 24 * 60 * 60);

// 14 days (2 weeks)
const twoWeeks = now + (14 * 24 * 60 * 60);

// 30 days (1 month)
const oneMonth = now + (30 * 24 * 60 * 60);

// 90 days (3 months - common for audit logs)
const threeMonths = now + (90 * 24 * 60 * 60);
```

### Helper Function

```typescript
// lib/ttl-helper.ts
export function getTTL(daysFromNow: number): number {
  const now = Math.floor(Date.now() / 1000);  // Seconds since epoch
  const secondsPerDay = 24 * 60 * 60;
  return now + (daysFromNow * secondsPerDay);
}

// Usage:
const ttl = getTTL(14);  // 14 days from now
```

---

## Real-World Patterns

### Pattern 1: Webhook Event Storage

**Use Case**: Store webhook events for debugging, then auto-delete after 2 weeks.

```typescript
// app/api/stripe/webhook/route.ts
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  // Verify signature
  const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

  // Store event with TTL (auto-delete after 2 weeks)
  await client.models.WebhookEvent.create({
    eventId: event.id,
    source: 'stripe',
    eventType: event.type,
    payload: event,
    receivedAt: new Date().toISOString(),
    ttl: getTTL(14),  // 2 weeks retention
  });

  // Process the event
  await processStripeEvent(event);

  return Response.json({ received: true });
}
```

**Why TTL?**
- Webhooks are for real-time processing
- Historical events rarely needed after 2 weeks
- Saves 95% of storage costs

### Pattern 2: Session Tokens

**Use Case**: User sessions that expire after 24 hours.

```typescript
// amplify/data/resource.ts
UserSession: a.model({
  userId: a.string().required(),
  sessionToken: a.string().required(),
  createdAt: a.datetime().required(),
  ttl: a.integer(),  // Auto-delete after 24 hours
})
.authorization((allow) => [allow.owner()]),

// When creating session:
const twentyFourHoursFromNow = Math.floor(Date.now() / 1000) + (24 * 60 * 60);

await client.models.UserSession.create({
  userId: user.id,
  sessionToken: generateToken(),
  createdAt: new Date().toISOString(),
  ttl: twentyFourHoursFromNow,
});
```

### Pattern 3: Rate Limiting Counters

**Use Case**: Track API usage per user, reset daily.

```typescript
// amplify/data/resource.ts
RateLimitCounter: a.model({
  userId: a.string().required(),
  endpoint: a.string().required(),
  requestCount: a.integer().required(),
  windowStart: a.datetime().required(),
  ttl: a.integer(),  // Auto-delete at end of day
})
.authorization((allow) => [allow.publicApiKey()]),

// When tracking requests:
const endOfDay = new Date();
endOfDay.setHours(23, 59, 59, 999);
const ttl = Math.floor(endOfDay.getTime() / 1000);

await client.models.RateLimitCounter.create({
  userId: user.id,
  endpoint: '/api/predictions',
  requestCount: 1,
  windowStart: new Date().toISOString(),
  ttl: ttl,  // Auto-delete at midnight
});
```

### Pattern 4: Temporary Cache Data

**Use Case**: Cache external API responses for 1 hour.

```typescript
// amplify/data/resource.ts
ApiCache: a.model({
  cacheKey: a.string().required(),
  response: a.json().required(),
  cachedAt: a.datetime().required(),
  ttl: a.integer(),  // Auto-delete after 1 hour
})
.authorization((allow) => [allow.publicApiKey()]),

// When caching:
const oneHourFromNow = Math.floor(Date.now() / 1000) + (60 * 60);

await client.models.ApiCache.create({
  cacheKey: `weather-${city}`,
  response: weatherData,
  cachedAt: new Date().toISOString(),
  ttl: oneHourFromNow,
});
```

---

## Querying with TTL

### Problem: Expired Items Still Appear

TTL deletes items **within 48 hours** of expiration, but expired items still appear in queries until physically deleted.

### Solution: Filter Out Expired Items

```typescript
// Query webhook events (exclude expired)
const now = Math.floor(Date.now() / 1000);

const { data: activeEvents } = await client.models.WebhookEvent.list({
  filter: {
    ttl: { gt: now }  // Only show items not yet expired
  }
});

console.log('Active events:', activeEvents.length);
```

### Alternative: Add Status Field

```typescript
// amplify/data/resource.ts
WebhookEvent: a.model({
  eventId: a.string().required(),
  payload: a.json().required(),
  status: a.enum(['pending', 'processed', 'expired']),
  ttl: a.integer(),
})

// Mark as expired when processing
await client.models.WebhookEvent.update({
  id: event.id,
  status: 'expired',
});

// Query only active events
const { data: activeEvents } = await client.models.WebhookEvent.list({
  filter: {
    status: { ne: 'expired' }  // Not expired
  }
});
```

---

## Cost Savings Example

### Without TTL (Manual Cleanup)

**Scenario**: 10,000 webhook events/day, keep for 30 days

- **Storage**: 10,000 events/day × 30 days × 1 KB/event = 300 MB
- **DynamoDB cost**: $0.25/GB/month → ~$0.075/month storage
- **Lambda cleanup**: Scheduled function runs daily, scans + deletes old items
  - Read cost: 10,000 reads/day × $0.25/million = ~$0.075/month
  - Write cost: 10,000 deletes/day × $1.25/million = ~$0.375/month
- **Total**: ~$0.525/month + Lambda execution time

### With TTL (Automatic)

- **Storage**: 10,000 events/day × 30 days × 1 KB/event = 300 MB
- **DynamoDB cost**: $0.25/GB/month → ~$0.075/month storage
- **TTL deletes**: FREE (no read/write charges)
- **Total**: ~$0.075/month

**Savings**: 85% reduction in costs + no Lambda maintenance!

---

## Monitoring TTL Deletions

### CloudWatch Metrics

DynamoDB publishes TTL metrics to CloudWatch:

```typescript
// amplify/backend.ts (optional monitoring)
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

const deletedItemsMetric = new cloudwatch.Metric({
  namespace: 'AWS/DynamoDB',
  metricName: 'TimeToLiveDeletedItemCount',
  dimensionsMap: {
    TableName: webhookEventTable.tableName,
  },
  statistic: 'Sum',
  period: Duration.days(1),
});

// Create alarm if deletions stop (indicates TTL issue)
new cloudwatch.Alarm(backend.stack, 'TTLDeletionAlarm', {
  metric: deletedItemsMetric,
  threshold: 100,  // Expect at least 100 deletions/day
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
  alarmDescription: 'TTL deletions dropped below expected threshold',
});
```

### Verification Query

```typescript
// Check how many items are scheduled for deletion
const now = Math.floor(Date.now() / 1000);

const { data: expiredItems } = await client.models.WebhookEvent.list({
  filter: {
    ttl: { lt: now }  // Already expired (awaiting deletion)
  }
});

console.log(`${expiredItems.length} items awaiting TTL deletion`);
```

---

## Troubleshooting

### Issue 1: Items Not Being Deleted

**Symptoms**: TTL field set correctly, but items remain in table for weeks.

**Causes & Solutions**:

1. **TTL not enabled on table**
   ```typescript
   // Check backend.ts - must have:
   webhookEventTable.addTtl({
     attributeName: 'ttl',
     enabled: true,
   });
   ```

2. **Wrong field name**
   ```typescript
   // Schema has 'ttl', but backend.ts has 'expiresAt'
   // MUST MATCH EXACTLY
   ```

3. **TTL value in milliseconds (wrong)**
   ```typescript
   // ❌ Wrong: Date.now() returns milliseconds
   const wrong = Date.now() + (24 * 60 * 60 * 1000);

   // ✅ Correct: Must be seconds
   const correct = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
   ```

4. **TTL deletion lag (normal)**
   - DynamoDB deletes items **within 48 hours** of expiration
   - This is expected behavior, not a bug

### Issue 2: TypeScript Type Errors

**Symptoms**: `Type 'number' is not assignable to type 'integer'`

**Solution**: Use `a.integer()`, not `a.number()`

```typescript
// ❌ Wrong
ttl: a.number(),

// ✅ Correct
ttl: a.integer(),
```

### Issue 3: Query Returns Expired Items

**Expected Behavior**: Expired items remain queryable until DynamoDB deletes them (up to 48 hours).

**Solution**: Filter expired items in application code:

```typescript
const now = Math.floor(Date.now() / 1000);

const { data: allItems } = await client.models.WebhookEvent.list();

// Client-side filtering
const activeItems = allItems.filter(item =>
  !item.ttl || item.ttl > now
);
```

---

## Best Practices

### 1. Always Set TTL When Creating Items

```typescript
// ✅ Good: TTL set at creation
await client.models.WebhookEvent.create({
  eventId: event.id,
  payload: event,
  ttl: getTTL(14),  // Always set
});

// ❌ Bad: TTL left undefined
await client.models.WebhookEvent.create({
  eventId: event.id,
  payload: event,
  // ttl missing - item never expires!
});
```

### 2. Use Consistent Expiration Periods

```typescript
// Define constants for common TTLs
export const TTL_PERIODS = {
  ONE_HOUR: 60 * 60,
  ONE_DAY: 24 * 60 * 60,
  ONE_WEEK: 7 * 24 * 60 * 60,
  TWO_WEEKS: 14 * 24 * 60 * 60,
  ONE_MONTH: 30 * 24 * 60 * 60,
} as const;

// Usage
const ttl = Math.floor(Date.now() / 1000) + TTL_PERIODS.TWO_WEEKS;
```

### 3. Document TTL Policy in Schema

```typescript
WebhookEvent: a.model({
  // ... fields

  // TTL: Items auto-delete 14 days after creation
  // Keeps webhook events for debugging, then cleans up automatically
  ttl: a.integer(),
})
```

### 4. Test TTL Configuration

```typescript
// Create test item expiring in 5 minutes
const fiveMinutesFromNow = Math.floor(Date.now() / 1000) + (5 * 60);

await client.models.WebhookEvent.create({
  eventId: 'test-ttl-' + Date.now(),
  source: 'test',
  eventType: 'test',
  payload: { test: true },
  receivedAt: new Date().toISOString(),
  ttl: fiveMinutesFromNow,
});

// Check DynamoDB console in ~48 hours to verify deletion
```

### 5. Consider Compliance Requirements

Before using TTL, verify data retention policies:

- **GDPR**: May require explicit user consent for data retention
- **HIPAA**: Medical records have specific retention requirements
- **Financial**: Payment data often requires 7+ years retention
- **Audit logs**: Compliance may require permanent retention

---

## When NOT to Use TTL

### ❌ Don't Use TTL For:

1. **Long-term data** - Items that should never expire
2. **Audit logs** - Compliance may require permanent records
3. **User-generated content** - Should be explicitly deleted by users
4. **Financial records** - Legal retention requirements
5. **Critical data** - TTL deletion is permanent (no recovery)

### ✅ Use TTL For:

1. **Temporary cache** - API responses, computed results
2. **Session data** - Login tokens, temporary credentials
3. **Webhook events** - Real-time processing, short-term debugging
4. **Rate limiting** - Counters that reset periodically
5. **Ephemeral data** - One-time codes, temporary links

---

## Summary

**DynamoDB TTL** is a zero-cost, maintenance-free way to automatically delete temporary data.

**Key Takeaways**:
1. ✅ Add `ttl: a.integer()` field to schema
2. ✅ Enable TTL in `backend.ts` with `addTtl()`
3. ✅ Store Unix timestamp in **seconds** (not milliseconds)
4. ✅ Items deleted within 48 hours of expiration
5. ✅ Zero cost for deletions
6. ✅ Perfect for webhooks, sessions, cache, rate limits

**Cost Savings**: Up to 85% reduction vs manual Lambda cleanup

**Production-Tested**: Used in ChillUpwork (webhook events) and Rosario (proposal events) for automatic 2-week cleanup.

---

## References

- **AWS Documentation**: [DynamoDB TTL](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html)
- **Amplify Data Schema**: [defineData](https://docs.amplify.aws/react/build-a-backend/data/)
- **Production Examples**: ChillUpwork (`amplify/data/resource.ts` - WebhookEvent, ProposalEvent models)
