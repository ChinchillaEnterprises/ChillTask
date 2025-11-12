# Authorization Modes for Webhooks

**Understanding which authorization rules work with API key authentication.**

---

## 🎯 Quick Reference

| Authorization Rule      | Works with API Key? | Use Case                          |
|-------------------------|---------------------|-----------------------------------|
| `allow.publicApiKey()`  | ✅ **YES**          | Webhooks, public endpoints        |
| `allow.authenticated()` | ❌ **NO**           | Requires Cognito user             |
| `allow.owner()`         | ❌ **NO**           | Requires Cognito user identity    |
| `allow.groups(['admin'])`| ❌ **NO**          | Requires Cognito group membership |
| `allow.resource(fn)`    | ⚠️ **COMPLEX**     | Requires Lambda IAM setup         |
| `allow.guest()`         | ⚠️ **LIMITED**     | Unauthenticated Cognito identity  |
| `allow.custom()`        | ⚠️ **ADVANCED**    | Custom authorization logic        |

---

## ✅ allow.publicApiKey()

### What It Does

Allows access to anyone with a valid API key from `amplify_outputs.json`.

### Syntax

```typescript
WebhookEvent: a.model({
  eventId: a.string().required(),
  data: a.json().required(),
})
.authorization((allow) => [
  allow.publicApiKey(), // ← Anyone with API key can access
])
```

### Use Cases

- ✅ **Webhook events** from external services
- ✅ **Public API endpoints** with no user authentication
- ✅ **Temporary data storage** (use with TTL)
- ✅ **Event logging** from public sources

### Access Level

**Can access from:**
- Next.js API routes (with API key)
- Any code with access to `amplify_outputs.json`

**CANNOT access from:**
- Frontend without API key
- Cognito users (unless also allowed)

### Security Considerations

- ⚠️ **No user identity** - Can't track who created records
- ⚠️ **All-or-nothing** - If you have the key, you can access ALL public models
- ⚠️ **Keep backend-only** - Never expose API key in frontend

### Example

```typescript
// Schema
SlackEvent: a.model({
  eventId: a.string().required(),
  channelId: a.string(),
  data: a.json().required(),
  ttl: a.integer(),
})
.authorization((allow) => [
  allow.publicApiKey(),
])

// API Route
import { dataClient } from '@/lib/amplify-data-client';

await dataClient.models.SlackEvent.create({
  eventId: 'evt_123',
  data: webhookData,
  ttl: calculateTTL(10),
});
// ✅ Works! API key authentication
```

---

## ❌ allow.authenticated()

### What It Does

Allows access only to signed-in Cognito users.

### Syntax

```typescript
UserPost: a.model({
  title: a.string().required(),
  content: a.string().required(),
})
.authorization((allow) => [
  allow.authenticated(), // ← Requires Cognito user session
])
```

### Why It Doesn't Work for Webhooks

**Webhooks don't have Cognito user sessions:**
- Slack webhook → No user token
- Stripe webhook → No user token
- GitHub webhook → No user token

**Error you'll see:**
```
Error: No current user
```

### When to Use

- ✅ **User-authenticated features** in your app
- ✅ **Frontend calling GraphQL** directly
- ✅ **Any logged-in user** can access

### Correct Pattern

```typescript
// For webhooks: Use publicApiKey
WebhookEvent: a.model({...})
.authorization((allow) => [
  allow.publicApiKey(), // ✅ Works for webhooks
])

// For user data: Use authenticated
UserProfile: a.model({...})
.authorization((allow) => [
  allow.authenticated(), // ✅ Works for logged-in users
])
```

---

## ❌ allow.owner()

### What It Does

Allows access only to the Cognito user who created the record.

### Syntax

```typescript
UserNote: a.model({
  content: a.string().required(),
  owner: a.string(), // Auto-populated with user ID
})
.authorization((allow) => [
  allow.owner(), // ← Only creator can access
])
```

### Why It Doesn't Work for Webhooks

**No owner identity:**
- Webhooks come from external services, not users
- No Cognito user ID to assign as owner
- Can't determine "who" owns a Slack event

**Error you'll see:**
```
Error: No current user
```

### When to Use

- ✅ **User-owned data** (notes, settings, etc.)
- ✅ **Privacy requirements** (only creator sees data)
- ✅ **Multi-tenant SaaS** (user isolation)

---

## ❌ allow.groups()

### What It Does

Allows access only to Cognito users in specific groups.

### Syntax

```typescript
AdminAction: a.model({
  action: a.string().required(),
})
.authorization((allow) => [
  allow.groups(['admin', 'moderator']),
])
```

### Why It Doesn't Work for Webhooks

**No group membership:**
- Webhooks aren't Cognito users
- Can't be in "admin" or "moderator" groups
- No user identity = no groups

**Error you'll see:**
```
Error: No current user
```

### When to Use

- ✅ **Role-based access control** (admins, moderators)
- ✅ **Team-based features** (team members only)
- ✅ **Permission levels** (read-only vs editor)

---

## ⚠️ allow.resource()

### What It Does

Allows access from specific Lambda functions via IAM authentication.

### Syntax

```typescript
import { myLambdaFunction } from '../functions/myFunction/resource';

ProcessedEvent: a.model({
  eventId: a.string().required(),
  result: a.json(),
})
.authorization((allow) => [
  allow.resource(myLambdaFunction), // ← Lambda can access via IAM
])
```

### Can It Work for Webhooks?

**⚠️ Yes, but it's complex:**

**Option 1: Two-step pattern (Recommended)**
```typescript
// Step 1: Webhook writes to public model
WebhookEvent: a.model({...})
.authorization((allow) => [allow.publicApiKey()])

// Step 2: Lambda processes and writes to restricted model
ProcessedEvent: a.model({...})
.authorization((allow) => [allow.resource(processFunction)])
```

**Option 2: Direct IAM (Not recommended)**
- Requires configuring IAM role for Next.js Lambda
- Requires `resourceGroupName: 'data'` in function definition
- More complex than API key pattern

### When to Use

- ✅ **Lambda-to-Lambda** communication
- ✅ **Scheduled functions** processing data
- ✅ **Background jobs** with restricted access
- ✅ **Two-step webhook processing**

See: [../functions/LAMBDA_DYNAMODB_ACCESS.md](../functions/LAMBDA_DYNAMODB_ACCESS.md)

---

## ⚠️ allow.guest()

### What It Does

Allows access to unauthenticated users with a temporary Cognito identity.

### Syntax

```typescript
PublicPost: a.model({
  title: a.string().required(),
})
.authorization((allow) => [
  allow.guest(), // ← Unauthenticated Cognito identity
])
```

### Can It Work for Webhooks?

**⚠️ Technically yes, but not practical:**

**Why it's complicated:**
- Requires frontend to create Cognito identity
- Webhooks bypass frontend entirely
- Need to generate guest credentials server-side
- More complex than API key

**Better alternative:**
```typescript
// Just use publicApiKey instead
PublicPost: a.model({...})
.authorization((allow) => [
  allow.publicApiKey(), // ✅ Simpler for webhooks
])
```

### When to Use

- ✅ **Frontend public access** (read-only blog posts)
- ✅ **Trial features** (before sign-up)
- ✅ **Public forms** (contact us, surveys)

---

## ⚠️ allow.custom()

### What It Does

Allows custom authorization logic defined in a Lambda function.

### Syntax

```typescript
CustomAuth: a.model({
  data: a.string(),
})
.authorization((allow) => [
  allow.custom(), // ← Custom Lambda authorizer
])
```

### Can It Work for Webhooks?

**⚠️ Yes, but very advanced:**

Requires:
1. Custom Lambda authorizer function
2. Logic to validate webhook signature
3. Return authorization decision
4. Much more complex than API key

**Not recommended for webhooks** - use `publicApiKey()` instead.

### When to Use

- ✅ **Complex authorization** logic
- ✅ **External auth systems** (OAuth, SAML)
- ✅ **Multi-factor authorization**
- ✅ **Business rule enforcement**

---

## 🎯 Decision Tree

```
Do I need to handle webhooks from external services?
  │
  ├─ Is the data public/temporary?
  │  │
  │  ├─ YES → Use allow.publicApiKey()
  │  │         ✅ Perfect for webhooks!
  │  │
  │  └─ NO → Use two-step pattern:
  │            1. Webhook writes to allow.publicApiKey() model
  │            2. Lambda processes and writes to allow.resource() model
  │
  └─ Is this user-authenticated data?
     │
     └─ YES → Use allow.authenticated() or allow.owner()
               ❌ NOT for webhooks - use GraphQL mutations instead
                  See: ../NO-API-GATEWAY.md
```

---

## 📊 Multiple Authorization Rules

### Combining Rules

You can allow MULTIPLE authorization methods on the same model:

```typescript
Post: a.model({
  title: a.string().required(),
  content: a.string().required(),
  owner: a.string(),
})
.authorization((allow) => [
  allow.owner(),          // Creator can read/update/delete
  allow.publicApiKey(),   // Webhooks can create
  allow.authenticated()   // Any user can read
    .to(['read']),
])
```

**Who can do what:**
- ✅ Owner → Full access (CRUD)
- ✅ API key → Create only
- ✅ Authenticated users → Read only

---

### Webhook + User Access Pattern

**Use case:** Webhook creates posts, users can view and comment

```typescript
// Posts created by webhooks
Post: a.model({
  title: a.string().required(),
  content: a.string().required(),
  sourceWebhook: a.string(), // Which webhook created this
})
.authorization((allow) => [
  allow.publicApiKey(),      // Webhook creates
  allow.authenticated()      // Users read
    .to(['read']),
])

// Comments created by users
Comment: a.model({
  postId: a.string().required(),
  text: a.string().required(),
  owner: a.string(),
})
.authorization((allow) => [
  allow.owner(),             // Creator can edit/delete
  allow.authenticated()      // Any user can read
    .to(['read']),
])
```

---

## 🔒 Security Best Practices

### 1. Never Mix User Data with Webhook Data

**❌ DON'T:**
```typescript
User: a.model({
  email: a.string().required(),
  passwordHash: a.string(),
})
.authorization((allow) => [
  allow.publicApiKey(), // 🚨 Anyone with API key can read passwords!
])
```

**✅ DO:**
```typescript
// User data - authenticated only
User: a.model({
  email: a.string().required(),
  passwordHash: a.string(),
})
.authorization((allow) => [
  allow.owner(), // ✅ Only user can access
])

// Webhook data - public API key
WebhookEvent: a.model({
  eventId: a.string().required(),
  data: a.json(),
  ttl: a.integer(),
})
.authorization((allow) => [
  allow.publicApiKey(), // ✅ Temporary webhook events only
])
```

---

### 2. Use TTL with publicApiKey

Always add TTL to temporary webhook data:

```typescript
WebhookEvent: a.model({
  eventId: a.string().required(),
  data: a.json(),
  ttl: a.integer(), // ← ALWAYS add this!
})
.authorization((allow) => [
  allow.publicApiKey(),
])
```

**Why:**
- Prevents unbounded data growth
- Reduces storage costs
- Limits exposure window

---

### 3. Verify Webhook Signatures

Even with API key auth, always verify webhook signatures:

```typescript
// app/api/slack/events/route.ts
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-slack-signature');

  // Verify before processing
  if (!verifySlackSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid' }, { status: 401 });
  }

  // Now safe to process
  await dataClient.models.SlackEvent.create({...});
}
```

---

## 📚 Related Documentation

- **[API_KEY_AUTH_EXPLAINED.md](./API_KEY_AUTH_EXPLAINED.md)** - Deep dive on API key
- **[NEXTJS_API_ROUTES_PATTERN.md](./NEXTJS_API_ROUTES_PATTERN.md)** - Complete pattern guide
- **[troubleshooting.md](./troubleshooting.md)** - Common errors
- **[../functions/LAMBDA_DYNAMODB_ACCESS.md](../functions/LAMBDA_DYNAMODB_ACCESS.md)** - For `allow.resource()`

---

## 🎯 Summary

**For webhooks, use:**
- ✅ `allow.publicApiKey()` - Primary pattern
- ⚠️ `allow.resource()` - Two-step processing pattern

**Don't use for webhooks:**
- ❌ `allow.authenticated()` - Requires Cognito user
- ❌ `allow.owner()` - Requires Cognito user
- ❌ `allow.groups()` - Requires Cognito user
- ❌ `allow.guest()` - Too complex, use API key
- ❌ `allow.custom()` - Overkill, use API key

**The simple rule:** If it's a webhook, use `allow.publicApiKey()` with TTL! 🔑
