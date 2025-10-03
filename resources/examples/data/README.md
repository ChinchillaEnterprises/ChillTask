# Amplify Data Schema Examples

This directory contains example data schemas demonstrating different patterns and use cases for AWS Amplify Gen 2.

## 📁 What's Included

### 1. **simple-custom-operations.ts**
The original example from the template - perfect for learning the basics:
- Simple models (Todo, Post, Profile)
- Custom query example (`getUserStats`)
- Custom mutation examples
- Different authorization patterns
- Detailed comments explaining each concept

### 2. **blog-schema.ts**
Complete blog platform with advanced features:
- Posts with publishing workflow
- User profiles and author info
- Comments with nested replies
- Custom operations for search, trending posts, and analytics
- SEO and metadata support
- Follow/unfollow functionality

### 3. **ecommerce-schema.ts**
Full e-commerce platform demonstrating:
- Products with variants and inventory
- Shopping cart and checkout flow
- Order management with status workflow
- Customer profiles and addresses
- Reviews and ratings
- Payment integration patterns
- Complex business logic operations

## 🚀 How to Use These Examples

### Step 1: Choose What You Need
Don't copy everything! Pick only the models and operations relevant to your app:

```typescript
// In your amplify/data/resource.ts, import what you need:
const schema = a.schema({
  // Keep your basic Todo model
  Todo: a.model({
    content: a.string(),
  }).authorization((allow) => [allow.owner()]),

  // Add only what you need from examples
  // For example, just the Post model from blog-schema.ts
  Post: a.model({
    title: a.string().required(),
    content: a.string().required(),
    // ... etc
  }),
});
```

### Step 2: Create Lambda Functions
For each custom operation, create a corresponding Lambda function:

```typescript
// amplify/functions/getUserStats/handler.ts
export const handler: Schema["getUserStats"]["functionHandler"] = async (event) => {
  const { userId, includeActivity } = event.arguments;
  
  // Your business logic here
  
  return {
    userId,
    totalPosts: 42,
    level: "expert",
    // ... rest of the fields
  };
};
```

### Step 3: Update Your Backend
Add the Lambda functions to your backend configuration:

```typescript
// amplify/backend.ts
import { getUserStats } from './functions/getUserStats/resource';

const backend = defineBackend({
  auth,
  data,
  getUserStats, // Add your function
});
```

## 🎯 Common Patterns

### Authorization Strategies

```typescript
// Public access (no auth required)
.authorization((allow) => [allow.publicApiKey()])

// Any authenticated user
.authorization((allow) => [allow.authenticated()])

// Only the owner
.authorization((allow) => [allow.owner()])

// Specific user groups
.authorization((allow) => [allow.groups(['admin', 'moderator'])])

// Multiple rules (OR logic)
.authorization((allow) => [
  allow.owner(),
  allow.groups(['admin']),
])

// Conditional access
.authorization((allow) => [
  allow.authenticated().to(["read"]).when((post) => post.published.eq(true))
])
```

### Field Types

```typescript
// Basic types
title: a.string().required(),
count: a.integer().default(0),
price: a.float().required(),
isActive: a.boolean().default(true),

// Date/time types
createdAt: a.datetime(),
birthDate: a.date(),
appointmentTime: a.time(),

// Validated types
email: a.email().required(),
website: a.url(),
phone: a.phone(),

// Enums for limited choices
status: a.enum(['draft', 'published', 'archived']),

// Arrays
tags: a.string().array(),
scores: a.integer().array(),

// JSON for flexible data
metadata: a.json(),
settings: a.json(),
```

### Indexes for Queries

```typescript
Post: a
  .model({
    authorId: a.string().required(),
    category: a.string().required(),
    createdAt: a.datetime(),
  })
  .secondaryIndexes((index) => [
    // Query posts by author
    index("byAuthor").partitionKey("authorId").sortKey("createdAt"),
    
    // Query posts by category
    index("byCategory").partitionKey("category").sortKey("createdAt"),
  ])
```

### Custom Operations

```typescript
// Custom Query
getUserStats: a
  .query()
  .arguments({
    userId: a.string().required(),
    timeRange: a.enum(['day', 'week', 'month']),
  })
  .returns(a.ref('UserStats'))
  .handler(a.handler.function("getUserStats"))
  .authorization((allow) => [allow.authenticated()]),

// Custom Mutation
processPayment: a
  .mutation()
  .arguments({
    orderId: a.string().required(),
    paymentMethodId: a.string().required(),
  })
  .returns(a.customType({
    success: a.boolean().required(),
    transactionId: a.string(),
    error: a.string(),
  }))
  .handler(a.handler.function("processPayment"))
  .authorization((allow) => [allow.authenticated()]),
```

## 💡 Best Practices

### 1. Start Simple
- Begin with basic CRUD operations
- Add custom operations as needed
- Don't over-engineer early

### 2. Think About Access Patterns
- Design indexes based on how you'll query data
- Consider pagination needs
- Plan for scale

### 3. Security First
- Use the principle of least privilege
- Validate in both schema and Lambda
- Never trust client input

### 4. Performance Considerations
- Use batch operations where possible
- Implement caching for expensive queries
- Consider DynamoDB limits

### 5. Error Handling
- Return meaningful error messages
- Use proper HTTP status codes
- Log errors for debugging

## 🔗 Related Documentation

- [Amplify Data Modeling](https://docs.amplify.aws/gen2/build-a-backend/data/data-modeling/)
- [Authorization Rules](https://docs.amplify.aws/gen2/build-a-backend/data/authorization/)
- [Custom Business Logic](https://docs.amplify.aws/gen2/build-a-backend/data/custom-business-logic/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

## ⚠️ Important Notes

- These are **examples only** - they don't get deployed
- Copy only what you need to `amplify/data/resource.ts`
- Each custom operation needs a Lambda function
- Test authorization rules thoroughly
- Consider costs - each model creates a DynamoDB table