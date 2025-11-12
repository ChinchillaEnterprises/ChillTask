# Handling Webhooks in Amplify Gen 2

**Complete guide to handling webhooks from external services (Slack, Stripe, GitHub, etc.) without using API Gateway or CDK.**

---

## 🎯 Quick Start

**Need to handle webhooks?** Use Next.js API routes + Amplify Data client with API key authentication.

**No CDK. No API Gateway. No standalone Lambda functions.**

---

## 📚 Documentation Structure

### Core Guides

1. **[NEXTJS_API_ROUTES_PATTERN.md](./NEXTJS_API_ROUTES_PATTERN.md)** ⭐ **START HERE**
   - The complete Next.js API Routes + Amplify Data pattern
   - Why this is better than API Gateway
   - How `amplify_outputs.json` works as a bridge
   - Complete working examples
   - When to use this pattern vs alternatives

2. **[API_KEY_AUTH_EXPLAINED.md](./API_KEY_AUTH_EXPLAINED.md)**
   - Deep dive on API key authentication
   - How AppSync works with API keys
   - Security considerations
   - Best practices

3. **[authorization-modes.md](./authorization-modes.md)**
   - Table of what authorization modes work with API key
   - Why `allow.publicApiKey()` is required
   - Common authorization errors and fixes

4. **[troubleshooting.md](./troubleshooting.md)**
   - Common webhook errors and solutions
   - Debugging tips
   - Performance optimization

### Live Examples

Complete working examples in `examples/`:

- **[slack-events/](./examples/slack-events/)** - Slack webhook events → DynamoDB
- **[stripe-payments/](./examples/stripe-payments/)** - Stripe payment webhooks
- **[github-events/](./examples/github-events/)** - GitHub webhook events
- **[shared/](./examples/shared/)** - Shared utilities (amplify-data-client.ts)

---

## 🚀 The Pattern (Quick Overview)

### What This Pattern Does

Allows external services to POST webhooks directly to your Next.js API routes, which then write to DynamoDB using the Amplify Data client.

**The Flow:**
```
Slack/Stripe/GitHub Webhook
  ↓
Next.js API Route (deployed as Lambda)
  ↓
Amplify Data Client (uses API key from amplify_outputs.json)
  ↓
AppSync GraphQL API
  ↓
DynamoDB
```

### Why This Works

- **Next.js API routes** automatically become Lambda functions when deployed to Amplify
- **They can access bundled files** like `amplify_outputs.json`
- **API key authentication** allows public endpoints without CDK complexity
- **AppSync is a cloud service** - not just for frontend, backend can call it too

### What You Get

✅ **Zero CDK code** - No API Gateway, no standalone Lambda resources
✅ **No deployment conflicts** - No hardcoded resource names
✅ **Simple authentication** - Just use the API key from `amplify_outputs.json`
✅ **Fast iteration** - Change route.ts, deploy, done
✅ **Type safety** - Full TypeScript support with generated types

---

## 🎯 When to Use This Pattern

### ✅ Perfect For:

- **Public webhooks** from external services (Slack, Stripe, GitHub, Twilio, SendGrid)
- **No user authentication** required (the webhook itself is authenticated by signature)
- **Writing webhook data** to DynamoDB
- **Triggering GraphQL mutations** from webhooks
- **Fast development** iteration on webhook handlers

### ❌ Not Suitable For:

- **User-authenticated endpoints** (use GraphQL custom mutations instead)
- **Scheduled functions** (use EventBridge scheduled Lambda)
- **Very high volume** (millions of requests per minute)
- **Complex IAM permissions** (use standalone Lambda with resourceGroupName)

**See the decision matrix in [NEXTJS_API_ROUTES_PATTERN.md](./NEXTJS_API_ROUTES_PATTERN.md#decision-matrix)**

---

## 🧠 Quick Decision Guide

```
Do I need to handle webhooks from an external service?
  │
  ├─ Is the endpoint public (no Cognito user auth)?
  │  │
  │  ├─ YES → Use THIS pattern (Next.js API Routes)
  │  │         Read: NEXTJS_API_ROUTES_PATTERN.md
  │  │
  │  └─ NO → Use GraphQL custom mutations
  │            Read: ../NO-API-GATEWAY.md
  │
  └─ Is it a scheduled task (cron)?
     │
     └─ YES → Use EventBridge scheduled Lambda
               Read: ../functions/scheduledFunction/
```

---

## 📖 Common Use Cases

### Slack Event Subscriptions

**Scenario:** Slack sends events (messages, reactions, etc.) to your app

**Solution:** Next.js API route → Amplify Data client → DynamoDB

**Example:** [examples/slack-events/](./examples/slack-events/)

**Pattern:**
- Slack POSTs to `https://yourdomain.com/api/slack/events`
- API route verifies signature, writes to DynamoDB
- Returns 200 OK within 3 seconds

---

### Stripe Payment Webhooks

**Scenario:** Stripe notifies you of payment events (success, failure, refund)

**Solution:** Next.js API route → Amplify Data client → DynamoDB

**Example:** [examples/stripe-payments/](./examples/stripe-payments/)

**Pattern:**
- Stripe POSTs to `https://yourdomain.com/api/stripe/webhook`
- API route verifies signature, writes to DynamoDB
- Optionally triggers mutation for order fulfillment

---

### GitHub Webhooks

**Scenario:** GitHub sends events (push, PR, issues) to your app

**Solution:** Next.js API route → Amplify Data client → DynamoDB

**Example:** [examples/github-events/](./examples/github-events/)

**Pattern:**
- GitHub POSTs to `https://yourdomain.com/api/github/webhook`
- API route verifies signature, writes to DynamoDB
- Triggers mutation for CI/CD pipeline

---

## ⚡ The 3-Second Problem

Webhooks typically timeout after **3 seconds**. If your processing takes longer, you'll get timeout errors.

### The Solution: Buffer Pattern

1. **Acknowledge Fast** (< 3 seconds)
   - Verify webhook signature
   - Write event to DynamoDB with TTL
   - Return 200 OK

2. **Process Later** (async)
   - Trigger GraphQL mutation to invoke Lambda
   - Lambda does heavy processing
   - Updates status in DynamoDB

**See detailed examples in [NEXTJS_API_ROUTES_PATTERN.md](./NEXTJS_API_ROUTES_PATTERN.md#the-buffer-pattern)**

---

## 🔐 Security

### Webhook Signature Verification

Always verify webhook signatures before processing:

```typescript
// Slack example
import { createHmac } from 'crypto';

function verifySlackSignature(body: string, timestamp: string, signature: string) {
  const hmac = createHmac('sha256', process.env.SLACK_SIGNING_SECRET!);
  hmac.update(`v0:${timestamp}:${body}`);
  const expected = `v0=${hmac.digest('hex')}`;
  return expected === signature;
}
```

**Examples for each service:**
- **Slack:** [examples/slack-events/route.ts](./examples/slack-events/route.ts)
- **Stripe:** [examples/stripe-payments/route.ts](./examples/stripe-payments/route.ts)
- **GitHub:** [examples/github-events/route.ts](./examples/github-events/route.ts)

### API Key Security

- ✅ API key is in `amplify_outputs.json` (auto-generated by Amplify)
- ✅ Only public endpoints use API key (not user-authenticated data)
- ✅ DynamoDB models use `allow.publicApiKey()` authorization
- ⚠️ Never commit API keys to git (amplify_outputs.json is gitignored)

---

## 💰 Cost Optimization

### TTL (Time To Live) Pattern

Webhook events are often temporary - you only need them for a few minutes.

**Example:**
```typescript
// In your schema
WebhookEvent: a.model({
  eventId: a.string().required(),
  data: a.json().required(),
  ttl: a.integer(), // Unix timestamp for auto-deletion
})
.authorization((allow) => [allow.publicApiKey()])
```

**In your API route:**
```typescript
import { calculateTTL } from '@/lib/amplify-data-client';

// Auto-delete after 10 minutes
const ttl = calculateTTL(10);

await dataClient.models.WebhookEvent.create({
  eventId: event.event_id,
  data: event,
  ttl, // DynamoDB will auto-delete this record
});
```

**Why this matters:**
- Prevents unbounded DynamoDB storage costs
- Auto-cleanup without Lambda triggers
- Perfect for temporary webhook event storage

---

## 🔗 Related Documentation

### Within Handbook

- **[../NO-API-GATEWAY.md](../NO-API-GATEWAY.md)** - For user-authenticated backend operations
- **[../functions/LAMBDA_DYNAMODB_ACCESS.md](../functions/LAMBDA_DYNAMODB_ACCESS.md)** - For scheduled/background Lambda functions
- **[../AI-DEVELOPMENT-GUIDELINES.md](../AI-DEVELOPMENT-GUIDELINES.md)** - The "No CDK" rule

### External Resources

- **[Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)** - Official Next.js docs
- **[Amplify Data](https://docs.amplify.aws/react/build-a-backend/data/)** - Amplify Data documentation
- **[DynamoDB TTL](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html)** - Time To Live documentation

---

## 🤖 For AI Assistants

When a user asks:
- "I need to handle Slack/Stripe/GitHub webhooks"
- "How do I save webhook events to DynamoDB?"
- "I want to create a public API endpoint"

**Recommend THIS pattern:**
✅ Next.js API Routes + Amplify Data Client (API key)

**NOT these:**
❌ API Gateway with CDK
❌ Standalone Lambda function with CDK
❌ Manual IAM role configuration

**Implementation checklist:**
1. ✅ Confirm endpoint can be public (no Cognito user auth)
2. ✅ Create `lib/amplify-data-client.ts` with API key config
3. ✅ Add model to schema with `allow.publicApiKey()`
4. ✅ Enable `apiKeyAuthorizationMode` in defineData
5. ✅ Create API route in `app/api/service/route.ts`
6. ✅ Add TTL field if data is temporary
7. ✅ Verify webhook signatures for security

**Guide them to:** [NEXTJS_API_ROUTES_PATTERN.md](./NEXTJS_API_ROUTES_PATTERN.md)

---

## 🎓 Learning Path

### New to This Pattern?

1. **Read:** [NEXTJS_API_ROUTES_PATTERN.md](./NEXTJS_API_ROUTES_PATTERN.md)
   - Understand the core pattern and why it works

2. **Study:** [examples/slack-events/](./examples/slack-events/)
   - See a complete working example

3. **Learn:** [API_KEY_AUTH_EXPLAINED.md](./API_KEY_AUTH_EXPLAINED.md)
   - Deep dive on how API key authentication works

4. **Implement:** Copy and customize an example for your use case

5. **Debug:** Use [troubleshooting.md](./troubleshooting.md) if you hit issues

### Already Familiar?

- Jump to [examples/](./examples/) for copy-paste code
- Check [authorization-modes.md](./authorization-modes.md) for auth rules
- Use [troubleshooting.md](./troubleshooting.md) for common errors

---

## ❓ FAQ

**Q: Why not just use API Gateway with CDK?**
A: API Gateway with CDK requires hardcoded resource names (causes sandbox conflicts), manual IAM setup, and lots of boilerplate. Next.js API routes are simpler and Amplify-native.

**Q: Can I use this for user-authenticated endpoints?**
A: No. This pattern is for PUBLIC endpoints only. For user-authenticated operations, use GraphQL custom mutations (see [../NO-API-GATEWAY.md](../NO-API-GATEWAY.md)).

**Q: What if my webhook processing takes longer than 3 seconds?**
A: Use the buffer pattern - acknowledge fast (< 3 sec), then trigger a mutation to process asynchronously in a Lambda function.

**Q: How do I handle webhook signature verification?**
A: Each example ([slack-events](./examples/slack-events/), [stripe-payments](./examples/stripe-payments/), [github-events](./examples/github-events/)) includes signature verification code.

**Q: Is the API key secure?**
A: Yes - it's in `amplify_outputs.json` which is gitignored, and it only grants access to models with `allow.publicApiKey()` authorization.

**Q: Can I use this with standalone Lambda functions?**
A: No, this pattern is specifically for Next.js API routes. For standalone Lambda, use the pattern in [../functions/LAMBDA_DYNAMODB_ACCESS.md](../functions/LAMBDA_DYNAMODB_ACCESS.md).

---

## 🎯 Remember

1. **Next.js API routes ARE Lambda functions** when deployed to Amplify
2. **AppSync is a cloud service** - backend can call it just like frontend
3. **API key authentication** avoids all the CDK complexity
4. **Buffer pattern** solves the 3-second timeout problem
5. **TTL pattern** prevents unbounded storage costs

Happy webhook handling! 🚀
