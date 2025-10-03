import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

// Type-safe handler for custom GraphQL operation
// This is automatically inferred from the schema definition
type Handler = Schema['getUserStats']['functionHandler'];

/**
 * Educational Example: Custom GraphQL Resolver Handler
 * 
 * ⚠️ IMPORTANT: This example uses the Post model and getUserStats operation
 * which are NOT in the default schema. To use this example:
 * 
 * 1. Copy the models and getUserStats operation from:
 *    amplify/examples/data/simple-custom-operations.ts
 * 2. Add them to your amplify/data/resource.ts
 * 3. Move this function to amplify/functions/getUserStats/
 * 4. Add the function to your amplify/backend.ts
 * 
 * This demonstrates how to create custom GraphQL operations that:
 * - Accept typed input arguments from GraphQL queries/mutations
 * - Access other data models using the Amplify client with full type safety
 * - Return properly typed responses that match your schema definition
 * - Handle authorization and errors in a production-ready way
 * 
 * Essential Amplify Gen 2 Patterns Demonstrated:
 * 1. Type safety with Schema['operationName']['functionHandler'] pattern
 * 2. IAM auth mode for system-level data access (bypasses user permissions)
 * 3. Proper error handling with user-friendly messages and detailed logging
 * 4. Data aggregation from multiple models within a single operation
 * 5. Optional parameters handling and conditional logic
 * 6. Business logic implementation within GraphQL resolvers
 */
export const handler: Handler = async (event) => {
  console.log("=== Custom GraphQL Resolver: getUserStats ===");
  console.log("Event arguments:", JSON.stringify(event.arguments, null, 2));

  try {
    // Extract typed arguments from the GraphQL event
    // TypeScript will enforce these match your schema definition
    const { userId, includeActivity = false } = event.arguments;

    // Initialize Amplify data client with IAM authentication
    // IAM auth allows the function to access data models as the system,
    // bypassing user-level permissions for administrative operations
    const env = process.env as any;
    const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

    const client = generateClient<Schema>({
      authMode: 'iam', // System-level access - essential for aggregation queries
      ...resourceConfig,
    });

    // Example: Query user's posts to calculate statistics
    // This demonstrates filtering data by a specific user ID
    const { data: posts } = await client.models.Post.list({
      filter: { authorId: { eq: userId } }
    });

    console.log(`Found ${posts.length} posts for user ${userId}`);

    // Example: Conditional data processing based on optional parameters
    // This shows how to handle optional arguments and perform additional queries
    let recentActivity = null;
    if (includeActivity && posts.length > 0) {
      // Sort posts by creation date and get the 5 most recent
      // This demonstrates client-side data processing within resolvers
      const sortedPosts = posts
        .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
        .slice(0, 5);

      recentActivity = {
        totalPosts: sortedPosts.length,
        latestPost: sortedPosts[0]?.title || null,
        lastActiveDate: sortedPosts[0]?.createdAt || null,
      };
    }

    // Example: Business logic implementation within a resolver
    // This demonstrates how to calculate derived values from your data
    const calculateUserLevel = (postCount: number): string => {
      if (postCount >= 50) return 'expert';
      if (postCount >= 20) return 'advanced';
      if (postCount >= 5) return 'intermediate';
      return 'beginner';
    };

    // Return typed response matching the schema definition
    // TypeScript will enforce this matches your UserStats custom type
    return {
      userId,
      totalPosts: posts.length,
      level: calculateUserLevel(posts.length),
      lastActive: posts[0]?.createdAt || null,
      joinedDate: new Date().toISOString(), // In production, fetch from Profile table
      activity: recentActivity,
    };

  } catch (error: any) {
    console.error("Error in getUserStats resolver:", error);
    
    // Re-throw with a user-friendly message
    // In production, you might want to:
    // 1. Log to CloudWatch with context
    // 2. Send alerts for critical errors
    // 3. Return different error types based on the failure
    // 4. Sanitize error messages to avoid exposing sensitive data
    throw new Error(`Failed to get user statistics: ${error.message}`);
  }
};