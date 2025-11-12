/**
 * 🎯 EDUCATIONAL WEBHOOK HANDLER EXAMPLE
 * 
 * This comprehensive example demonstrates secure webhook processing patterns
 * for AWS Amplify Gen 2 applications. Perfect for learning webhook security,
 * event routing, and database integration.
 * 
 * 🔥 KEY CONCEPTS COVERED:
 * - Cryptographic signature verification (HMAC-SHA256)
 * - Timing-safe comparisons to prevent attacks
 * - Event type routing and processing patterns
 * - Amplify Data integration with proper IAM auth
 * - Error handling with appropriate HTTP status codes
 * - Structured logging for monitoring and debugging
 * 
 * 💡 REAL-WORLD USE CASES:
 * - Payment webhooks (Stripe, PayPal, Square)
 * - Communication events (Twilio SMS, SendGrid email)
 * - Repository events (GitHub push, GitLab merge)
 * - E-commerce updates (Shopify orders, inventory)
 * - User lifecycle events (registration, subscription changes)
 * - External API callbacks and notifications
 * 
 * 🛡️ SECURITY HIGHLIGHTS:
 * - ALWAYS verify webhook signatures before processing
 * - Use environment variables for secrets (never hardcode)
 * - Implement timing-safe comparisons to prevent timing attacks
 * - Validate all input data before database operations
 * - Return proper HTTP status codes for webhook provider retry logic
 */

import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';
import crypto from 'crypto';

// ==========================================
// 📊 TYPE DEFINITIONS
// ==========================================

/**
 * Standard webhook event structure
 * 
 * Most webhook providers follow this pattern. Adapt the `data` field
 * to match your specific service's payload structure.
 */
interface WebhookEvent {
  /** Unique identifier for this webhook event */
  id: string;
  
  /** Event type (e.g., 'user.created', 'payment.succeeded') */
  type: string;
  
  /** Event-specific data payload */
  data: {
    [key: string]: any;
  };
  
  /** When the event occurred (ISO 8601 format) */
  timestamp: string;
  
  /** Optional: API version from webhook provider */
  api_version?: string;
}

/**
 * Webhook processing result interface
 */
interface WebhookResult {
  received: boolean;
  eventId: string;
  processed: boolean;
  message?: string;
}

// ==========================================
// 🛠️ UTILITY FUNCTIONS
// ==========================================

/**
 * Simple structured logger for webhook processing
 * 
 * In production, consider using AWS X-Ray or CloudWatch Insights
 * for better tracing and monitoring capabilities.
 */
const createLogger = (functionName: string) => ({
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: new Date().toISOString(),
      functionName,
      message,
      ...meta
    }));
  },
  
  warn: (message: string, meta?: object) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      timestamp: new Date().toISOString(),
      functionName,
      message,
      ...meta
    }));
  },
  
  error: (message: string, error: Error, meta?: object) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      functionName,
      message,
      error: error.message,
      stack: error.stack,
      ...meta
    }));
  }
});

/**
 * HTTP error classes with proper status codes
 * 
 * These help webhook providers understand whether they should
 * retry the request or consider it permanently failed.
 */
class WebhookError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'WebhookError';
  }
}

const createError = {
  badRequest: (message: string) => new WebhookError(400, message),
  unauthorized: (message: string) => new WebhookError(401, message),
  serverError: (message: string) => new WebhookError(500, message)
};

// ==========================================
// 🔐 SECURITY FUNCTIONS
// ==========================================

/**
 * 🛡️ WEBHOOK SIGNATURE VERIFICATION
 * 
 * This is THE MOST CRITICAL security function for webhooks!
 * 
 * WHY VERIFY SIGNATURES?
 * - Prevents malicious actors from sending fake webhooks
 * - Ensures the request actually came from your webhook provider
 * - Protects against replay attacks and data tampering
 * 
 * HOW IT WORKS:
 * 1. Webhook provider signs the payload with a shared secret
 * 2. We compute the same signature using the same secret
 * 3. We compare signatures using timing-safe comparison
 * 4. Only process if signatures match exactly
 * 
 * PROVIDER-SPECIFIC EXAMPLES:
 * - Stripe: HMAC-SHA256, header 'stripe-signature', format 't=timestamp,v1=signature'
 * - GitHub: HMAC-SHA1, header 'x-hub-signature', format 'sha1=signature'
 * - PayPal: HMAC-SHA256, multiple headers for verification
 * - Generic: HMAC-SHA256 (implemented below)
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Step 1: Generate expected signature using HMAC-SHA256
    // This creates a cryptographic hash of the payload using our secret key
    const expectedSignature = crypto
      .createHmac('sha256', secret)  // Create HMAC with SHA256 algorithm
      .update(payload, 'utf8')       // Add the raw payload data
      .digest('hex');                // Get hexadecimal representation
    
    // Step 2: Clean the received signature
    // Remove common prefixes that webhook providers add
    const cleanSignature = signature.replace(/^(sha256=|v1=)/, '');
    
    // Step 3: Timing-safe comparison
    // CRITICAL: Normal string comparison (===) is vulnerable to timing attacks
    // Attackers can measure response time to guess the signature byte by byte
    // crypto.timingSafeEqual() takes constant time regardless of differences
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(cleanSignature, 'hex')
    );
  } catch (error) {
    // SECURITY: If anything goes wrong during verification, fail securely
    // Never process unverified webhooks, even if verification throws an error
    return false;
  }
}

/**
 * 🔍 PROVIDER-SPECIFIC VERIFICATION EXAMPLES
 * 
 * Copy these functions for specific webhook providers:
 */

/**
 * Stripe webhook signature verification
 * Stripe uses a more complex signature with timestamp validation
 */
function verifyStripeSignature(payload: string, signature: string, secret: string): boolean {
  try {
    // Stripe signature format: "t=1234567890,v1=signature_here"
    const elements = signature.split(',');
    const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1];
    const sig = elements.find(e => e.startsWith('v1='))?.split('=')[1];
    
    if (!timestamp || !sig) return false;
    
    // Create expected signature with timestamp (prevents replay attacks)
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');
    
    return crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(sig, 'hex'));
  } catch {
    return false;
  }
}

/**
 * GitHub webhook signature verification
 * GitHub uses SHA1 instead of SHA256
 */
function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSig = crypto
      .createHmac('sha1', secret)
      .update(payload)
      .digest('hex');
    
    const receivedSig = signature.replace('sha1=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSig, 'hex'),
      Buffer.from(receivedSig, 'hex')
    );
  } catch {
    return false;
  }
}

// ==========================================
// 📊 EVENT PROCESSING FUNCTIONS  
// ==========================================

/**
 * 👤 PROCESS USER LIFECYCLE EVENTS
 * 
 * Common pattern for handling user-related webhooks from external systems
 * like Auth0, Firebase Auth, custom user management systems, or CRM platforms.
 * 
 * TYPICAL EVENT SOURCES:
 * - Authentication providers (Auth0, Firebase, Okta)  
 * - CRM systems (Salesforce, HubSpot)
 * - E-commerce platforms (Shopify customer updates)
 * - Support systems (Zendesk, Intercom)
 * 
 * SECURITY NOTE: Always validate user data before database operations!
 */
async function processUserEvent(
  eventData: any,
  amplifyClient: ReturnType<typeof generateClient<Schema>>,
  logger: ReturnType<typeof createLogger>
) {
  // Step 1: Extract and validate user data
  const { userId, email, name, action, externalId } = eventData;
  
  // Input validation - critical for security!
  if (!userId || !action) {
    throw createError.badRequest('Missing required user event fields: userId, action');
  }
  
  logger.info('Processing user lifecycle event', { 
    userId, 
    email: email?.substring(0, 3) + '***', // Log partial email for privacy
    action,
    externalId
  });
  
  // Step 2: Route to specific handler based on action
  switch (action) {
    case 'created':
    case 'registered':
    case 'signed_up':
      // Handle new user registration from external system
      await amplifyClient.models.WebhookEvent.create({
        eventId: `user_${userId}_${Date.now()}`,
        eventType: 'user.created',
        sourceService: 'external-auth-provider', // Replace with actual provider
        data: JSON.stringify({
          userId,
          email,
          name,
          registrationDate: eventData.timestamp || new Date().toISOString(),
          source: eventData.source || 'webhook'
        }),
        processedAt: new Date().toISOString(),
        status: 'processed'
      });
      
      // TODO: Add business logic here:
      // - Send welcome email
      // - Create user profile in your system
      // - Set default permissions
      // - Trigger onboarding workflow
      
      logger.info('User creation event processed successfully', { userId });
      break;
      
    case 'updated':
    case 'profile_updated':
      // Handle user profile updates from external system
      await amplifyClient.models.WebhookEvent.create({
        eventId: `user_${userId}_${Date.now()}`,
        eventType: 'user.updated',
        sourceService: 'external-auth-provider',
        data: JSON.stringify({
          userId,
          updatedFields: eventData.changes || eventData.updated_fields,
          previousValues: eventData.previous || {},
          updateTimestamp: eventData.timestamp || new Date().toISOString()
        }),
        processedAt: new Date().toISOString(),
        status: 'processed'
      });
      
      // TODO: Add business logic here:
      // - Sync profile changes to your database
      // - Update search indexes
      // - Notify other systems of changes
      // - Log significant changes for audit
      
      logger.info('User profile update event processed', { userId });
      break;
      
    case 'deleted':
    case 'deactivated':
    case 'banned':
      // Handle user deletion/deactivation from external system
      await amplifyClient.models.WebhookEvent.create({
        eventId: `user_${userId}_${Date.now()}`,
        eventType: 'user.deleted',
        sourceService: 'external-auth-provider',
        data: JSON.stringify({
          userId,
          deletionReason: eventData.reason || 'user_requested',
          deletionDate: eventData.timestamp || new Date().toISOString(),
          dataRetentionPeriod: eventData.retention_days || 30
        }),
        processedAt: new Date().toISOString(),
        status: 'processed'
      });
      
      // TODO: Add business logic here:
      // - Anonymize user data (GDPR compliance)
      // - Cancel active subscriptions
      // - Clean up user-generated content
      // - Schedule data deletion after retention period
      // - Notify relevant teams
      
      logger.info('User deletion event processed', { userId });
      break;
      
    default:
      logger.warn('Unknown user action received', { action, userId });
      
      // Still log unknown events for investigation
      await amplifyClient.models.WebhookEvent.create({
        eventId: `user_${userId}_${Date.now()}`,
        eventType: `user.${action}`,
        sourceService: 'external-auth-provider',
        data: JSON.stringify(eventData),
        processedAt: new Date().toISOString(),
        status: 'unhandled' // Mark as unhandled for review
      });
  }
}

/**
 * 📊 PROCESS STATUS UPDATE EVENTS
 * 
 * Essential pattern for handling status webhooks from external systems.
 * These events are common for tracking state changes across various platforms.
 * 
 * TYPICAL EVENT SOURCES:
 * - Order fulfillment systems (status updates, tracking info)
 * - Processing services (document conversion, image processing)
 * - Background job systems (task completion, error notifications)
 * - External API integrations (sync status, data validation)
 * 
 * COMMON BUSINESS LOGIC:
 * - Success status: Update records, notify users, trigger next steps
 * - Failure status: Handle errors, retry logic, alert administrators
 * - Pending status: Update progress indicators, estimate completion
 * - Cancelled status: Clean up resources, refund processes
 */
async function processStatusEvent(
  eventData: any,
  amplifyClient: ReturnType<typeof generateClient<Schema>>,
  logger: ReturnType<typeof createLogger>
) {
  // Step 1: Extract and validate status data
  const { 
    recordId, 
    operationId, 
    userId, 
    amount, 
    currency, 
    status, 
    metadata,
    completedAt 
  } = eventData;
  
  // Input validation for status events
  if (!recordId && !operationId) {
    throw createError.badRequest('Missing required record identifiers');
  }
  
  if (!userId || !status) {
    throw createError.badRequest('Missing required status fields: userId, status');
  }
  
  logger.info('Processing status update event', { 
    recordId, 
    operationId, 
    userId,
    status,
    amount: amount ? `${amount} ${currency || 'units'}` : 'N/A'
  });
  
  // Step 2: Route based on status value
  switch (status) {
    case 'succeeded':
    case 'completed':
    case 'finished':
    case 'approved':
      // ✅ SUCCESSFUL OPERATION
      await amplifyClient.models.WebhookEvent.create({
        eventId: `status_${recordId || operationId}_${Date.now()}`,
        eventType: 'status.completed',
        sourceService: 'external-service', // e.g., 'document-processor', 'fulfillment-api'
        data: JSON.stringify({
          recordId,
          operationId,
          userId,
          amount,
          currency,
          metadata: metadata || {},
          processedAt: new Date().toISOString(),
          completedAt: completedAt || new Date().toISOString()
        }),
        processedAt: new Date().toISOString(),
        status: 'processed'
      });
      
      // TODO: Critical business logic for successful operations:
      // - Update record status to 'active' or 'completed'
      // - Send success notification to user
      // - Trigger next steps in workflow
      // - Update progress tracking
      // - Generate completion reports
      // - Update analytics and metrics
      
      logger.info('Success status event processed', { userId, recordId });
      break;
      
    case 'failed':
    case 'error':
    case 'rejected':
    case 'declined':
      // ❌ FAILED OPERATION
      await amplifyClient.models.WebhookEvent.create({
        eventId: `status_${recordId || operationId}_${Date.now()}`,
        eventType: 'status.failed',
        sourceService: 'external-service',
        data: JSON.stringify({
          recordId,
          operationId,
          userId,
          failureReason: eventData.error_message || eventData.failure_reason,
          errorCode: eventData.error_code,
          attemptNumber: eventData.attempt_count || 1,
          retryAfter: eventData.retry_after,
          amount,
          currency
        }),
        processedAt: new Date().toISOString(),
        status: 'processed'
      });
      
      // TODO: Critical business logic for failed operations:
      // - Implement retry logic with exponential backoff
      // - Send failure notification to user
      // - Update error logs and monitoring
      // - Schedule manual review if needed
      // - Escalate critical failures to administrators
      // - Update failure analytics for improvement
      
      logger.warn('Failure status event processed', { 
        userId, 
        reason: eventData.error_message || eventData.failure_reason 
      });
      break;
      
    case 'refunded':
    case 'reversed':
    case 'credited':
      // 💰 REVERSAL PROCESSED
      await amplifyClient.models.WebhookEvent.create({
        eventId: `reversal_${recordId}_${Date.now()}`,
        eventType: 'status.reversed',
        sourceService: 'external-service',
        data: JSON.stringify({
          originalRecordId: recordId,
          reversalId: eventData.reversal_id,
          userId,
          reversalAmount: eventData.reversal_amount || amount,
          reversalReason: eventData.reason || 'user_request',
          isPartialReversal: eventData.is_partial === true,
          reversedAt: eventData.reversed_at || new Date().toISOString()
        }),
        processedAt: new Date().toISOString(),
        status: 'processed'
      });
      
      // TODO: Business logic for reversals:
      // - Adjust user account based on reversal amount
      // - Update financial records
      // - Send reversal confirmation notification
      // - Handle partial vs full reversals appropriately
      // - Update accounting reconciliation
      // - Trigger customer service notifications
      
      logger.info('Reversal event processed', { userId, reversalAmount: eventData.reversal_amount });
      break;
      
    case 'canceled':
    case 'cancelled':
    case 'aborted':
      // 🚫 OPERATION CANCELED
      await amplifyClient.models.WebhookEvent.create({
        eventId: `cancel_${operationId}_${Date.now()}`,
        eventType: 'status.canceled',
        sourceService: 'external-service',
        data: JSON.stringify({
          operationId,
          userId,
          canceledAt: eventData.canceled_at || new Date().toISOString(),
          cancelReason: eventData.cancellation_reason || 'user_request',
          effectiveDate: eventData.effective_date,
          compensationAmount: eventData.compensation_amount
        }),
        processedAt: new Date().toISOString(),
        status: 'processed'
      });
      
      // TODO: Business logic for cancellations:
      // - Clean up allocated resources
      // - Send cancellation confirmation
      // - Process any compensation due
      // - Update workflow status
      // - Handle cleanup of dependent operations
      // - Update cancellation analytics
      
      logger.info('Cancellation processed', { userId, operationId });
      break;
      
    default:
      logger.warn('Unknown status received', { status, userId });
      
      // Log unknown status events for investigation
      await amplifyClient.models.WebhookEvent.create({
        eventId: `status_${recordId || operationId}_${Date.now()}`,
        eventType: `status.${status}`,
        sourceService: 'external-service',
        data: JSON.stringify(eventData),
        processedAt: new Date().toISOString(),
        status: 'unhandled'
      });
  }
}

// ==========================================
// 🚀 MAIN WEBHOOK HANDLER FUNCTION
// ==========================================

/**
 * 🎯 AWS LAMBDA WEBHOOK HANDLER
 * 
 * This is the main entry point for processing webhooks in AWS Amplify Gen 2.
 * It demonstrates a complete, production-ready webhook processing pipeline.
 * 
 * 📋 PROCESSING PIPELINE:
 * 1. 🛡️  Security: Verify webhook signature (CRITICAL!)
 * 2. 📝  Parsing: Extract and validate event data
 * 3. 🔍  Routing: Direct events to appropriate handlers
 * 4. 💾  Storage: Save events to database for audit trail
 * 5. ✅  Response: Return proper HTTP status codes
 * 
 * 🔧 RESPONSE CODES FOR WEBHOOK PROVIDERS:
 * - 200: Success - don't retry
 * - 400: Bad request (invalid signature/data) - don't retry
 * - 401: Unauthorized - don't retry  
 * - 500: Server error - retry with backoff
 * - 503: Service unavailable - retry immediately
 * 
 * 💡 COPY-PASTE FRIENDLY:
 * This handler is designed to be easily copied and adapted for your specific
 * webhook provider and business logic needs.
 */
export const handler = async (event: any): Promise<any> => {
  // Initialize logger for this function
  const logger = createLogger('webhookHandler');
  
  // Extract HTTP event data from API Gateway
  const body = event.body || '';
  const headers = event.headers || {};
  
  logger.info('🎯 Webhook request received', {
    method: event.httpMethod,
    path: event.path,
    hasSignature: !!(headers['x-webhook-signature'] || headers['X-Webhook-Signature']),
    bodyLength: body?.length || 0,
    userAgent: headers['user-agent'] || 'unknown'
  });

  try {
    // ==========================================
    // STEP 1: 🔐 VERIFY WEBHOOK SIGNATURE
    // ==========================================
    
    // Look for signature in common header locations
    const signature = headers['x-webhook-signature'] || 
                     headers['X-Webhook-Signature'] ||
                     headers['stripe-signature'] ||  // Stripe uses this
                     headers['x-hub-signature'];     // GitHub uses this
    
    if (!signature) {
      logger.error('❌ Missing webhook signature header');
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing webhook signature',
          message: 'Webhook signature is required for security verification'
        })
      };
    }

    // Get webhook secret from environment variables
    // 🚨 PRODUCTION TIP: Use AWS Secrets Manager for better security
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('❌ Webhook secret not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Configuration error',
          message: 'Webhook secret not configured'
        })
      };
    }

    // Perform cryptographic signature verification
    if (!verifyWebhookSignature(body, signature, webhookSecret)) {
      logger.error('❌ Invalid webhook signature - possible security threat!', {
        signatureProvided: signature.substring(0, 20) + '...',
        bodyHash: crypto.createHash('sha256').update(body).digest('hex').substring(0, 10)
      });
      
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: 'Invalid signature',
          message: 'Webhook signature verification failed'
        })
      };
    }

    logger.info('✅ Webhook signature verified successfully');

    // ==========================================
    // STEP 2: 📝 PARSE AND VALIDATE EVENT DATA
    // ==========================================
    
    let webhookEvent: WebhookEvent;
    try {
      webhookEvent = JSON.parse(body);
      
      // Validate required fields
      if (!webhookEvent.id || !webhookEvent.type || !webhookEvent.data) {
        throw new Error('Missing required fields: id, type, or data');
      }
      
    } catch (parseError) {
      logger.error('❌ Failed to parse webhook payload', parseError as Error, {
        bodyPreview: body.substring(0, 200)
      });
      
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid payload',
          message: 'Webhook payload must be valid JSON with id, type, and data fields'
        })
      };
    }

    logger.info('📊 Processing webhook event', {
      eventId: webhookEvent.id,
      eventType: webhookEvent.type,
      timestamp: webhookEvent.timestamp,
      apiVersion: webhookEvent.api_version
    });

    // ==========================================
    // STEP 3: 🔗 INITIALIZE AMPLIFY DATA CLIENT
    // ==========================================
    
    const env = process.env as any;
    const { resourceConfig } = await getAmplifyDataClientConfig(env);
    const amplifyClient = generateClient<Schema>({
      authMode: 'iam', // Use IAM role for Lambda function
      ...resourceConfig,
    });

    logger.info('🔗 Amplify Data client initialized');

    // ==========================================
    // STEP 4: 🎯 ROUTE EVENT TO HANDLER
    // ==========================================
    
    switch (webhookEvent.type) {
      // 👤 USER LIFECYCLE EVENTS
      case 'user.created':
      case 'user.registered':
      case 'user.updated':
      case 'user.profile_updated':
      case 'user.deleted':
      case 'user.deactivated':
        logger.info('📤 Routing to user event handler');
        await processUserEvent(webhookEvent.data, amplifyClient, logger);
        break;

      // 📊 STATUS UPDATE EVENTS
      case 'status.completed':
      case 'status.succeeded':
      case 'status.failed':
      case 'status.declined':
      case 'status.reversed':
      case 'status.canceled':
      case 'status.cancelled':
      case 'operation.finished':
      case 'operation.approved':
      case 'operation.rejected':
        logger.info('📤 Routing to status event handler');
        await processStatusEvent(webhookEvent.data, amplifyClient, logger);
        break;

      // 🔔 COMMUNICATION EVENTS (examples for extension)
      case 'email.delivered':
      case 'email.bounced':
      case 'sms.delivered':
      case 'sms.failed':
        logger.info('📤 Routing to communication event handler');
        // Store communication events for tracking
        await amplifyClient.models.WebhookEvent.create({
          eventId: webhookEvent.id,
          eventType: webhookEvent.type,
          sourceService: 'communication-provider',
          data: JSON.stringify(webhookEvent.data),
          processedAt: new Date().toISOString(),
          status: 'processed'
        });
        
        // TODO: Add specific communication event logic here
        // - Update delivery status in your system
        // - Handle bounced emails (remove from list)
        // - Track SMS delivery rates
        // - Trigger alternative communication methods on failure
        break;

      // 🛒 E-COMMERCE EVENTS (examples for extension)
      case 'order.created':
      case 'order.fulfilled':
      case 'order.canceled':
      case 'inventory.low':
      case 'product.updated':
        logger.info('📤 Routing to e-commerce event handler');
        // Store e-commerce events
        await amplifyClient.models.WebhookEvent.create({
          eventId: webhookEvent.id,
          eventType: webhookEvent.type,
          sourceService: 'ecommerce-platform',
          data: JSON.stringify(webhookEvent.data),
          processedAt: new Date().toISOString(),
          status: 'processed'
        });
        
        // TODO: Add specific e-commerce logic here
        // - Update inventory levels
        // - Trigger fulfillment processes  
        // - Send order confirmation emails
        // - Update customer order history
        break;

      // ❓ UNHANDLED EVENT TYPES
      default:
        logger.warn('⚠️  Unhandled webhook event type received', { 
          eventType: webhookEvent.type,
          eventId: webhookEvent.id,
          dataKeys: Object.keys(webhookEvent.data || {})
        });
        
        // Still save unhandled events for investigation and future processing
        await amplifyClient.models.WebhookEvent.create({
          eventId: webhookEvent.id,
          eventType: webhookEvent.type,
          sourceService: 'unknown-provider',
          data: JSON.stringify(webhookEvent.data),
          processedAt: new Date().toISOString(),
          status: 'unhandled' // Mark for manual review
        });
        
        logger.info('📝 Unhandled event saved for review');
    }

    // ==========================================
    // STEP 5: ✅ RETURN SUCCESS RESPONSE
    // ==========================================
    
    const response: WebhookResult = { 
      received: true,
      eventId: webhookEvent.id,
      processed: true,
      message: `Successfully processed ${webhookEvent.type} event`
    };

    logger.info('🎉 Webhook processed successfully', { 
      eventId: webhookEvent.id,
      eventType: webhookEvent.type,
      processingTimeMs: Date.now() - (event.requestTimeEpoch || Date.now())
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Processed-By': 'amplify-webhook-handler',
        'X-Event-Id': webhookEvent.id
      },
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    // ==========================================
    // 🚨 ERROR HANDLING AND LOGGING
    // ==========================================
    
    logger.error('💥 Webhook processing failed', error, {
      errorType: error.name,
      statusCode: error.statusCode,
      stack: error.stack?.split('\n').slice(0, 3) // Limit stack trace in logs
    });
    
    // Return appropriate HTTP status codes for webhook providers
    if (error instanceof WebhookError) {
      return {
        statusCode: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.name,
          message: error.message,
          timestamp: new Date().toISOString()
        })
      };
    }
    
    // For unexpected errors, return 500 so the provider will retry
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Webhook processing encountered an unexpected error',
        timestamp: new Date().toISOString(),
        retryable: true
      })
    };
  }
};