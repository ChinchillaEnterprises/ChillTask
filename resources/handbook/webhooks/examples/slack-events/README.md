# Slack Events Webhook Example

**Complete working example of handling Slack event subscriptions using Next.js API Routes + Amplify Data.**

---

## 🎯 What This Example Shows

- ✅ **Slack event subscription** webhook handler
- ✅ **Signature verification** for security
- ✅ **URL verification** challenge response
- ✅ **Fast acknowledgment** (< 3 seconds)
- ✅ **DynamoDB storage** with TTL
- ✅ **API key authentication** with Amplify Data
- ✅ **Complete type safety** with TypeScript

---

## 📁 Files in This Example

```
slack-events/
├── README.md           ← You are here
├── route.ts            ← Next.js API route (webhook handler)
└── schema.ts           ← Data schema for Slack events
```

**Also needed (copy from shared/):**
```
lib/
└── amplify-data-client.ts   ← Shared Amplify client
```

---

## 🚀 Quick Start

### Step 1: Copy Files to Your Project

```bash
# Copy the API route
cp route.ts your-app/app/api/slack/events/route.ts

# Copy the shared client
cp ../shared/amplify-data-client.ts your-app/lib/amplify-data-client.ts
```

### Step 2: Add Schema to Your Data Resource

```typescript
// your-app/amplify/data/resource.ts
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // Copy the SlackEvent model from schema.ts
  SlackEvent: a.model({
    eventId: a.string().required(),
    eventType: a.string().required(),
    channelId: a.string(),
    userId: a.string(),
    text: a.string(),
    teamId: a.string(),
    timestamp: a.string(),
    data: a.json().required(),
    ttl: a.integer(),
    processedAt: a.datetime(),
    status: a.enum(['pending', 'processed', 'failed']),
  })
  .authorization((allow) => [
    allow.publicApiKey(), // ← CRITICAL: Allows webhook access
  ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
    // ← CRITICAL: Enable API key mode
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
```

### Step 3: Add Environment Variable

```bash
# Create .env.local
echo "SLACK_SIGNING_SECRET=your-slack-signing-secret" > .env.local
```

**Where to find your Slack signing secret:**
1. Go to https://api.slack.com/apps
2. Select your app
3. Go to "Basic Information"
4. Find "Signing Secret" under "App Credentials"

### Step 4: Start Sandbox

```bash
npx ampx sandbox
```

Wait for "amplify_outputs.json generated"

### Step 5: Start Dev Server

```bash
npm run dev
```

### Step 6: Expose Localhost with ngrok

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### Step 7: Configure Slack Event Subscriptions

1. Go to https://api.slack.com/apps
2. Select your app
3. Go to "Event Subscriptions"
4. Toggle "Enable Events" to ON
5. Set Request URL: `https://abc123.ngrok.io/api/slack/events`
6. Subscribe to bot events (e.g., `message.channels`, `app_mention`)
7. Save Changes

---

## 🔐 How Signature Verification Works

Slack signs every request with a signature. We verify it to ensure the webhook is genuinely from Slack.

### The Process

1. **Slack computes signature:**
   ```
   basestring = v0:{timestamp}:{request_body}
   signature = HMAC-SHA256(basestring, signing_secret)
   header = v0={signature}
   ```

2. **We recompute and compare:**
   ```typescript
   const hmac = createHmac('sha256', SLACK_SIGNING_SECRET);
   hmac.update(`v0:${timestamp}:${bodyText}`);
   const expected = `v0=${hmac.digest('hex')}`;

   if (expected === signature) {
     // ✅ Valid!
   }
   ```

3. **Replay attack prevention:**
   ```typescript
   // Reject requests older than 5 minutes
   const age = Math.abs(currentTime - requestTime);
   if (age > 60 * 5) {
     // ❌ Too old!
   }
   ```

---

## 📋 Slack Event Types

Common events you might want to handle:

| Event Type | Description | Example Data |
|------------|-------------|--------------|
| `message` | Message posted in channel | `{ text, user, channel }` |
| `app_mention` | Bot was mentioned | `{ text, user, channel }` |
| `reaction_added` | User added reaction | `{ reaction, user, item }` |
| `channel_created` | New channel created | `{ channel: { id, name } }` |
| `member_joined_channel` | User joined channel | `{ user, channel }` |

**Full list:** https://api.slack.com/events

---

## 🧪 Testing Locally

### Test URL Verification

```bash
curl -X POST http://localhost:3000/api/slack/events \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test123"}'
```

**Expected response:**
```json
{"challenge":"test123"}
```

---

### Test Event Storage

1. Send a real event from Slack (via ngrok)
2. Check DynamoDB:
   ```bash
   # AWS Console → DynamoDB → Tables → SlackEvent
   # Or use debug endpoint:
   curl http://localhost:3000/api/debug/slack-events
   ```

3. Verify TTL is set:
   ```bash
   # Record should have ttl field with future Unix timestamp
   ```

---

## 💰 Cost Optimization

This example uses **TTL (Time To Live)** to auto-delete old events:

```typescript
ttl: calculateTTL(10), // Delete after 10 minutes
```

**Why this matters:**
- Slack sends LOTS of events (100s-1000s per day)
- Without TTL, DynamoDB storage grows unbounded
- With TTL, old events auto-delete → bounded costs

**Recommended TTL values:**

| Use Case | TTL | Rationale |
|----------|-----|-----------|
| Real-time processing | 10 min | Just need to process, then discard |
| Debugging/audit | 24 hours | Keep for investigation |
| Analytics | 7 days | Aggregate before deletion |

**To adjust:**
```typescript
ttl: calculateTTL(1440), // 24 hours = 1440 minutes
```

---

## ⚡ Performance Considerations

### The 3-Second Rule

Slack requires response within **3 seconds** or it will retry.

**This example is FAST:**
1. Verify signature: ~5ms
2. Parse body: ~1ms
3. Write to DynamoDB: ~50-200ms
4. Return response: ~1ms

**Total: < 300ms** ✅

---

### If You Need Slow Processing

Use the **buffer pattern**:

```typescript
// 1. Acknowledge FAST
await dataClient.models.SlackEvent.create({
  eventId: body.event_id,
  data: body,
  status: 'pending', // Mark as unprocessed
  ttl: calculateTTL(60), // Keep for 1 hour
});

return Response.json({ ok: true }); // < 3 seconds!

// 2. Process LATER (in separate Lambda)
// Trigger via GraphQL mutation
dataClient.mutations.processSlackEvent({
  eventId: body.event_id,
}).catch(console.error);
```

---

## 🔍 Debugging

### Check if Events are Being Saved

```typescript
// app/api/debug/slack-events/route.ts
import { dataClient } from '@/lib/amplify-data-client';

export async function GET() {
  const { data: events } = await dataClient.models.SlackEvent.list();

  return Response.json({
    count: events.length,
    latest: events[0],
  });
}
```

Visit: `http://localhost:3000/api/debug/slack-events`

---

### Common Errors

**"Invalid signature"**
```
Cause: Wrong SLACK_SIGNING_SECRET
Fix: Check .env.local and Slack app settings
```

**"AccessDeniedException"**
```
Cause: Missing allow.publicApiKey() on SlackEvent model
Fix: Add authorization rule to schema
```

**"Webhook timeout"**
```
Cause: Processing taking > 3 seconds
Fix: Use buffer pattern (acknowledge fast, process later)
```

---

## 🎨 Customization Ideas

### 1. Filter Specific Event Types

```typescript
// Only store message events
if (event.type === 'message' && !event.subtype) {
  await dataClient.models.SlackEvent.create({...});
}
```

### 2. Add Custom Processing

```typescript
// Extract user mentions
const mentions = event.text?.match(/<@([A-Z0-9]+)>/g) || [];

await dataClient.models.SlackEvent.create({
  eventId: body.event_id,
  text: event.text,
  mentions: mentions.join(','), // Store as comma-separated
  data: body,
});
```

### 3. Trigger Custom Mutations

```typescript
// For important events, trigger processing immediately
if (event.type === 'app_mention') {
  dataClient.mutations.handleAppMention({
    eventId: body.event_id,
    text: event.text,
    userId: event.user,
  }).catch(console.error);
}
```

---

## 📚 Related Documentation

- **[../NEXTJS_API_ROUTES_PATTERN.md](../../NEXTJS_API_ROUTES_PATTERN.md)** - Pattern overview
- **[../API_KEY_AUTH_EXPLAINED.md](../../API_KEY_AUTH_EXPLAINED.md)** - API key deep dive
- **[../troubleshooting.md](../../troubleshooting.md)** - Common errors
- **[Slack Events API](https://api.slack.com/events)** - Official Slack docs

---

## 🎯 Production Checklist

Before deploying to production:

- [ ] Added `SLACK_SIGNING_SECRET` to environment variables
- [ ] Enabled API key authorization mode in schema
- [ ] Added `allow.publicApiKey()` to SlackEvent model
- [ ] Tested signature verification
- [ ] Tested with real Slack events
- [ ] Set appropriate TTL value
- [ ] Configured Slack Event Subscriptions with production URL
- [ ] Subscribed to necessary event types
- [ ] Tested error handling
- [ ] Checked CloudWatch logs

---

**This example provides a production-ready foundation for handling Slack events!** 🚀
