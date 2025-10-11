# 🔗 Webhook Guide: External Services → Your App

---

## 🎯 Quick Navigation

**For comprehensive webhook documentation, see:**

### **[webhooks/](./webhooks/) - Complete Webhook Documentation** 📚

The `webhooks/` folder contains everything you need:

- **[README.md](./webhooks/README.md)** - Navigation hub and overview
- **[NEXTJS_API_ROUTES_PATTERN.md](./webhooks/NEXTJS_API_ROUTES_PATTERN.md)** - Complete pattern guide ⭐
- **[API_KEY_AUTH_EXPLAINED.md](./webhooks/API_KEY_AUTH_EXPLAINED.md)** - Deep dive on API key authentication
- **[authorization-modes.md](./webhooks/authorization-modes.md)** - What auth modes work with API key
- **[troubleshooting.md](./webhooks/troubleshooting.md)** - Common errors and solutions
- **[examples/](./webhooks/examples/)** - Complete working examples (Slack, Stripe, GitHub)

**The comprehensive guides include:**
- ✅ Amplify Data client with API key authentication
- ✅ DynamoDB storage with TTL
- ✅ Signature verification for all services
- ✅ The buffer pattern for slow processing
- ✅ Complete, production-ready code examples

---

## 📋 This Page: Quick Reference

This page provides a quick overview. For detailed implementations, **go to [webhooks/](./webhooks/)**.

---

## When You Need This

You need a **public HTTPS endpoint** that external services can POST to:

- ✅ Slack event subscriptions
- ✅ Stripe payment webhooks
- ✅ GitHub webhook events
- ✅ Twilio callbacks
- ✅ SendGrid event webhooks
- ✅ Any third-party service that sends HTTP requests to your app

---

## The Correct Solution: Next.js API Routes

Use **Next.js API routes** in `app/api/`. When deployed to Amplify Gen 2, they automatically become public Lambda-backed HTTPS endpoints.

### ❌ DON'T DO THIS

```typescript
// backend.ts - NEVER DO THIS
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
const httpApi = new HttpApi(backend.stack, 'WebhookApi', {
  apiName: 'slack-webhook-api',  // Wrong!
});
```

### ✅ DO THIS INSTEAD

```typescript
// app/api/slack/events/route.ts
export async function POST(request: Request) {
  const body = await request.json();

  // Handle Slack event

  return Response.json({ ok: true });
}
```

---

## How It Works

### 1. Create Next.js API Route

File location determines the URL:

```
app/api/slack/events/route.ts    → https://yourdomain.com/api/slack/events
app/api/stripe/webhook/route.ts  → https://yourdomain.com/api/stripe/webhook
app/api/github/webhook/route.ts  → https://yourdomain.com/api/github/webhook
```

### 2. When Deployed to Amplify Gen 2

Amplify automatically:
- Creates a Lambda function for each route
- Connects it to CloudFront
- Makes it accessible via HTTPS
- Uses your app's domain

**No CDK. No configuration. It just works.**

---

## Complete Webhook Examples

### Example 1: Slack Event Webhook

```typescript
// app/api/slack/events/route.ts
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Slack URL verification challenge
  if (body.type === 'url_verification') {
    return Response.json({ challenge: body.challenge });
  }

  // Handle Slack event
  if (body.event) {
    console.log('Slack event:', body.event);

    // Process the event
    // Save to DynamoDB, trigger background job, etc.

    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Unknown event type' }, { status: 400 });
}
```

**Configure in Slack:**
- Webhook URL: `https://yourdomain.com/api/slack/events`
- Amplify provides the domain when deployed

### Example 2: Stripe Webhook with Signature Verification

```typescript
// app/api/stripe/webhook/route.ts
import { NextRequest } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text(); // Get raw body for signature verification
  const signature = request.headers.get('stripe-signature')!;

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('Payment succeeded:', paymentIntent.id);
        // Update database, send confirmation email, etc.
        break;

      case 'payment_intent.payment_failed':
        console.log('Payment failed');
        // Handle failed payment
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }
}
```

**Configure in Stripe:**
- Webhook URL: `https://yourdomain.com/api/stripe/webhook`
- Get webhook secret from Stripe dashboard
- Store in environment variables

### Example 3: GitHub Webhook

```typescript
// app/api/github/webhook/route.ts
import { NextRequest } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  const event = request.headers.get('x-github-event');

  // Verify GitHub signature
  const secret = process.env.GITHUB_WEBHOOK_SECRET!;
  const hash = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  if (signature !== hash) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body);

  // Handle GitHub events
  switch (event) {
    case 'push':
      console.log('Push to:', payload.repository.full_name);
      // Trigger build, run tests, etc.
      break;

    case 'pull_request':
      console.log('PR action:', payload.action);
      // Run CI checks, update status, etc.
      break;

    default:
      console.log('Unhandled GitHub event:', event);
  }

  return Response.json({ success: true });
}
```

**Configure in GitHub:**
- Webhook URL: `https://yourdomain.com/api/github/webhook`
- Content type: `application/json`
- Secret: Store in environment variables

---

## Webhook Best Practices

### 1. Always Verify Signatures

External services send signatures to prove authenticity:

```typescript
// Stripe
const event = stripe.webhooks.constructEvent(body, signature, secret);

// GitHub
const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');

// Slack (signing secret)
const hash = crypto.createHmac('sha256', secret).update(timestamp + body).digest('hex');
```

**Never trust webhook data without signature verification.**

### 2. Return Responses Quickly

Webhooks expect fast responses (< 3 seconds):

```typescript
export async function POST(request: Request) {
  const body = await request.json();

  // ✅ Respond immediately
  const response = Response.json({ received: true });

  // ❌ Don't do slow work before responding
  // await slowDatabaseOperation();
  // await callExternalAPI();

  return response;
}
```

For slow operations, trigger a background job:

```typescript
export async function POST(request: Request) {
  const body = await request.json();

  // Option 1: Trigger GraphQL mutation (background processing)
  // Option 2: Save to DynamoDB for later processing
  // Option 3: Invoke another Lambda asynchronously

  // Respond immediately
  return Response.json({ received: true });
}
```

### 3. Handle Retries

Services retry failed webhooks. Make your handler **idempotent**:

```typescript
export async function POST(request: Request) {
  const body = await request.json();
  const eventId = body.id; // Most services send unique event IDs

  // Check if already processed
  const existing = await checkIfProcessed(eventId);
  if (existing) {
    return Response.json({ received: true }); // Already handled
  }

  // Process event
  await processEvent(body);

  // Mark as processed
  await markAsProcessed(eventId);

  return Response.json({ received: true });
}
```

### 4. Log Everything

Webhooks are hard to debug. Log comprehensively:

```typescript
export async function POST(request: Request) {
  const body = await request.json();

  console.log('Webhook received:', {
    headers: Object.fromEntries(request.headers),
    body,
    timestamp: new Date().toISOString(),
  });

  try {
    // Process webhook
    console.log('Processing successful');
  } catch (error) {
    console.error('Webhook processing failed:', error);
    throw error; // Let service retry
  }

  return Response.json({ received: true });
}
```

---

## Connecting Webhooks to Your Backend

Webhooks often need to interact with your Amplify backend:

### Pattern 1: Save to DynamoDB via GraphQL Mutation

```typescript
// app/api/slack/events/route.ts
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { Amplify } from 'aws-amplify';
import outputs from '@/amplify_outputs.json';

Amplify.configure(outputs);
const client = generateClient<Schema>();

export async function POST(request: Request) {
  const body = await request.json();

  // Save Slack message to database via GraphQL
  await client.mutations.saveSlackMessage({
    channelId: body.event.channel,
    messageText: body.event.text,
    timestamp: body.event.ts,
  });

  return Response.json({ ok: true });
}
```

### Pattern 2: Trigger Background Processing

```typescript
// app/api/stripe/webhook/route.ts
export async function POST(request: Request) {
  const body = await request.json();

  // Trigger async background job via GraphQL mutation
  await client.mutations.processPayment({
    paymentIntentId: body.data.object.id,
    amount: body.data.object.amount,
  });

  // Respond immediately (don't wait for processing)
  return Response.json({ received: true });
}
```

### Pattern 3: Direct DynamoDB Access (Advanced)

For high-volume webhooks, you can access DynamoDB directly:

```typescript
// app/api/high-volume-webhook/route.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function POST(request: Request) {
  const body = await request.json();

  await docClient.send(new PutCommand({
    TableName: process.env.EVENTS_TABLE_NAME,
    Item: {
      id: body.id,
      data: body,
      timestamp: Date.now(),
    },
  }));

  return Response.json({ received: true });
}
```

---

## Environment Variables

Store secrets in Amplify environment variables:

### In Amplify Console:
1. Go to your app → Environment variables
2. Add secrets:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `SLACK_SIGNING_SECRET`
   - `GITHUB_WEBHOOK_SECRET`

### Access in Next.js API Routes:
```typescript
const secret = process.env.STRIPE_WEBHOOK_SECRET;
```

---

## Testing Webhooks Locally

### Option 1: Use ngrok

```bash
# Start Next.js dev server
npm run dev

# In another terminal, expose localhost
npx ngrok http 3000
```

Use the ngrok URL for webhook configuration during development.

### Option 2: Use Webhook Testing Tools

- **Stripe CLI**: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- **Slack CLI**: Slack app development mode
- **Postman**: Send test webhook payloads manually

---

## Deployment

When you deploy to Amplify:

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add webhook handler"
   git push
   ```

2. **Amplify builds and deploys**
   - Next.js API routes become Lambda functions
   - Accessible at your Amplify domain

3. **Configure external service**
   - Use the Amplify domain: `https://your-app.amplifyapp.com/api/webhook`
   - Or custom domain: `https://yourdomain.com/api/webhook`

4. **Add environment variables**
   - Go to Amplify Console → Environment variables
   - Add webhook secrets
   - Redeploy if needed

---

## Common Patterns Summary

| Use Case | Solution | Example |
|----------|----------|---------|
| External webhook (Slack, Stripe) | Next.js API route | `app/api/slack/events/route.ts` |
| Internal backend operation | GraphQL custom mutation | `client.mutations.processData()` |
| Public HTTPS endpoint | Next.js API route | `app/api/public/route.ts` |
| Background job | GraphQL mutation | `client.mutations.runJob()` |
| Scheduled task | `defineFunction` with schedule | See function examples |

---

## The Rule

**For webhooks from external services:**
- ✅ Use Next.js API routes (`app/api/*/route.ts`)
- ❌ Never use API Gateway CDK

**For internal backend operations:**
- ✅ Use GraphQL custom mutations/queries
- ❌ Never use API Gateway CDK

**Never, ever use API Gateway CDK for anything.**

---

## Reference

### Comprehensive Webhook Documentation

- **[webhooks/](./webhooks/)** - Complete webhook documentation folder ⭐
  - Pattern guides, API key authentication, troubleshooting, examples
- **[NEXTJS_API_ROUTES_PATTERN.md](./webhooks/NEXTJS_API_ROUTES_PATTERN.md)** - Full implementation guide
- **[API_KEY_AUTH_EXPLAINED.md](./webhooks/API_KEY_AUTH_EXPLAINED.md)** - Deep dive on API keys
- **[examples/](./webhooks/examples/)** - Slack, Stripe, GitHub examples

### Related Documentation

- **API Gateway Ban**: `NO-API-GATEWAY.md`
- **GraphQL Custom Operations**: `data/simple-custom-operations.ts`
- **Main Guidelines**: `AI-DEVELOPMENT-GUIDELINES.md`
- **Next.js API Routes**: [Next.js Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
