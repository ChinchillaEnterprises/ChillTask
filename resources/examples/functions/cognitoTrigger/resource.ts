import { defineFunction } from '@aws-amplify/backend';

/**
 * Educational Example: Comprehensive Cognito Trigger Function Configuration
 * 
 * This demonstrates how to configure a Lambda function to handle multiple Cognito triggers.
 * 
 * COGNITO TRIGGER TYPES THIS FUNCTION CAN HANDLE:
 * - PreSignUp: Before user registration (validation, auto-confirm)
 * - PostConfirmation: After email/phone confirmation (welcome flows)
 * - PreAuthentication: Before login (custom validation)
 * - PostAuthentication: After login (analytics, tracking)
 * - TokenGeneration: Before JWT creation (custom claims)
 * 
 * CONFIGURATION PATTERNS:
 * 
 * 1. Function Definition:
 *    - name: Unique identifier (will be used in AWS Lambda)
 *    - entry: Path to handler file (./handler.ts)
 *    - resourceGroupName: Groups with related resources ('auth')
 * 
 * 2. Performance Settings:
 *    - timeoutSeconds: Max 30 seconds (Cognito hard limit)
 *    - memoryMB: Start with 512MB, adjust based on needs
 *    - Cognito triggers must be fast and reliable
 * 
 * 3. Environment Configuration:
 *    - Feature flags for different behaviors
 *    - External service URLs and settings
 *    - Never put secrets here (use AWS Secrets Manager)
 * 
 * 4. IAM Permissions (Auto-granted):
 *    - CloudWatch Logs write access
 *    - AppSync GraphQL API access (for database operations)
 *    - Additional permissions via backend configuration
 */

export const cognitoTriggerExample = defineFunction({
  // Unique name for this function (will appear in AWS Lambda console)
  name: 'cognitoTriggerExample',
  
  // Path to the handler file (relative to this resource.ts)
  entry: './handler.ts',
  
  // Group with auth-related resources for organization in CloudFormation
  resourceGroupName: 'auth',
  
  // Performance Configuration
  // Cognito triggers have a hard maximum timeout of 30 seconds
  timeoutSeconds: 30,
  
  // Memory allocation affects CPU and cost
  // 512MB is good for most triggers, increase for heavy operations
  memoryMB: 512,
  
  // Environment variables for configuration (available as process.env)
  environment: {
    // Deployment environment identifier
    ENV: process.env.ENV || 'dev',
    
    // AWS region for consistency across services
    REGION: process.env.AWS_REGION || 'us-east-1',
    
    // =================================================================
    // FEATURE FLAGS - Control trigger behavior without code changes
    // =================================================================
    
    // User onboarding features
    ENABLE_WELCOME_EMAIL: 'true',
    ENABLE_PROFILE_CREATION: 'true',
    ENABLE_USER_PREFERENCES_INIT: 'true',
    
    // Authentication features
    ENABLE_LOGIN_TRACKING: 'true',
    ENABLE_ACTIVITY_LOGGING: 'true',
    
    // Validation features
    ENABLE_INVITE_CODE_VALIDATION: 'false',
    ENABLE_DOMAIN_RESTRICTION: 'false',
    ENABLE_BUSINESS_HOURS_CHECK: 'false',
    
    // Token customization
    ENABLE_CUSTOM_CLAIMS: 'true',
    ENABLE_ROLE_CLAIMS: 'true',
    ENABLE_PERMISSION_CLAIMS: 'true',
    
    // =================================================================
    // EXTERNAL SERVICE CONFIGURATION
    // =================================================================
    
    // Application URLs for emails and redirects
    APP_URL: process.env.APP_URL || 'https://localhost:3000',
    ONBOARDING_URL: process.env.ONBOARDING_URL || '/onboarding',
    
    // Support and contact information
    SUPPORT_EMAIL: 'support@yourapp.com',
    COMPANY_NAME: 'Your Company Name',
    
    // Business logic configuration
    ALLOWED_EMAIL_DOMAINS: 'company.com,partner.com,client.com',
    DEFAULT_USER_ROLE: 'user',
    BUSINESS_HOURS_START: '9',
    BUSINESS_HOURS_END: '17',
    
    // =================================================================
    // DEVELOPMENT AND DEBUGGING
    // =================================================================
    
    // Logging levels and debugging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    ENABLE_DEBUG_LOGGING: process.env.NODE_ENV === 'development' ? 'true' : 'false',
    
    // Performance monitoring
    ENABLE_PERFORMANCE_METRICS: 'true',
    SLOW_OPERATION_THRESHOLD_MS: '1000',
  },
});

// =============================================================================
// EDUCATIONAL CONFIGURATION GUIDE
// =============================================================================

/**
 * CONNECTING TO COGNITO USER POOL:
 * 
 * This function needs to be connected to your Cognito User Pool triggers.
 * In your amplify/auth/resource.ts file:
 * 
 * ```typescript
 * import { cognitoTriggerExample } from '../examples/functions/cognitoTrigger/resource';
 * 
 * export const auth = defineAuth({
 *   loginWith: {
 *     email: true,
 *   },
 *   triggers: {
 *     // Choose which triggers to enable based on your needs:
 *     
 *     preSignUp: cognitoTriggerExample,           // Before registration
 *     postConfirmation: cognitoTriggerExample,    // After email confirmation
 *     preAuthentication: cognitoTriggerExample,   // Before login
 *     postAuthentication: cognitoTriggerExample,  // After login
 *     preTokenGeneration: cognitoTriggerExample,  // Before JWT creation
 *   },
 * });
 * ```
 * 
 * AUTOMATIC IAM PERMISSIONS:
 * 
 * When you connect this function to Cognito, it automatically gets:
 * - CloudWatch Logs write access (for console.log)
 * - Cognito trigger execution permissions
 * - Basic Lambda execution role
 * 
 * ADDITIONAL PERMISSIONS (configure in amplify/backend.ts):
 * 
 * ```typescript
 * import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
 * 
 * // Grant AppSync access for database operations
 * backend.cognitoTriggerExample.addToRolePolicy(
 *   new PolicyStatement({
 *     effect: Effect.ALLOW,
 *     actions: ['appsync:GraphQL'],
 *     resources: [backend.data.resources.graphqlApi.arn + '/*'],
 *   })
 * );
 * 
 * // Grant SES access for email sending
 * backend.cognitoTriggerExample.addToRolePolicy(
 *   new PolicyStatement({
 *     effect: Effect.ALLOW,
 *     actions: ['ses:SendEmail', 'ses:SendRawEmail'],
 *     resources: ['*'],
 *   })
 * );
 * 
 * // Grant Secrets Manager access for API keys
 * backend.cognitoTriggerExample.addToRolePolicy(
 *   new PolicyStatement({
 *     effect: Effect.ALLOW,
 *     actions: ['secretsmanager:GetSecretValue'],
 *     resources: ['arn:aws:secretsmanager:*:*:secret:myapp/*'],
 *   })
 * );
 * ```
 * 
 * PERFORMANCE OPTIMIZATION:
 * 
 * Memory Configuration:
 * - 128MB: Minimal triggers (logging only)
 * - 256MB: Basic database operations
 * - 512MB: Standard triggers with external API calls
 * - 1024MB: Heavy operations (image processing, large data)
 * - 1769MB: CPU-intensive tasks
 * 
 * Timeout Considerations:
 * - Cognito enforces 30-second hard limit
 * - Target < 5 seconds for good user experience
 * - Use async operations for external API calls
 * - Consider Lambda provisioned concurrency for consistent performance
 * 
 * ENVIRONMENT VARIABLE BEST PRACTICES:
 * 
 * ✅ DO:
 * - Use for feature flags and configuration
 * - Keep environment-specific settings here
 * - Use for non-sensitive URLs and identifiers
 * - Document expected values in comments
 * 
 * ❌ DON'T:
 * - Store passwords, API keys, or secrets
 * - Hardcode sensitive business logic
 * - Use for large configuration objects
 * 
 * Use AWS Secrets Manager for sensitive data:
 * ```typescript
 * import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
 * 
 * const client = new SecretsManagerClient({ region: process.env.REGION });
 * const secret = await client.send(new GetSecretValueCommand({
 *   SecretId: 'myapp/email-service-api-key'
 * }));
 * ```
 * 
 * MONITORING AND DEBUGGING:
 * 
 * CloudWatch Logs:
 * - All console.log statements appear in CloudWatch
 * - Use structured logging for better searchability
 * - Log function duration and performance metrics
 * 
 * CloudWatch Metrics:
 * - Duration, Errors, Invocations (automatic)
 * - Custom metrics for business logic
 * - Set up alarms for error rates and timeouts
 * 
 * AWS X-Ray Tracing:
 * - Enable for detailed performance analysis
 * - Track external API call latency
 * - Identify bottlenecks in your code
 * 
 * COMMON PITFALLS TO AVOID:
 * 
 * 1. Blocking User Flows:
 *    - Don't throw errors unless absolutely necessary
 *    - Handle failures gracefully (log and continue)
 *    - User registration should succeed even if profile creation fails
 * 
 * 2. Performance Issues:
 *    - Avoid synchronous external API calls
 *    - Optimize database queries
 *    - Don't process large amounts of data
 * 
 * 3. Error Handling:
 *    - Always return the event object
 *    - Log errors with context (user ID, trigger source)
 *    - Use try/catch blocks around external operations
 * 
 * 4. Security:
 *    - Validate input data from Cognito events
 *    - Don't trust user attributes without validation
 *    - Use least privilege IAM permissions
 * 
 * TESTING AND DEVELOPMENT:
 * 
 * Local Testing:
 * - Use AWS SAM CLI for local testing
 * - Create test events with sample Cognito data
 * - Test different trigger sources and scenarios
 * 
 * Integration Testing:
 * - Test actual user signup and login flows
 * - Verify database records are created correctly
 * - Test email delivery and external integrations
 * 
 * Production Monitoring:
 * - Set up CloudWatch dashboards
 * - Monitor error rates and timeout occurrences
 * - Track business metrics (signup success rates)
 * 
 * This configuration provides a robust foundation for Cognito triggers
 * that can scale from simple user onboarding to complex business workflows.
 */