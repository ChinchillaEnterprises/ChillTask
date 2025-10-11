# 🚫 Never Use API Gateway

## The Rule

**DO NOT use API Gateway CDK for backend API endpoints. EVER.**

This applies to:
- REST APIs
- Lambda function endpoints
- Backend operations
- Admin functions
- System integrations
- Internal APIs
- Background jobs
- ANY backend logic you want to invoke from the frontend

## The Correct Pattern: GraphQL Mutations with Amplify Data Client

Instead of API Gateway, use **GraphQL custom mutations and queries** that invoke Lambda functions, called via the Amplify Data client.

---

## How It Works

### 1. Define Custom Operation in Schema

In `amplify/data/resource.ts`:

```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // Your data models...

  // Custom mutation that invokes a Lambda
  processPayment: a
    .mutation()
    .arguments({
      orderId: a.string().required(),
      amount: a.float().required(),
      paymentMethod: a.string().required(),
    })
    .returns(a.customType({
      success: a.boolean().required(),
      transactionId: a.string(),
      message: a.string(),
    }))
    .handler(a.handler.function('processPayment'))  // Links to Lambda
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({ schema });
```

### 2. Create the Lambda Function

In `amplify/functions/processPayment/handler.ts`:

```typescript
import type { Schema } from '../../data/resource';

export const handler: Schema['processPayment']['functionHandler'] = async (event) => {
  const { orderId, amount, paymentMethod } = event.arguments;

  // Your business logic here
  // Access DynamoDB, call external APIs, etc.

  return {
    success: true,
    transactionId: 'txn_12345',
    message: 'Payment processed successfully'
  };
};
```

### 3. Wire It Up in backend.ts

In `amplify/backend.ts`:

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

const backend = defineBackend({
  auth,
  data,
  // Functions are automatically included via schema
});
```

### 4. Call from Frontend Using Data Client

In your React component:

```typescript
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

const client = generateClient<Schema>();

// Invoke the Lambda via GraphQL mutation
const handlePayment = async () => {
  const { data, errors } = await client.mutations.processPayment({
    orderId: 'order_123',
    amount: 99.99,
    paymentMethod: 'card',
  });

  if (data) {
    console.log('Success:', data.message);
    console.log('Transaction ID:', data.transactionId);
  }

  if (errors) {
    console.error('Payment failed:', errors);
  }
};
```

---

## Why This is Superior to API Gateway

### ✅ Amplify Native Pattern Benefits

1. **No CDK Required**
   - Pure Amplify abstractions
   - No raw CloudFormation
   - No hardcoded resource names
   - No sandbox conflicts

2. **Type Safety End-to-End**
   - Schema defines the contract
   - Lambda handler is fully typed
   - Frontend client is auto-typed
   - Catch errors at compile time

3. **Built-in Authorization**
   - `allow.authenticated()` - Any signed-in user
   - `allow.owner()` - Only resource owner
   - `allow.groups(['admin'])` - Specific user groups
   - `allow.publicApiKey()` - API key access
   - Authorization checked before Lambda executes

4. **No Naming Conflicts**
   - Amplify manages all resource names
   - Multiple developers can run sandboxes simultaneously
   - No `AlreadyExists` errors

5. **Automatic Permissions**
   - Amplify handles IAM policies
   - Lambda gets DynamoDB access automatically
   - No manual permission management

6. **Cost Effective**
   - No API Gateway charges
   - Only Lambda invocation costs
   - Included in Amplify pricing

### ❌ API Gateway CDK Problems

1. **Violates "No CDK" Rule**
   - Requires `aws-cdk-lib` imports
   - Raw CloudFormation complexity
   - Students need to learn CDK

2. **Sandbox Conflicts**
   - Hardcoded names cause `AlreadyExists` errors
   - Multiple devs can't run sandboxes

3. **Extra Cost**
   - API Gateway charges per request
   - Adds unnecessary AWS bill

4. **No Type Safety**
   - Manual type definitions
   - No schema enforcement
   - Runtime errors

5. **Manual Authorization**
   - Have to implement auth yourself
   - Error-prone
   - Security risks

6. **More Code to Maintain**
   - CDK constructs
   - IAM policies
   - Integration code
   - Error handling

---

## Common Use Cases

### Background Jobs

```typescript
// Schema
runBackgroundJob: a
  .mutation()
  .arguments({ jobType: a.string().required() })
  .returns(a.customType({ jobId: a.string().required() }))
  .handler(a.handler.function('runBackgroundJob'))
  .authorization((allow) => [allow.authenticated()]);
```

### Admin Operations

```typescript
// Schema
adminCleanupData: a
  .mutation()
  .arguments({ targetDate: a.datetime().required() })
  .returns(a.customType({ recordsDeleted: a.integer().required() }))
  .handler(a.handler.function('adminCleanupData'))
  .authorization((allow) => [allow.groups(['admin'])]);
```

### External API Integration

```typescript
// Schema
fetchExternalData: a
  .query()
  .arguments({ resourceId: a.string().required() })
  .returns(a.json())  // Flexible return type
  .handler(a.handler.function('fetchExternalData'))
  .authorization((allow) => [allow.authenticated()]);
```

### Batch Processing

```typescript
// Schema
batchUpdateRecords: a
  .mutation()
  .arguments({
    recordIds: a.string().array().required(),
    updates: a.json().required()
  })
  .returns(a.customType({
    updated: a.integer().required(),
    failed: a.integer().required()
  }))
  .handler(a.handler.function('batchUpdateRecords'))
  .authorization((allow) => [allow.authenticated()]);
```

---

## Authorization Patterns

GraphQL custom operations support flexible authorization:

```typescript
// Any authenticated user
.authorization((allow) => [allow.authenticated()])

// Only the resource owner
.authorization((allow) => [allow.owner()])

// Specific user groups
.authorization((allow) => [allow.groups(['admin', 'moderator'])])

// Public API key (for webhooks/system access)
.authorization((allow) => [allow.publicApiKey()])

// Multiple rules combined
.authorization((allow) => [
  allow.authenticated().to(['read']),
  allow.groups(['admin']).to(['read', 'create', 'update', 'delete']),
])
```

---

## Client-Side Usage Patterns

### Basic Mutation

```typescript
const { data, errors } = await client.mutations.myOperation({
  arg1: 'value',
  arg2: 123
});
```

### Basic Query

```typescript
const { data, errors } = await client.queries.myOperation({
  userId: 'user123'
});
```

### With Error Handling

```typescript
try {
  const { data, errors } = await client.mutations.processPayment({
    orderId: 'order_123',
    amount: 99.99
  });

  if (errors) {
    console.error('GraphQL errors:', errors);
    return;
  }

  console.log('Success:', data);
} catch (error) {
  console.error('Network error:', error);
}
```

### With Loading State

```typescript
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  setLoading(true);
  try {
    const { data } = await client.mutations.submitForm({ formData });
    if (data) {
      // Handle success
    }
  } finally {
    setLoading(false);
  }
};
```

---

## Lambda Implementation Patterns

### Accessing DynamoDB via Data Client

```typescript
import type { Schema } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/myFunction';

// Configure Amplify in Lambda
Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint: env.AMPLIFY_DATA_GRAPHQL_ENDPOINT,
        region: env.AWS_REGION,
        defaultAuthMode: 'iam'
      }
    }
  },
  {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => ({
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            sessionToken: env.AWS_SESSION_TOKEN,
          },
        }),
        clearCredentialsAndIdentityId: () => {},
      },
    },
  }
);

const dataClient = generateClient<Schema>({ authMode: 'iam' });

export const handler: Schema['getUserStats']['functionHandler'] = async (event) => {
  const { userId } = event.arguments;

  // Query DynamoDB via Data client
  const { data: posts } = await dataClient.models.Post.list({
    filter: { authorId: { eq: userId } }
  });

  return {
    userId,
    totalPosts: posts.length,
    level: posts.length > 100 ? 'expert' : 'beginner'
  };
};
```

### Error Handling

```typescript
export const handler: Schema['myOperation']['functionHandler'] = async (event) => {
  try {
    // Your business logic
    return { success: true };
  } catch (error) {
    console.error('Operation failed:', error);
    throw new Error('Failed to process request');
  }
};
```

---

## The Bottom Line

**Never create API Gateway with CDK.**

For backend API endpoints that need to be called from the frontend:
1. Define custom GraphQL mutation/query in schema
2. Link to Lambda via `a.handler.function('functionName')`
3. Call from frontend via Amplify Data client

This pattern gives you:
- ✅ Type safety
- ✅ Built-in auth
- ✅ No CDK
- ✅ No conflicts
- ✅ Lower cost
- ✅ Less code

**If you think you need API Gateway, you're wrong. Use GraphQL custom operations instead.**

---

## Reference

- **Examples**: See `resources/handbook/data/simple-custom-operations.ts`
- **Lambda Patterns**: See `resources/handbook/functions/graphqlResolver/`
- **Main Guidelines**: See `resources/handbook/AI-DEVELOPMENT-GUIDELINES.md`
