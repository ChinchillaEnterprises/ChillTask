# 🔧 Environment Variables in Amplify Gen 2

**The complete guide to defining, passing, and accessing environment variables in Lambda functions.**

---

## 🎯 Quick Answer

**How to pass environment variables to Lambda functions:**

```typescript
// amplify/functions/my-function/resource.ts
import { defineFunction } from '@aws-amplify/backend';

export const myFunction = defineFunction({
  name: 'my-function',
  entry: './handler.ts',
  environment: {
    DEPLOY_BRANCH: process.env.AWS_BRANCH || 'main',
    API_ENDPOINT: 'https://api.example.com',
    BATCH_SIZE: '100',
  }
});
```

**How to access them in your handler:**

```typescript
// amplify/functions/my-function/handler.ts
import { env } from '$amplify/env/my-function';

export const handler = async (event) => {
  console.log('Branch:', env.DEPLOY_BRANCH);     // ✅ Type-safe
  console.log('API:', env.API_ENDPOINT);
  console.log('Batch Size:', env.BATCH_SIZE);
};
```

---

## 📚 Table of Contents

- [Three Methods to Define Environment Variables](#three-methods-to-define-environment-variables)
- [Two Ways to Access Environment Variables](#two-ways-to-access-environment-variables)
- [Build-Time vs Runtime](#build-time-vs-runtime)
- [Decision Tree: Which Method to Use](#decision-tree-which-method-to-use)
- [Common Use Cases](#common-use-cases)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
- [Best Practices](#best-practices)
- [FAQ](#faq)

---

## 🛠️ Three Methods to Define Environment Variables

### Method 1: `environment` in `defineFunction()` (Preferred)

**When to use:** 95% of the time. For static values, build-time values, and external config.

```typescript
// amplify/functions/my-function/resource.ts
import { defineFunction } from '@aws-amplify/backend';

export const myFunction = defineFunction({
  name: 'my-function',
  entry: './handler.ts',
  environment: {
    // Static configuration
    API_ENDPOINT: 'https://api.example.com',
    BATCH_SIZE: '100',
    LOG_LEVEL: 'INFO',

    // Build-time environment variables
    DEPLOY_BRANCH: process.env.AWS_BRANCH || 'main',
    REGION: process.env.AWS_REGION || 'us-east-1',
    ENV: process.env.ENV || 'dev',

    // External environment variables (from .env or Amplify hosting)
    EXTERNAL_API_KEY: process.env.EXTERNAL_API_KEY || 'default',
    STRIPE_ENDPOINT: process.env.STRIPE_ENDPOINT || 'https://api.stripe.com',

    // Feature flags
    ENABLE_BETA_FEATURES: 'false',
    USE_CACHE: 'true',
  }
});
```

**Characteristics:**
- ✅ Clean and simple
- ✅ Co-located with function definition
- ✅ Type-safe access in handler
- ✅ Works for 95% of use cases

---

### Method 2: `addEnvironment()` in `backend.ts` (Rare)

**When to use:** ONLY for CDK-generated ARNs or values computed from multiple resources in backend.ts.

```typescript
// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { myFunction } from './functions/my-function/resource';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Topic } from 'aws-cdk-lib/aws-sns';

const backend = defineBackend({
  myFunction
});

// Create custom SNS topic using CDK
const notificationTopic = new Topic(
  backend.myFunction.resources.lambda.stack,
  'NotificationTopic'
);

// Pass CDK-generated ARN to Lambda
(backend.myFunction.resources.lambda as Function).addEnvironment(
  'NOTIFICATION_TOPIC_ARN',
  notificationTopic.topicArn
);
```

**When NOT to use:**
- ❌ AWS_BRANCH (use Method 1 instead - it's available in resource.ts)
- ❌ External API endpoints (use Method 1)
- ❌ DynamoDB table names (use `resourceGroupName: 'data'` pattern instead)
- ❌ Static configuration (use Method 1)

**Characteristics:**
- ⚠️ Requires type casting
- ⚠️ Separates config from function definition
- ⚠️ Only use when Method 1 can't work
- ✅ Good for CDK-generated resources

---

### Method 3: `secret()` for Sensitive Values

**When to use:** For API keys, OAuth secrets, credentials, passwords.

```typescript
// amplify/functions/my-function/resource.ts
import { defineFunction, secret } from '@aws-amplify/backend';

export const myFunction = defineFunction({
  name: 'my-function',
  entry: './handler.ts',
  environment: {
    // Public config
    API_ENDPOINT: 'https://api.example.com',

    // Secrets (NOT stored in code or build artifacts)
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
    GOOGLE_CLIENT_SECRET: secret('GOOGLE_CLIENT_SECRET'),
    DATABASE_PASSWORD: secret('DATABASE_PASSWORD'),
  }
});
```

**Setting secrets:**

```bash
# For sandbox (local development)
npx ampx sandbox secret set STRIPE_SECRET_KEY

# For production (via Amplify Console UI)
# Go to: Amplify Console → Your App → Environment variables & secrets
```

**Why use secrets:**
- 🔒 NOT rendered in plaintext in build artifacts
- 🔒 NOT visible in CloudFormation stack events
- 🔒 Encrypted at rest in AWS Systems Manager Parameter Store
- 🔒 Follows AWS security best practices

**Characteristics:**
- ✅ Secure storage
- ✅ Different values per environment
- ⚠️ Must be set manually (not in code)
- ⚠️ Accessed same way as regular env vars

---

## 📖 Two Ways to Access Environment Variables

### Method 1: Generated `env` Symbol (Recommended)

Amplify automatically generates a type-safe `env` object at build time.

**How it works:**
1. During deployment, Amplify reads your `environment` configuration
2. Generates `.amplify/generated/env/my-function.ts` with TypeScript types
3. You import and use the type-safe `env` object

**Usage:**

```typescript
// amplify/functions/my-function/handler.ts
import { env } from '$amplify/env/my-function';

export const handler = async (event) => {
  // ✅ Type-safe access with autocomplete
  const branch = env.DEPLOY_BRANCH;
  const apiUrl = env.API_ENDPOINT;
  const batchSize = parseInt(env.BATCH_SIZE);

  console.log(`Running on ${branch} with batch size ${batchSize}`);

  // TypeScript will error if you try to access a variable that doesn't exist
  // const foo = env.DOES_NOT_EXIST; // ❌ TypeScript error
};
```

**Benefits:**
- ✅ **Autocomplete** - IDE suggests available variables
- ✅ **Type safety** - Catch typos at compile time
- ✅ **Documentation** - See all env vars in one place
- ✅ **Refactoring** - Rename variables with confidence

---

### Method 2: Traditional `process.env` (Also Works)

You can still use the traditional Node.js approach.

```typescript
// amplify/functions/my-function/handler.ts
export const handler = async (event) => {
  // ❌ No type safety, no autocomplete
  const branch = process.env.DEPLOY_BRANCH;
  const apiUrl = process.env.API_ENDPOINT;
  const batchSize = parseInt(process.env.BATCH_SIZE || '10');

  // Typos won't be caught until runtime
  const foo = process.env.DOES_NOT_EXIST; // undefined, no error
};
```

**When to use:**
- Legacy code migration
- Quick debugging
- Reading AWS Lambda built-in variables (not in your config)

**Drawbacks:**
- ❌ No autocomplete
- ❌ No type checking
- ❌ Easy to make typos
- ❌ Must provide fallback values manually

---

## ⏰ Build-Time vs Runtime

**Critical concept:** Environment variables exist in TWO different contexts.

### Build-Time Context

**When:** During deployment, when Amplify runs `backend.ts` and `resource.ts`

**Available variables:**
- `process.env.AWS_BRANCH` ✅
- `process.env.AWS_REGION` ✅
- `process.env.AWS_APP_ID` ✅
- Any variables from `.env` or Amplify hosting config ✅

**Where you can use them:**
- `amplify/backend.ts` ✅
- `amplify/functions/*/resource.ts` ✅
- CDK infrastructure code ✅

**Example:**
```typescript
// backend.ts - Build-time
const awsBranch = process.env.AWS_BRANCH; // ✅ Available
const isProduction = awsBranch === 'main';

if (isProduction) {
  // Create production-only resources
  new Rule(...);
}
```

---

### Runtime Context

**When:** Lambda function executes in response to an event

**Available variables:**
- Variables defined in `environment: {}` ✅
- Variables added via `addEnvironment()` ✅
- AWS Lambda built-in variables (`AWS_LAMBDA_FUNCTION_NAME`, etc.) ✅
- `process.env.AWS_BRANCH` ❌ **NOT AVAILABLE**

**Where you use them:**
- `amplify/functions/*/handler.ts` (Lambda handler code)

**Example:**
```typescript
// handler.ts - Runtime
export const handler = async (event) => {
  // ❌ AWS_BRANCH is NOT available here
  const branch = process.env.AWS_BRANCH; // undefined!

  // ✅ Use the value you passed from build-time
  const branch = env.DEPLOY_BRANCH; // Works! (if you passed it)
};
```

---

### The Critical Pattern for AWS_BRANCH

**Capture at build-time, pass to runtime:**

```typescript
// Step 1: In resource.ts (build-time) - Capture AWS_BRANCH
export const myFunction = defineFunction({
  environment: {
    DEPLOY_BRANCH: process.env.AWS_BRANCH || 'main', // ✅ Captured here
  }
});

// Step 2: In handler.ts (runtime) - Use the captured value
import { env } from '$amplify/env/my-function';

export const handler = async (event) => {
  const branch = env.DEPLOY_BRANCH; // ✅ Available at runtime

  if (branch === 'main') {
    // Production behavior
  } else {
    // Dev/sandbox behavior
  }
};
```

---

## 🌲 Decision Tree: Which Method to Use

```
Need to pass environment variables to Lambda?
│
├─ Is it a secret (API key, password, OAuth token)?
│  └─ YES → Use Method 3: secret()
│
├─ Is it a CDK-generated resource (SNS ARN, custom resource)?
│  └─ YES → Use Method 2: addEnvironment() in backend.ts
│
└─ Everything else (AWS_BRANCH, external APIs, config)?
   └─ Use Method 1: environment in defineFunction()
```

### Quick Reference Table

| Variable Type | Method | Example |
|---------------|--------|---------|
| **Static config** | Method 1 | `API_ENDPOINT: 'https://...'` |
| **Build-time vars** | Method 1 | `DEPLOY_BRANCH: process.env.AWS_BRANCH` |
| **External APIs** | Method 1 | `STRIPE_URL: process.env.STRIPE_URL` |
| **Feature flags** | Method 1 | `ENABLE_BETA: 'false'` |
| **CDK ARNs** | Method 2 | `TOPIC_ARN: snsTopic.topicArn` |
| **Secrets** | Method 3 | `API_KEY: secret('MY_API_KEY')` |
| **DynamoDB tables** | ❌ None | Use `resourceGroupName: 'data'` |

---

## 💼 Common Use Cases

### Use Case 1: Environment-Specific Configuration

```typescript
// resource.ts
export const myFunction = defineFunction({
  environment: {
    DEPLOY_BRANCH: process.env.AWS_BRANCH || 'main',
    LOG_LEVEL: process.env.AWS_BRANCH === 'main' ? 'INFO' : 'DEBUG',
    BATCH_SIZE: process.env.AWS_BRANCH === 'main' ? '1000' : '10',
  }
});

// handler.ts
import { env } from '$amplify/env/my-function';

export const handler = async (event) => {
  console.log(`Running on ${env.DEPLOY_BRANCH}`);
  console.log(`Log level: ${env.LOG_LEVEL}`);

  const batchSize = parseInt(env.BATCH_SIZE);
  // Process records in batches
};
```

---

### Use Case 2: External API Integration

```typescript
// resource.ts
export const apiIntegration = defineFunction({
  environment: {
    STRIPE_API_URL: process.env.STRIPE_API_URL || 'https://api.stripe.com',
    STRIPE_API_VERSION: '2023-10-16',
    STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),
    TIMEOUT_MS: '30000',
  }
});

// handler.ts
import { env } from '$amplify/env/api-integration';

export const handler = async (event) => {
  const response = await fetch(`${env.STRIPE_API_URL}/v1/charges`, {
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Stripe-Version': env.STRIPE_API_VERSION,
    },
    signal: AbortSignal.timeout(parseInt(env.TIMEOUT_MS)),
  });
};
```

---

### Use Case 3: Feature Flags

```typescript
// resource.ts
export const featureFunction = defineFunction({
  environment: {
    ENABLE_BETA_FEATURES: process.env.ENABLE_BETA || 'false',
    ENABLE_CACHING: 'true',
    CACHE_TTL_SECONDS: '3600',
    MAX_RETRIES: '3',
  }
});

// handler.ts
import { env } from '$amplify/env/feature-function';

export const handler = async (event) => {
  const useBeta = env.ENABLE_BETA_FEATURES === 'true';
  const useCache = env.ENABLE_CACHING === 'true';

  if (useBeta) {
    // Use new implementation
  } else {
    // Use stable implementation
  }

  if (useCache) {
    const ttl = parseInt(env.CACHE_TTL_SECONDS);
    // Implement caching with TTL
  }
};
```

---

### Use Case 4: CDK-Generated Resources (Rare)

```typescript
// backend.ts
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Function } from 'aws-cdk-lib/aws-lambda';

const backend = defineBackend({
  notificationHandler
});

// Create SNS topic
const topic = new Topic(
  backend.notificationHandler.resources.lambda.stack,
  'EventTopic',
  { displayName: 'Event Notifications' }
);

// Pass ARN to Lambda
(backend.notificationHandler.resources.lambda as Function).addEnvironment(
  'EVENT_TOPIC_ARN',
  topic.topicArn
);

// handler.ts
export const handler = async (event) => {
  const topicArn = process.env.EVENT_TOPIC_ARN;
  // Publish to SNS topic
};
```

---

## 🚫 Anti-Patterns to Avoid

### Anti-Pattern 1: Passing DynamoDB Table Names

**❌ DON'T DO THIS:**
```typescript
// backend.ts - WRONG!
(backend.myFunction.resources.lambda as Function).addEnvironment(
  'TABLE_NAME',
  backend.data.resources.tables.MyModel.tableName
);
```

**✅ DO THIS INSTEAD:**
```typescript
// resource.ts - CORRECT!
export const myFunction = defineFunction({
  resourceGroupName: 'data',  // ← Grants access to ALL DynamoDB tables
});

// handler.ts - Access via Amplify Data client
const client = generateClient<Schema>({ authMode: 'iam' });
const result = await client.models.MyModel.create({...});
```

**Why:** The Amplify Data client pattern is type-safe, environment-agnostic, and doesn't require table names.

See: [LAMBDA_DYNAMODB_ACCESS.md](./functions/LAMBDA_DYNAMODB_ACCESS.md)

---

### Anti-Pattern 2: Using `addEnvironment()` for AWS_BRANCH

**❌ DON'T DO THIS:**
```typescript
// backend.ts - Unnecessary!
(backend.myFunction.resources.lambda as Function).addEnvironment(
  'DEPLOY_BRANCH',
  process.env.AWS_BRANCH || 'main'
);
```

**✅ DO THIS INSTEAD:**
```typescript
// resource.ts - Clean!
export const myFunction = defineFunction({
  environment: {
    DEPLOY_BRANCH: process.env.AWS_BRANCH || 'main',
  }
});
```

**Why:** `AWS_BRANCH` is available in `resource.ts` during build time. No need for `addEnvironment()`.

---

### Anti-Pattern 3: Storing Secrets in Environment Variables

**❌ DON'T DO THIS:**
```typescript
// resource.ts - INSECURE!
export const myFunction = defineFunction({
  environment: {
    API_KEY: 'sk_live_abc123...',  // ❌ Visible in build artifacts!
  }
});
```

**✅ DO THIS INSTEAD:**
```typescript
// resource.ts - Secure!
export const myFunction = defineFunction({
  environment: {
    API_KEY: secret('MY_API_KEY'),  // ✅ Encrypted in SSM Parameter Store
  }
});
```

**Why:** Regular environment variables are stored in plaintext in build artifacts and CloudFormation.

---

### Anti-Pattern 4: Not Using Type-Safe `env` Symbol

**❌ LESS IDEAL:**
```typescript
// handler.ts
export const handler = async (event) => {
  const apiUrl = process.env.API_ENDPOINT;  // No autocomplete, no type checking
  const batch = parseInt(process.env.BATCH_SIZE || '10');
};
```

**✅ BETTER:**
```typescript
// handler.ts
import { env } from '$amplify/env/my-function';

export const handler = async (event) => {
  const apiUrl = env.API_ENDPOINT;  // ✅ Autocomplete + type checking
  const batch = parseInt(env.BATCH_SIZE);
};
```

**Why:** Type safety catches errors at compile time, not runtime.

---

## 📋 Best Practices

### 1. **Always Provide Fallback Values**

```typescript
environment: {
  API_ENDPOINT: process.env.API_ENDPOINT || 'https://api.dev.example.com',
  LOG_LEVEL: process.env.LOG_LEVEL || 'INFO',
  DEPLOY_BRANCH: process.env.AWS_BRANCH || 'main',
}
```

**Why:** Prevents undefined values in sandbox or when env vars are missing.

---

### 2. **Use Type-Safe Access**

```typescript
// ✅ Preferred
import { env } from '$amplify/env/my-function';
const apiUrl = env.API_ENDPOINT;

// ❌ Less ideal
const apiUrl = process.env.API_ENDPOINT;
```

**Why:** Autocomplete, type checking, and refactoring support.

---

### 3. **Document Environment-Specific Behavior**

```typescript
environment: {
  // Production: 1000 records per batch
  // Dev/Sandbox: 10 records per batch (faster testing)
  BATCH_SIZE: process.env.AWS_BRANCH === 'main' ? '1000' : '10',

  // Production: INFO logs only
  // Dev/Sandbox: DEBUG logs for troubleshooting
  LOG_LEVEL: process.env.AWS_BRANCH === 'main' ? 'INFO' : 'DEBUG',
}
```

**Why:** Makes environment differences explicit and easier to understand.

---

### 4. **Group Related Variables**

```typescript
environment: {
  // External API configuration
  STRIPE_API_URL: process.env.STRIPE_API_URL || 'https://api.stripe.com',
  STRIPE_API_VERSION: '2023-10-16',
  STRIPE_SECRET_KEY: secret('STRIPE_SECRET_KEY'),

  // Performance tuning
  BATCH_SIZE: '100',
  MAX_RETRIES: '3',
  TIMEOUT_MS: '30000',

  // Feature flags
  ENABLE_CACHING: 'true',
  ENABLE_BETA_FEATURES: 'false',
}
```

**Why:** Improves readability and maintenance.

---

### 5. **Use Secrets for Sensitive Data**

```typescript
environment: {
  // ✅ Public configuration
  API_ENDPOINT: 'https://api.example.com',

  // ✅ Secrets
  API_KEY: secret('MY_API_KEY'),
  DATABASE_PASSWORD: secret('DB_PASSWORD'),
  OAUTH_CLIENT_SECRET: secret('OAUTH_SECRET'),
}
```

**Why:** Keeps sensitive data encrypted and out of version control.

---

## ❓ FAQ

### Q: How do I see what environment variables my Lambda has?

**A:** Add debug logging to your handler:

```typescript
export const handler = async (event) => {
  // Log all environment variables
  console.log('Environment variables:', JSON.stringify(process.env, null, 2));

  // Log specific variables
  console.log('DEPLOY_BRANCH:', process.env.DEPLOY_BRANCH);
  console.log('API_ENDPOINT:', process.env.API_ENDPOINT);
};
```

Check CloudWatch Logs after invoking the function.

---

### Q: Can I use `.env` files?

**A:** Yes, but with caveats:

```typescript
// resource.ts
import 'dotenv/config';  // Load .env file

export const myFunction = defineFunction({
  environment: {
    EXTERNAL_API_KEY: process.env.EXTERNAL_API_KEY || 'default',
  }
});
```

**Important:**
- `.env` files are NOT automatically loaded by Amplify
- Only works during local development/testing
- Production deployments need Amplify hosting environment variables
- Add `.env` to `.gitignore` to avoid committing secrets

---

### Q: How do I set different values for sandbox vs production?

**A:** Use `AWS_BRANCH` to detect environment:

```typescript
// resource.ts
environment: {
  API_ENDPOINT: process.env.AWS_BRANCH === 'main'
    ? 'https://api.prod.example.com'
    : 'https://api.dev.example.com',

  DEPLOY_BRANCH: process.env.AWS_BRANCH || 'sandbox',
}
```

Or use Amplify hosting environment variables (per-branch configuration).

---

### Q: What's the difference between `environment` variables and `secret()`?

**A:**

| Feature | `environment` | `secret()` |
|---------|--------------|-----------|
| **Visibility** | Plaintext in build artifacts | Encrypted in SSM |
| **Storage** | CloudFormation template | AWS Systems Manager |
| **Version control** | Can be committed | Never committed |
| **Use case** | Public config, endpoints | API keys, passwords |
| **Setting values** | In code | CLI or Amplify Console |

---

### Q: Can I pass environment variables from `backend.ts` to `resource.ts`?

**A:** No. They execute in the same build-time context, so both have access to the same `process.env` variables.

```typescript
// backend.ts and resource.ts both have access to:
process.env.AWS_BRANCH
process.env.AWS_REGION
process.env.ENV
// etc.
```

---

### Q: Why isn't `AWS_BRANCH` available in my Lambda handler?

**A:** `AWS_BRANCH` is a **build-time** variable. Lambda handlers run at **runtime**.

**Solution:** Pass it explicitly:

```typescript
// resource.ts - Capture at build-time
environment: {
  DEPLOY_BRANCH: process.env.AWS_BRANCH || 'main',
}

// handler.ts - Access at runtime
import { env } from '$amplify/env/my-function';
const branch = env.DEPLOY_BRANCH;
```

See: [BACKEND_ENV_CONFIG.md](./BACKEND_ENV_CONFIG.md) for more details.

---

### Q: Do I need to restart my sandbox after changing environment variables?

**A:** Yes. Environment variables are set during deployment.

```bash
# Stop sandbox
# Update environment variables in resource.ts
# Restart sandbox
npx ampx sandbox
```

The new values will be available after redeployment.

---

### Q: How do I access AWS Lambda built-in variables?

**A:** Use `process.env` directly (these aren't in your `environment` config):

```typescript
export const handler = async (event) => {
  console.log('Function name:', process.env.AWS_LAMBDA_FUNCTION_NAME);
  console.log('Function version:', process.env.AWS_LAMBDA_FUNCTION_VERSION);
  console.log('Memory limit:', process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE);
  console.log('Log group:', process.env.AWS_LAMBDA_LOG_GROUP_NAME);
  console.log('Region:', process.env.AWS_REGION);
};
```

---

## 🔗 Related Documentation

- [BACKEND_ENV_CONFIG.md](./BACKEND_ENV_CONFIG.md) - Environment awareness (sandbox vs dev vs production)
- [functions/LAMBDA_DYNAMODB_ACCESS.md](./functions/LAMBDA_DYNAMODB_ACCESS.md) - Why you don't need table names
- [functions/scheduledFunction/](./functions/scheduledFunction/) - Scheduled function examples
- [AI-DEVELOPMENT-GUIDELINES.md](./AI-DEVELOPMENT-GUIDELINES.md) - The "No CDK" rule

---

## ✅ Quick Checklist

Before deploying your Lambda function with environment variables:

- [ ] Used `environment: {}` in `defineFunction()` for most variables
- [ ] Used `secret()` for sensitive data (API keys, passwords)
- [ ] Only used `addEnvironment()` for CDK-generated ARNs (if any)
- [ ] Provided fallback values for all variables
- [ ] Used `env` symbol for type-safe access in handler
- [ ] Documented environment-specific behavior
- [ ] Added `.env` to `.gitignore` if using dotenv
- [ ] NOT passing DynamoDB table names (using `resourceGroupName: 'data'` instead)
- [ ] NOT assuming `AWS_BRANCH` exists at runtime

---

**Remember:** Use `environment: {}` in `defineFunction()` for 95% of use cases. Only reach for `addEnvironment()` when you have CDK-generated values. Always use `secret()` for sensitive data.

Happy configuring! 🚀
