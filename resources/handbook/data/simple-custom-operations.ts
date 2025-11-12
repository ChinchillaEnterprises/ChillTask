import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/**
 * 🎯 Example: Simple Custom Operations
 * 
 * This is the example that was originally in the main schema.
 * It shows the basic pattern for adding custom queries and mutations
 * beyond the standard CRUD operations.
 * 
 * This is perfect for learning how custom operations work before
 * diving into more complex examples.
 */

const schema = a.schema({
  // Basic Todo model for the starter app
  Todo: a
    .model({
      content: a.string(),
    })
    .authorization((allow) => [allow.owner()]),

  // Example data models for demonstrating relationships
  Post: a
    .model({
      title: a.string().required(),
      content: a.string().required(),
      authorId: a.string().required(),
      published: a.boolean().default(false),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner().to(["create", "read", "update", "delete"]),
      allow.authenticated().to(["read"]),
    ]),

  Profile: a
    .model({
      userId: a.string().required(),
      displayName: a.string(),
      bio: a.string(),
      avatar: a.string(),
      joinedDate: a.datetime(),
    })
    .authorization((allow) => [
      allow.owner().to(["create", "read", "update", "delete"]),
      allow.authenticated().to(["read"]),
    ]),

  // ========================================================================
  // CUSTOM TYPES - Define complex return values
  // ========================================================================
  
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
    activity: a.ref('UserActivity'),
  }),

  // ========================================================================
  // CUSTOM QUERY EXAMPLE
  // ========================================================================
  
  /**
   * Custom Query: Get User Statistics
   * 
   * This demonstrates the complete pattern for custom GraphQL operations:
   * 1. Define strongly-typed arguments with required/optional parameters
   * 2. Define return type using custom types or existing models
   * 3. Link to your Lambda handler function
   * 4. Set appropriate authorization rules
   * 
   * Key points:
   * - The operation name (getUserStats) must match your function export name
   * - Arguments can be required or optional with defaults
   * - Return types can be models, custom types, or arrays
   * - Authorization is checked before the Lambda executes
   */
  getUserStats: a
    .query()
    .arguments({ 
      userId: a.string().required(),
      includeActivity: a.boolean() // Optional parameter
    })
    .returns(a.ref('UserStats'))
    .handler(a.handler.function("getUserStats")) // Must match function name
    .authorization((allow) => [
      allow.authenticated(), // Any signed-in user can call this
    ]),

  // ========================================================================
  // CUSTOM MUTATION EXAMPLES
  // ========================================================================
  
  /**
   * Custom Mutation: Process User Action
   * 
   * Mutations are for operations that modify data.
   * They follow the same pattern as queries but use .mutation() instead.
   */
  processUserAction: a
    .mutation()
    .arguments({
      userId: a.string().required(),
      action: a.string().required(),
      metadata: a.json(), // Flexible JSON type for additional data
    })
    .returns(a.customType({
      success: a.boolean().required(),
      message: a.string(),
      processedAt: a.datetime(),
    }))
    .handler(a.handler.function("processUserAction"))
    .authorization((allow) => [allow.authenticated()]),

  /**
   * Batch Operation Example
   * 
   * Shows how to handle multiple items in a single operation
   */
  batchUpdatePosts: a
    .mutation()
    .arguments({
      postIds: a.string().array().required(),
      updates: a.json().required(), // { published?: boolean, category?: string }
    })
    .returns(a.customType({
      updated: a.integer().required(),
      failed: a.integer().required(),
      errors: a.string().array(),
    }))
    .handler(a.handler.function("batchUpdatePosts"))
    .authorization((allow) => [allow.authenticated()]),

  // ========================================================================
  // DIFFERENT AUTHORIZATION PATTERNS
  // ========================================================================
  
  /**
   * Public API Access Example
   * Useful for webhooks or public data
   */
  getPublicStats: a
    .query()
    .arguments({
      timeRange: a.enum(['day', 'week', 'month', 'all']),
    })
    .returns(a.customType({
      totalUsers: a.integer().required(),
      totalPosts: a.integer().required(),
      activeToday: a.integer().required(),
    }))
    .handler(a.handler.function("getPublicStats"))
    .authorization((allow) => [
      allow.publicApiKey(), // Accessible with API key
      allow.authenticated(), // Also accessible to signed-in users
    ]),

  /**
   * Admin-Only Operation
   * Restricted to specific user groups
   */
  adminDashboard: a
    .query()
    .returns(a.customType({
      totalUsers: a.integer().required(),
      totalRevenue: a.float().required(),
      systemHealth: a.string().required(),
      alerts: a.string().array(),
    }))
    .handler(a.handler.function("adminDashboard"))
    .authorization((allow) => [
      allow.groups(['admin']), // Only admin group members
    ]),

  /**
   * Owner-Based Custom Operation
   * The Lambda will verify ownership
   */
  exportMyData: a
    .mutation()
    .arguments({
      format: a.enum(['json', 'csv', 'pdf']),
      includeDeleted: a.boolean().default(false),
    })
    .returns(a.customType({
      downloadUrl: a.string().required(),
      expiresAt: a.datetime().required(),
      sizeInBytes: a.integer().required(),
    }))
    .handler(a.handler.function("exportMyData"))
    .authorization((allow) => [
      allow.authenticated(), // Lambda will verify user owns the data
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    // Enable API key for public operations
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/**
 * 📚 HOW TO USE THESE EXAMPLES
 * 
 * 1. COPY WHAT YOU NEED:
 *    - Take only the models and operations relevant to your app
 *    - Don't copy everything - start small and grow
 * 
 * 2. CREATE THE LAMBDA FUNCTIONS:
 *    - Each custom operation needs a corresponding Lambda function
 *    - The function name must match what's in the handler
 *    - See amplify/examples/functions/graphqlResolver for patterns
 * 
 * 3. AUTHORIZATION PATTERNS:
 *    - allow.authenticated() - Any signed-in user
 *    - allow.owner() - Only the creator (based on owner field)
 *    - allow.groups(['name']) - Specific Cognito groups
 *    - allow.publicApiKey() - API key access (webhooks, public data)
 *    - allow.resource(lambda) - Lambda function access only
 * 
 * 4. ARGUMENT TYPES:
 *    - a.string(), a.integer(), a.float(), a.boolean()
 *    - a.datetime(), a.date(), a.time()
 *    - a.email(), a.url(), a.phone(), a.ipAddress()
 *    - a.json() - For flexible/complex data
 *    - a.enum(['option1', 'option2']) - For limited choices
 *    - .array() - For lists (e.g., a.string().array())
 *    - .required() - Makes a field mandatory
 *    - .default(value) - Sets a default value
 * 
 * 5. RETURN TYPES:
 *    - a.ref('ModelName') - Reference existing model
 *    - a.ref('CustomType') - Reference custom type
 *    - a.customType({...}) - Inline custom type
 *    - .array() - Return arrays
 * 
 * 6. LAMBDA IMPLEMENTATION:
 *    ```typescript
 *    export const handler: Schema["getUserStats"]["functionHandler"] = async (event) => {
 *      const { userId, includeActivity } = event.arguments;
 *      
 *      // Your business logic here
 *      
 *      return {
 *        userId,
 *        totalPosts: 42,
 *        level: "expert",
 *        // ... rest of the fields
 *      };
 *    };
 *    ```
 * 
 * 7. CLIENT-SIDE USAGE:
 *    ```typescript
 *    // Query
 *    const { data, errors } = await client.queries.getUserStats({
 *      userId: "123",
 *      includeActivity: true
 *    });
 *    
 *    // Mutation
 *    const { data, errors } = await client.mutations.processUserAction({
 *      userId: "123",
 *      action: "complete_profile",
 *      metadata: { source: "onboarding" }
 *    });
 *    ```
 */