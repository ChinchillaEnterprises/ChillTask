# Add Custom GraphQL Resolver

**Step-by-step pattern for creating custom GraphQL queries and mutations with Lambda functions**

---

## ✅ Prerequisites

- Amplify Data configured (`amplify/data/resource.ts` exists)
- Data models defined
- Understanding of GraphQL queries vs mutations
- **READ FIRST:** `authorize-lambda-with-data.md` for database access setup

---

## 📋 Step 1: Create Function Files

Create the function folder structure:

```bash
mkdir -p amplify/functions/get-user-stats
```

### Create `amplify/functions/get-user-stats/resource.ts`:

```typescript
import { defineFunction } from '@aws-amplify/backend';

export const getUserStats = defineFunction({
  name: 'get-user-stats',
  entry: './handler.ts',
  resourceGroupName: 'data', // CRITICAL: Grants DynamoDB access
  timeoutSeconds: 30,
});
```

**Key Points:**
- ✅ `resourceGroupName: 'data'` grants DynamoDB IAM permissions
- ✅ You ALSO need schema-level `allow.resource()` - see `authorize-lambda-with-data.md`
- ✅ Timeout defaults to 30 seconds (max 900 for complex ops)
- ✅ Function name matches the handler filename

---

## 📋 Step 2: Create Type-Safe Handler

### Create `amplify/functions/get-user-stats/handler.ts`:

```typescript
import type { Schema } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/get-user-stats';

// Configure Amplify in Lambda
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

// Create client with IAM auth (system-level access)
const client = generateClient<Schema>({
  authMode: 'iam',
});

// Type-safe handler - Schema knows the exact arguments and return type!
export const handler: Schema['getUserStats']['functionHandler'] = async (event) => {
  const { userId, includeActivity } = event.arguments;

  try {
    // Query multiple models with system-level access
    const { data: posts } = await client.models.Post.list({
      filter: { userId: { eq: userId } },
    });

    const totalPosts = posts?.length || 0;

    // Calculate user level based on posts
    let level = 'Beginner';
    if (totalPosts > 100) level = 'Expert';
    else if (totalPosts > 50) level = 'Advanced';
    else if (totalPosts > 10) level = 'Intermediate';

    // Conditional data fetching
    let activity = null;
    if (includeActivity && posts && posts.length > 0) {
      const latestPost = posts.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      activity = {
        totalPosts,
        latestPost: latestPost.title,
        lastActiveDate: latestPost.createdAt,
      };
    }

    return {
      userId,
      totalPosts,
      level,
      lastActive: posts?.[0]?.createdAt,
      joinedDate: '2024-01-01', // Get from user profile
      activity,
    };
  } catch (error) {
    console.error('Error in getUserStats:', error);
    throw new Error('Failed to fetch user stats');
  }
};
```

**Key Points:**
- ✅ Use `Schema['operationName']['functionHandler']` for type safety
- ✅ Configure Amplify with `env.AMPLIFY_DATA_GRAPHQL_ENDPOINT`
- ✅ Use `authMode: 'iam'` for system-level data access
- ✅ Return objects that match your schema exactly

---

## 📋 Step 3: Define Custom Types in Schema

Update `amplify/data/resource.ts`:

```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { getUserStats } from '../functions/get-user-stats/resource';

const schema = a.schema({
  // Your existing models
  Post: a
    .model({
      title: a.string().required(),
      content: a.string().required(),
      userId: a.string().required(),
      createdAt: a.string(),
    })
    .authorization((allow) => [allow.authenticated()]),

  // Custom types for complex return values
  UserActivity: a.customType({
    totalPosts: a.integer(),
    latestPost: a.string(),
    lastActiveDate: a.datetime(),
  }),

  UserStats: a.customType({
    userId: a.string().required(),
    totalPosts: a.integer().required(),
    level: a.string().required(),
    lastActive: a.datetime(),
    joinedDate: a.datetime(),
    activity: a.ref('UserActivity'), // Reference to custom type
  }),

  // Custom query operation
  getUserStats: a
    .query() // Use .mutation() for write operations
    .arguments({
      userId: a.string().required(), // Required parameter
      includeActivity: a.boolean(), // Optional parameter
    })
    .returns(a.ref('UserStats')) // Return type matches custom type
    .handler(a.handler.function(getUserStats)) // Links to your function
    .authorization((allow) => [allow.authenticated()]), // Who can call this
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
```

---

## 📋 Step 4: Register Function in Backend

Update `amplify/backend.ts`:

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { getUserStats } from './functions/get-user-stats/resource';

const backend = defineBackend({
  auth,
  data,
  getUserStats, // Register function here
});
```

---

## 📋 Step 5: Deploy and Test

```bash
npx ampx sandbox
```

Wait for deployment to complete.

---

## 📋 Step 6: Call from Frontend

```typescript
"use client";

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

async function fetchUserStats(userId: string) {
  try {
    const result = await client.queries.getUserStats({
      userId,
      includeActivity: true,
    });

    if (result.data) {
      console.log(`User has ${result.data.totalPosts} posts`);
      console.log(`User level: ${result.data.level}`);

      if (result.data.activity) {
        console.log(`Latest post: ${result.data.activity.latestPost}`);
      }
    }

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
    }
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
  }
}
```

---

## 🎯 Common Use Cases

### Aggregating Data

```typescript
// Calculate totals across multiple models
const userStats = {
  totalPosts: posts.length,
  totalComments: comments.length,
  averagePostLength: posts.reduce((sum, p) => sum + p.content.length, 0) / posts.length,
};
```

### External API Integration

```typescript
// Fetch data from external service
const response = await fetch('https://api.example.com/data', {
  headers: { 'Authorization': `Bearer ${process.env.API_KEY}` },
});

const externalData = await response.json();

// Combine with database data
return {
  internalData: dbResult,
  externalData,
};
```

### Complex Filtering

```typescript
// Apply business logic that can't be done in GraphQL filters
const filteredPosts = posts.filter(post => {
  const age = Date.now() - new Date(post.createdAt).getTime();
  const isRecent = age < 7 * 24 * 60 * 60 * 1000; // 7 days
  const isPopular = post.views > 1000;
  return isRecent && isPopular;
});
```

---

## 📋 Mutations vs Queries

### Use `.query()` for:
- Reading data
- Aggregating data
- Complex filtering
- Data analysis

### Use `.mutation()` for:
- Creating/updating/deleting data
- Triggering background jobs
- Sending emails/notifications
- External API calls that modify state

### Example Mutation:

```typescript
// In schema
processOrder: a
  .mutation()
  .arguments({ orderId: a.string().required() })
  .returns(a.customType({
    success: a.boolean().required(),
    trackingNumber: a.string(),
    message: a.string().required(),
  }))
  .handler(a.handler.function(processOrder))
  .authorization((allow) => [allow.authenticated()]),
```

---

## ⚠️ Common Pitfalls

1. **Missing `resourceGroupName: 'data'`** → Function can't access database
2. **Wrong auth mode** → Use `authMode: 'iam'` in function, not user credentials
3. **Type mismatch** → Return object MUST match custom type exactly
4. **Not handling errors** → Always wrap in try-catch
5. **Forgetting to register in backend.ts** → Function won't deploy

---

## 🔒 Authorization Options

```typescript
// Different authorization strategies
.authorization((allow) => [
  allow.authenticated(),                    // Any signed-in user
  allow.owner(),                           // Only resource owner
  allow.groups(['admin', 'moderator']),    // Specific user groups
  allow.publicApiKey(),                    // Public access via API key
  allow.custom(),                          // Custom authorization logic

  // Combine multiple rules:
  allow.authenticated().to(['read']),
  allow.groups(['admin']).to(['read', 'create', 'update']),
])
```

---

## ✅ Checklist

Before moving on, verify:
- [ ] Function created in `amplify/functions/` with resource.ts and handler.ts
- [ ] Custom types defined in schema
- [ ] Operation defined with arguments, returns, handler, and authorization
- [ ] Function registered in `amplify/backend.ts`
- [ ] `resourceGroupName: 'data'` set in resource.ts
- [ ] Handler uses `Schema['operationName']['functionHandler']` type
- [ ] Amplify configured with IAM auth in handler
- [ ] Sandbox deployed successfully
- [ ] Client-side call tested and working

---

**You're done! Your app now has custom GraphQL operations! 🎉**
