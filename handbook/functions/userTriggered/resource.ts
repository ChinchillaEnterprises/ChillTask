import { defineFunction } from "@aws-amplify/backend";

// Educational Example: User-Triggered Function Configuration
// This shows how to configure Lambda functions for user-triggered actions

export const userTriggeredExample = defineFunction({
  // Function name - should be descriptive and unique
  name: "userTriggeredExample",
  
  // Entry point to the handler code
  entry: "./handler.ts",
  
  // Resource group for organization and permissions
  // "data" group gives access to DynamoDB tables and AppSync
  resourceGroupName: "data",
  
  // Environment variables passed to the function
  environment: {
    // Environment name (dev, staging, prod)
    ENV: process.env.ENV || "dev",
    
    // AWS region for services like Secrets Manager
    REGION: process.env.REGION || "us-east-1",
    
    // Custom environment variables for your use case
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
    EXTERNAL_API_URL: process.env.EXTERNAL_API_URL || "https://api.example.com"
  },
  
  // Function timeout in seconds (max 15 minutes for Lambda)
  // User-triggered functions should be fast - aim for under 30 seconds
  timeoutSeconds: 30,
  
  // Memory allocation affects performance and cost
  // More memory = faster CPU, but higher cost
  // 512MB is good for most user-triggered functions
  memoryMB: 512
});

// Export all functions for use in backend.ts
export const userTriggeredFunctions = {
  processUserFile,
  generateReport,
  exportUserData
};

// 📚 Configuration Best Practices for Background Processing:
//
// 1. NAMING: Use descriptive names that indicate the function's purpose
// 2. TIMEOUT: Keep user-triggered functions fast (< 30 seconds)
// 3. MEMORY: Start with 512MB, increase only if needed for performance
// 4. ENVIRONMENT: Use environment variables for configuration, not hardcoded values
// 5. RESOURCE GROUP: Use "data" group for database access, "auth" for Cognito triggers
// 6. ENTRY POINT: Keep handler files focused on a single responsibility

// 🔧 Advanced Configuration Options (uncomment as needed):
//
// // Custom IAM permissions for accessing other AWS services
// // permissions: {
// //   actions: ["secretsmanager:GetSecretValue"],
// //   resources: ["arn:aws:secretsmanager:*:*:secret:amplify-template/*"]
// // },
//
// // VPC configuration for accessing private resources
// // vpc: {
// //   subnetIds: ["subnet-12345", "subnet-67890"],
// //   securityGroupIds: ["sg-abcdef"]
// // },
//
// // Dead letter queue for failed invocations
// // deadLetterQueue: {
// //   targetArn: "arn:aws:sqs:region:account:dlq-name"
// // },
//
// // Layers for shared dependencies
// // layers: ["arn:aws:lambda:region:account:layer:my-layer:1"]