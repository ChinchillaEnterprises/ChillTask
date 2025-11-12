import { defineFunction } from '@aws-amplify/backend';

/**
 * Educational Example: GraphQL Resolver Function Configuration
 * 
 * This defines the Lambda function that handles custom GraphQL operations.
 * Essential Amplify Gen 2 configuration patterns:
 * 
 * - name: Must exactly match the function name used in data/resource.ts
 * - entry: Points to the handler file (relative to this resource file)
 * - resourceGroupName: Associates with data resources for IAM permissions
 * - timeoutSeconds: Set appropriate timeout for your data operations
 * - environment: Pass environment variables your function needs
 * 
 * This configuration enables your Lambda function to access Amplify data
 * models with proper permissions and type safety.
 */
export const getUserStats = defineFunction({
  name: "getUserStats", // Must match the operation name in your schema
  entry: "./handler.ts", // Path to your handler file
  resourceGroupName: "data", // Links to data resources for IAM permissions
  environment: {
    // Environment variables available to your function at runtime
    // Add any configuration your function needs
    REGION: process.env.REGION || "us-east-1",
  },
  timeoutSeconds: 15, // Timeout for data operations (max 15 minutes for Lambda)
});