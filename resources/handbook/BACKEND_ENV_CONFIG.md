# 🎛️ Backend Environment Configuration

**How to write environment-aware backend code that behaves differently in sandbox, dev, and production.**

---

## 🎯 The Problem

You're building a scheduled Lambda function that runs every minute to check for new jobs. Great! But now you have a problem:

- **Production deployment** is running the schedule ✅
- **Your sandbox** is ALSO running the schedule ✅
- **Your teammate's sandbox** is ALSO running the schedule ✅
- **Dev environment** is ALSO running the schedule ✅

**Result:** 4+ duplicate executions, 4x the AWS costs, potential race conditions, and chaos.

**The solution:** Environment-aware backend configuration.

---

## 🌍 AWS Amplify Branches ≠ GitHub Branches

This is the most important concept to understand:

### AWS Amplify Branches (Deployment Environments)

**These are deployment targets in AWS Amplify:**

| AWS Branch | What It Is | When It Exists |
|------------|------------|----------------|
| `'main'` | Production deployment | Deployed from GitHub `main` branch |
| `'dev'` | Development environment | Deployed from GitHub `dev` branch |
| `'uat'` | User acceptance testing | Deployed from GitHub `uat` branch |
| `undefined` | **Sandbox** | Running locally via `npx ampx sandbox` |

### GitHub Branches (Source Control)

**These are just your git branches:**
- `main`, `dev`, `feature/new-thing`, etc.
- They determine which code is deployed
- They do NOT determine environment behavior

### The Key Distinction

```typescript
// ❌ WRONG - This is a GitHub branch
git checkout main

// ✅ CORRECT - This is an AWS Amplify environment variable
const awsBranch = process.env.AWS_BRANCH; // 'main' | 'dev' | undefined
```

**When you run `npx ampx sandbox`:**
- You might be on git branch `main` or `feature/xyz`
- But `process.env.AWS_BRANCH` is `undefined` (sandbox has no AWS branch)

**When Amplify deploys from GitHub:**
- Your code is pushed to git branch `main`
- Amplify creates a deployment with `process.env.AWS_BRANCH = 'main'`

---

## ⚠️ Critical: Build-Time vs Runtime

**Before we dive into patterns, understand this critical distinction:**

### AWS_BRANCH Availability

| Context | AWS_BRANCH Available? | Purpose |
|---------|----------------------|---------|
| **Build-Time** (`backend.ts`, `resource.ts`) | ✅ YES | Decide which resources to create |
| **Runtime** (Lambda `handler.ts`) | ❌ NO | Execute business logic |

**What this means:**
- You can use `AWS_BRANCH` in `backend.ts` to decide if schedules should be created
- Lambda functions do NOT automatically have access to `AWS_BRANCH`
- If Lambda needs branch awareness, you must pass it explicitly

**See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for the complete guide on passing environment variables to Lambda functions.**

---

## 🔍 Environment Detection Pattern

### Build-Time Detection (backend.ts)

```typescript
// In amplify/backend.ts
const awsBranch = process.env.AWS_BRANCH;

// Common checks
const isProduction = awsBranch === 'main';
const isDevelopment = awsBranch === 'dev';
const isSandbox = awsBranch === undefined;
const isDeployed = awsBranch !== undefined; // Any deployment (not sandbox)
```

**Use this for:** Conditional resource creation (schedules, streams, expensive operations)

### Log for Debugging

**Always log the environment** so you can debug deployment issues:

```typescript
console.log(`🔧 Backend Configuration:`);
console.log(`   AWS_BRANCH: ${awsBranch || 'undefined (sandbox)'}`);
console.log(`   Environment: ${isProduction ? 'PRODUCTION' : isDevelopment ? 'DEVELOPMENT' : 'SANDBOX'}`);
```

**Output in sandbox:**
```
🔧 Backend Configuration:
   AWS_BRANCH: undefined (sandbox)
   Environment: SANDBOX
```

**Output in production:**
```
🔧 Backend Configuration:
   AWS_BRANCH: main
   Environment: PRODUCTION
```

---

## 🎯 Real-World Example: Conditional EventBridge Schedules

**Problem:** You have a Lambda that checks Upwork for new jobs every minute. You only want it running in production, not in every developer's sandbox.

### Complete Implementation

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Duration } from 'aws-cdk-lib';
import { upworkJobsMonitor } from './functions/upwork-jobs-monitor/resource';

const backend = defineBackend({
  upworkJobsMonitor
});

/**
 * 🎛️ Environment Detection
 *
 * AWS_BRANCH is set by Amplify during deployment:
 * - 'main' = Production deployment from GitHub
 * - 'dev' = Development branch deployment
 * - undefined = Sandbox (local development)
 */
const awsBranch = process.env.AWS_BRANCH;
const isMainBranch = awsBranch === 'main';

// Log for debugging
console.log(`🔧 Backend Configuration:`);
console.log(`   AWS_BRANCH: ${awsBranch || 'undefined (sandbox)'}`);
console.log(`   EventBridge Schedules: ${isMainBranch ? '✅ ENABLED' : '❌ DISABLED'}`);

if (isMainBranch) {
  /**
   * ✅ PRODUCTION: Enable scheduled monitoring
   *
   * This only runs in production deployment, preventing:
   * - Duplicate executions from developer sandboxes
   * - Unnecessary AWS costs
   * - Race conditions between environments
   */
  new Rule(backend.upworkJobsMonitor.resources.lambda.stack, 'UpworkJobsMonitorSchedule', {
    schedule: Schedule.rate(Duration.minutes(1)), // Every minute
    description: 'Monitor fresh Upwork jobs and post to Slack',
    targets: [new LambdaFunction(backend.upworkJobsMonitor.resources.lambda)]
  });
} else {
  /**
   * ❌ SANDBOX/DEV: Schedules disabled
   *
   * You can still manually invoke the Lambda for testing,
   * but it won't run automatically.
   */
  console.log(`⏸️  Schedules disabled: Not on main branch (current: ${awsBranch || 'sandbox'})`);
}
```

### What Happens

**When you run `npx ampx sandbox`:**
```
🔧 Backend Configuration:
   AWS_BRANCH: undefined (sandbox)
   EventBridge Schedules: ❌ DISABLED
⏸️  Schedules disabled: Not on main branch (current: sandbox)
```
- Lambda function is created ✅
- You can manually invoke it for testing ✅
- EventBridge schedule is NOT created ✅
- No automatic executions ✅

**When deployed to production:**
```
🔧 Backend Configuration:
   AWS_BRANCH: main
   EventBridge Schedules: ✅ ENABLED
```
- Lambda function is created ✅
- EventBridge schedule IS created ✅
- Runs every minute automatically ✅
- Only ONE instance running ✅

---

## 🔄 Passing AWS_BRANCH to Lambda Functions

**If your Lambda function needs to know which branch it's deployed to**, you must pass it explicitly:

### The Correct Pattern

```typescript
// amplify/functions/my-function/resource.ts
import { defineFunction } from '@aws-amplify/backend';

export const myFunction = defineFunction({
  name: 'my-function',
  entry: './handler.ts',
  environment: {
    // Capture AWS_BRANCH at build-time, pass to runtime
    DEPLOY_BRANCH: process.env.AWS_BRANCH || 'main',
  }
});
```

```typescript
// amplify/functions/my-function/handler.ts
import { env } from '$amplify/env/my-function';

export const handler = async (event) => {
  const branch = env.DEPLOY_BRANCH; // ✅ Available at runtime

  if (branch === 'main') {
    // Production behavior: send real emails, charge real payments
    await sendProductionEmail();
  } else {
    // Dev/sandbox behavior: just log, use test mode
    console.log('Would send email in production');
  }
};
```

### Why This Works

1. **Build-time** (`resource.ts` executes): `process.env.AWS_BRANCH` is available
2. **Capture the value**: Store it in `environment.DEPLOY_BRANCH`
3. **Runtime** (`handler.ts` executes): `env.DEPLOY_BRANCH` is available

**See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for complete details on passing environment variables.**

---

## 🛠️ Common Use Cases

### 1. Enable Schedules Only in Production

**Use case:** Cron jobs, background tasks, monitoring

```typescript
const isProduction = process.env.AWS_BRANCH === 'main';

if (isProduction) {
  // Create EventBridge schedule
  new Rule(stack, 'DailyReport', {
    schedule: Schedule.cron({ hour: '9', minute: '0' }), // 9 AM daily
    targets: [new LambdaFunction(reportFunction)]
  });
}
```

### 2. Different Configuration Per Environment

**Use case:** Rate limiting, batch sizes, API quotas

```typescript
const awsBranch = process.env.AWS_BRANCH;

// Different batch sizes per environment
const batchSize =
  awsBranch === 'main' ? 100 :  // Production: larger batches
  awsBranch === 'dev' ? 10 :     // Dev: smaller batches
  1;                             // Sandbox: minimal for testing

backend.batchProcessor.resources.lambda.addEnvironment('BATCH_SIZE', batchSize.toString());
```

### 3. Enable Beta Features in Dev Only

**Use case:** Testing new integrations before production

```typescript
const isDev = process.env.AWS_BRANCH === 'dev';
const isSandbox = process.env.AWS_BRANCH === undefined;
const isDevOrSandbox = isDev || isSandbox;

if (isDevOrSandbox) {
  // Enable experimental feature
  backend.betaFeature.resources.lambda.addEnvironment('ENABLE_BETA', 'true');
  console.log('✅ Beta features enabled');
}
```

### 4. Different Secrets Per Environment

**Use case:** Different API keys for dev vs production

```typescript
const awsBranch = process.env.AWS_BRANCH;

const secretName =
  awsBranch === 'main' ? 'prod/stripe-api-key' :
  awsBranch === 'dev' ? 'dev/stripe-api-key' :
  'sandbox/stripe-api-key';

backend.paymentProcessor.resources.lambda.addEnvironment('SECRET_NAME', secretName);
```

### 5. Disable Expensive Operations in Sandbox

**Use case:** Save costs during development

```typescript
const isProduction = process.env.AWS_BRANCH === 'main';

// Only enable real-time processing in production
if (isProduction) {
  // DynamoDB Streams trigger
  backend.realtimeProcessor.resources.lambda.addEventSource(
    new DynamoEventSource(backend.data.resources.tables['Orders'], {
      startingPosition: lambda.StartingPosition.LATEST
    })
  );
} else {
  console.log('⏸️  DynamoDB Streams disabled in non-production');
}
```

---

## 🧠 Best Practices

### 1. Always Log Environment Detection

```typescript
const awsBranch = process.env.AWS_BRANCH;
console.log(`🔧 Environment: ${awsBranch || 'sandbox'}`);
```

**Why:** Makes debugging deployment issues 10x easier.

### 2. Default to Safe Behavior

```typescript
// ❌ BAD - Defaults to production behavior
const enableSchedules = process.env.AWS_BRANCH !== 'dev';

// ✅ GOOD - Defaults to sandbox behavior (safe)
const enableSchedules = process.env.AWS_BRANCH === 'main';
```

**Why:** If `AWS_BRANCH` is unexpectedly `undefined` or a new value, you want conservative behavior.

### 3. Make Conditionals Explicit

```typescript
// ❌ BAD - Unclear intent
if (process.env.AWS_BRANCH) {
  createSchedule();
}

// ✅ GOOD - Clear what you're checking
const isProduction = process.env.AWS_BRANCH === 'main';
if (isProduction) {
  createSchedule();
}
```

### 4. Document Why Features Are Conditional

```typescript
if (isMainBranch) {
  /**
   * ✅ PRODUCTION: Enable scheduled monitoring
   *
   * Disabled in sandbox/dev to prevent:
   * - Duplicate Slack notifications
   * - Race conditions with production data
   * - Unexpected AWS costs
   */
  new Rule(...);
}
```

### 5. Test Both Code Paths

**In sandbox:**
- Verify schedules are NOT created
- Verify Lambda still exists and can be invoked manually

**In production:**
- Verify schedules ARE created
- Verify correct schedule expression
- Monitor CloudWatch for executions

---

## 📊 Environment Comparison Table

| Feature | Sandbox (`undefined`) | Dev (`'dev'`) | Production (`'main'`) |
|---------|----------------------|---------------|----------------------|
| **EventBridge Schedules** | ❌ Disabled | ❌ Disabled | ✅ Enabled |
| **DynamoDB Streams** | ❌ Disabled | ⚠️ Optional | ✅ Enabled |
| **Real-time Processing** | ❌ Disabled | ⚠️ Optional | ✅ Enabled |
| **External API Calls** | ⚠️ Test mode | ⚠️ Test mode | ✅ Live mode |
| **Batch Size** | Small (1-10) | Medium (10-50) | Large (100+) |
| **Rate Limiting** | Strict | Moderate | Production limits |
| **Logging Level** | DEBUG | DEBUG | INFO/WARN |
| **Secrets** | Sandbox secrets | Dev secrets | Prod secrets |

---

## 🚨 Common Pitfalls

### Pitfall 1: Confusing Git Branches with AWS Branches

```typescript
// ❌ WRONG - This is checking git branch
if (getCurrentGitBranch() === 'main') {
  createSchedule(); // Will run in sandbox if you're on git main!
}

// ✅ CORRECT - Check AWS_BRANCH
if (process.env.AWS_BRANCH === 'main') {
  createSchedule();
}
```

### Pitfall 2: Forgetting Sandbox Has No AWS_BRANCH

```typescript
// ❌ BAD - Truthy check includes 'dev', 'uat', etc.
if (process.env.AWS_BRANCH) {
  createSchedule(); // Runs in dev too!
}

// ✅ GOOD - Explicit check
if (process.env.AWS_BRANCH === 'main') {
  createSchedule();
}
```

### Pitfall 3: Not Logging Environment

```typescript
// ❌ BAD - Silent behavior differences
if (process.env.AWS_BRANCH === 'main') {
  createSchedule();
}

// ✅ GOOD - Explicit logging
if (process.env.AWS_BRANCH === 'main') {
  console.log('✅ Creating production schedule');
  createSchedule();
} else {
  console.log('⏸️  Skipping schedule (not production)');
}
```

### Pitfall 4: Hardcoding Environment Values

```typescript
// ❌ BAD - Hardcoded
backend.myFunction.resources.lambda.addEnvironment('API_KEY', 'prod-key-123');

// ✅ GOOD - Environment-aware
const apiKey = process.env.AWS_BRANCH === 'main' ? 'prod-key-123' : 'dev-key-456';
backend.myFunction.resources.lambda.addEnvironment('API_KEY', apiKey);
```

---

## 🔗 Related Guides

- **[ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)** - Complete guide to passing env vars to Lambda functions
- **[QUICK_START.md](./QUICK_START.md)** - Sandbox vs production differences
- **[functions/scheduledFunction/](./functions/scheduledFunction/)** - EventBridge schedule examples
- **[AI-DEVELOPMENT-GUIDELINES.md](./AI-DEVELOPMENT-GUIDELINES.md)** - When to use CDK escape hatches

---

## 💡 Pro Tips

### For AI Assistants

- **Check for environment awareness** when creating schedules, streams, or expensive operations
- **Suggest logging** environment detection for debugging
- **Default to sandbox-safe behavior** (features disabled unless explicitly enabled for production)
- **Reference this guide** when users ask about "running only in production"

### For Developers

- **Think about every developer's sandbox** when adding automated features
- **Log environment detection** at the top of `backend.ts`
- **Test in sandbox first** - verify schedules are NOT created
- **Monitor production logs** - verify schedules ARE created and running
- **Document conditional logic** - explain why features are environment-specific

---

## 🎯 Summary

**The Pattern:**
```typescript
const awsBranch = process.env.AWS_BRANCH;
const isProduction = awsBranch === 'main';

if (isProduction) {
  // Production-only features
}
```

**Key Concepts:**
- AWS_BRANCH = Amplify deployment environment (NOT git branch)
- `undefined` = Sandbox (local development)
- `'main'` = Production deployment
- Default to safe/sandbox behavior
- Always log environment detection

**Common Use Cases:**
- EventBridge schedules (production only)
- DynamoDB Streams (production only)
- Different batch sizes per environment
- Different secrets per environment
- Beta features (dev/sandbox only)

Now go build environment-aware backends! 🚀
