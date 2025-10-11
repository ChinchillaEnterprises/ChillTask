# GraphQL Custom Resolver Example

This educational example demonstrates how to create custom GraphQL operations in Amplify Gen 2 using production-proven patterns.

## What This Shows

**Custom GraphQL Operations**: How to extend your GraphQL API beyond basic CRUD operations with business logic, data aggregation, and complex queries.

**Essential Amplify Gen 2 Patterns Demonstrated:**
- Type-safe function handlers with automatic Schema inference
- IAM authentication for system-level data access (bypassing user permissions)
- Data aggregation across multiple models within a single operation
- Production-ready error handling and structured logging
- Authorization patterns for different access levels
- Optional parameter handling and conditional processing

## Files Overview

### `handler.ts`
The Lambda function that implements the custom resolver:
- **Type Safety**: Uses `Schema['operationName']['functionHandler']` for complete type inference
- **Data Access**: Shows how to query multiple models using the Amplify client with IAM auth
- **Business Logic**: Demonstrates calculating derived data (user levels, activity statistics)
- **Error Handling**: Production-ready error logging with user-friendly error messages
- **Optional Parameters**: Shows how to handle conditional logic based on input arguments

### `resource.ts`
Function configuration and deployment settings:
- **Resource Association**: Links to data resources via `resourceGroupName` for IAM permissions
- **Environment Setup**: Passes necessary environment variables to your function
- **Timeout Configuration**: Sets appropriate timeouts for data operations (max 15 minutes)
- **Function Naming**: Must match the operation name defined in your schema

## Schema Integration

Add this to your `data/resource.ts` to wire up the custom operation.
This example shows the complete pattern from arguments to return types:

```typescript
// Example schema definition showing the complete pattern
const schema = a.schema({
  // ... your data models (Post, Profile, etc.) ...

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
      includeActivity: a.boolean() // Optional parameter
    })
    .returns(a.ref('UserStats')) // Return type matches custom type
    .handler(a.handler.function(getUserStats)) // Links to your function
    .authorization((allow) => [allow.authenticated()]), // Who can call this
});
```

## Usage from Client

```typescript
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

// Initialize the client with your schema type
const client = generateClient<Schema>();

// Call the custom operation with full type safety
const result = await client.queries.getUserStats({
  userId: "user123",
  includeActivity: true // Optional parameter
});

// TypeScript knows the exact structure of the response
if (result.data) {
  console.log(`User has ${result.data.totalPosts} posts`);
  console.log(`User level: ${result.data.level}`);
  
  if (result.data.activity) {
    console.log(`Latest post: ${result.data.activity.latestPost}`);
  }
}

// Handle errors
if (result.errors) {
  console.error('GraphQL errors:', result.errors);
}
```

## Production Patterns Demonstrated

This example demonstrates these essential patterns for real-world applications:

1. **Data Aggregation**: Combining data from multiple models in a single operation
2. **Business Logic**: Implementing calculation and derived values within resolvers
3. **Conditional Processing**: Handling optional parameters and conditional data fetching
4. **Type Safety**: Using `Schema['operationName']['functionHandler']` for complete type inference
5. **IAM Auth Pattern**: Using `authMode: 'iam'` for system-level data access
6. **Error Handling**: Production-ready error logging and user-friendly error messages

## Authorization Options

Custom operations support flexible authorization patterns:

```typescript
// Examples of different authorization strategies
.authorization((allow) => [
  allow.authenticated(),           // Any signed-in user can call this
  allow.owner(),                   // Only resource owner (based on ownership fields)
  allow.groups(['admin', 'moderator']), // Specific user groups only
  allow.publicApiKey(),            // System/webhook access via API key
  allow.custom(),                  // Custom authorization logic in Lambda
  
  // You can combine multiple rules:
  allow.authenticated().to(['read']),
  allow.groups(['admin']).to(['read', 'create', 'update']),
])
```

## Common Use Cases

- **User Dashboards**: Aggregate user activity, preferences, and statistics across multiple tables
- **Business Logic**: Calculate derived values, apply business rules, and complex computations
- **External Integrations**: Fetch and process data from external APIs and webhook responses
- **Complex Queries**: Join and combine data across multiple models with filtering
- **System Operations**: Administrative functions, health checks, and configuration queries
- **Batch Operations**: Process multiple records or perform bulk updates
- **Caching Layers**: Implement custom caching logic for expensive operations

## Next Steps

1. **Define your custom types** in the schema for complex return values
2. **Import your function** in data/resource.ts using the same name
3. **Wire up the operation** with proper arguments, return types, and authorization
4. **Test with different auth modes** to ensure proper access control
5. **Add comprehensive error handling** for your specific business logic
6. **Consider performance** - add caching, pagination, or background processing as needed
7. **Monitor and log** your functions in production for debugging and optimization

This pattern scales to handle complex business operations while maintaining complete type safety, proper authorization, and production reliability.