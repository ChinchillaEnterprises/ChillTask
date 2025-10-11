# API Key Authentication Deep Dive

**Understanding how API key authentication works in the Next.js API Routes + Amplify Data pattern.**

---

## 🎯 What Is API Key Authentication?

API key authentication is a simple authentication method where:
1. **AWS generates a secret key** when you enable API key mode in AppSync
2. **The key is stored** in `amplify_outputs.json`
3. **Requests include the key** in headers to prove they're authorized
4. **AppSync validates the key** and grants access to models with `allow.publicApiKey()`

**No user identity. No session tokens. Just a simple key.**

---

## 🧒 ELI5: What Is an API Key?

Imagine you have a **clubhouse** (your AppSync GraphQL API) with different rooms (data models).

**User authentication (Cognito):**
- Like having a **membership card with your photo**
- The bouncer checks your ID
- You can only enter rooms you're allowed in based on who you are

**API key authentication:**
- Like having a **guest pass**
- Anyone with the pass can enter
- But the pass only works for specific "public" rooms
- No identity needed - just show the pass

**In this pattern:**
- Your Next.js API route has the "guest pass" (API key)
- It can access "public rooms" (models with `allow.publicApiKey()`)
- External webhooks don't need to know who they are - they just need the pass

---

## 🔑 How It Works

### The Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Amplify generates API key when you enable apiKeyMode     │
│    Stored in: amplify_outputs.json                          │
│    Format: "da2-abcdefghijklmnopqrstuvwxyz"                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Your Next.js API route imports amplify_outputs.json      │
│    Gets API key from: outputs.data.api_key                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Amplify Data client configured with authMode: 'apiKey'   │
│    Automatically includes API key in all GraphQL requests   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. AppSync receives GraphQL request with API key header     │
│    Header: x-api-key: da2-abcdefghijklmnopqrstuvwxyz       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. AppSync validates API key                                │
│    ✅ Valid? → Check model authorization rules              │
│    ❌ Invalid? → Return AccessDeniedException               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Model has allow.publicApiKey() rule?                     │
│    ✅ Yes → Execute mutation/query                          │
│    ❌ No → Return AccessDeniedException                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 The Configuration Chain

### Step 1: Enable API Key Mode in Data Schema

```typescript
// amplify/data/resource.ts
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  WebhookEvent: a.model({
    eventId: a.string().required(),
    data: a.json().required(),
  })
  // CRITICAL: Allow API key access
  .authorization((allow) => [
    allow.publicApiKey(), // ← This is what makes API key work!
  ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool', // For frontend users
    // CRITICAL: Enable API key mode
    apiKeyAuthorizationMode: {
      expiresInDays: 30, // API key expires and rotates every 30 days
    },
  },
});
```

**What this does:**
- ✅ Generates an API key for your AppSync API
- ✅ Stores it in `amplify_outputs.json`
- ✅ Configures AppSync to accept API key in `x-api-key` header
- ✅ Sets expiration (Amplify auto-rotates before expiry)

---

### Step 2: Configure Amplify Client with API Key

```typescript
// lib/amplify-data-client.ts
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from '@/amplify_outputs.json';
import type { Schema } from '@/amplify/data/resource';

// Configure Amplify with outputs (includes API key)
Amplify.configure(outputs, {
  ssr: true, // CRITICAL for Next.js API routes!
});

// Create client with API key auth mode
export const dataClient = generateClient<Schema>({
  authMode: 'apiKey', // ← Use API key from outputs
});
```

**What this does:**
- ✅ Reads API key from `amplify_outputs.json`
- ✅ Configures client to use `authMode: 'apiKey'`
- ✅ Automatically includes `x-api-key` header in all requests
- ✅ `ssr: true` ensures it works in Lambda environment

---

### Step 3: Use Client in API Route

```typescript
// app/api/slack/events/route.ts
import { dataClient } from '@/lib/amplify-data-client';

export async function POST(request: Request) {
  const body = await request.json();

  // This automatically uses API key authentication
  await dataClient.models.WebhookEvent.create({
    eventId: body.event_id,
    data: body,
  });

  return Response.json({ ok: true });
}
```

**What happens:**
- ✅ `dataClient` uses API key under the hood
- ✅ GraphQL mutation includes `x-api-key` header
- ✅ AppSync validates key and checks `allow.publicApiKey()`
- ✅ Mutation succeeds and writes to DynamoDB

---

## 🔐 Security Considerations

### Is the API Key Secure?

**Short answer:** Yes, for PUBLIC webhook endpoints.

**Longer answer:**

**✅ What makes it secure:**
1. **Limited scope** - Only grants access to models with `allow.publicApiKey()`
2. **Not in frontend code** - API key stays on backend (Next.js API routes)
3. **Gitignored** - `amplify_outputs.json` is never committed
4. **Auto-rotation** - Amplify rotates key before expiration
5. **Rate limiting** - AppSync has built-in rate limits

**⚠️ Limitations:**
1. **No user identity** - Can't use `owner()` or `groups()` authorization
2. **All-or-nothing** - If you have the key, you can access ALL `publicApiKey()` models
3. **Shared key** - All API routes use the same key

---

### What Can Go Wrong?

**❌ DON'T: Expose API key in frontend code**

```typescript
// ❌ WRONG - API key visible in browser
// frontend/pages/index.tsx
import outputs from '@/amplify_outputs.json';

export default function Page() {
  // This exposes API key in browser bundle!
  const apiKey = outputs.data.api_key;
  // ...
}
```

**✅ DO: Keep API key on backend only**

```typescript
// ✅ CORRECT - API key stays on backend
// lib/amplify-data-client.ts (used only by API routes)
import outputs from '@/amplify_outputs.json';
Amplify.configure(outputs);
```

---

**❌ DON'T: Use `publicApiKey()` for user-specific data**

```typescript
// ❌ WRONG - User data with public access
UserProfile: a.model({
  userId: a.string().required(),
  email: a.string().required(),
  password: a.string().required(), // 🔥 EXPOSED!
})
.authorization((allow) => [
  allow.publicApiKey(), // Anyone with API key can read ALL profiles!
])
```

**✅ DO: Use `publicApiKey()` only for webhook events**

```typescript
// ✅ CORRECT - Temporary webhook events
WebhookEvent: a.model({
  eventId: a.string().required(),
  data: a.json().required(),
  ttl: a.integer(), // Auto-deletes
})
.authorization((allow) => [
  allow.publicApiKey(), // OK - temporary public data
])
```

---

### Best Practices

1. **Only use for public endpoints** - Webhooks, public APIs, etc.
2. **Never for user data** - Use Cognito authentication for that
3. **Add TTL to webhook models** - Auto-delete old records
4. **Verify webhook signatures** - Don't trust the source blindly
5. **Keep amplify_outputs.json gitignored** - Never commit it
6. **Use environment-specific outputs** - Different keys per environment

---

## 🆚 API Key vs Other Auth Modes

### Comparison Table

| Feature | API Key | Cognito User Pool | IAM (Lambda) |
|---------|---------|-------------------|--------------|
| **User Identity** | ❌ No | ✅ Yes | ⚠️ Service identity |
| **Use Case** | Public webhooks | User-authenticated | Backend services |
| **Authorization** | `publicApiKey()` | `owner()`, `groups()` | `resource()` |
| **Complexity** | ⭐ Simple | ⭐⭐ Moderate | ⭐⭐⭐ Complex |
| **Key Location** | `amplify_outputs.json` | User JWT token | IAM role |
| **Rotation** | Auto (30 days) | Per session | N/A |
| **Best For** | Slack, Stripe, GitHub | User apps | Scheduled Lambda |

---

### When to Use Each

**Use API Key when:**
- ✅ Building public webhook endpoints
- ✅ No user authentication needed
- ✅ External services POST to your API
- ✅ Want simplicity over fine-grained permissions

**Use Cognito when:**
- ✅ Building user-authenticated features
- ✅ Need owner-based access control
- ✅ Have user sign-up/sign-in
- ✅ Frontend calls GraphQL directly

**Use IAM when:**
- ✅ Backend services (Lambda) need access
- ✅ Scheduled functions (EventBridge)
- ✅ No API key or user token available
- ✅ Need service-to-service authentication

---

## 🔄 API Key Rotation

### How Amplify Handles Rotation

Amplify **automatically rotates** the API key before it expires:

1. **You set expiration** in `apiKeyAuthorizationMode.expiresInDays`
2. **Amplify generates new key** a few days before expiration
3. **Both keys work** during overlap period (grace period)
4. **Old key expires** after grace period
5. **New key in** `amplify_outputs.json` on next deployment

**You don't need to do anything** - it's automatic!

---

### Manual Rotation (If Needed)

**Scenario:** API key was leaked, need to rotate immediately

**Steps:**

1. **Update schema** to force new key generation:
```typescript
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 7, // Changed from 30 → forces rotation
    },
  },
});
```

2. **Deploy:**
```bash
git add .
git commit -m "Rotate API key"
git push
```

3. **New key generated** in `amplify_outputs.json`

4. **Redeploy API routes** to use new key:
```bash
# Amplify auto-redeploys on push
```

**During grace period:** Both old and new keys work
**After grace period:** Only new key works

---

## 📊 What's in amplify_outputs.json?

### Full Structure

```json
{
  "version": "1.1",
  "data": {
    "url": "https://abcd1234.appsync-api.us-east-1.amazonaws.com/graphql",
    "api_key": "da2-abcdefghijklmnopqrstuvwxyz1234567890",
    "default_authorization_type": "AMAZON_COGNITO_USER_POOLS",
    "authorization_types": [
      "API_KEY",
      "AMAZON_COGNITO_USER_POOLS"
    ]
  },
  "auth": {
    "user_pool_id": "us-east-1_AbCdEfGhI",
    "user_pool_client_id": "1234567890abcdefghijklmnop",
    "identity_pool_id": "us-east-1:12345678-1234-1234-1234-123456789012",
    "aws_region": "us-east-1"
  },
  "storage": {
    "bucket_name": "amplify-app-bucket",
    "aws_region": "us-east-1"
  }
}
```

### What the Data Client Uses

For API key authentication:

```typescript
// Amplify reads these fields:
const endpoint = outputs.data.url;
const apiKey = outputs.data.api_key;

// Then includes in GraphQL requests:
fetch(endpoint, {
  method: 'POST',
  headers: {
    'x-api-key': apiKey, // ← AppSync validates this
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query, variables }),
});
```

**You don't write this code** - `generateClient()` does it automatically!

---

## 🧪 Testing API Key Authentication

### Test 1: Verify API Key Exists

```typescript
// app/api/debug/api-key-check/route.ts
import outputs from '@/amplify_outputs.json';

export async function GET() {
  return Response.json({
    hasApiKey: !!outputs.data?.api_key,
    apiKeyPrefix: outputs.data?.api_key?.substring(0, 10) + '...',
    endpoint: outputs.data?.url,
    authTypes: outputs.data?.authorization_types,
  });
}
```

**Visit:** `http://localhost:3000/api/debug/api-key-check`

**Expected output:**
```json
{
  "hasApiKey": true,
  "apiKeyPrefix": "da2-abcdef...",
  "endpoint": "https://abcd1234.appsync-api.us-east-1.amazonaws.com/graphql",
  "authTypes": ["API_KEY", "AMAZON_COGNITO_USER_POOLS"]
}
```

---

### Test 2: Verify Data Client Connection

```typescript
// app/api/debug/data-client-test/route.ts
import { dataClient } from '@/lib/amplify-data-client';

export async function GET() {
  try {
    // Try to list records (empty list is OK)
    const result = await dataClient.models.WebhookEvent.list();

    return Response.json({
      success: true,
      authMode: 'apiKey',
      recordCount: result.data.length,
    });
  } catch (error: any) {
    return Response.json({
      success: false,
      error: error.message,
      hint: 'Check that apiKeyAuthorizationMode is enabled and model has allow.publicApiKey()',
    }, { status: 500 });
  }
}
```

**Visit:** `http://localhost:3000/api/debug/data-client-test`

**Expected output (success):**
```json
{
  "success": true,
  "authMode": "apiKey",
  "recordCount": 0
}
```

---

### Test 3: Create a Test Record

```typescript
// app/api/debug/create-test-record/route.ts
import { dataClient, calculateTTL } from '@/lib/amplify-data-client';

export async function POST() {
  try {
    const result = await dataClient.models.WebhookEvent.create({
      eventId: `test-${Date.now()}`,
      data: { test: true, timestamp: new Date().toISOString() },
      ttl: calculateTTL(5), // Delete after 5 minutes
    });

    return Response.json({
      success: true,
      recordId: result.data?.id,
      message: 'Test record created (will auto-delete in 5 minutes)',
    });
  } catch (error: any) {
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
```

**Test with curl:**
```bash
curl -X POST http://localhost:3000/api/debug/create-test-record
```

---

## 🚨 Common Errors

### Error: "AccessDeniedException"

**Full error:**
```
AccessDeniedException: Not Authorized to access createWebhookEvent on type Mutation
```

**Causes:**
1. Model doesn't have `allow.publicApiKey()` authorization
2. API key mode not enabled in defineData
3. Using wrong auth mode in client

**Fix:**

```typescript
// 1. Check model authorization
WebhookEvent: a.model({...})
.authorization((allow) => [
  allow.publicApiKey(), // ← Must have this!
])

// 2. Check defineData config
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
    apiKeyAuthorizationMode: {  // ← Must have this!
      expiresInDays: 30,
    },
  },
});

// 3. Check client configuration
export const dataClient = generateClient<Schema>({
  authMode: 'apiKey', // ← Must use 'apiKey'
});
```

---

### Error: "The API key is invalid"

**Full error:**
```
The API key is invalid
```

**Causes:**
1. `amplify_outputs.json` is outdated
2. API key expired
3. Wrong API key being used

**Fix:**

```bash
# Regenerate amplify_outputs.json
npx ampx sandbox

# Or if deployed:
git pull  # Get latest amplify_outputs.json from deployment
```

---

### Error: "Cannot find module '@/amplify_outputs.json'"

**Full error:**
```
Error: Cannot find module '@/amplify_outputs.json'
```

**Causes:**
1. Sandbox not running (file not generated)
2. Wrong import path

**Fix:**

```bash
# Generate amplify_outputs.json
npx ampx sandbox
```

Check import path:
```typescript
// Correct paths (depending on tsconfig.json)
import outputs from '@/amplify_outputs.json';  // If @ maps to root
import outputs from '../amplify_outputs.json'; // Relative path
```

---

## 📚 Further Reading

- **[NEXTJS_API_ROUTES_PATTERN.md](./NEXTJS_API_ROUTES_PATTERN.md)** - Complete pattern guide
- **[authorization-modes.md](./authorization-modes.md)** - All auth modes compared
- **[troubleshooting.md](./troubleshooting.md)** - More debugging tips
- **[AppSync API Keys](https://docs.aws.amazon.com/appsync/latest/devguide/security-authz.html#api-key-authorization)** - AWS official docs

---

## 🎯 Key Takeaways

1. **API key = Simple authentication** for public endpoints
2. **Only works with** `allow.publicApiKey()` authorization
3. **Auto-generated** and stored in `amplify_outputs.json`
4. **Auto-rotates** before expiration (no manual work)
5. **Backend-only** - Never expose in frontend code
6. **Perfect for webhooks** from Slack, Stripe, GitHub, etc.

---

**Remember:** API key authentication is the simplest way to let external services write to your database without CDK complexity! 🔑
