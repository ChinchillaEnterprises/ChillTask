# Lambda Function URLs

**Create public HTTPS endpoints for Lambda functions without API Gateway**

---

## What are Lambda Function URLs?

**Lambda Function URLs** are built-in HTTPS endpoints that invoke your Lambda function directly, without needing API Gateway or Application Load Balancer.

### Key Features:
- ✅ **Single HTTPS endpoint** per Lambda function
- ✅ **No API Gateway overhead** - Direct Lambda invocation
- ✅ **CORS support** - Built-in CORS configuration
- ✅ **29-30 second timeout** - Same as API Gateway
- ✅ **Free** - No API Gateway charges (only Lambda execution)

### When to Use Function URLs:

| Use Case | Function URL | Next.js API Route | API Gateway |
|----------|--------------|-------------------|-------------|
| **Webhooks from external services** | ⚠️ Possible | ✅ **Preferred** | ❌ Never |
| **Public Lambda endpoints** | ✅ Yes | ⚠️ If on Next.js | ❌ Never |
| **Fast response required (< 3s)** | ✅ Yes | ✅ Yes | ❌ Never |
| **Long operations (> 30s)** | ❌ No (use async) | ❌ No (use async) | ❌ Never |
| **Backend Lambda (no Next.js)** | ✅ **Best choice** | N/A | ❌ Never |

**Rule of Thumb**:
- If you have **Next.js**, use API routes for webhooks
- If you have **backend-only Lambda**, use Function URLs
- **Never** use API Gateway CDK for anything

---

## Architecture

### Traditional Approach (Amplify Gen 1)
```
External Service → API Gateway → Lambda
                    ↑
                (Creates complexity)
```

### Function URL Approach (Amplify Gen 2)
```
External Service → Lambda Function URL
                    ↑
              (Direct invocation)
```

**Advantages**:
- Simpler architecture
- Lower latency (no API Gateway hop)
- Zero API Gateway charges
- Built-in CORS support

---

## Implementation

### Step 1: Create Lambda Function

```typescript
// amplify/functions/slack-webhook/resource.ts
import { defineFunction } from '@aws-amplify/backend';

export const slackWebhook = defineFunction({
  name: 'slack-webhook',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 512,
});
```

### Step 2: Enable Function URL in backend.ts

```typescript
// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { slackWebhook } from './functions/slack-webhook/resource';
import { data } from './data/resource';

const backend = defineBackend({
  data,
  slackWebhook,
});

/**
 * Add public HTTPS endpoint to Lambda function
 */
backend.slackWebhook.resources.lambda.addFunctionUrl({
  // Authentication
  authType: FunctionUrlAuthType.NONE,  // Public endpoint (no auth)

  // CORS configuration
  cors: {
    allowedOrigins: ['*'],              // Allow all origins
    allowedMethods: [HttpMethod.POST],   // Only POST requests
    allowedHeaders: [
      'content-type',
      'x-slack-signature',
      'x-slack-request-timestamp',
    ],
    maxAge: Duration.hours(1),           // Cache preflight for 1 hour
  },
});
```

### Step 3: Implement Handler

```typescript
// amplify/functions/slack-webhook/handler.ts
import type { Handler } from 'aws-lambda';
import crypto from 'crypto';

export const handler: Handler = async (event) => {
  console.log('Slack webhook received:', {
    headers: event.headers,
    body: event.body,
  });

  // Parse request body
  const body = JSON.parse(event.body || '{}');

  // Verify Slack signature
  const signature = event.headers['x-slack-signature'];
  const timestamp = event.headers['x-slack-request-timestamp'];
  const isValid = verifySlackSignature(event.body, signature, timestamp);

  if (!isValid) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid signature' }),
    };
  }

  // Handle Slack URL verification challenge
  if (body.type === 'url_verification') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge: body.challenge }),
    };
  }

  // Process Slack event
  console.log('Processing event:', body.event);

  // Your business logic here...

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};

function verifySlackSignature(
  body: string,
  signature: string,
  timestamp: string
): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET!;
  const baseString = `v0:${timestamp}:${body}`;
  const hash = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(baseString)
    .digest('hex');
  return signature === hash;
}
```

### Step 4: Get Function URL After Deployment

```typescript
// amplify/backend.ts (optional - output URL)
backend.addOutput({
  custom: {
    slackWebhookUrl: backend.slackWebhook.resources.lambda.functionUrl,
  },
});
```

After deployment, the URL is available in:
- **CloudFormation Outputs**: Check AWS Console
- **amplify_outputs.json**: `custom.slackWebhookUrl`
- **Lambda Console**: Function → Configuration → Function URL

---

## Authentication Options

### Option 1: No Authentication (Public)

**Use Case**: Webhooks with signature verification (Slack, Stripe, GitHub)

```typescript
backend.slackWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,  // Public endpoint
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [HttpMethod.POST],
  },
});
```

**Security**: Verify request signatures in Lambda handler.

### Option 2: AWS IAM Authentication

**Use Case**: Internal services with AWS credentials

```typescript
backend.internalApi.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.AWS_IAM,  // Requires AWS signature
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [HttpMethod.POST],
  },
});
```

**Access**: Requires AWS SigV4 signed requests (from other AWS services).

---

## CORS Configuration

### Basic CORS (Allow All)

```typescript
backend.webhookHandler.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],               // Any origin
    allowedMethods: [HttpMethod.ALL],    // GET, POST, PUT, DELETE, etc.
  },
});
```

### Strict CORS (Specific Origins)

```typescript
backend.apiFunction.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: [
      'https://app.example.com',
      'https://staging.example.com',
    ],
    allowedMethods: [HttpMethod.POST, HttpMethod.GET],
    allowedHeaders: ['content-type', 'authorization'],
    exposedHeaders: ['x-request-id'],
    maxAge: Duration.hours(1),           // Cache preflight responses
    allowCredentials: true,              // Allow cookies/auth headers
  },
});
```

### CORS for Webhooks (Minimal)

```typescript
// Webhooks typically don't need preflight
backend.stripeWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [HttpMethod.POST],   // Webhooks only POST
    allowedHeaders: ['content-type', 'stripe-signature'],
  },
});
```

---

## Complete Examples

### Example 1: Slack Webhook Handler

```typescript
// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';
import { slackWebhook } from './functions/slack-webhook/resource';

const backend = defineBackend({
  slackWebhook,
});

// Add public HTTPS endpoint
backend.slackWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [HttpMethod.POST],
    allowedHeaders: [
      'content-type',
      'x-slack-signature',
      'x-slack-request-timestamp',
    ],
  },
});

// Grant DynamoDB access
const slackEventsTable = backend.data.resources.tables['SlackEvent'];
slackEventsTable.grantReadWriteData(backend.slackWebhook.resources.lambda);

// Add environment variables
backend.slackWebhook.resources.lambda.addEnvironment(
  'SLACK_SIGNING_SECRET',
  process.env.SLACK_SIGNING_SECRET || 'replace-me'
);

// Output URL for easy access
backend.addOutput({
  custom: {
    slackWebhookUrl: backend.slackWebhook.resources.lambda.functionUrl,
  },
});
```

### Example 2: GitHub Webhook Handler

```typescript
// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { githubWebhook } from './functions/github-webhook/resource';

const backend = defineBackend({
  githubWebhook,
});

backend.githubWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [HttpMethod.POST],
    allowedHeaders: [
      'content-type',
      'x-github-event',
      'x-hub-signature-256',
    ],
  },
});

backend.addOutput({
  custom: {
    githubWebhookUrl: backend.githubWebhook.resources.lambda.functionUrl,
  },
});
```

### Example 3: Stripe Webhook Handler

```typescript
// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { stripeWebhook } from './functions/stripe-webhook/resource';

const backend = defineBackend({
  stripeWebhook,
});

backend.stripeWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [HttpMethod.POST],
    allowedHeaders: ['content-type', 'stripe-signature'],
  },
});

// Store webhook secret
backend.stripeWebhook.resources.lambda.addEnvironment(
  'STRIPE_WEBHOOK_SECRET',
  process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...'
);

backend.addOutput({
  custom: {
    stripeWebhookUrl: backend.stripeWebhook.resources.lambda.functionUrl,
  },
});
```

---

## Handler Event Structure

### Function URL Event Format

```typescript
// Event structure passed to handler
interface FunctionUrlEvent {
  version: '2.0';
  routeKey: '$default';
  rawPath: '/';
  rawQueryString: '';
  headers: {
    'content-type': 'application/json';
    'x-custom-header': 'value';
    // ... other headers
  };
  requestContext: {
    accountId: 'anonymous';
    apiId: 'abc123';
    domainName: 'xyz.lambda-url.us-east-1.on.aws';
    domainPrefix: 'xyz';
    http: {
      method: 'POST';
      path: '/';
      protocol: 'HTTP/1.1';
      sourceIp: '1.2.3.4';
      userAgent: 'Slack-Webhooks/1.0';
    };
    requestId: 'abc-123-def-456';
    routeKey: '$default';
    stage: '$default';
    time: '01/Jan/2025:00:00:00 +0000';
    timeEpoch: 1704067200000;
  };
  body: '{"type":"url_verification","challenge":"abc123"}';
  isBase64Encoded: false;
}
```

### Handler Response Format

```typescript
// Response structure
interface FunctionUrlResponse {
  statusCode: 200 | 400 | 401 | 403 | 500;
  headers?: {
    'Content-Type': 'application/json';
    'X-Custom-Header'?: string;
  };
  body: string;  // Must be JSON.stringify() for objects
  isBase64Encoded?: boolean;
}

// Example:
return {
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ success: true }),
};
```

---

## Testing

### Local Testing (Sandbox)

```bash
# Start sandbox
npx ampx sandbox

# Get function URL from outputs
cat amplify_outputs.json | grep -A 2 "slackWebhookUrl"

# Test with curl
curl -X POST \
  https://xyz.lambda-url.us-east-1.on.aws \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test123"}'

# Should return: {"challenge":"test123"}
```

### Production Testing

```bash
# Get deployed function URL
aws lambda get-function-url-config \
  --function-name slack-webhook

# Test with curl
curl -X POST \
  https://prod-xyz.lambda-url.us-east-1.on.aws \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Configure in External Service

1. **Get Function URL** from AWS Console or `amplify_outputs.json`
2. **Add to service** (Slack, Stripe, GitHub):
   - Slack: API Dashboard → Event Subscriptions → Request URL
   - Stripe: Developers → Webhooks → Add endpoint
   - GitHub: Repo Settings → Webhooks → Add webhook

---

## Comparison: Function URLs vs Next.js API Routes

### Next.js API Routes

```typescript
// app/api/slack/events/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  // Process event
  return Response.json({ ok: true });
}
```

**Pros**:
- ✅ Part of Next.js app (familiar pattern)
- ✅ Deployed automatically with Amplify hosting
- ✅ Uses your app's domain
- ✅ TypeScript/JavaScript only

**Cons**:
- ❌ Requires Next.js (can't use for pure backend)
- ❌ Cold starts if low traffic
- ❌ Mixed with frontend code

### Lambda Function URLs

```typescript
// amplify/functions/slack-webhook/handler.ts
export const handler = async (event) => {
  const body = JSON.parse(event.body);
  // Process event
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true }),
  };
};
```

**Pros**:
- ✅ Pure backend (no Next.js needed)
- ✅ Separate from frontend
- ✅ Can use Python, Go, Rust, etc.
- ✅ Better for event-driven architecture

**Cons**:
- ❌ Separate AWS domain (not your app domain)
- ❌ Requires CDK configuration
- ❌ Different event structure

### Decision Matrix

| Scenario | Use Next.js API Route | Use Function URL |
|----------|----------------------|------------------|
| **You have Next.js app** | ✅ Preferred | ⚠️ Optional |
| **Backend-only Lambda** | ❌ Not possible | ✅ **Best choice** |
| **Need Python/Go/Rust** | ❌ Not supported | ✅ **Best choice** |
| **Want custom domain** | ✅ Uses app domain | ⚠️ Requires setup |
| **Event-driven architecture** | ⚠️ Possible | ✅ **Better fit** |

---

## Advanced Patterns

### Pattern 1: Self-Invoke for Async Processing

**Use Case**: Webhook needs to respond in < 3 seconds, but processing takes 5 minutes.

```typescript
// amplify/backend.ts
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Policy } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  slackWebhook,
});

// Add Function URL
backend.slackWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [HttpMethod.POST],
  },
});

// Grant self-invoke permission
const selfInvokePolicy = new Policy(
  backend.slackWebhook.resources.lambda.stack,
  'SlackWebhookSelfInvokePolicy',
  {
    statements: [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [backend.slackWebhook.resources.lambda.functionArn],
      }),
    ],
  }
);

selfInvokePolicy.attachToRole(backend.slackWebhook.resources.lambda.role!);
```

```typescript
// amplify/functions/slack-webhook/handler.ts
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({});

export const handler = async (event: any) => {
  // Check if this is the async invocation
  if ('isAsync' in event && event.isAsync) {
    // Long processing (5 minutes)
    await processSlackMessage(event.slackEvent);
    return;
  }

  // Initial webhook request - respond immediately
  const body = JSON.parse(event.body);

  // Invoke self asynchronously
  await lambda.send(
    new InvokeCommand({
      FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
      InvocationType: 'Event',  // Async (fire and forget)
      Payload: JSON.stringify({
        isAsync: true,
        slackEvent: body.event,
      }),
    })
  );

  // Respond to Slack immediately (< 3 seconds)
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true }),
  };
};
```

**See**: `ASYNC_PATTERNS.md` for complete guide.

### Pattern 2: Rate Limiting with DynamoDB

```typescript
// amplify/functions/webhook-handler/handler.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: any) => {
  const sourceIp = event.requestContext.http.sourceIp;
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Check rate limit
  const { Item } = await client.send(
    new GetCommand({
      TableName: process.env.RATE_LIMIT_TABLE,
      Key: { ip: sourceIp },
    })
  );

  if (Item && Item.timestamp > oneMinuteAgo && Item.count >= 10) {
    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Rate limit exceeded' }),
    };
  }

  // Update counter
  await client.send(
    new PutCommand({
      TableName: process.env.RATE_LIMIT_TABLE,
      Item: {
        ip: sourceIp,
        timestamp: now,
        count: (Item?.count || 0) + 1,
        ttl: Math.floor(now / 1000) + 3600,  // Expire after 1 hour
      },
    })
  );

  // Process request
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true }),
  };
};
```

---

## Troubleshooting

### Issue 1: Function URL Not Created

**Symptoms**: Deployment succeeds, but no Function URL appears.

**Cause**: Missing `addFunctionUrl()` in `backend.ts`.

**Solution**:
```typescript
backend.myFunction.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: { allowedOrigins: ['*'], allowedMethods: [HttpMethod.POST] },
});
```

### Issue 2: CORS Errors

**Symptoms**: Browser shows `CORS policy: No 'Access-Control-Allow-Origin' header`.

**Cause**: Missing or incorrect CORS configuration.

**Solution**:
```typescript
backend.myFunction.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],  // Or specific origins
    allowedMethods: [HttpMethod.POST],
    allowedHeaders: ['content-type'],
  },
});
```

### Issue 3: 401 Unauthorized

**Symptoms**: External service webhook fails with 401.

**Cause**: Using `AWS_IAM` auth instead of `NONE`.

**Solution**:
```typescript
// For public webhooks, use NONE
authType: FunctionUrlAuthType.NONE,

// For internal services, use AWS_IAM
authType: FunctionUrlAuthType.AWS_IAM,
```

### Issue 4: Timeout After 30 Seconds

**Symptoms**: Function times out for long operations.

**Cause**: Function URLs have 29-30 second hard limit (same as API Gateway).

**Solution**: Use async pattern (self-invoke or DynamoDB Stream).

**See**: `ASYNC_PATTERNS.md` for solutions.

---

## Best Practices

### 1. Always Verify Signatures

```typescript
// Never trust webhook data without verification
const isValid = verifySignature(body, signature, secret);
if (!isValid) {
  return { statusCode: 401, body: 'Invalid signature' };
}
```

### 2. Respond Quickly

```typescript
// ✅ Good: Respond immediately, process async
await lambda.send(invokeAsync);
return { statusCode: 200, body: 'Processing' };

// ❌ Bad: Slow processing blocks response
await slowOperation();  // 10 seconds
return { statusCode: 200, body: 'Done' };
```

### 3. Log Everything

```typescript
console.log('Webhook received:', {
  source: event.requestContext.http.sourceIp,
  headers: event.headers,
  body: event.body,
});
```

### 4. Use Environment Variables

```typescript
// backend.ts
backend.webhookHandler.resources.lambda.addEnvironment(
  'WEBHOOK_SECRET',
  process.env.WEBHOOK_SECRET || 'replace-me'
);
```

### 5. Output URLs for Easy Access

```typescript
backend.addOutput({
  custom: {
    webhookUrl: backend.webhookHandler.resources.lambda.functionUrl,
  },
});
```

---

## Summary

**Lambda Function URLs** provide direct HTTPS access to Lambda functions without API Gateway complexity.

**Key Takeaways**:
1. ✅ Use for backend-only Lambda functions (no Next.js)
2. ✅ Perfect for webhooks when not using Next.js API routes
3. ✅ Add with `addFunctionUrl()` in `backend.ts`
4. ✅ Configure CORS for browser access
5. ✅ Zero API Gateway charges
6. ⚠️ 29-30 second timeout (use async patterns for long operations)

**Rule**: Prefer Next.js API routes if you have Next.js, otherwise use Function URLs.

---

## References

- **AWS Documentation**: [Lambda Function URLs](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html)
- **Amplify CDK Guide**: [Using CDK with Amplify](https://docs.amplify.aws/react/build-a-backend/functions/custom-functions/)
- **Production Example**: Rosario `amplify/backend.ts` - Slack webhook with Function URL
- **Related**: `ASYNC_PATTERNS.md` - Handling long operations
- **Related**: `WEBHOOKS-GUIDE.md` - Next.js API route pattern (preferred for webhooks)
