# ⏰ Async Patterns: Bypassing the 30-Second Timeout

**How to handle long-running operations (Claude API, ML models, file processing) when AWS enforces 29-30 second timeout limits.**

---

## 🚨 The Problem: The 30-Second Wall

**All public HTTP endpoints in AWS have hard timeout limits:**

| Service | Timeout Limit |
|---------|--------------|
| **API Gateway** | 29 seconds |
| **AppSync GraphQL** | 30 seconds |
| **Lambda Function URLs** (Next.js API routes) | 30 seconds |
| **ALB / CloudFront** | ~30 seconds |

### What This Means:

If you need to:
- Call Claude API (30-60+ seconds to respond)
- Run ML model inference (2-5 minutes)
- Process large files or videos
- Generate complex reports
- Run batch database operations

**You literally cannot do it directly from the frontend** because the HTTP connection will timeout and the user gets an error, even if your Lambda is still running successfully in the background.

### The Failure Pattern:

```
Frontend: "Generate report for 10,000 customers"
  ↓
API Gateway → Lambda starts processing...
  ↓
[29 seconds pass]
  ↓
API Gateway: "504 Gateway Timeout" ❌
  ↓
Frontend: Shows error to user
  ↓
Lambda: Still running happily in background, completes after 3 minutes
  ↓
User: Never sees the result 😢
```

---

## ✅ The Solution: Async Processing Patterns

Both patterns work by **decoupling the HTTP response from the actual processing**:

1. **Respond immediately** (< 3 seconds) - "Got it, processing..."
2. **Process in background** (up to 15 minutes with Lambda max timeout)
3. **Notify when done** (via subscription or callback)

---

## 📊 Pattern Comparison

| Aspect | Pattern 1: DynamoDB Stream | Pattern 2: Lambda Self-Invoke |
|--------|---------------------------|------------------------------|
| **Infrastructure** | DynamoDB table + Stream trigger | Single Lambda function |
| **Cost** | Higher (DynamoDB writes/reads/streams) | Lower (just Lambda invocation) |
| **Code Complexity** | Lower (automatic trigger) | Higher (manual invocation code) |
| **Real-time Status** | ✅ Yes (GraphQL subscriptions) | ❌ No (fire and forget) |
| **Audit Trail** | ✅ Automatic (DynamoDB records) | ❌ Manual (must add logging) |
| **Retry Logic** | ✅ Automatic (DynamoDB stream) | ❌ Manual (must implement) |
| **Best For** | Frontend operations with UX | Webhook handlers |
| **Frontend Feedback** | "Processing... 60% done" | "Request received" (then silence) |

---

## 🎯 Pattern 1: DynamoDB Stream Trigger

**Use when:** You need real-time status updates for frontend users

### The Flow:

```
1. Frontend calls GraphQL mutation
   ↓
2. Lambda creates DynamoDB record (status: 'pending')
   ↓
3. Returns job ID immediately (< 1 second) ✅
   ↓
4. DynamoDB Stream automatically triggers processor Lambda
   ↓
5. Processor Lambda runs long operation (up to 15 minutes)
   ↓
6. Updates DynamoDB record (status: 'complete', response: '...')
   ↓
7. Frontend subscription receives real-time update 🎉
```

### Example Use Cases:

- ✅ AI chatbot on website (user needs to see "thinking..." status)
- ✅ Report generation dashboard (show "Generating... 60% complete")
- ✅ File processing with progress updates
- ✅ Multi-step workflows with status tracking

### Code Example (from Rosario production):

**1. Frontend submits query:**

```typescript
// Frontend
const { data } = await client.mutations.submitQuery({
  query: "What were sales last month?",
  metadata: { sessionId: 'user-123' }
});

console.log('Job created:', data.id); // Returns in < 1 second

// Subscribe to real-time updates
client.models.QueryJob.observeQuery({
  filter: { id: { eq: data.id } }
}).subscribe({
  next: ({ items }) => {
    const job = items[0];
    if (job.status === 'processing') {
      showSpinner('Calling Claude API...');
    } else if (job.status === 'complete') {
      showResponse(job.response);
    }
  }
});
```

**2. Mutation handler creates job record:**

```typescript
// amplify/functions/submit-query/handler.ts
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

const client = generateClient<Schema>({ authMode: 'iam' });

export const handler: Schema["submitQuery"]["functionHandler"] = async (event) => {
  const { query, metadata } = event.arguments;

  // Create job record - DynamoDB Stream will trigger processor automatically!
  const { data: job } = await client.models.QueryJob.create({
    query,
    status: 'pending',
    createdAt: new Date().toISOString(),
    metadata: JSON.stringify(metadata || {})
  });

  return job; // Returns immediately
};
```

**3. DynamoDB Stream triggers processor Lambda:**

```typescript
// amplify/backend.ts
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';

const backend = defineBackend({
  auth,
  data,
  submitQueryFunction,
  processQueryJob  // The processor Lambda
});

// Configure automatic trigger - NO CODE IN HANDLER NEEDED!
const queryJobTable = backend.data.resources.tables['QueryJob'];

backend.processQueryJob.resources.lambda.addEventSource(
  new DynamoEventSource(queryJobTable, {
    startingPosition: StartingPosition.LATEST,
    batchSize: 1,        // Process one job at a time
    retryAttempts: 2,    // Automatic retry on failure
  })
);
```

**4. Processor does the slow work:**

```typescript
// amplify/functions/process-query-job/handler.ts
import type { DynamoDBStreamHandler } from 'aws-lambda';

export const handler: DynamoDBStreamHandler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName === 'INSERT') {
      const job = record.dynamodb?.NewImage;

      // Only process pending jobs
      if (job.status?.S !== 'pending') continue;

      const jobId = job.id?.S;
      const query = job.query?.S;

      // Update to processing
      await client.models.QueryJob.update({
        id: jobId,
        status: 'processing'
      });

      // Call Claude API (takes 30-60+ seconds)
      const response = await fetch('https://claude.chinchilla-ai.com/query', {
        method: 'POST',
        body: JSON.stringify({ prompt: query }),
        signal: AbortSignal.timeout(270000) // 4.5 minute timeout
      });

      const data = await response.json();

      // Update with result
      await client.models.QueryJob.update({
        id: jobId,
        status: 'complete',
        response: data.claude_response
      });

      console.log('Job completed:', jobId);
    }
  }
};
```

**5. Schema definition:**

```typescript
// amplify/data/resource.ts
const schema = a.schema({
  QueryJob: a.model({
    query: a.string().required(),
    status: a.enum(['pending', 'processing', 'complete', 'error']),
    response: a.string(),
    error: a.string(),
    createdAt: a.datetime().required(),
    metadata: a.json()
  })
  .authorization(allow => [
    allow.publicApiKey(),
    allow.authenticated()
  ]),

  submitQuery: a.mutation()
    .arguments({
      query: a.string().required(),
      metadata: a.json()
    })
    .returns(a.ref('QueryJob'))
    .handler(a.handler.function(submitQueryFunction))
    .authorization(allow => [allow.authenticated()])
});

// CRITICAL: Grant Lambda access to GraphQL API
schema.authorization(allow => [
  allow.resource(submitQueryFunction),
  allow.resource(processQueryJob)
]);
```

### Pros:

- ✅ **Real-time UX** - Frontend shows live status updates
- ✅ **Automatic retry** - DynamoDB stream retries failures
- ✅ **Audit trail** - Every job tracked in database
- ✅ **No manual invocation** - Stream handles it automatically
- ✅ **Type-safe** - Full GraphQL schema validation

### Cons:

- ❌ **Higher cost** - DynamoDB writes, reads, stream charges
- ❌ **More infrastructure** - Need to design schema

---

## 🚀 Pattern 2: Lambda Self-Invoke

**Use when:** You need immediate response to webhooks but have slow processing

### The Flow:

```
1. Webhook hits Lambda Function URL (Slack/Stripe/GitHub)
   ↓
2. Lambda validates signature, responds "200 OK" (< 1 second) ✅
   ↓
3. Lambda invokes ITSELF asynchronously with payload
   ↓
4. First invocation returns (webhook sender is happy)
   ↓
5. Second invocation processes slow work (up to 15 minutes)
   ↓
6. Posts result back to external service (e.g., Slack message)
```

### Example Use Cases:

- ✅ Slack bot commands (must respond within 3 seconds)
- ✅ Stripe webhook processing (verify payment, send email)
- ✅ GitHub webhook handlers (run CI, update status)
- ✅ Any webhook requiring immediate acknowledgment

### Code Example (from Rosario production):

**1. Function resource with self-invoke permission:**

```typescript
// amplify/backend.ts
import { Policy, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,
  data,
  slackWebhook
});

// Grant Lambda permission to invoke itself
const selfInvokePolicy = new Policy(
  backend.slackWebhook.resources.lambda.stack,
  'SlackWebhookSelfInvokePolicy',
  {
    statements: [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [backend.slackWebhook.resources.lambda.functionArn],
      })
    ]
  }
);

selfInvokePolicy.attachToRole(backend.slackWebhook.resources.lambda.role!);
```

**2. Handler detects sync vs async invocation:**

```typescript
// amplify/functions/slack-webhook/handler.ts
import { Handler } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: process.env.AWS_REGION });

interface AsyncPayload {
  isAsync: true;
  slackEvent: {
    type: string;
    text: string;
    channel: string;
    user: string;
    ts: string;
  };
}

export const handler: Handler = async (event) => {
  // Check if this is async self-invocation
  if ('isAsync' in event && event.isAsync) {
    // ASYNC PATH: Do the slow work
    const asyncPayload = event as AsyncPayload;
    await processSlackMessage(asyncPayload.slackEvent);
    return;
  }

  // SYNC PATH: Webhook from Slack
  const body = typeof event.body === 'string' ? event.body : JSON.stringify(event.body);
  const payload = JSON.parse(body);

  // Handle URL verification
  if (payload.type === 'url_verification') {
    return {
      statusCode: 200,
      body: JSON.stringify({ challenge: payload.challenge })
    };
  }

  // Self-invoke asynchronously to process in background
  const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME;

  const asyncPayload: AsyncPayload = {
    isAsync: true,
    slackEvent: payload.event
  };

  await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,  // Invoke ourselves!
      InvocationType: 'Event',     // Async - don't wait for response
      Payload: JSON.stringify(asyncPayload)
    })
  );

  // Return immediately to Slack (within 3 seconds)
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true })
  };
};

// Async processing function (called by second invocation)
async function processSlackMessage(event: AsyncPayload['slackEvent']) {
  console.log('Processing message asynchronously:', event.text);

  // Call Claude API (takes 30-60 seconds)
  const response = await fetch(
    'https://claude.chinchilla-ai.com/query-rosario',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: event.text
      })
    }
  );

  const data = await response.json();

  // Post response back to Slack
  await slackClient.chat.postMessage({
    channel: event.channel,
    text: data.claude_response,
    thread_ts: event.ts
  });

  console.log('Successfully processed message');
}
```

### Pros:

- ✅ **Cheapest** - No DynamoDB, just one Lambda invocation
- ✅ **Simplest** - One function, one file
- ✅ **Elegant** - Beautiful self-referential pattern
- ✅ **Perfect for webhooks** - Immediate response required

### Cons:

- ❌ **No real-time feedback** - Frontend can't show "processing..." status
- ❌ **No automatic retry** - Must implement yourself
- ❌ **No audit trail** - Unless you manually add DynamoDB logging
- ❌ **Fire and forget** - User just waits with no visibility

---

## 🎯 Decision Matrix: Which Pattern Should I Use?

### Use Pattern 1 (DynamoDB Stream) When:

| Scenario | Why |
|----------|-----|
| **Frontend chatbot/dashboard** | Users need to see "Processing... please wait" |
| **Report generation** | Show progress: "Generating... 60% complete" |
| **Multi-step workflows** | Track status through each step |
| **Audit requirements** | Need full history of all operations |
| **Retry critical** | Must guarantee eventual processing |

### Use Pattern 2 (Lambda Self-Invoke) When:

| Scenario | Why |
|----------|-----|
| **Slack/Stripe/GitHub webhooks** | Must respond < 3 seconds or service retries |
| **No user waiting** | Result goes to external system, not user |
| **Simple one-off processing** | Don't need status tracking |
| **Cost-sensitive** | Minimize infrastructure |
| **Quick implementation** | Need it working fast |

---

## 🧪 Testing Both Patterns

### Testing Pattern 1 (DynamoDB Stream):

```bash
# Start sandbox
npx ampx sandbox

# In another terminal, watch DynamoDB table
aws dynamodb scan --table-name QueryJob-[sandbox-id] --watch

# Call mutation from frontend
const { data } = await client.mutations.submitQuery({
  query: "test query"
});

# Watch the record transition:
# status: 'pending' → 'processing' → 'complete'
```

### Testing Pattern 2 (Lambda Self-Invoke):

```bash
# View logs in real-time
aws logs tail /aws/lambda/slack-webhook --follow

# Send test webhook
curl -X POST https://your-function-url.lambda-url.us-east-1.on.aws \
  -H "Content-Type: application/json" \
  -d '{"type":"event_callback","event":{"text":"test"}}'

# You'll see TWO log streams:
# 1. First invocation: "Received webhook, self-invoking..."
# 2. Second invocation: "Processing asynchronously..."
```

---

## 💰 Cost Comparison

### Pattern 1 (DynamoDB Stream) Cost:

```
Per 1,000 requests:
- DynamoDB write (create job):     $0.00125
- DynamoDB read (subscription):     $0.00025
- DynamoDB streams (trigger):       $0.00020
- Lambda invocations (2 functions): $0.00040
Total: ~$0.00210 per request
```

### Pattern 2 (Lambda Self-Invoke) Cost:

```
Per 1,000 requests:
- Lambda first invocation:  $0.00020
- Lambda second invocation: $0.00020
Total: ~$0.00040 per request
```

**Pattern 2 is ~5x cheaper** (but you lose real-time status tracking).

---

## 🚨 Common Pitfalls

### Pattern 1 Mistakes:

1. **Forgetting `allow.resource()` in schema**
   ```typescript
   // ❌ Missing - Lambda can't access GraphQL API
   export const data = defineData({ schema });

   // ✅ Correct - Lambda has access
   schema.authorization(allow => [
     allow.resource(processQueryJob)
   ]);
   ```

2. **Not setting `resourceGroupName: 'data'`**
   ```typescript
   // ❌ Lambda can't access DynamoDB
   export const processQueryJob = defineFunction({
     name: 'process-query-job'
   });

   // ✅ Lambda has DynamoDB access
   export const processQueryJob = defineFunction({
     name: 'process-query-job',
     resourceGroupName: 'data'
   });
   ```

3. **Processing wrong record status**
   ```typescript
   // ❌ Processes all records, even completed ones
   for (const record of event.Records) {
     await processJob(record);
   }

   // ✅ Only process pending jobs
   if (record.dynamodb?.NewImage?.status?.S === 'pending') {
     await processJob(record);
   }
   ```

### Pattern 2 Mistakes:

1. **Forgetting self-invoke IAM permission**
   ```typescript
   // ❌ Lambda can't invoke itself - permission denied
   await lambda.send(new InvokeCommand({ FunctionName: functionName }));

   // ✅ Add IAM policy in backend.ts (see example above)
   ```

2. **Waiting for async invocation**
   ```typescript
   // ❌ Waits for second invocation to complete (defeats the purpose!)
   InvocationType: 'RequestResponse'

   // ✅ Fire and forget
   InvocationType: 'Event'
   ```

3. **No way to detect async invocation**
   ```typescript
   // ❌ Can't tell if first or second invocation
   export const handler = async (event) => {
     await processSlackMessage(event);
   };

   // ✅ Check for flag
   if ('isAsync' in event && event.isAsync) {
     await processSlackMessage(event.slackEvent);
   }
   ```

---

## 🔗 Related Documentation

- **[WEBHOOKS-GUIDE.md](./WEBHOOKS-GUIDE.md)** - Webhook handling (uses Pattern 2)
- **[NO-API-GATEWAY.md](./NO-API-GATEWAY.md)** - GraphQL custom mutations (uses Pattern 1)
- **[functions/scheduledFunction/](./functions/scheduledFunction/)** - Cron job examples
- **[LAMBDA_DYNAMODB_ACCESS.md](./functions/LAMBDA_DYNAMODB_ACCESS.md)** - DynamoDB access patterns

---

## 📚 Real-World Examples

Both patterns are running in production:

### Pattern 1: Rosario AI Business Intelligence
- **Repo**: `temp-rosario` (cloned for reference)
- **Files**:
  - `amplify/functions/submit-query/handler.ts` - Creates job
  - `amplify/functions/process-query-job/handler.ts` - Processes via DynamoDB Stream
  - `amplify/backend.ts:36-43` - Stream trigger configuration
- **Use case**: Frontend chatbot with real-time status updates

### Pattern 2: Rosario Slack Webhook
- **Repo**: `temp-rosario` (cloned for reference)
- **Files**:
  - `amplify/functions/slack-webhook/handler.ts:178-207` - Self-invoke code
  - `amplify/backend.ts:72-87` - IAM self-invoke policy
- **Use case**: Slack bot that must respond within 3 seconds

---

## 🎓 Key Takeaways

1. **The 30-second wall is real** - All AWS public endpoints timeout around 29-30 seconds
2. **Async patterns decouple response from processing** - Respond fast, process slow
3. **Pattern 1 is best for UX** - Users see real-time status updates
4. **Pattern 2 is best for webhooks** - Cheap, simple, immediate response
5. **Choose based on user visibility** - If frontend waits, use Pattern 1. If webhook fires and forgets, use Pattern 2.

---

## ❓ FAQ

**Q: Can I use both patterns in the same app?**
A: Yes! Use Pattern 1 for frontend operations, Pattern 2 for webhooks.

**Q: What if I don't need real-time status but want audit logs?**
A: Use Pattern 2 but manually write to DynamoDB in the async invocation.

**Q: Can Lambda run longer than 15 minutes?**
A: No. 15 minutes is the hard limit. For longer tasks, use Step Functions or ECS.

**Q: What about AWS Step Functions for async workflows?**
A: Step Functions are great for complex multi-step workflows, but overkill for simple "call API, return result" scenarios. Start with these patterns first.

**Q: Do I need to worry about duplicate processing?**
A: Pattern 1: DynamoDB streams handle deduplication. Pattern 2: Implement idempotency keys if needed.

---

## 🚀 Next Steps

1. **Identify your use case** - Frontend operation or webhook?
2. **Choose the right pattern** - Use the decision matrix
3. **Copy the example code** - From Rosario production examples
4. **Test in sandbox** - Verify async processing works
5. **Deploy to production** - Monitor CloudWatch logs

Happy building! 🎉
