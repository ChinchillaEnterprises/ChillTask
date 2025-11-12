# Webhook Troubleshooting Guide

**Common errors when implementing the Next.js API Routes + Amplify Data pattern and how to fix them.**

---

## 🚨 Most Common Errors

### 1. "AccessDeniedException: Not Authorized to access..."

**Full error:**
```
AccessDeniedException: Not Authorized to access createWebhookEvent on type Mutation
```

**Causes:**
1. Model doesn't have `allow.publicApiKey()` authorization
2. API key mode not enabled in `defineData`
3. Using wrong auth mode in client

**Fix:**

```typescript
// ✅ Step 1: Check model authorization
WebhookEvent: a.model({
  eventId: a.string().required(),
  data: a.json(),
})
.authorization((allow) => [
  allow.publicApiKey(), // ← MUST have this!
])

// ✅ Step 2: Check defineData config
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
    apiKeyAuthorizationMode: {  // ← MUST enable this!
      expiresInDays: 30,
    },
  },
});

// ✅ Step 3: Check client configuration
export const dataClient = generateClient<Schema>({
  authMode: 'apiKey', // ← MUST use 'apiKey'
});
```

**Verify the fix:**
```bash
# Restart sandbox to regenerate amplify_outputs.json
npx ampx sandbox
```

---

### 2. "The API key is invalid"

**Full error:**
```
GraphQLError: The API key is invalid
```

**Causes:**
1. `amplify_outputs.json` is outdated or missing
2. API key expired
3. Sandbox not running

**Fix:**

```bash
# Generate fresh amplify_outputs.json
npx ampx sandbox

# If deployed, pull latest:
git pull
```

**Check if API key exists:**
```typescript
// app/api/debug/route.ts
import outputs from '@/amplify_outputs.json';

export async function GET() {
  return Response.json({
    hasApiKey: !!outputs.data?.api_key,
    apiKeyPrefix: outputs.data?.api_key?.substring(0, 10),
  });
}
```

Visit: `http://localhost:3000/api/debug`

---

### 3. "Cannot find module '@/amplify_outputs.json'"

**Full error:**
```
Error: Cannot find module '@/amplify_outputs.json'
```

**Causes:**
1. Sandbox not running (file not generated)
2. Wrong import path
3. TypeScript path mapping issue

**Fix:**

```bash
# Generate the file
npx ampx sandbox
```

**Check import path:**
```typescript
// Option 1: If @ is mapped to root in tsconfig.json
import outputs from '@/amplify_outputs.json';

// Option 2: Relative path
import outputs from '../../../amplify_outputs.json';

// Option 3: From root
import outputs from '~/amplify_outputs.json';
```

**Verify tsconfig.json:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]  // @ should map to root
    }
  }
}
```

---

### 4. "No current user"

**Full error:**
```
Error: No current user
```

**Cause:**
Using authentication modes that require Cognito users instead of API key.

**Fix:**

```typescript
// ❌ WRONG - Requires Cognito user
WebhookEvent: a.model({...})
.authorization((allow) => [
  allow.authenticated(), // Requires logged-in user!
])

// ✅ CORRECT - Uses API key
WebhookEvent: a.model({...})
.authorization((allow) => [
  allow.publicApiKey(), // Works for webhooks!
])
```

**See:** [authorization-modes.md](./authorization-modes.md) for details

---

### 5. Webhook Timeout (3 seconds)

**Symptom:**
Webhook service shows "timeout" errors, your API route logs show request was processing.

**Cause:**
Your API route is doing too much work before responding.

**Fix: Use the buffer pattern**

```typescript
// ❌ SLOW - Processing before response
export async function POST(request: Request) {
  const body = await request.json();

  // This takes 10 seconds...
  await heavyProcessing(body);

  return Response.json({ ok: true }); // Too late! Already timed out
}

// ✅ FAST - Acknowledge first, process later
export async function POST(request: Request) {
  const body = await request.json();

  // Quick write to DynamoDB (< 1 second)
  await dataClient.models.WebhookEvent.create({
    eventId: body.event_id,
    data: body,
    status: 'pending',
  });

  // Acknowledge FAST (< 3 seconds total)
  const response = Response.json({ ok: true });

  // Trigger async processing (happens after response)
  dataClient.mutations.processWebhook({
    eventId: body.event_id,
  }).catch(console.error);

  return response;
}
```

**See:** [NEXTJS_API_ROUTES_PATTERN.md#the-buffer-pattern](./NEXTJS_API_ROUTES_PATTERN.md#the-buffer-pattern)

---

### 6. "Amplify is not configured"

**Full error:**
```
Error: Amplify has not been configured
```

**Cause:**
`Amplify.configure()` wasn't called before using the Data client.

**Fix:**

```typescript
// lib/amplify-data-client.ts
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from '@/amplify_outputs.json';

// ✅ MUST call configure before generateClient
Amplify.configure(outputs, {
  ssr: true, // CRITICAL for Next.js API routes!
});

export const dataClient = generateClient<Schema>({
  authMode: 'apiKey',
});
```

**Common mistake:**
```typescript
// ❌ WRONG - Calling generateClient without configure
export const dataClient = generateClient<Schema>({
  authMode: 'apiKey',
});
// Will fail with "Amplify is not configured"
```

---

### 7. Invalid Webhook Signature

**Symptom:**
Your signature verification is failing even though the webhook is legitimate.

**Causes:**
1. Using wrong signing secret
2. Body was parsed before verification
3. Timestamp validation too strict

**Fix:**

```typescript
// ✅ CORRECT - Get raw body BEFORE parsing
export async function POST(request: Request) {
  // Get raw text for signature
  const bodyText = await request.text();
  const timestamp = request.headers.get('x-slack-request-timestamp')!;
  const signature = request.headers.get('x-slack-signature')!;

  // Verify with RAW body (not parsed JSON)
  if (!verifySlackSignature(bodyText, timestamp, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Now safe to parse
  const body = JSON.parse(bodyText);
  // ...
}
```

```typescript
// ❌ WRONG - Parsing before verification
export async function POST(request: Request) {
  const body = await request.json(); // Parsed too early!

  const signature = request.headers.get('x-slack-signature')!;

  // This will fail - body is object, not string
  if (!verifySlackSignature(JSON.stringify(body), signature)) {
    // Signature won't match!
  }
}
```

---

## 🔍 Debugging Techniques

### Technique 1: Add Debug Logging

```typescript
// app/api/slack/events/route.ts
export async function POST(request: Request) {
  console.log('🔵 Webhook received');

  const body = await request.json();
  console.log('📦 Body:', JSON.stringify(body, null, 2));

  try {
    const result = await dataClient.models.SlackEvent.create({...});
    console.log('✅ Created record:', result.data?.id);
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }

  return Response.json({ ok: true });
}
```

**View logs:**
- **Development:** Terminal where `npm run dev` is running
- **Production:** CloudWatch → Log groups → `/aws/lambda/your-function`

---

### Technique 2: Test with curl

```bash
# Test your API route locally
curl -X POST http://localhost:3000/api/slack/events \
  -H "Content-Type: application/json" \
  -d '{"event_id": "test-123", "event": {"type": "message", "text": "test"}}'
```

**Expected response:**
```json
{"ok":true}
```

---

### Technique 3: Check CloudWatch Logs

```bash
# For deployed API routes
# Go to: AWS Console → CloudWatch → Log groups
# Find: /aws/lambda/your-api-route-name
# Look for recent log streams
```

**What to look for:**
- ❌ "AccessDeniedException" → Check authorization
- ❌ "API key is invalid" → Regenerate amplify_outputs.json
- ❌ "Cannot find module" → Check import path
- ✅ "Created record: abc123" → Working correctly

---

### Technique 4: Create Debug Endpoints

```typescript
// app/api/debug/test-db/route.ts
import { dataClient } from '@/lib/amplify-data-client';

export async function GET() {
  try {
    // Test listing records
    const result = await dataClient.models.WebhookEvent.list();

    return Response.json({
      success: true,
      count: result.data.length,
      authMode: 'apiKey',
    });
  } catch (error: any) {
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
```

Visit: `http://localhost:3000/api/debug/test-db`

---

## 🧪 Testing Checklist

Before deploying to production:

- [ ] **Test locally with curl**
  ```bash
  curl -X POST http://localhost:3000/api/webhook \
    -H "Content-Type: application/json" \
    -d '{"test": true}'
  ```

- [ ] **Verify signature validation**
  ```bash
  # Send request without signature
  curl -X POST http://localhost:3000/api/webhook \
    -d '{"test": true}'
  # Should return 401
  ```

- [ ] **Test with ngrok for real webhooks**
  ```bash
  ngrok http 3000
  # Use ngrok URL in webhook service
  ```

- [ ] **Check DynamoDB records created**
  ```bash
  # AWS Console → DynamoDB → Tables → Your table
  # Or use debug endpoint
  ```

- [ ] **Verify TTL field set correctly**
  ```typescript
  // Record should have ttl field with future timestamp
  ```

- [ ] **Test timeout handling**
  ```typescript
  // Add artificial delay, ensure < 3 seconds
  ```

- [ ] **Check CloudWatch logs**
  ```bash
  # No errors in logs
  # Successful creation messages
  ```

---

## 🐛 Common Deployment Issues

### Issue 1: Works Locally, Fails in Production

**Cause:**
`amplify_outputs.json` different between local and deployed.

**Fix:**

```bash
# Ensure deployed version has latest outputs
git pull

# Redeploy
git push
```

**Verify API key matches:**
```bash
# Local
cat amplify_outputs.json | grep api_key

# Production (via debug endpoint)
curl https://yourdomain.com/api/debug | grep apiKey
```

---

### Issue 2: CORS Errors

**Symptom:**
Frontend can't call the webhook endpoint.

**Note:** Webhooks should NOT be called from frontend - they're for external services only.

**If you need frontend to trigger backend:**
Use GraphQL custom mutations instead (see [../NO-API-GATEWAY.md](../NO-API-GATEWAY.md)).

---

### Issue 3: Environment Variables Not Working

**Symptom:**
`process.env.SLACK_SIGNING_SECRET` is undefined.

**Fix:**

```bash
# Local development: Create .env.local
echo "SLACK_SIGNING_SECRET=your-secret" > .env.local

# Production: Add to Amplify environment variables
# Go to: Amplify Console → App → Environment variables
# Add: SLACK_SIGNING_SECRET = your-secret
```

**Verify:**
```typescript
// app/api/debug/env/route.ts
export async function GET() {
  return Response.json({
    hasSecret: !!process.env.SLACK_SIGNING_SECRET,
    secretPrefix: process.env.SLACK_SIGNING_SECRET?.substring(0, 5),
  });
}
```

---

## 📊 Error Lookup Table

| Error Message | Likely Cause | Fix |
|---------------|--------------|-----|
| "AccessDeniedException" | Missing `allow.publicApiKey()` | Add to model authorization |
| "The API key is invalid" | Outdated amplify_outputs.json | Run `npx ampx sandbox` |
| "Cannot find module" | Missing amplify_outputs.json | Run `npx ampx sandbox` |
| "No current user" | Wrong authorization mode | Use `allow.publicApiKey()` |
| "Amplify is not configured" | Missing `Amplify.configure()` | Call before generateClient |
| "Invalid signature" | Using parsed body | Use raw body text |
| Webhook timeout | Slow processing | Use buffer pattern |
| CORS errors | Frontend calling webhook | Use GraphQL mutations instead |
| "env variable undefined" | Missing .env.local | Create .env.local file |

---

## 🔧 Quick Fixes

### Reset Everything

```bash
# Nuclear option - start fresh
npx ampx sandbox delete
npx ampx sandbox
npm run dev
```

### Regenerate Outputs

```bash
npx ampx sandbox
# Wait for "amplify_outputs.json generated"
```

### Check Configuration

```typescript
// app/api/debug/config/route.ts
import outputs from '@/amplify_outputs.json';

export async function GET() {
  return Response.json({
    hasData: !!outputs.data,
    hasApiKey: !!outputs.data?.api_key,
    endpoint: outputs.data?.url,
    authTypes: outputs.data?.authorization_types,
  });
}
```

---

## 📚 Related Documentation

- **[NEXTJS_API_ROUTES_PATTERN.md](./NEXTJS_API_ROUTES_PATTERN.md)** - Complete pattern guide
- **[API_KEY_AUTH_EXPLAINED.md](./API_KEY_AUTH_EXPLAINED.md)** - API key deep dive
- **[authorization-modes.md](./authorization-modes.md)** - Auth modes reference
- **[examples/](./examples/)** - Working code examples

---

## 🆘 Still Stuck?

### Check These Resources

1. **CloudWatch Logs** - Most errors show up here
2. **Amplify Console** - Check deployment status
3. **DynamoDB Console** - Verify records created
4. **AWS X-Ray** - Trace request flow
5. **Example Code** - Compare with working examples

### Common Oversights

- ✅ Did you run `npx ampx sandbox`?
- ✅ Did you enable `apiKeyAuthorizationMode`?
- ✅ Did you add `allow.publicApiKey()` to model?
- ✅ Did you call `Amplify.configure()` with `ssr: true`?
- ✅ Did you use `authMode: 'apiKey'` in client?
- ✅ Is your webhook signature verification correct?

---

**Remember:** Most webhook errors are authorization-related. Start by verifying API key configuration! 🔑
