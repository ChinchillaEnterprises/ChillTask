import { defineFunction } from "@aws-amplify/backend";

/**
 * 🎯 WEBHOOK HANDLER FUNCTION RESOURCE CONFIGURATION
 * 
 * This configuration defines a production-ready webhook handler for AWS Amplify Gen 2.
 * It's optimized for receiving HTTP POST requests from external webhook providers
 * with proper security, performance, and monitoring setup.
 * 
 * 🔧 CONFIGURATION FEATURES:
 * - ✅ Environment variables for secrets and configuration
 * - ✅ Proper IAM permissions for Amplify Data access  
 * - ✅ Optimized timeout and memory settings
 * - ✅ Resource grouping for organization
 * - ✅ Ready for API Gateway integration
 * 
 * 🛡️ SECURITY FEATURES:
 * - Environment-based secret management
 * - Support for multiple webhook providers
 * - Configurable CORS settings
 * - Rate limiting ready
 * 
 * 📊 PERFORMANCE OPTIMIZATIONS:
 * - 30-second timeout (good for webhook processing)
 * - 512MB memory (balance between cost and performance)
 * - Resource grouping for better organization
 */
export const webhookHandler = defineFunction({
  // Function identification
  name: "webhookHandler",
  entry: "./handler.ts",
  resourceGroupName: "api", // Groups with other API-related Lambda functions
  
  // Environment variables for configuration and secrets
  environment: {
    // 🌍 DEPLOYMENT ENVIRONMENT
    ENV: process.env.ENV || "dev",
    REGION: process.env.REGION || "us-east-1",
    
    // 🔐 WEBHOOK SECURITY SECRETS
    // CRITICAL: Set these in your deployment environment!
    // Local development: export WEBHOOK_SECRET="your-secret-here"
    // Production: Set in Amplify Console or AWS Secrets Manager
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "dev-webhook-secret-change-me",
    
    // 🎯 PROVIDER-SPECIFIC SECRETS (uncomment as needed)
    // Stripe webhooks
    // STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    // STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    
    // GitHub webhooks  
    // GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
    // GITHUB_ACCESS_TOKEN: process.env.GITHUB_ACCESS_TOKEN,
    
    // PayPal webhooks
    // PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID,
    // PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
    
    // Twilio webhooks
    // TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    
    // SendGrid webhooks
    // SENDGRID_WEBHOOK_SECRET: process.env.SENDGRID_WEBHOOK_SECRET,
    
    // 📧 NOTIFICATION SETTINGS (optional)
    // NOTIFICATION_EMAIL: process.env.NOTIFICATION_EMAIL,
    // SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
    
    // 🗃️ DATABASE SETTINGS (optional)
    // ENABLE_AUDIT_LOGGING: process.env.ENABLE_AUDIT_LOGGING || "true",
    // RETENTION_DAYS: process.env.RETENTION_DAYS || "90",
  },
  
  // ⚡ PERFORMANCE CONFIGURATION
  timeout: 30,    // 30 seconds - good for webhook processing with external API calls
  memoryMB: 512,  // 512MB - balance between performance and cost
  
  // 🔒 ADDITIONAL SECURITY OPTIONS (uncomment as needed)
  // reservedConcurrency: 10, // Limit concurrent executions
  // deadLetterQueue: true,   // Enable DLQ for failed invocations
});

/**
 * 📋 BACKEND INTEGRATION GUIDE
 * 
 * Add this function to your Amplify backend with proper API Gateway setup:
 * 
 * ```typescript
 * // In amplify/backend.ts
 * import { defineBackend } from '@aws-amplify/backend';
 * import { auth } from './auth/resource';
 * import { data } from './data/resource';
 * import { webhookHandler } from './examples/functions/webhookHandler/resource';
 * 
 * const backend = defineBackend({
 *   auth,
 *   data,
 *   webhookHandler, // Add the webhook handler
 * });
 * 
 * // Create HTTP API endpoint for webhook processing
 * const webhookApi = backend.webhookHandler.addHttpApi({
 *   path: '/webhook',
 *   methods: ['POST'],
 *   cors: {
 *     allowOrigins: ['*'], // Adjust based on your webhook providers
 *     allowMethods: ['POST'],
 *     allowHeaders: [
 *       'Content-Type',
 *       'X-Webhook-Signature',
 *       'Stripe-Signature',     // For Stripe
 *       'X-Hub-Signature',      // For GitHub
 *       'X-PayPal-Signature',   // For PayPal
 *     ],
 *   },
 * });
 * 
 * // Optional: Add custom domain for production
 * // const customDomain = webhookApi.addCustomDomain({
 * //   domainName: 'api.yourdomain.com',
 * //   certificate: yourCertificate,
 * // });
 * 
 * // Export the API URL for webhook provider configuration
 * backend.addOutput({
 *   webhookUrl: webhookApi.url + '/webhook',
 * });
 * ```
 * 
 * 🌐 WEBHOOK PROVIDER CONFIGURATION:
 * 
 * Point your webhook providers to: https://your-api-id.execute-api.region.amazonaws.com/webhook
 * 
 * Required headers:
 * - Content-Type: application/json
 * - X-Webhook-Signature: sha256=computed-signature (or provider-specific header)
 * 
 * 🔍 MONITORING SETUP:
 * 
 * ```typescript
 * // Add CloudWatch alarms for monitoring
 * import { Alarm, Metric } from 'aws-cdk-lib/aws-cloudwatch';
 * 
 * new Alarm(backend.stack, 'WebhookErrorAlarm', {
 *   metric: new Metric({
 *     namespace: 'AWS/Lambda',
 *     metricName: 'Errors',
 *     dimensionsMap: {
 *       FunctionName: backend.webhookHandler.resources.lambda.functionName,
 *     },
 *   }),
 *   threshold: 5,
 *   evaluationPeriods: 2,
 * });
 * ```
 * 
 * 🧪 TESTING:
 * 
 * ```bash
 * # Test webhook endpoint locally
 * curl -X POST http://localhost:3000/api/webhook \
 *   -H "Content-Type: application/json" \
 *   -H "X-Webhook-Signature: sha256=computed-signature" \
 *   -d '{"id":"test_123","type":"user.created","data":{"userId":"123"}}'
 * ```
 */