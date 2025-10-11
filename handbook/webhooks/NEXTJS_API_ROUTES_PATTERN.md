# Next.js API Routes + Amplify Data Pattern

**The complete guide to handling webhooks without API Gateway or CDK.**

---

## 🎯 TL;DR

Use Next.js API routes with the Amplify Data client (API key auth) to handle webhooks from external services like Slack, Stripe, and GitHub.

**Zero CDK. Zero API Gateway. Zero deployment conflicts.**

---

## 🧠 The Core Insight

### What We Discovered

**AppSync is NOT frontend-only** - it's a cloud service that both frontend AND backend can call.

When you deploy a Next.js app to Amplify:
1. **Next.js API routes become Lambda functions** automatically
2. **They can access bundled files** like `amplify_outputs.json`
3. **`amplify_outputs.json` contains** the AppSync endpoint URL and API key
4. **Your API route can** use the Amplify Data client to write to DynamoDB

**This eliminates the need for API Gateway + standalone Lambda + CDK.**

---

## 🆚 The Old Way vs The New Way

### ❌ The Old Way (Problematic)

```typescript
// backend.ts - Lots of CDK code
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2'; // ❌ CDK
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'; // ❌ CDK

const httpApi = new HttpApi(backend.stack, 'WebhookApi', {
  apiName: 'slack-webhook-api', // ❌ Hardcoded name = conflicts!
});

const webhookHandler = defineFunction({
  name: 'slack-webhook-handler',
  entry: './webhook-handler.ts',
});

// Manual IAM policy configuration... ❌ Complex!
webhookHandler.addToRolePolicy(new PolicyStatement({...}));
```

**Problems:**
- 🔴 Requires importing from `aws-cdk-lib` (violates No CDK rule)
- 🔴 Hardcoded API names cause sandbox deployment conflicts
- 🔴 Manual IAM role management
- 🔴 Complex CDK boilerplate
- 🔴 Separate deployment from Next.js app

---

### ✅ The New Way (This Pattern)

```typescript
// app/api/slack/events/route.ts - Just a Next.js API route
import { dataClient } from '@/lib/amplify-data-client';

export async function POST(request: Request) {
  const body = await request.json();

  // Write directly to DynamoDB via Amplify Data client
  await dataClient.models.SlackEvent.create({
    eventId: body.event_id,
    data: body,
    ttl: calculateTTL(10), // Auto-delete after 10 minutes
  });

  return Response.json({ ok: true });
}
```

**What happens when deployed:**
- ✅ Amplify automatically creates a Lambda function for this route
- ✅ Accessible at: `https://yourdomain.com/api/slack/events`
- ✅ Can access `amplify_outputs.json` for API key
- ✅ Uses existing Next.js infrastructure
- ✅ No CDK code anywhere
- ✅ No naming conflicts

---

## 🏗️ How It Works

### The Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ External Service (Slack/Stripe/GitHub)                      │
└─────────────────────────────────────────────────────────────┘
                            │ POST webhook
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Next.js API Route (app/api/slack/events/route.ts)          │
│ - Deployed as Lambda function by Amplify                    │
│ - Has access to amplify_outputs.json                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ lib/amplify-data-client.ts                                  │
│ - Reads amplify_outputs.json                                │
│ - Gets AppSync endpoint + API key                           │
│ - Configures Amplify Data client                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ AppSync GraphQL API (Cloud Service)                         │
│ - Receives mutation/query with API key auth                 │
│ - Validates authorization (allow.publicApiKey)               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ DynamoDB Table                                               │
│ - Stores webhook event data                                 │
│ - TTL auto-deletes old records                              │
└─────────────────────────────────────────────────────────────┘
```

### The Key Pieces

1. **Next.js API Route** (`app/api/*/route.ts`)
   - Becomes a Lambda function when deployed
   - Receives webhook POST requests
   - Has access to bundled files

2. **amplify_outputs.json** (Auto-generated)
   - Contains AppSync endpoint URL
   - Contains API key
   - Bundled with Next.js deployment

3. **Shared Library** (`lib/amplify-data-client.ts`)
   - Reads `amplify_outputs.json`
   - Configures Amplify with API key auth
   - Exports configured Data client

4. **Data Schema** (`amplify/data/resource.ts`)
   - Models with `allow.publicApiKey()` authorization
   - `apiKeyAuthorizationMode` enabled in defineData

---

## 📝 Complete Working Example

### Step 1: Create Shared Data Client

```typescript
// lib/amplify-data-client.ts
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from '@/amplify_outputs.json';
import type { Schema } from '@/amplify/data/resource';

// Configure Amplify with API key authentication
Amplify.configure(outputs, {
  ssr: true, // Important for Next.js API routes!
});

// Create client with API key auth mode
export const dataClient = generateClient<Schema>({
  authMode: 'apiKey', // Uses API key from amplify_outputs.json
});

/**
 * Calculate TTL (Time To Live) timestamp
 * @param minutesFromNow - How many minutes until auto-deletion
 * @returns Unix timestamp for DynamoDB TTL
 */
export function calculateTTL(minutesFromNow: number): number {
  return Math.floor(Date.now() / 1000) + (minutesFromNow * 60);
}

/**
 * Safely stringify JSON with error handling
 */
export function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.error('JSON stringify error:', error);
    return JSON.stringify({ error: 'Failed to stringify object' });
  }
}
```

**Key Points:**
- ✅ `ssr: true` is CRITICAL for Next.js API routes
- ✅ `authMode: 'apiKey'` uses the API key from outputs
- ✅ Helper functions for common operations

---

### Step 2: Create Data Schema

```typescript
// amplify/data/resource.ts
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  SlackEvent: a.model({
    eventId: a.string().required(),
    eventType: a.string().required(),
    channelId: a.string(),
    userId: a.string(),
    text: a.string(),
    data: a.json().required(), // Full event payload
    ttl: a.integer(), // Unix timestamp for auto-deletion
    processedAt: a.datetime(),
  })
  // PUBLIC API KEY AUTHORIZATION - Required for webhooks!
  .authorization((allow) => [
    allow.publicApiKey(), // Allows API route to create records
  ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
    // CRITICAL: Enable API key authorization mode
    apiKeyAuthorizationMode: {
      expiresInDays: 30, // API key expires in 30 days
    },
  },
});
```

**Key Points:**
- ✅ `allow.publicApiKey()` on the model
- ✅ `apiKeyAuthorizationMode` enabled in defineData
- ✅ TTL field for auto-deletion
- ✅ JSON field for full event payload

---

### Step 3: Create Next.js API Route

```typescript
// app/api/slack/events/route.ts
import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { dataClient, calculateTTL, safeStringify } from '@/lib/amplify-data-client';

/**
 * Verify Slack signature to ensure webhook is authentic
 */
function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string
): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET!;

  // Prevent replay attacks (timestamp too old)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTimestamp - parseInt(timestamp)) > 60 * 5) {
    return false; // Older than 5 minutes
  }

  // Compute expected signature
  const hmac = createHmac('sha256', signingSecret);
  hmac.update(`v0:${timestamp}:${body}`);
  const expected = `v0=${hmac.digest('hex')}`;

  // Compare signatures (constant-time comparison)
  return expected === signature;
}

export async function POST(request: Request) {
  try {
    // Get raw body text for signature verification
    const bodyText = await request.text();
    const body = JSON.parse(bodyText);

    // Get Slack signature headers
    const timestamp = request.headers.get('x-slack-request-timestamp') || '';
    const signature = request.headers.get('x-slack-signature') || '';

    // Verify webhook signature
    if (!verifySlackSignature(bodyText, timestamp, signature)) {
      console.error('Invalid Slack signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Handle Slack URL verification challenge
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Extract event data
    const event = body.event;

    // Write to DynamoDB via Amplify Data client
    // This uses API key authentication from amplify_outputs.json
    const result = await dataClient.models.SlackEvent.create({
      eventId: body.event_id,
      eventType: event.type,
      channelId: event.channel,
      userId: event.user,
      text: event.text,
      data: safeStringify(body),
      ttl: calculateTTL(10), // Auto-delete after 10 minutes
      processedAt: new Date().toISOString(),
    });

    console.log('Slack event saved:', result.data?.id);

    // Acknowledge receipt to Slack (< 3 seconds!)
    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Webhook processing error:', error);

    // Still return 200 to prevent Slack from retrying
    // (Log error for manual investigation)
    return NextResponse.json({ ok: true });
  }
}
```

**Key Points:**
- ✅ Signature verification for security
- ✅ Fast acknowledgment (< 3 seconds)
- ✅ Uses `dataClient` from shared library
- ✅ TTL for auto-cleanup
- ✅ Comprehensive error handling

---

## ⚡ The 3-Second Timeout Problem

### The Problem

Most webhook services (Slack, Stripe, GitHub) have a **3-second timeout**. If your API route takes longer than 3 seconds to respond, the webhook will fail and retry.

**What causes slow responses:**
- 🔴 Complex processing (image analysis, AI, etc.)
- 🔴 Multiple database queries
- 🔴 External API calls
- 🔴 Heavy computations

### The Solution: Buffer Pattern

**Acknowledge Fast, Process Later**

```typescript
// app/api/slack/events/route.ts
export async function POST(request: Request) {
  const body = await request.json();

  // 1. Verify signature (fast)
  if (!verifySignature(...)) {
    return NextResponse.json({ error: 'Invalid' }, { status: 401 });
  }

  // 2. Write event to DynamoDB with TTL (fast)
  await dataClient.models.SlackEvent.create({
    eventId: body.event_id,
    data: body,
    ttl: calculateTTL(10), // Will be auto-deleted
    status: 'pending', // Mark as unprocessed
  });

  // 3. Acknowledge IMMEDIATELY (< 3 seconds total)
  const response = NextResponse.json({ ok: true });

  // 4. Trigger async processing (mutation invokes Lambda)
  // This happens AFTER the response is sent
  dataClient.mutations.processSlackEvent({
    eventId: body.event_id,
  }).catch(error => {
    console.error('Async processing failed:', error);
  });

  return response;
}
```

**The async mutation (invokes Lambda for heavy processing):**

```typescript
// amplify/data/resource.ts
const schema = a.schema({
  // ... SlackEvent model ...

  // Custom mutation for async processing
  processSlackEvent: a
    .mutation()
    .arguments({ eventId: a.string().required() })
    .returns(a.json())
    .handler(a.handler.function('processSlackEvent'))
    .authorization((allow) => [allow.publicApiKey()]),
});
```

```typescript
// amplify/functions/processSlackEvent/handler.ts
import type { Schema } from '../../data/resource';

export const handler: Schema['processSlackEvent']['functionHandler'] = async (event) => {
  const { eventId } = event.arguments;

  // Fetch event from DynamoDB
  const slackEvent = await client.models.SlackEvent.get({ id: eventId });

  // Do heavy processing here (can take minutes)
  const result = await heavyProcessing(slackEvent.data);

  // Update status
  await client.models.SlackEvent.update({
    id: eventId,
    status: 'processed',
    processedAt: new Date().toISOString(),
  });

  return { success: true, result };
};
```

**Benefits:**
- ✅ Webhook acknowledges in < 3 seconds
- ✅ Heavy processing happens asynchronously
- ✅ No timeout failures
- ✅ No retry storms

---

## 💰 TTL (Time To Live) Pattern

### Why TTL Matters

Webhook events accumulate quickly:
- Slack sends thousands of events per day
- Stripe sends every payment event
- GitHub sends every push/PR/issue

**Without TTL:** Your DynamoDB table grows indefinitely → increasing storage costs

**With TTL:** Old records auto-delete → bounded storage costs

### How to Implement TTL

**1. Add TTL field to schema:**

```typescript
SlackEvent: a.model({
  eventId: a.string().required(),
  data: a.json().required(),
  ttl: a.integer(), // Unix timestamp
})
```

**2. Enable TTL on DynamoDB table:**

TTL is enabled automatically when you have a field named `ttl` in your schema.

**3. Calculate TTL in your API route:**

```typescript
import { calculateTTL } from '@/lib/amplify-data-client';

// Auto-delete after 10 minutes
await dataClient.models.SlackEvent.create({
  eventId: body.event_id,
  data: body,
  ttl: calculateTTL(10),
});
```

**Helper function:**

```typescript
// lib/amplify-data-client.ts
export function calculateTTL(minutesFromNow: number): number {
  // DynamoDB TTL expects Unix timestamp (seconds since epoch)
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const minutes = minutesFromNow * 60; // Convert to seconds
  return now + minutes;
}
```

### Common TTL Values

| Use Case | TTL Duration | Rationale |
|----------|--------------|-----------|
| Webhook events | 10 minutes | Just need to process, then discard |
| Payment events | 7 days | Keep for reconciliation, then archive |
| Audit logs | 90 days | Compliance requirements |
| Temporary data | 1 hour | Very short-lived cache |

---

## 🔐 Authorization Modes

### What Works with API Key

| Authorization Rule      | Works? | Why |
|-------------------------|--------|-----|
| `allow.publicApiKey()`  | ✅ YES  | Designed for API key access |
| `allow.authenticated()` | ❌ NO   | Requires Cognito user token |
| `allow.owner()`         | ❌ NO   | Requires Cognito user identity |
| `allow.groups(['admin'])`| ❌ NO  | Requires Cognito group membership |
| `allow.resource(fn)`    | ⚠️ COMPLEX | Requires Lambda IAM setup |

### The Required Pattern

```typescript
// amplify/data/resource.ts
const schema = a.schema({
  WebhookEvent: a.model({
    // ... fields ...
  })
  // CRITICAL: Must use allow.publicApiKey()
  .authorization((allow) => [
    allow.publicApiKey(), // For webhook API routes
  ]),
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
    // CRITICAL: Enable API key mode
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
```

### Common Authorization Errors

**Error: "AccessDeniedException"**
```
Cause: Missing allow.publicApiKey() on model
Fix: Add .authorization((allow) => [allow.publicApiKey()])
```

**Error: "API key not found"**
```
Cause: apiKeyAuthorizationMode not enabled in defineData
Fix: Add apiKeyAuthorizationMode to defineData config
```

**See:** [authorization-modes.md](./authorization-modes.md) for complete details

---

## 🎯 Decision Matrix

### When to Use THIS Pattern

✅ **Perfect for:**
- Public webhooks from external services
- No user authentication required
- Writing event data to DynamoDB
- Triggering async processing via mutations
- Fast iteration on webhook handlers
- Avoiding CDK complexity

### When to Use Alternatives

❌ **Use GraphQL Custom Mutations instead:**
- User-authenticated operations
- Frontend invoking backend logic
- Owner-based authorization
- See: [../NO-API-GATEWAY.md](../NO-API-GATEWAY.md)

❌ **Use Standalone Lambda instead:**
- Scheduled functions (cron jobs)
- EventBridge triggers
- S3 event triggers
- Complex IAM permissions
- See: [../functions/LAMBDA_DYNAMODB_ACCESS.md](../functions/LAMBDA_DYNAMODB_ACCESS.md)

### Comparison Table

| Feature | Next.js API Routes | GraphQL Custom Mutations | Standalone Lambda |
|---------|-------------------|-------------------------|-------------------|
| **Use Case** | Public webhooks | User-authenticated ops | Scheduled/triggered |
| **Authentication** | API key | Cognito user token | IAM role |
| **CDK Required** | ❌ No | ❌ No | ⚠️ Sometimes |
| **Deployment** | With Next.js app | With Data schema | Separate resource |
| **Authorization** | `publicApiKey()` | `authenticated()`, `owner()` | `resource()` |
| **Best For** | External services | Internal operations | Background jobs |

---

## 🧩 How amplify_outputs.json Works

### What Is It?

`amplify_outputs.json` is auto-generated by Amplify and contains:
- AppSync GraphQL endpoint URL
- API key
- Cognito User Pool ID
- S3 bucket names
- All other AWS resource identifiers

**Location:** Root of your Next.js project

**Gitignored:** Yes - contains sensitive keys

### The "Bridge" Concept

```
amplify_outputs.json acts as a BRIDGE between:

Frontend Config              Backend Access
     ↓                              ↓
[amplify_outputs.json]
     ↓                              ↓
React components          Next.js API routes
use Amplify.configure()   use Amplify.configure()
     ↓                              ↓
Both access the           Both access the
SAME AppSync endpoint     SAME AppSync endpoint
```

**Key Insight:** Frontend and backend both use the same GraphQL API, just with different auth modes (userPool vs apiKey).

### How Next.js API Routes Access It

When you deploy a Next.js app to Amplify:
1. `amplify_outputs.json` is bundled with your app
2. API routes (Lambda functions) can import it
3. Use it to configure the Amplify Data client

**Example:**

```typescript
// lib/amplify-data-client.ts
import outputs from '@/amplify_outputs.json'; // ← Bundled file

Amplify.configure(outputs, { ssr: true });
```

**Why this works:**
- Next.js bundles all imported files when building
- Lambda function includes the bundle
- File is accessible at runtime

### What's Inside

```json
{
  "data": {
    "url": "https://abcd1234.appsync-api.us-east-1.amazonaws.com/graphql",
    "api_key": "da2-abcdefghijklmnopqrstuvwxyz",
    "default_authorization_type": "AMAZON_COGNITO_USER_POOLS",
    "authorization_types": ["API_KEY", "AMAZON_COGNITO_USER_POOLS"]
  },
  "auth": {
    "user_pool_id": "us-east-1_AbCdEfGhI",
    "user_pool_client_id": "1234567890abcdefghijklm"
  }
}
```

**The Data client uses:**
- `data.url` - AppSync endpoint
- `data.api_key` - For `authMode: 'apiKey'`

---

## 🧪 Testing Your Webhook

### Local Testing

**1. Start Next.js dev server:**
```bash
npm run dev
```

**2. Use ngrok to expose localhost:**
```bash
ngrok http 3000
```

**3. Configure webhook URL in external service:**
```
https://abc123.ngrok.io/api/slack/events
```

**4. Send test webhook from service**

**5. Check logs:**
```bash
# Console output from Next.js dev server
```

### Production Testing

**1. Deploy to Amplify:**
```bash
git push
```

**2. Get deployment URL:**
```
https://main.d1234abcd.amplifyapp.com
```

**3. Configure webhook in external service:**
```
https://main.d1234abcd.amplifyapp.com/api/slack/events
```

**4. Send test webhook**

**5. Check CloudWatch logs:**
- Go to AWS Console
- CloudWatch > Log groups
- Find `/aws/lambda/your-function-name`

---

## 🔍 Debugging

### Check API Route Logs

**Development:**
```bash
npm run dev
# Logs appear in terminal
```

**Production:**
- AWS Console → CloudWatch → Log groups
- Find log group for your API route Lambda

### Verify amplify_outputs.json

```typescript
// app/api/debug/route.ts
import outputs from '@/amplify_outputs.json';

export async function GET() {
  return Response.json({
    hasApiKey: !!outputs.data?.api_key,
    endpoint: outputs.data?.url,
  });
}
```

Visit: `https://yourdomain.com/api/debug`

### Test Data Client Connection

```typescript
// app/api/test-db/route.ts
import { dataClient } from '@/lib/amplify-data-client';

export async function GET() {
  try {
    const result = await dataClient.models.SlackEvent.list();
    return Response.json({ success: true, count: result.data.length });
  } catch (error) {
    return Response.json({ success: false, error: String(error) });
  }
}
```

---

## 📚 Complete Example Files

### File Structure

```
your-app/
├── amplify/
│   ├── data/
│   │   └── resource.ts              # Schema with publicApiKey
│   └── backend.ts                   # No CDK needed!
├── lib/
│   └── amplify-data-client.ts      # Shared client
├── app/
│   └── api/
│       └── slack/
│           └── events/
│               └── route.ts         # Webhook handler
├── amplify_outputs.json             # Auto-generated
└── .env.local                       # SLACK_SIGNING_SECRET
```

**See complete working examples:**
- [examples/slack-events/](./examples/slack-events/)
- [examples/stripe-payments/](./examples/stripe-payments/)
- [examples/github-events/](./examples/github-events/)

---

## 🎯 Checklist

Before deploying your webhook handler:

- [ ] Created `lib/amplify-data-client.ts` with API key auth
- [ ] Added model to schema with `allow.publicApiKey()`
- [ ] Enabled `apiKeyAuthorizationMode` in defineData
- [ ] Created API route in `app/api/service/route.ts`
- [ ] Added signature verification in API route
- [ ] Added TTL field for auto-cleanup
- [ ] Tested locally with ngrok
- [ ] Deployed to Amplify
- [ ] Configured webhook URL in external service
- [ ] Tested with real webhook from service
- [ ] Checked CloudWatch logs for errors

---

## 🚀 Next Steps

1. **Copy an example:** Start with [examples/slack-events/](./examples/slack-events/)
2. **Customize for your service:** Modify signature verification and data model
3. **Deploy and test:** Use ngrok for local testing, then deploy to Amplify
4. **Monitor:** Check CloudWatch logs for errors
5. **Optimize:** Add buffer pattern if processing takes > 3 seconds

---

## 🔗 Related Documentation

- **[API_KEY_AUTH_EXPLAINED.md](./API_KEY_AUTH_EXPLAINED.md)** - Deep dive on API key authentication
- **[authorization-modes.md](./authorization-modes.md)** - What works with API key
- **[troubleshooting.md](./troubleshooting.md)** - Common errors and fixes
- **[examples/](./examples/)** - Complete working examples

---

**Remember:** Next.js API routes + Amplify Data client = The CDK-free way to handle webhooks! 🚀
