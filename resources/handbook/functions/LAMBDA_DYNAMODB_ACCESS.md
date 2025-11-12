# Lambda DynamoDB Access in Amplify Gen 2

**The complete guide to granting Lambda functions access to DynamoDB tables using Amplify's native patterns.**

---

## 🎯 Quick Answer

To grant your Lambda function access to DynamoDB tables:

```typescript
// In amplify/functions/myFunction/resource.ts
export const myFunction = defineFunction({
  name: 'myFunction',
  entry: './handler.ts',
  resourceGroupName: 'data',  // ← This grants DynamoDB access!
});
```

**But that's only HALF the solution!** See "The Two-Part Pattern" below.

---

## 🧒 ELI5: What `resourceGroupName: 'data'` Means

Imagine you have a **toy box** (that's your DynamoDB database) and a **robot helper** (that's your Lambda function).

**Without `resourceGroupName: 'data'`:**
- The robot can't open the toy box
- You'd have to write a special permission slip with complicated rules
- That's the "old CDK way" - lots of work!

**With `resourceGroupName: 'data'`:**
- You just tell the robot: "Hey, you're part of the DATA team!"
- Now the robot automatically gets a key to the toy box
- No permission slips needed!

It's like giving your robot a **team badge** that says "DATA TEAM" and that badge automatically opens all the toy boxes (DynamoDB tables) that belong to the data team.

---

## ⚠️ The Two-Part Pattern (BOTH Required!)

**You need TWO pieces for Lambda DynamoDB access to work:**

### Part 1: Function Configuration (The Physical Key)

```typescript
// amplify/functions/myFunction/resource.ts
import { defineFunction } from '@aws-amplify/backend';

export const myFunction = defineFunction({
  name: 'myFunction',
  entry: './handler.ts',
  resourceGroupName: 'data',  // ← Grants IAM permissions to DynamoDB
  timeoutSeconds: 300,
  memoryMB: 1024,
});
```

**What this does:**
- ✅ Grants IAM permissions to access ALL DynamoDB tables created by your Data resource
- ✅ Allows read/write/update/delete operations
- ✅ Sets up proper IAM role and policies automatically
- ✅ Handles all security configuration behind the scenes

**What it DOES NOT do:**
- ❌ Does NOT provide the GraphQL endpoint URL
- ❌ Does NOT inject Amplify Data client configuration
- ❌ Does NOT work alone - you also need Part 2!

### Part 2: Schema-Level Authorization (The Address)

```typescript
// amplify/data/resource.ts
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { myFunction } from '../functions/myFunction/resource';

const schema = a.schema({
  MyModel: a.model({
    content: a.string().required(),
  })
  .authorization((allow) => [
    allow.guest(), // Model-level: Frontend access
  ]),
})
// 🚨 CRITICAL: Schema-level authorization
.authorization((allow) => [
  allow.resource(myFunction),  // ← Injects GraphQL config into Lambda!
]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
  },
});
```

**What this does:**
- ✅ Injects GraphQL endpoint URL into Lambda environment variables
- ✅ Provides Amplify Data client configuration
- ✅ Sets up `AMPLIFY_DATA_GRAPHQL_ENDPOINT` environment variable
- ✅ Enables `getAmplifyDataClientConfig()` to work

**Think of it like a door with two locks:**
- `resourceGroupName: 'data'` = Gives you the **physical key** (IAM permissions)
- `allow.resource(myFunction)` = Tells you the **address** where the door is (GraphQL endpoint config)

**You need BOTH to open the door!**

---

## 🚨 #1 Error: "Malformed Environment Variables"

If you see this error:
```
Error: The data environment variables are malformed
```

**You're missing the schema-level `allow.resource()`!**

Without it:
- ❌ `AMPLIFY_DATA_GRAPHQL_ENDPOINT` is not set
- ❌ `AMPLIFY_SSM_ENV_CONFIG` is empty `{}`
- ❌ `getAmplifyDataClientConfig()` throws an error

**Fix:** Add schema-level authorization (see Part 2 above).

---

## 📝 Complete Working Example

### Step 1: Backend Registration

```typescript
// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { myFunction } from './functions/myFunction/resource';

const backend = defineBackend({
  auth,
  data,
  myFunction,  // ← CRITICAL: Must be registered here
});
```

### Step 2: Function Handler

```typescript
// amplify/functions/myFunction/handler.ts
import { EventBridgeEvent } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import type { Schema } from '../../data/resource';

export const handler = async (event: EventBridgeEvent<string, any>) => {
  try {
    // Get Amplify configuration (requires schema-level allow.resource!)
    const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
      process.env.AWS_REGION!
    );

    Amplify.configure(resourceConfig, libraryOptions);

    // CRITICAL: Use 'iam' authMode for Lambda functions
    const client = generateClient<Schema>({ authMode: 'iam' });

    // Now you can access DynamoDB through GraphQL
    const result = await client.models.MyModel.create({
      content: 'Test from Lambda',
    });

    console.log('Created record:', result.data?.id);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Success',
        recordId: result.data?.id,
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Processing failed' }),
    };
  }
};
```

---

## 🆚 Comparison: Amplify Way vs CDK Way

### ❌ The Old CDK Way (DON'T DO THIS)

```typescript
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

// Lots of manual work...
myFunction.addToRolePolicy(new PolicyStatement({
  actions: [
    'dynamodb:GetItem',
    'dynamodb:PutItem',
    'dynamodb:UpdateItem',
    'dynamodb:DeleteItem',
    'dynamodb:Query',
    'dynamodb:Scan'
  ],
  resources: [
    `arn:aws:dynamodb:${region}:${account}:table/MyTable`,
    `arn:aws:dynamodb:${region}:${account}:table/MyTable/index/*`
  ]
}));
// ... repeat for every table!
```

**Problems:**
- 🔴 Requires importing from `aws-cdk-lib` (violates No CDK rule)
- 🔴 Hardcoded ARNs (breaks across environments)
- 🔴 Manual policy management (error-prone)
- 🔴 Verbose and repetitive
- 🔴 No GraphQL endpoint configuration

### ✅ The Amplify Gen 2 Way (DO THIS)

```typescript
export const myFunction = defineFunction({
  resourceGroupName: 'data',  // Done!
});
```

**Benefits:**
- 🟢 One line of code
- 🟢 Works across all environments automatically
- 🟢 No CDK imports needed
- 🟢 Automatic permission management
- 🟢 Type-safe GraphQL access

---

## 🔍 Common Data Operations

### Create Records

```typescript
const result = await client.models.MyModel.create({
  content: 'New record',
  isActive: true,
});
```

### Read Records

```typescript
// Get by ID
const record = await client.models.MyModel.get({ id: 'record-id' });

// List all
const { data: records } = await client.models.MyModel.list();

// List with filter
const { data: activeRecords } = await client.models.MyModel.list({
  filter: { isActive: { eq: true } }
});
```

### Update Records

```typescript
const updated = await client.models.MyModel.update({
  id: 'record-id',
  content: 'Updated content',
});
```

### Delete Records

```typescript
const deleted = await client.models.MyModel.delete({
  id: 'record-id',
});
```

### Batch Operations

```typescript
// Process multiple records
const items = await client.models.MyModel.list();

const results = await Promise.allSettled(
  items.data.map(item =>
    client.models.MyModel.update({
      id: item.id,
      processedAt: new Date().toISOString(),
    })
  )
);

const successful = results.filter(r => r.status === 'fulfilled').length;
console.log(`Processed ${successful} records`);
```

---

## ❓ FAQ

### Q: What exactly does `resourceGroupName: 'data'` grant access to?

**A:** ALL DynamoDB tables created by your Data resource (all models in your schema).

### Q: Can I restrict access to specific tables only?

**A:** No, not with `resourceGroupName`. It's all-or-nothing for the resource group. For fine-grained control, you'd need CDK (but we avoid CDK in this template).

### Q: Why do I need both `resourceGroupName: 'data'` AND `allow.resource()`?

**A:**
- `resourceGroupName: 'data'` = IAM permissions (the key)
- `allow.resource()` = GraphQL endpoint config (the address)
- You need both to access data!

### Q: Can I skip `allow.resource()` if I just need IAM permissions?

**A:** Only if you're accessing DynamoDB directly (not recommended). For Amplify Data client usage, you MUST have `allow.resource()`.

### Q: What auth mode should I use in Lambda?

**A:** Always use `{ authMode: 'iam' }` when creating the client. This uses the Lambda's IAM role instead of user credentials.

### Q: Will this work in scheduled functions?

**A:** Yes! This is the standard pattern for all Lambda functions - scheduled, GraphQL resolvers, event-driven, etc.

### Q: What if I see "AccessDeniedException"?

**A:** Check three things:
1. Function has `resourceGroupName: 'data'` in resource.ts
2. Schema has `.authorization((allow) => [allow.resource(functionName)])`
3. Function is registered in `defineBackend({ ..., functionName })`

### Q: Can I use this pattern for other resources (S3, Cognito)?

**A:** Yes! Use:
- `resourceGroupName: 'storage'` for S3 access (see `LAMBDA_S3_ACCESS.md`)
- `resourceGroupName: 'auth'` for Cognito access (see `LAMBDA_COGNITO_ACCESS.md`)

---

## 🎓 Real-World Use Cases

This pattern is perfect for:

- **Scheduled Functions**: Daily data sync, cleanup jobs, batch processing
- **GraphQL Resolvers**: Custom queries/mutations with complex business logic
- **Event-Driven Functions**: S3 triggers, EventBridge events, API webhooks
- **Background Jobs**: Processing user-initiated long-running tasks
- **Admin Operations**: Bulk updates, data migration, analytics generation

---

## 🔗 Related Documentation

- [Scheduled Function Example](./scheduledFunction/) - See this pattern in action
- [GraphQL Resolver Example](./graphqlResolver/) - Custom operations with DynamoDB
- [Lambda S3 Access](./LAMBDA_S3_ACCESS.md) - Access S3 from Lambda (coming soon)
- [Lambda Cognito Access](./LAMBDA_COGNITO_ACCESS.md) - Access Cognito from Lambda (coming soon)
- [AI Development Guidelines](../AI-DEVELOPMENT-GUIDELINES.md) - The "No CDK" rule

---

## ✅ Quick Checklist

Before deploying your Lambda function with DynamoDB access:

- [ ] Function has `resourceGroupName: 'data'` in resource.ts
- [ ] Schema has schema-level `.authorization((allow) => [allow.resource(functionName)])`
- [ ] Function is imported in data/resource.ts
- [ ] Function is registered in `defineBackend()`
- [ ] Handler uses `{ authMode: 'iam' }` when creating client
- [ ] Handler calls `getAmplifyDataClientConfig()` before accessing data
- [ ] No CDK imports (`aws-cdk-lib/aws-iam`) anywhere in your function code

---

**Remember:** `resourceGroupName: 'data'` + `allow.resource()` = Complete DynamoDB access. Both required. No CDK needed.
