# AWS Secrets Manager with Lambda Functions

**Secure storage and IAM access patterns for API keys, OAuth tokens, and credentials**

---

## What is AWS Secrets Manager?

**AWS Secrets Manager** securely stores sensitive data like API keys, database passwords, and OAuth tokens. It provides:

- ✅ **Encryption at rest** - All secrets encrypted with AWS KMS
- ✅ **Automatic rotation** - Can rotate credentials automatically
- ✅ **Fine-grained IAM** - Control who can read/write secrets
- ✅ **Versioning** - Track secret changes over time
- ✅ **Audit logging** - CloudTrail logs all secret access

### When to Use Secrets Manager:

| Secret Type | Use Secrets Manager | Use Amplify Sandbox Secrets | Use Environment Variables |
|-------------|--------------------|-----------------------------|---------------------------|
| **Production API keys** | ✅ **Best** | ❌ Sandbox only | ⚠️ Less secure |
| **OAuth tokens** | ✅ **Best** | ❌ Sandbox only | ❌ Never |
| **Database passwords** | ✅ **Best** | ❌ Sandbox only | ⚠️ Less secure |
| **Dev/Test secrets** | ⚠️ Overkill | ✅ **Best** | ✅ OK |
| **Non-sensitive config** | ❌ Unnecessary | ❌ Unnecessary | ✅ **Best** |

---

## Cost Considerations

### Secrets Manager Pricing (as of 2025):
- **$0.40 per secret per month**
- **$0.05 per 10,000 API calls**

### Example Cost:
- 5 secrets (Stripe, Slack, GitHub, Database, Google OAuth): **$2.00/month**
- 100,000 Lambda reads/month: **$0.50/month**
- **Total: ~$2.50/month**

### When to Use:
- ✅ Production applications
- ✅ Sensitive credentials (OAuth, API keys)
- ✅ Multi-environment deployments

### When NOT to Use:
- ❌ Non-sensitive config (use environment variables)
- ❌ Sandbox/dev secrets (use `npx ampx sandbox secret set`)
- ❌ Public values (use `amplify_outputs.json`)

---

## Architecture

### Traditional Approach (Insecure)
```
Lambda function → Environment Variables → API Key stored in plaintext
                                         ↑
                                    (Visible in console)
```

### Secrets Manager Approach (Secure)
```
Lambda function → Secrets Manager API → Encrypted secret in KMS
                  ↑
              (IAM policy required)
```

---

## Implementation

### Step 1: Create Secret (AWS Console or CLI)

#### Option A: AWS Console

1. Go to **AWS Secrets Manager** console
2. Click **Store a new secret**
3. Select **Other type of secret**
4. Add key-value pairs:
   ```json
   {
     "apiKey": "sk_live_abc123...",
     "clientId": "oauth_client_123",
     "clientSecret": "oauth_secret_xyz"
   }
   ```
5. Name: `myapp/prod/stripe`
6. Click **Store**

#### Option B: AWS CLI

```bash
# Store a simple string secret
aws secretsmanager create-secret \
  --name myapp/prod/stripe-api-key \
  --secret-string "sk_live_abc123..."

# Store JSON secret (multiple values)
aws secretsmanager create-secret \
  --name myapp/prod/google-oauth \
  --secret-string '{
    "clientId": "123456789.apps.googleusercontent.com",
    "clientSecret": "GOCSPX-xyz123..."
  }'
```

### Step 2: Grant Lambda Access (IAM Policy)

```typescript
// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { myFunction } from './functions/my-function/resource';

const backend = defineBackend({
  myFunction,
});

/**
 * Grant Lambda permission to read secrets
 */
backend.myFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'secretsmanager:GetSecretValue',  // Read secret
    ],
    resources: [
      // Specific secret ARN
      'arn:aws:secretsmanager:us-east-1:123456789012:secret:myapp/prod/stripe-api-key-ABC123',
    ],
  })
);
```

### Step 3: Read Secret in Lambda

```typescript
// amplify/functions/my-function/handler.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

export const handler = async (event: any) => {
  // Read secret from Secrets Manager
  const response = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: 'myapp/prod/stripe-api-key',
    })
  );

  const apiKey = response.SecretString!;
  console.log('Got API key:', apiKey.substring(0, 10) + '...');

  // Use the API key
  // ...

  return { statusCode: 200, body: 'Success' };
};
```

---

## IAM Policy Patterns

### Pattern 1: Single Secret Access

**Use Case**: Lambda needs access to one specific secret.

```typescript
// amplify/backend.ts
backend.myFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: [
      'arn:aws:secretsmanager:us-east-1:123456789012:secret:myapp/prod/stripe-abc123',
    ],
  })
);
```

### Pattern 2: Wildcard Secret Family

**Use Case**: Lambda needs access to all secrets in a namespace (e.g., all Upwork secrets).

```typescript
// amplify/backend.ts
backend.upworkFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: [
      // All secrets starting with 'upwork-'
      'arn:aws:secretsmanager:us-east-1:*:secret:upwork-*',
    ],
  })
);
```

**Why Wildcard?**
- Matches `upwork-api-key`, `upwork-oauth-tokens`, `upwork-webhook-secret`
- No need to update IAM policy when adding new secrets
- Still scoped to `upwork-` prefix (not all secrets)

### Pattern 3: Read and Write Access

**Use Case**: Lambda needs to update secrets (OAuth token refresh).

```typescript
// amplify/backend.ts
backend.tokenRefreshFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'secretsmanager:GetSecretValue',   // Read
      'secretsmanager:PutSecretValue',   // Write (update existing)
      'secretsmanager:UpdateSecret',     // Update metadata
    ],
    resources: [
      'arn:aws:secretsmanager:us-east-1:*:secret:upwork-oauth-tokens*',
    ],
  })
);
```

### Pattern 4: Multi-Secret Access

**Use Case**: Lambda needs multiple unrelated secrets.

```typescript
// amplify/backend.ts
backend.webhookHandler.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: [
      'arn:aws:secretsmanager:us-east-1:*:secret:slack-*',
      'arn:aws:secretsmanager:us-east-1:*:secret:stripe-*',
      'arn:aws:secretsmanager:us-east-1:*:secret:github-*',
    ],
  })
);
```

### Pattern 5: Environment-Specific Secrets

**Use Case**: Different secrets per environment (dev, staging, prod).

```typescript
// amplify/backend.ts
const awsBranch = process.env.AWS_BRANCH || 'main';
const env = awsBranch === 'main' ? 'prod' : 'dev';

backend.myFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: [
      `arn:aws:secretsmanager:us-east-1:*:secret:myapp/${env}/*`,
    ],
  })
);

// Also pass environment to Lambda
backend.myFunction.resources.lambda.addEnvironment('ENV', env);
```

---

## Complete Examples

### Example 1: OAuth Token Refresh

**Scenario**: Lambda reads OAuth tokens, refreshes them, writes back to Secrets Manager.

```typescript
// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { tokenRefresh } from './functions/token-refresh/resource';

const backend = defineBackend({
  tokenRefresh,
});

// Grant read/write access to OAuth tokens
backend.tokenRefresh.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'secretsmanager:GetSecretValue',
      'secretsmanager:PutSecretValue',
    ],
    resources: [
      'arn:aws:secretsmanager:us-east-1:*:secret:upwork-oauth-tokens*',
    ],
  })
);
```

```typescript
// amplify/functions/token-refresh/handler.ts
import { SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });
const SECRET_NAME = 'upwork-oauth-tokens';

export const handler = async (event: any) => {
  console.log('Refreshing Upwork OAuth tokens...');

  // 1. Read current tokens
  const getResponse = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: SECRET_NAME })
  );

  const currentTokens = JSON.parse(getResponse.SecretString!);
  const { refreshToken } = currentTokens;

  // 2. Call Upwork API to refresh
  const response = await fetch('https://www.upwork.com/api/v3/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.UPWORK_CLIENT_ID!,
      client_secret: process.env.UPWORK_CLIENT_SECRET!,
    }),
  });

  const newTokens = await response.json();

  // 3. Write new tokens back to Secrets Manager
  await secretsClient.send(
    new PutSecretValueCommand({
      SecretId: SECRET_NAME,
      SecretString: JSON.stringify({
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        expiresAt: Date.now() + newTokens.expires_in * 1000,
      }),
    })
  );

  console.log('✓ Tokens refreshed successfully');
  return { statusCode: 200, body: 'Tokens refreshed' };
};
```

### Example 2: Stripe Webhook Verification

**Scenario**: Lambda reads Stripe webhook secret to verify signatures.

```typescript
// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { stripeWebhook } from './functions/stripe-webhook/resource';

const backend = defineBackend({
  stripeWebhook,
});

backend.stripeWebhook.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: [
      'arn:aws:secretsmanager:us-east-1:*:secret:stripe-webhook-secret*',
    ],
  })
);
```

```typescript
// amplify/functions/stripe-webhook/handler.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import Stripe from 'stripe';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });
let cachedWebhookSecret: string | null = null;

async function getWebhookSecret(): Promise<string> {
  // Cache secret to avoid repeated API calls
  if (cachedWebhookSecret) {
    return cachedWebhookSecret;
  }

  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: 'stripe-webhook-secret' })
  );

  cachedWebhookSecret = response.SecretString!;
  return cachedWebhookSecret;
}

export const handler = async (event: any) => {
  const body = event.body;
  const signature = event.headers['stripe-signature'];

  // Get webhook secret from Secrets Manager
  const webhookSecret = await getWebhookSecret();

  // Verify Stripe signature
  let stripeEvent: Stripe.Event;
  try {
    const stripe = new Stripe(process.env.STRIPE_API_KEY!);
    stripeEvent = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return { statusCode: 401, body: 'Invalid signature' };
  }

  // Process event
  console.log('Stripe event:', stripeEvent.type);

  return { statusCode: 200, body: 'Success' };
};
```

### Example 3: Multi-Service Webhook Handler

**Scenario**: Lambda handles webhooks from Slack, Stripe, and GitHub (needs all secrets).

```typescript
// amplify/backend.ts
backend.webhookRouter.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: [
      'arn:aws:secretsmanager:us-east-1:*:secret:chinchilla-ai-academy/prod/slack*',
      'arn:aws:secretsmanager:us-east-1:*:secret:stripe-*',
      'arn:aws:secretsmanager:us-east-1:*:secret:github-*',
    ],
  })
);
```

```typescript
// amplify/functions/webhook-router/handler.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

async function getSecret(secretName: string): Promise<any> {
  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );
  return JSON.parse(response.SecretString!);
}

export const handler = async (event: any) => {
  const path = event.path;

  if (path === '/webhooks/slack') {
    const slackSecret = await getSecret('chinchilla-ai-academy/prod/slack');
    // Verify Slack signature with slackSecret.signingSecret
    // ...
  } else if (path === '/webhooks/stripe') {
    const stripeSecret = await getSecret('stripe-webhook-secret');
    // Verify Stripe signature
    // ...
  } else if (path === '/webhooks/github') {
    const githubSecret = await getSecret('github-webhook-secret');
    // Verify GitHub signature
    // ...
  }

  return { statusCode: 200, body: 'Success' };
};
```

---

## Secret Naming Conventions

### Pattern: `{app}/{environment}/{service}`

```
myapp/prod/stripe-api-key
myapp/prod/google-oauth
myapp/prod/database-password

myapp/dev/stripe-api-key
myapp/dev/google-oauth
myapp/dev/database-password

chinchilla-ai-academy/prod/slack
chinchilla-ai-academy/prod/openai-api-key
```

**Benefits**:
- Clear organization by app and environment
- Easy to grant access with wildcards: `myapp/prod/*`
- Prevents accidental cross-environment access

---

## Caching Secrets in Lambda

### Problem: Every Lambda Invocation Calls Secrets Manager

**Cost Impact**: 1 million invocations × $0.05/10k calls = **$5/month** just for secret reads!

### Solution: Cache Secrets in Global Scope

```typescript
// ❌ Bad: Reads secret on every invocation
export const handler = async (event: any) => {
  const secret = await getSecret('my-secret');  // Called every time
  // Use secret...
};

// ✅ Good: Cache secret across invocations
let cachedSecret: string | null = null;

export const handler = async (event: any) => {
  if (!cachedSecret) {
    cachedSecret = await getSecret('my-secret');  // Called once per container
  }
  // Use cachedSecret...
};
```

**How It Works**:
- Lambda reuses containers across invocations
- Global variables persist between invocations
- Secret only fetched on cold start (~5% of invocations)

**Cost Savings**: 1 million invocations → ~50,000 secret reads = **$0.25/month** (95% reduction!)

### Advanced: Cache with Expiration

```typescript
// amplify/functions/my-function/handler.ts
interface CachedSecret {
  value: string;
  expiresAt: number;
}

let secretCache: Map<string, CachedSecret> = new Map();

async function getCachedSecret(secretName: string, ttlSeconds: number = 300): Promise<string> {
  const now = Date.now();
  const cached = secretCache.get(secretName);

  // Return cached value if still valid
  if (cached && cached.expiresAt > now) {
    console.log(`Using cached secret: ${secretName}`);
    return cached.value;
  }

  // Fetch fresh secret
  console.log(`Fetching secret from Secrets Manager: ${secretName}`);
  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );

  const value = response.SecretString!;

  // Cache with expiration
  secretCache.set(secretName, {
    value,
    expiresAt: now + ttlSeconds * 1000,
  });

  return value;
}

export const handler = async (event: any) => {
  // Cache for 5 minutes (300 seconds)
  const apiKey = await getCachedSecret('stripe-api-key', 300);

  // Use apiKey...
};
```

---

## Secrets Manager vs Sandbox Secrets

### Amplify Sandbox Secrets

**Use For**: Development/testing secrets

```bash
# Set secret for sandbox
npx ampx sandbox secret set STRIPE_SECRET_KEY

# Enter value when prompted
? Enter secret value: sk_test_abc123...
```

**Pros**:
- ✅ Free
- ✅ Easy to set up
- ✅ Integrated with Amplify CLI

**Cons**:
- ❌ **Sandbox only** (not for production)
- ❌ Stored in AWS SSM Parameter Store (limited features)
- ❌ No automatic rotation

### AWS Secrets Manager

**Use For**: Production secrets

```bash
# Create secret via AWS CLI
aws secretsmanager create-secret \
  --name myapp/prod/stripe-api-key \
  --secret-string "sk_live_abc123..."
```

**Pros**:
- ✅ Production-grade security
- ✅ Automatic rotation
- ✅ Versioning and audit logs
- ✅ Cross-service access

**Cons**:
- ❌ Costs $0.40/secret/month
- ❌ Requires IAM policy setup

### Decision Matrix

| Environment | Use Sandbox Secrets | Use Secrets Manager |
|-------------|-------------------|---------------------|
| **Sandbox (local dev)** | ✅ **Best** | ⚠️ Overkill |
| **Branch deployment (dev/staging)** | ❌ Won't work | ✅ **Best** |
| **Production** | ❌ Won't work | ✅ **Required** |

---

## Troubleshooting

### Issue 1: AccessDeniedException

**Symptoms**:
```
AccessDeniedException: User: arn:aws:sts::123:assumed-role/myFunction-role
is not authorized to perform: secretsmanager:GetSecretValue
```

**Cause**: Missing IAM policy in `backend.ts`.

**Solution**:
```typescript
backend.myFunction.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: ['arn:aws:secretsmanager:us-east-1:*:secret:my-secret*'],
  })
);
```

### Issue 2: ResourceNotFoundException

**Symptoms**:
```
ResourceNotFoundException: Secrets Manager can't find the specified secret
```

**Cause**: Secret name typo or doesn't exist.

**Solution**:
```bash
# List all secrets
aws secretsmanager list-secrets

# Create missing secret
aws secretsmanager create-secret \
  --name my-secret \
  --secret-string "value"
```

### Issue 3: InvalidRequestException (Wrong Region)

**Symptoms**:
```
InvalidRequestException: Secret not found in region us-west-2
```

**Cause**: Secret created in different region than Lambda.

**Solution**:
```typescript
// Ensure client uses correct region
const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
});
```

### Issue 4: Cached Secret Not Updating

**Symptoms**: Lambda still uses old secret value after update.

**Cause**: Secret cached in Lambda global scope.

**Solution**:
1. **Force refresh**: Clear cache by redeploying Lambda
2. **Use TTL cache**: Implement expiration (see "Caching" section above)
3. **Version check**: Store `versionId` and compare on each call

---

## Best Practices

### 1. Use Wildcard ARNs for Secret Families

```typescript
// ✅ Good: Covers all Stripe secrets
resources: ['arn:aws:secretsmanager:us-east-1:*:secret:stripe-*']

// ❌ Bad: Must update for each new secret
resources: [
  'arn:aws:secretsmanager:us-east-1:*:secret:stripe-api-key-abc',
  'arn:aws:secretsmanager:us-east-1:*:secret:stripe-webhook-secret-xyz',
]
```

### 2. Cache Secrets to Reduce Costs

```typescript
let cachedSecret: string | null = null;

export const handler = async () => {
  if (!cachedSecret) {
    cachedSecret = await getSecret('my-secret');
  }
  // Use cachedSecret
};
```

### 3. Use JSON for Multiple Values

```typescript
// ✅ Good: One secret with multiple values
{
  "apiKey": "abc123",
  "clientId": "xyz789",
  "clientSecret": "def456"
}

// ❌ Bad: Three separate secrets ($1.20/month vs $0.40/month)
// stripe-api-key
// stripe-client-id
// stripe-client-secret
```

### 4. Separate Environments

```typescript
myapp/prod/stripe-api-key    // Production
myapp/dev/stripe-api-key     // Development

// Lambda automatically uses correct environment
const env = process.env.ENV || 'prod';
const secretName = `myapp/${env}/stripe-api-key`;
```

### 5. Never Log Secret Values

```typescript
// ❌ Bad: Logs full secret
console.log('Secret:', secret);

// ✅ Good: Logs only confirmation
console.log('Secret loaded:', secret.substring(0, 10) + '...');
```

---

## Summary

**AWS Secrets Manager** provides production-grade secret storage with encryption, rotation, and audit logging.

**Key Takeaways**:
1. ✅ Use for production API keys, OAuth tokens, database passwords
2. ✅ Grant IAM access with `addToRolePolicy()` in `backend.ts`
3. ✅ Use wildcard ARNs for secret families: `secret:myapp-*`
4. ✅ Cache secrets in Lambda global scope (95% cost reduction)
5. ✅ Costs $0.40/secret/month + $0.05/10k API calls
6. ⚠️ For sandbox/dev, use `npx ampx sandbox secret set` (free)

**Production-Tested**: Used in ChillUpwork (Upwork OAuth tokens) and other production apps for secure credential management.

---

## References

- **AWS Documentation**: [Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html)
- **AWS SDK v3**: [@aws-sdk/client-secrets-manager](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-secrets-manager/)
- **Amplify Sandbox Secrets**: [npx ampx sandbox secret](https://docs.amplify.aws/react/deploy-and-host/sandbox-environments/features/#secrets)
- **Production Example**: ChillUpwork `amplify/backend.ts` - OAuth token management with Secrets Manager
- **Related**: `ENVIRONMENT_VARIABLES.md` - When to use env vars vs secrets
