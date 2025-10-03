# Authorize Lambda Functions to Access Amplify Data

**FOUNDATIONAL PATTERN: Required for ALL Lambda functions that access your DynamoDB database through Amplify Data**

---

## 🚨 Critical Concept

**This pattern is NOT specific to any function type - it applies to ALL Lambda functions:**
- ✅ Scheduled functions (EventBridge cron jobs)
- ✅ GraphQL resolvers (custom queries/mutations)
- ✅ Webhook handlers (external APIs)
- ✅ User-triggered functions (button clicks)
- ✅ Cognito triggers (auth lifecycle)
- ✅ **ANY Lambda that needs to read/write DynamoDB**

---

## ⚠️ The #1 Error: "Malformed Environment Variables"

If you see this error in your Lambda function:

```
Error: The data environment variables are malformed
```

**You're missing schema-level authorization.** Keep reading to understand why.

---

## 📋 The Two-Level Authorization System

Amplify Gen 2 uses a **two-level authorization system** for Lambda functions:

### Level 1: Model-Level Authorization (Frontend Access)

```typescript
// In amplify/data/resource.ts
const schema = a.schema({
  MyModel: a
    .model({
      name: a.string(),
      value: a.integer(),
    })
    .authorization((allow) => [
      allow.guest(),           // Frontend users
      allow.authenticated(),   // Signed-in users
      allow.owner(),          // Resource owners
    ]),
});
```

**This controls WHO (users/frontend) can access the model.**

### Level 2: Schema-Level Authorization (Lambda Access)

```typescript
// In amplify/data/resource.ts
import { myFunction } from '../functions/my-function/resource';

const schema = a.schema({
  MyModel: a.model({...})
    .authorization((allow) => [
      allow.guest(), // Model-level
    ])
})
.authorization((allow) => [
  allow.resource(myFunction), // Schema-level - CRITICAL!
]);
```

**This controls WHAT (Lambda functions) can access the GraphQL endpoint.**

---

## 🔑 Why Both Levels Are Required

### `resourceGroupName: 'data'` (Function Level)
**What it does:**
- ✅ Grants IAM permissions to access DynamoDB tables
- ✅ Allows Lambda to physically read/write to database

**What it does NOT do:**
- ❌ Does NOT inject GraphQL endpoint configuration
- ❌ Does NOT set `AMPLIFY_DATA_GRAPHQL_ENDPOINT` env var
- ❌ Does NOT provide Amplify Data Client config

### `allow.resource(functionName)` (Schema Level)
**What it does:**
- ✅ Injects GraphQL endpoint URL into Lambda environment
- ✅ Sets `AMPLIFY_DATA_GRAPHQL_ENDPOINT` env var
- ✅ Populates `AMPLIFY_SSM_ENV_CONFIG` with configuration
- ✅ Enables `getAmplifyDataClientConfig()` to work

**What it does NOT do:**
- ❌ Does NOT grant DynamoDB IAM permissions (that's `resourceGroupName`)

---

## 📋 The Complete 3-Step Setup

### Step 1: Set `resourceGroupName` in Function

In `amplify/functions/my-function/resource.ts`:

```typescript
import { defineFunction } from '@aws-amplify/backend';

export const myFunction = defineFunction({
  name: 'my-function',
  entry: './handler.ts',
  resourceGroupName: 'data', // ← Grants DynamoDB IAM permissions
});
```

### Step 2: Add Schema-Level Authorization

In `amplify/data/resource.ts`:

```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { myFunction } from '../functions/my-function/resource';

const schema = a.schema({
  MyModel: a
    .model({
      name: a.string(),
      value: a.integer(),
    })
    .authorization((allow) => [
      allow.guest(), // Model-level: Frontend access
    ])
})
.authorization((allow) => [
  allow.resource(myFunction), // ← Schema-level: Injects GraphQL config!
]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
  },
});
```

**CRITICAL:** The `.authorization((allow) => [allow.resource(myFunction)])` MUST be at the **schema level**, NOT the model level!

### Step 3: Register Function in Backend

In `amplify/backend.ts`:

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { myFunction } from './functions/my-function/resource';

const backend = defineBackend({
  auth,
  data,
  myFunction, // ← MUST register here to wire everything together
});
```

---

## 📋 Using Amplify Data Client in Lambda

Once all 3 steps are complete, your Lambda handler can access data:

### Option 1: Using `getAmplifyDataClientConfig()` (Recommended)

```typescript
import { EventBridgeEvent } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import type { Schema } from '../../data/resource';

export const handler = async (event: EventBridgeEvent<string, any>) => {
  try {
    // This REQUIRES schema-level allow.resource() to work!
    const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
      process.env.AWS_REGION!
    );

    Amplify.configure(resourceConfig, libraryOptions);

    // CRITICAL: Use 'iam' authMode for Lambda functions
    const client = generateClient<Schema>({ authMode: 'iam' });

    // Now you can access DynamoDB
    const result = await client.models.MyModel.create({
      name: 'test',
      value: 42,
    });

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error: any) {
    console.error('Error:', error);
    // "malformed environment variables" = missing allow.resource()
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
```

### Option 2: Using `env` variables (Alternative)

```typescript
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/my-function';
import type { Schema } from '../../data/resource';

export const handler = async (event: any) => {
  // Configure using env variables (injected by allow.resource())
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
    { ssr: true }
  );

  const client = generateClient<Schema>({ authMode: 'iam' });

  const result = await client.models.MyModel.list();

  return { statusCode: 200, body: JSON.stringify(result) };
};
```

---

## ❌ Common Mistakes

### Mistake 1: Only Setting `resourceGroupName`

```typescript
// ❌ WRONG - Missing schema-level authorization
// Function resource.ts
export const myFunction = defineFunction({
  resourceGroupName: 'data', // Not enough!
});

// Data resource.ts
const schema = a.schema({
  MyModel: a.model({...})
    .authorization((allow) => [allow.guest()])
  // Missing: .authorization((allow) => [allow.resource(myFunction)])
});
```

**Result:** "Malformed environment variables" error

### Mistake 2: Wrong Authorization Placement

```typescript
// ❌ WRONG - allow.resource() at MODEL level
const schema = a.schema({
  MyModel: a
    .model({...})
    .authorization((allow) => [
      allow.guest(),
      allow.resource(myFunction), // TypeScript error! Wrong place!
    ])
});
```

**Result:** TypeScript compilation error

### Mistake 3: Not Registering Function in Backend

```typescript
// ❌ WRONG - Function not in defineBackend()
const backend = defineBackend({
  auth,
  data,
  // Missing: myFunction
});
```

**Result:** Function can't access data, permissions not wired up

---

## 🔍 Debugging "Malformed Environment Variables"

If you get the "malformed environment variables" error:

### Step 1: Check Lambda Environment Variables

In AWS Console → Lambda → Your Function → Configuration → Environment variables:

**Look for these variables:**
- `AMPLIFY_DATA_GRAPHQL_ENDPOINT` - Should contain your AppSync endpoint URL
- `AMPLIFY_SSM_ENV_CONFIG` - Should contain JSON config (not `{}`)

**If missing or empty:**
- ❌ You forgot schema-level `allow.resource(functionName)`

### Step 2: Check Your Schema

In `amplify/data/resource.ts`:

```typescript
// ✅ CORRECT - Two separate .authorization() blocks
const schema = a.schema({
  MyModel: a.model({...})
    .authorization((allow) => [
      allow.guest(), // Model-level
    ])
})
.authorization((allow) => [ // Schema-level - on the schema, NOT the model
  allow.resource(myFunction),
]);
```

### Step 3: Check Function Registration

In `amplify/backend.ts`:

```typescript
const backend = defineBackend({
  auth,
  data,
  myFunction, // ✅ Must be here
});
```

### Step 4: Redeploy

```bash
npx ampx sandbox
```

Wait for deployment to complete and check Lambda env vars again.

---

## 📋 Quick Reference: All Lambda Types

### Scheduled Function (EventBridge)

```typescript
// Function resource.ts
export const scheduledFunc = defineFunction({
  resourceGroupName: 'data',
});

// Data resource.ts
schema.authorization((allow) => [allow.resource(scheduledFunc)]);

// Backend.ts
defineBackend({ auth, data, scheduledFunc });
```

### GraphQL Resolver

```typescript
// Function resource.ts
export const customResolver = defineFunction({
  resourceGroupName: 'data',
});

// Data resource.ts
schema.authorization((allow) => [allow.resource(customResolver)]);

// Backend.ts
defineBackend({ auth, data, customResolver });
```

### Webhook Handler

```typescript
// Function resource.ts
export const webhookHandler = defineFunction({
  resourceGroupName: 'data',
});

// Data resource.ts
schema.authorization((allow) => [allow.resource(webhookHandler)]);

// Backend.ts
defineBackend({ auth, data, webhookHandler });
```

### Cognito Trigger

```typescript
// Function resource.ts
export const postConfirmation = defineFunction({
  resourceGroupName: 'data',
});

// Data resource.ts
schema.authorization((allow) => [allow.resource(postConfirmation)]);

// Backend.ts
defineBackend({ auth, data, postConfirmation });
```

**The pattern is IDENTICAL for all function types!**

---

## ✅ Verification Checklist

Before moving on, verify ALL THREE steps:

- [ ] Function has `resourceGroupName: 'data'` in resource.ts
- [ ] Schema has `.authorization((allow) => [allow.resource(functionName)])` at schema level
- [ ] Function is registered in `defineBackend({ ..., functionName })`
- [ ] Lambda environment has `AMPLIFY_DATA_GRAPHQL_ENDPOINT` set (check AWS Console)
- [ ] Lambda environment has populated `AMPLIFY_SSM_ENV_CONFIG` (not `{}`)
- [ ] Function handler uses `authMode: 'iam'` when generating client
- [ ] Sandbox deployed successfully without errors

---

## 🎯 Key Takeaways

1. **Two levels of authorization are required:**
   - `resourceGroupName: 'data'` → IAM permissions
   - `allow.resource(functionName)` → GraphQL config injection

2. **Schema-level authorization is NOT optional:**
   - Without it, you get "malformed environment variables"
   - It MUST be at schema level: `schema.authorization(...)` NOT `model.authorization(...)`

3. **This applies to ALL Lambda functions:**
   - Scheduled functions, GraphQL resolvers, webhooks, triggers - all the same pattern

4. **Always use `authMode: 'iam'` in Lambda:**
   - Lambda functions authenticate as IAM roles, not users
   - `generateClient<Schema>({ authMode: 'iam' })`

---

**You MUST complete all 3 steps for Lambda-to-Data access to work! 🔐**
