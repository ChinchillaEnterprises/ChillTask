# 🎯 Educational Webhook Handler Example

A comprehensive, production-ready webhook handler that teaches webhook security, processing patterns, and AWS Amplify Gen 2 integration. Perfect for learning how to securely handle external service callbacks in serverless applications.

## 🎓 What You'll Learn

This example demonstrates essential webhook concepts through real, copy-paste friendly code:

### 🔐 Security Mastery
- **Signature Verification**: Learn HMAC-SHA256 cryptographic verification
- **Timing-Safe Comparisons**: Prevent timing attacks with proper comparison methods
- **Provider-Specific Patterns**: Examples for Stripe, GitHub, PayPal, and generic webhooks
- **Secret Management**: Environment variables vs AWS Secrets Manager approaches

### 📊 Event Processing Patterns
- **User Lifecycle Events**: Registration, updates, deletion handling
- **Payment & Billing Events**: Success, failure, refund, cancellation flows
- **Communication Events**: Email delivery, SMS status, bounce handling
- **E-commerce Events**: Orders, inventory, fulfillment patterns

### 🏗️ AWS Integration
- **Amplify Data Integration**: Type-safe database operations with GraphQL
- **Lambda Best Practices**: Error handling, logging, performance optimization
- **API Gateway Setup**: HTTP endpoints, CORS, custom domains
- **CloudWatch Monitoring**: Structured logging and alerting patterns

## 🚀 Key Features

- ✅ **Cryptographic Security**: HMAC signature verification with timing-safe comparisons
- ✅ **Multi-Provider Support**: Examples for 8+ popular webhook providers
- ✅ **Educational Comments**: Detailed explanations of every security concept
- ✅ **Copy-Paste Ready**: Real production patterns you can use immediately
- ✅ **Type Safety**: Full TypeScript with proper error handling
- ✅ **Audit Trail**: Complete webhook event logging for compliance
- ✅ **Error Recovery**: Proper HTTP status codes for webhook provider retry logic

## Security Best Practices

### 1. Always Verify Signatures

```typescript
// ✅ Good: Verify every webhook
if (!verifyWebhookSignature(body, signature, secret)) {
  throw errorHandler.badRequest('Invalid signature');
}

// ❌ Bad: Processing unverified webhooks
const event = JSON.parse(body); // Dangerous!
```

### 2. Use Timing-Safe Comparisons

```typescript
// ✅ Good: Prevents timing attacks
return crypto.timingSafeEqual(
  Buffer.from(expected, 'hex'),
  Buffer.from(received, 'hex')
);

// ❌ Bad: Vulnerable to timing attacks
return expected === received;
```

### 3. Store Secrets Securely

```typescript
// ✅ Good: Environment variables or Secrets Manager
const secret = process.env.WEBHOOK_SECRET;

// ❌ Bad: Hardcoded secrets
const secret = "sk_live_abc123"; // Never do this!
```

### 4. Validate Input Data

```typescript
// ✅ Good: Validate before processing
if (!webhookEvent.id || !webhookEvent.type) {
  throw errorHandler.badRequest('Invalid event structure');
}

// ❌ Bad: Trusting webhook data blindly
await processEvent(webhookEvent); // Could be malformed
```

## Webhook Provider Examples

### Stripe Integration

```typescript
// Stripe uses HMAC-SHA256 with 'stripe-signature' header
const signature = headers['stripe-signature'];
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe provides their own verification method
const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
```

### GitHub Integration

```typescript
// GitHub uses HMAC-SHA1 with 'x-hub-signature' header
function verifyGitHubSignature(payload: string, signature: string, secret: string) {
  const expectedSignature = crypto
    .createHmac('sha1', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  const receivedSignature = signature.replace('sha1=', '');
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}
```

### Generic HMAC-SHA256

```typescript
// Most services use HMAC-SHA256
function verifySignature(payload: string, signature: string, secret: string) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature.replace('sha256=', ''), 'hex')
  );
}
```

## Database Schema

Add this to your `amplify/data/resource.ts`:

```typescript
const schema = a.schema({
  WebhookEvent: a
    .model({
      eventId: a.string().required(),
      eventType: a.string().required(),
      sourceService: a.string().required(),
      data: a.string().required(), // JSON string of event data
      processedAt: a.string().required(),
      status: a.enum(['processed', 'failed', 'unhandled']),
    })
    .authorization((allow) => [allow.resource(webhookHandler)]),
});
```

## Setup Instructions

### 1. Add to Backend

In `amplify/backend.ts`:

```typescript
import { webhookHandler } from './examples/functions/webhookHandler/resource';

const backend = defineBackend({
  auth,
  data,
  webhookHandler,
});

// Create HTTP API endpoint
const webhookApi = backend.webhookHandler.addHttpApi({
  path: '/webhook',
  methods: ['POST'],
});
```

### 2. Set Environment Variables

```bash
# Local development
export WEBHOOK_SECRET="your-secure-secret-here"

# Production (set in Amplify Console)
WEBHOOK_SECRET=your-production-secret
```

### 3. Configure External Service

Point your webhook provider to:
```
https://your-api-id.execute-api.region.amazonaws.com/webhook
```

Include required headers:
- `Content-Type: application/json`
- `X-Webhook-Signature: sha256=computed-signature`

## Testing

### Local Testing

```bash
# Test webhook endpoint
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=computed-signature" \
  -d '{"id":"test_123","type":"user.created","data":{"userId":"123"}}'
```

### Generate Test Signature

```javascript
const crypto = require('crypto');
const payload = '{"id":"test_123","type":"user.created","data":{"userId":"123"}}';
const secret = 'your-webhook-secret';
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
console.log('X-Webhook-Signature: sha256=' + signature);
```

## Monitoring

### CloudWatch Metrics

The function automatically sends metrics for:
- `Success` - Successful webhook processing
- `Failure` - Failed webhook processing  
- `Duration` - Processing time in milliseconds

### Log Analysis

Search CloudWatch logs for:
```json
{
  "level": "ERROR",
  "functionName": "webhookHandler",
  "message": "Webhook processing failed"
}
```

### Common Issues

1. **Invalid Signature**: Check webhook secret configuration
2. **Parsing Errors**: Validate JSON payload structure
3. **Database Errors**: Verify IAM permissions for DynamoDB
4. **Timeout**: Increase function timeout for complex processing

## Advanced Patterns

### Rate Limiting

```typescript
// Add rate limiting for webhook endpoints
const rateLimiter = new Map();

function checkRateLimit(sourceIP: string): boolean {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  if (!rateLimiter.has(sourceIP)) {
    rateLimiter.set(sourceIP, []);
  }
  
  const requests = rateLimiter.get(sourceIP);
  const recentRequests = requests.filter(time => time > windowStart);
  
  if (recentRequests.length >= 100) { // 100 requests per minute
    return false;
  }
  
  recentRequests.push(now);
  rateLimiter.set(sourceIP, recentRequests);
  return true;
}
```

### Retry Logic

```typescript
// Handle webhook processing with retries
async function processWithRetry(event: WebhookEvent, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await processEvent(event);
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### Webhook Replay

```typescript
// Store failed webhooks for manual retry
async function handleFailedWebhook(event: WebhookEvent, error: Error) {
  await amplifyClient.models.FailedWebhook.create({
    eventId: event.id,
    eventType: event.type,
    data: JSON.stringify(event),
    error: error.message,
    createdAt: new Date().toISOString(),
    status: 'pending_retry'
  });
}
```

## 🌐 Real-World Provider Examples

### Stripe Payment Webhooks
```typescript
// Stripe-specific signature verification (included in handler)
const stripeSignature = headers['stripe-signature'];
const isValid = verifyStripeSignature(body, stripeSignature, stripeSecret);

// Common Stripe events:
// - payment_intent.succeeded
// - payment_intent.payment_failed  
// - customer.subscription.created
// - customer.subscription.deleted
```

### GitHub Repository Webhooks
```typescript
// GitHub-specific signature verification (included in handler)
const githubSignature = headers['x-hub-signature'];
const isValid = verifyGitHubSignature(body, githubSignature, githubSecret);

// Common GitHub events:
// - push (code commits)
// - pull_request (PR created/updated)
// - issues (issue created/closed)
// - release (new release published)
```

### E-commerce Platform Webhooks
```typescript
// Shopify, WooCommerce, etc.
// Common events:
// - orders/create
// - orders/paid
// - orders/cancelled
// - customers/create
// - app/uninstalled
```

## 🧪 Testing Your Webhook Handler

### Local Development Testing
```bash
# 1. Start your Amplify sandbox
npx ampx sandbox

# 2. Test with curl (replace signature with actual computed value)
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=your-computed-signature" \
  -d '{
    "id": "test_event_123",
    "type": "user.created",
    "timestamp": "2024-01-01T00:00:00Z",
    "data": {
      "userId": "user_123",
      "email": "test@example.com",
      "action": "created"
    }
  }'
```

### Generate Test Signatures
```javascript
// Node.js script to generate valid test signatures
const crypto = require('crypto');

const payload = JSON.stringify({
  id: 'test_event_123',
  type: 'user.created',
  timestamp: new Date().toISOString(),
  data: { userId: 'user_123', email: 'test@example.com', action: 'created' }
});

const secret = 'your-webhook-secret';
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
console.log('X-Webhook-Signature: sha256=' + signature);
```

### Using Webhook Testing Tools
- **Ngrok**: Expose local server for webhook testing
- **Webhook.site**: Capture and inspect webhooks
- **Postman**: Test webhook endpoints with proper signatures
- **Insomnia**: API testing with signature generation

## 📊 Monitoring and Debugging

### CloudWatch Logs Analysis
```bash
# Search for webhook processing errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/webhookHandler \
  --filter-pattern "ERROR"

# Search for specific event types
aws logs filter-log-events \
  --log-group-name /aws/lambda/webhookHandler \
  --filter-pattern "payment.failed"
```

### Key Metrics to Monitor
- **Success Rate**: Percentage of webhooks processed successfully
- **Response Time**: Average processing duration
- **Error Rate**: Failed webhook processing attempts
- **Signature Failures**: Potential security issues

## 🔗 Related Examples

- [GraphQL Resolver Function](../graphqlResolver/README.md) - Custom business logic
- [Cognito Trigger Function](../cognitoTrigger/README.md) - User lifecycle hooks  
- [Scheduled Function](../scheduledFunction/README.md) - Automated tasks
- [User Triggered Function](../userTriggered/README.md) - Direct user actions

## ✅ Security Checklist

Use this checklist to ensure your webhook implementation is production-ready:

### Basic Security
- [ ] Webhook signature verification implemented and tested
- [ ] Secrets stored in environment variables (dev) or AWS Secrets Manager (prod)
- [ ] Input validation for all webhook data fields
- [ ] Proper error handling with appropriate HTTP status codes
- [ ] Structured logging for security monitoring

### Advanced Security  
- [ ] Rate limiting configured (API Gateway or Lambda level)
- [ ] HTTPS-only endpoints in production
- [ ] Least-privilege IAM permissions for Lambda function
- [ ] Webhook event audit trail in database
- [ ] Dead letter queue for failed processing

### Monitoring & Operations
- [ ] CloudWatch alarms for error rates and latencies
- [ ] Log aggregation and alerting configured
- [ ] Webhook provider retry policies understood
- [ ] Disaster recovery procedures documented
- [ ] Performance load testing completed

## 🎯 Next Steps

After implementing this webhook handler:

1. **Add Provider-Specific Logic**: Customize event handlers for your webhook providers
2. **Implement Business Rules**: Add your application's specific business logic
3. **Set Up Monitoring**: Configure CloudWatch dashboards and alerts
4. **Add Rate Limiting**: Protect against webhook flooding
5. **Security Audit**: Review implementation with security team
6. **Load Testing**: Test with expected webhook volumes
7. **Documentation**: Document your specific webhook integrations