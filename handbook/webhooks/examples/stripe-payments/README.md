# Stripe Webhooks Example

**Coming soon: Complete working example of handling Stripe payment webhooks using Next.js API Routes + Amplify Data.**

---

## 🎯 What This Will Show

- ✅ Stripe webhook handler for payment events
- ✅ Signature verification with Stripe signing secret
- ✅ Payment event storage in DynamoDB
- ✅ Idempotency handling for retry safety
- ✅ Fast acknowledgment (< 3 seconds)

---

## 📋 Common Stripe Events

| Event Type | Description | Action |
|------------|-------------|--------|
| `payment_intent.succeeded` | Payment completed | Fulfill order |
| `payment_intent.payment_failed` | Payment failed | Notify user |
| `charge.refunded` | Refund processed | Update order status |
| `customer.subscription.created` | New subscription | Activate features |
| `customer.subscription.deleted` | Subscription canceled | Deactivate features |
| `invoice.payment_succeeded` | Invoice paid | Send receipt |

**Full list:** https://stripe.com/docs/api/events/types

---

## 🔐 Stripe Signature Verification

Stripe signs webhooks with your webhook signing secret:

```typescript
import { createHmac } from 'crypto';

function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const timestamp = signature.split(',')[0].split('=')[1];
  const sig = signature.split(',')[1].split('=')[1];

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSig = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return sig === expectedSig;
}
```

---

## 💡 Key Differences from Slack

**Stripe Specifics:**
1. **Idempotency** - Stripe retries failed webhooks, must handle duplicates
2. **Stripe-Signature header** - Different format than Slack
3. **Webhook signing secret** - Per webhook endpoint, not per app
4. **No challenge response** - No URL verification like Slack

**Idempotency Pattern:**
```typescript
// Check if event already processed
const existing = await dataClient.models.StripeEvent.list({
  filter: { eventId: { eq: body.id } }
});

if (existing.data.length > 0) {
  console.log('Event already processed, skipping');
  return Response.json({ received: true });
}

// Process only if new
await processPaymentEvent(body);
```

---

## 📝 Recommended Schema

```typescript
StripeEvent: a.model({
  eventId: a.string().required(),        // Stripe event ID
  eventType: a.string().required(),      // payment_intent.succeeded, etc.
  customerId: a.string(),                // Stripe customer ID
  paymentIntentId: a.string(),           // Payment intent ID
  amount: a.integer(),                   // Amount in cents
  currency: a.string(),                  // USD, EUR, etc.
  status: a.string(),                    // succeeded, failed, etc.
  data: a.json().required(),             // Full event payload
  ttl: a.integer(),                      // Auto-delete after processing
  processedAt: a.datetime(),
  processingStatus: a.enum(['pending', 'processed', 'failed']),
})
.authorization((allow) => [
  allow.publicApiKey(),
])
```

---

## 🚀 Quick Start (When Available)

```bash
# Copy the files
cp route.ts your-app/app/api/stripe/webhook/route.ts
cp schema.ts your-app/amplify/data/resource.ts

# Add environment variable
echo "STRIPE_WEBHOOK_SECRET=whsec_..." > .env.local

# Start sandbox
npx ampx sandbox

# Test locally with Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## 📚 Resources

- **[Stripe Webhooks Guide](https://stripe.com/docs/webhooks)** - Official documentation
- **[Stripe CLI](https://stripe.com/docs/stripe-cli)** - Local testing tool
- **[Event Types](https://stripe.com/docs/api/events/types)** - All webhook events
- **[Signature Verification](https://stripe.com/docs/webhooks/signatures)** - Security guide

---

## 🔔 Status

**Status:** 📝 Documentation planned

**Coming soon!** Full implementation with:
- Complete route.ts implementation
- Schema definition
- Signature verification
- Idempotency handling
- Testing guide with Stripe CLI

**Want to help?** Contributions welcome! See the Slack example for the pattern to follow.

---

## 💡 In the Meantime

Use the **Slack events example** as a reference - the pattern is nearly identical:

1. Verify webhook signature (different algorithm)
2. Check for duplicate processing (idempotency)
3. Store event in DynamoDB with TTL
4. Acknowledge fast (< 3 seconds)
5. Trigger async processing if needed

The core concepts are the same, just different signature verification and event structure!
