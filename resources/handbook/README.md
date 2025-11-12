# 📖 Amplify Gen 2 Developer Handbook

**Your complete guide to building production-ready apps with AWS Amplify Gen 2 and Next.js.**

---

## 🎯 Quick Navigation: "I Need To..."

Use this table to jump directly to what you need:

| I Need To... | Go Here |
|--------------|---------|
| **Get AWS resource names (tables, functions)** | [RESOURCE_NAME_CAPTURE.md](#-critical-resource-names-are-auto-captured) 🎯 **AI: READ THIS!** |
| **Set up authentication** | [`auth/` folder](#-authentication) |
| **Set up custom subdomain for client app** | [CUSTOM_HOSTING_DOMAIN.md](#-deployment--infrastructure) ⭐ NEW |
| **Set up custom Cognito domain (auth.client.domain.com)** | [pending/COGNITO_CUSTOM_DOMAIN.md](#-pending--future-implementations) ⚠️ Pending |
| **Connect to DynamoDB / Create database schema** | [`data/` folder](#-data--database) |
| **Fix GraphQL schema errors / Naming conflicts** | [data/TROUBLESHOOTING.md](./data/TROUBLESHOOTING.md) ⭐ NEW |
| **Auto-delete temporary data (webhooks, sessions)** | [TTL_PATTERN.md](#-data--database) ⭐ NEW |
| **Give Lambda access to DynamoDB/S3/Cognito** | [`functions/LAMBDA_*_ACCESS.md`](#-lambda-permissions) |
| **Store API keys/OAuth tokens securely** | [SECRETS_MANAGER_IAM.md](#-lambda-functions) ⭐ NEW |
| **Create public Lambda endpoint (no API Gateway)** | [LAMBDA_FUNCTION_URLS.md](#-lambda-functions) ⭐ NEW |
| **Deploy ML models / Heavy Python dependencies** | [docker-lambda/](#-docker-lambda-functions) |
| **Deploy custom binaries (yt-dlp, FFmpeg)** | [docker-lambda/TYPESCRIPT.md](#-docker-lambda-functions) |
| **Create a backend API endpoint** | [NO-API-GATEWAY.md](#-never-use-api-gateway) |
| **Handle webhooks from Slack/Stripe/GitHub** | [`webhooks/` folder](#-webhooks-from-external-services) |
| **Run background jobs / scheduled tasks** | [`functions/` folder](#-lambda-functions) |
| **Handle long-running operations (> 30 seconds)** | [ASYNC_PATTERNS.md](#-async-patterns-bypassing-30-second-timeout) |
| **Manage secrets & environment variables (unified standard)** | [SECRETS_MANAGEMENT_STANDARD.md](#-secrets-management-official-standard) ⭐ NEW |
| **Pass environment variables to Lambda functions** | [ENVIRONMENT_VARIABLES.md](#-environment-variables) |
| **Enable features only in production / Detect environment** | [BACKEND_ENV_CONFIG.md](#-backend-environment-configuration) |
| **Build the frontend / Connect to backend** | [`frontend/` folder](#-frontend--client-side) |
| **Fix TypeScript import errors (@/ vs @root)** | [PATH_ALIASES.md](./frontend/PATH_ALIASES.md) ⭐ NEW |
| **Implement glassmorphism / liquid glass design** | [LIQUID_GLASS_DESIGN.md](#-frontend--client-side) ⭐ NEW |
| **Fix deployment errors / Debug issues** | [`troubleshooting/` folder](#-troubleshooting) ⭐ NEW |
| **Understand the rules** | [AI-DEVELOPMENT-GUIDELINES.md](#-critical-must-read-first) |

---

## 🚨 CRITICAL: Must Read First

### [AI-DEVELOPMENT-GUIDELINES.md](./AI-DEVELOPMENT-GUIDELINES.md)

**Read this BEFORE adding any backend code.**

**What's inside:**
- ❌ **The "No CDK" rule** - Never import from `aws-cdk-lib`
- ✅ **What you CAN use** - `defineAuth`, `defineData`, `defineFunction`, `defineStorage`
- 🧠 **Decision trees** - "Should I use this AWS service?"
- 🚫 **Common anti-patterns** - What NOT to do
- 📋 **Pre-commit checklist** - Ensure you're following best practices

**TL;DR:** Only use Amplify abstractions. Never raw CDK.

---

## 🔍 CRITICAL: Resource Names Are Auto-Captured

### [data/RESOURCE_NAME_CAPTURE.md](./data/RESOURCE_NAME_CAPTURE.md)

**🎯 FOR AI ASSISTANTS: Read this immediately! You have automatic access to all AWS resource names.**

**What You Need to Know:**

AWS auto-generates physical resource names that are hard to discover:
- **DynamoDB tables**: `Todo-4mogzwizrffkrmux5kud2mtuiy-NONE`
- **Lambda functions**: `amplify-myapp-sayHello-xyz789abc`

**✅ YOU HAVE AUTOMATIC ACCESS TO THESE NAMES!**

They're exported to `amplify_outputs.json` in this structure:

```json
{
  "custom": {
    "resourceNames": {
      "tables": {
        "Todo": "Todo-jts2uzxkpfh6lktcv5bjojv6ny-NONE"
      },
      "functions": {
        "sayHello": "amplify-chilltemplate-sayHello-xyz789"
      }
    }
  }
}
```

**How to Use:**

**In code:**
```typescript
import outputs from './amplify_outputs.json';

const tableName = outputs.custom?.resourceNames?.tables?.Todo;
const funcName = outputs.custom?.resourceNames?.functions?.sayHello;
```

**In bash/CLI:**
```bash
# Get DynamoDB table name
TABLE_NAME=$(jq -r '.custom.resourceNames.tables.Todo' amplify_outputs.json)
aws dynamodb scan --table-name "$TABLE_NAME"

# Get Lambda function name
FUNC_NAME=$(jq -r '.custom.resourceNames.functions.sayHello' amplify_outputs.json)
aws lambda invoke --function-name "$FUNC_NAME" output.json
```

**Why This Matters:**
- ✅ **No guessing** - You always have the exact resource names
- ✅ **Easy debugging** - Find resources in AWS Console quickly
- ✅ **AWS CLI operations** - Run queries, scans, invocations without trial-and-error
- ✅ **Automatic** - New resources added to `defineBackend()` appear automatically

**When helping users:**
- Instead of saying "find the table name in AWS Console"
- Say: "Check `amplify_outputs.json` → `custom.resourceNames.tables.YourModel`"

**Implementation:** This pattern is already set up in `amplify/backend.ts` - you don't need to configure it!

---

### 🚨 IMPORTANT: Sandbox vs Deployed Resources

**There are TWO different ways to discover resources:**

#### 1️⃣ **Sandbox Resources (Local Development)**
**Source:** `amplify_outputs.json` in project root

This is YOUR local sandbox environment:
```bash
# This is YOUR sandbox - unique to your machine
npx ampx sandbox
```

Resource names are in `amplify_outputs.json`:
```json
{
  "custom": {
    "resourceNames": {
      "tables": { "Todo": "Todo-abc123-NONE" },
      "functions": { "sayHello": "amplify-sandbox-sayHello-xyz" }
    }
  }
}
```

**Use this when:**
- ✅ You're developing locally (`npx ampx sandbox`)
- ✅ You need table/function names for AWS CLI while testing
- ✅ You're debugging your local sandbox

#### 2️⃣ **Deployed Branch Resources (Production/Staging)**
**Source:** Amplify MCP Server Tools

These are DEPLOYED apps on AWS Amplify (not your sandbox):
- **Production** (main branch)
- **Staging** (dev branch)
- **Other environments**

**Use Amplify MCP tools to discover these:**

```typescript
// Available MCP tools:
amplify_discover_resources({
  appId: "d2gpfnvtyalr1k",
  branchName: "main",  // or "dev", "staging"
  resourceType: "lambda" | "dynamodb" | "cognito" | "all"
})

amplify_get_lambda_logs({
  appId: "d2gpfnvtyalr1k",
  functionName: "sayHello",
  timeRange: "15m"
})

amplify_get_appsync_logs({
  appId: "d2gpfnvtyalr1k",
  branchName: "main"
})
```

**Use MCP tools when:**
- ✅ Debugging production/staging issues
- ✅ Checking deployed app resources (not your sandbox)
- ✅ Viewing logs for deployed branches
- ✅ Getting environment-specific configuration

**Key Differences:**

| Aspect | Sandbox (Local) | Deployed (Production/Staging) |
|--------|----------------|-------------------------------|
| **Discovery** | `amplify_outputs.json` | Amplify MCP tools |
| **Scope** | YOUR local machine only | Shared team environment |
| **How to access** | Read local file | Call MCP functions |
| **Resource names** | `Todo-abc123-NONE` | `Todo-xyz789-main` |
| **When to use** | Local development | Production debugging |

**Summary:**
- 📁 **Local sandbox?** → Use `amplify_outputs.json`
- ☁️ **Deployed app?** → Use Amplify MCP server tools

---

## 🎛️ Backend Environment Configuration

### [BACKEND_ENV_CONFIG.md](./BACKEND_ENV_CONFIG.md)

**How to write environment-aware backend code that behaves differently in sandbox, dev, and production.**

**What's inside:**
- 🌍 **AWS Amplify Branches ≠ GitHub Branches** - Critical distinction
- 🔍 **Environment detection pattern** - Using `process.env.AWS_BRANCH`
- ⚡ **Conditional features** - EventBridge schedules, DynamoDB Streams, batch sizes
- 🎯 **Real-world examples** - Complete working code from production backends
- 🚨 **Common pitfalls** - What NOT to do

**The Problem:**
```
Your sandbox runs a schedule every minute ✅
Production runs the same schedule ✅
Your teammate's sandbox also runs it ✅
= 3+ duplicate executions, 3x costs, chaos ❌
```

**The Solution:**
```typescript
const awsBranch = process.env.AWS_BRANCH;
const isProduction = awsBranch === 'main';

if (isProduction) {
  // Only runs in production deployment
  new Rule(stack, 'Schedule', {
    schedule: Schedule.rate(Duration.minutes(1)),
    targets: [new LambdaFunction(myFunction)]
  });
}
```

**Key Concepts:**
- `AWS_BRANCH = 'main'` → Production deployment
- `AWS_BRANCH = 'dev'` → Development environment
- `AWS_BRANCH = undefined` → Sandbox (local)
- Different secrets, batch sizes, and feature flags per environment

**Common Use Cases:**
- Enable EventBridge schedules only in production
- Different API keys for dev vs production
- Beta features in dev/sandbox only
- Disable expensive operations during local development
- Environment-specific configuration

**TL;DR:** Use `process.env.AWS_BRANCH` to detect environment. Default to sandbox-safe behavior. Always log environment detection.

---

## 🔐 Secrets Management (Official Standard)

### [SECRETS_MANAGEMENT_STANDARD.md](./SECRETS_MANAGEMENT_STANDARD.md) ⭐ NEW

**⚖️ THE RULE - The official unified standard for managing secrets and environment variables across ALL BEONIQ Amplify Gen 2 projects.**

**What's inside:**
- 🎯 **ONE secret per repo** - Unified AWS Secrets Manager structure
- 🎭 **ONE methodology** - Works in both local development AND CI/CD
- 🔄 **Auto-detection** - Correct secrets for sandbox, dev, and main
- 📦 **Next.js instrumentation hook** - Automatic secret fetching on startup
- ✨ **Zero manual config** - No Amplify Console env vars needed
- 📝 **Complete implementation guide** - Step-by-step for new projects

**The Problem (OLD approach):**
```
❌ Multiple secrets per environment
❌ Manual Amplify Console configuration
❌ Duplicate secret management (Secrets Manager + Amplify)
❌ Bash parsing in amplify.yml
❌ Required .env.local files
```

**The Solution (NEW standard):**
```json
{
  "sandbox": { "service_name": {...} },
  "dev": { "service_name": {...} },
  "main": { "service_name": {...} }
}
```

**How it works:**
- `instrumentation.ts` runs on Next.js startup (local AND CI/CD)
- Auto-detects environment via `$AWS_BRANCH`
- Fetches from unified secret in AWS Secrets Manager
- Sets `process.env.*` variables programmatically
- Works with local AWS credentials or Amplify service role

**Key Benefits:**
- ✅ Single source of truth (AWS Secrets Manager only)
- ✅ Automatic environment detection
- ✅ No manual Amplify Console environment variables
- ✅ No .env.local required (but respects if present)
- ✅ Easier credential rotation
- ✅ Works for Next.js API routes
- ✅ Detailed startup logging

**This is THE standard for all future projects. No exceptions.**

---

## 🔧 Environment Variables

### [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)

**The complete guide to defining, passing, and accessing environment variables in Lambda functions.**

**What's inside:**
- 🛠️ **Three methods to define env vars** - When to use each approach
- 📖 **Two ways to access** - Type-safe `env` symbol vs traditional `process.env`
- ⏰ **Build-time vs runtime** - Critical AWS_BRANCH availability explanation
- 🌲 **Decision tree** - Which method to use for your use case
- 💼 **Common use cases** - Real-world examples with complete code
- 🚫 **Anti-patterns** - What NOT to do (DynamoDB table names, etc.)

**The Three Methods:**

```typescript
// Method 1: environment in defineFunction() (95% of use cases)
export const myFunction = defineFunction({
  environment: {
    DEPLOY_BRANCH: process.env.AWS_BRANCH || 'main',
    API_ENDPOINT: 'https://api.example.com',
  }
});

// Method 2: addEnvironment() in backend.ts (CDK-generated ARNs only)
(backend.myFunction.resources.lambda as Function).addEnvironment(
  'TOPIC_ARN',
  snsTopic.topicArn
);

// Method 3: secret() for sensitive data
export const myFunction = defineFunction({
  environment: {
    API_KEY: secret('MY_API_KEY'),
  }
});
```

**Accessing in handlers:**
```typescript
// Type-safe (recommended)
import { env } from '$amplify/env/my-function';
console.log(env.DEPLOY_BRANCH); // ✅ Autocomplete + type checking

// Traditional (also works)
console.log(process.env.DEPLOY_BRANCH); // ❌ No type safety
```

**Key Concepts:**
- AWS_BRANCH is NOT available at Lambda runtime (must be passed explicitly)
- Use Method 1 (`environment`) for 95% of use cases
- NEVER pass DynamoDB table names (use `resourceGroupName: 'data'` instead)
- Use `secret()` for API keys and passwords

**Common Use Cases:**
- Environment-specific configuration (dev vs production)
- External API integration (Stripe, SendGrid, etc.)
- Feature flags and conditional behavior
- Performance tuning (batch sizes, timeouts)

**TL;DR:** Use `environment: {}` in `defineFunction()` for almost everything. Only use `addEnvironment()` for CDK-generated ARNs. Always use `secret()` for sensitive data.

---

## ⏰ Async Patterns: Bypassing 30-Second Timeout

### [ASYNC_PATTERNS.md](./ASYNC_PATTERNS.md)

**How to handle operations that take longer than AWS's 29-30 second timeout limit (Claude API, ML models, file processing).**

**The Problem:**
```
All public HTTP endpoints in AWS timeout at 29-30 seconds:
- API Gateway: 29 seconds
- AppSync GraphQL: 30 seconds
- Lambda Function URLs: 30 seconds

But your operation takes 3+ minutes to complete!
```

**The Solution: Two Async Patterns**

This guide teaches both production-proven patterns and when to use each:

### Pattern 1: DynamoDB Stream Trigger
**Best for:** Frontend operations where users need real-time status updates

```typescript
// User submits query → Job created in DynamoDB (returns in 1 sec)
// DynamoDB Stream automatically triggers processor Lambda
// Lambda runs for 15 minutes, updates job status
// Frontend subscribes to real-time updates via GraphQL
```

**Pros:**
- ✅ Real-time UX ("Processing... 60% complete")
- ✅ Automatic retry logic
- ✅ Full audit trail in DynamoDB
- ✅ No manual invocation code

**Use cases:**
- AI chatbot on website
- Report generation dashboard
- File processing with progress
- Multi-step workflows

### Pattern 2: Lambda Self-Invoke
**Best for:** Webhook handlers that need immediate response

```typescript
// Webhook arrives → Lambda responds "200 OK" (< 1 sec)
// Lambda invokes itself asynchronously
// Second invocation processes slow work (up to 15 minutes)
// Posts result back to external service
```

**Pros:**
- ✅ Cheapest (no DynamoDB costs)
- ✅ Simplest (one function, one file)
- ✅ Perfect for webhooks (< 3 second response required)

**Use cases:**
- Slack bot commands
- Stripe payment webhooks
- GitHub event handlers
- Any webhook requiring fast acknowledgment

### What's Inside the Guide:

- 🚨 **The 30-second wall explained** - Why AWS enforces this limit
- 📊 **Pattern comparison table** - Cost, complexity, UX, use cases
- 🎯 **Decision matrix** - Which pattern for your scenario
- 💻 **Complete code examples** - From Rosario production (both patterns)
- 🧪 **Testing strategies** - How to test each pattern
- 💰 **Cost comparison** - Real numbers for 1,000 requests
- 🚨 **Common pitfalls** - Mistakes to avoid
- 📚 **Real-world examples** - Both patterns running in production

### Quick Decision:

| Your Scenario | Use This Pattern |
|---------------|------------------|
| Frontend chatbot/dashboard | Pattern 1 (DynamoDB Stream) |
| Slack/Stripe/GitHub webhook | Pattern 2 (Lambda Self-Invoke) |
| Need audit trail | Pattern 1 |
| Cost-sensitive | Pattern 2 |
| Need real-time status | Pattern 1 |
| Fire and forget | Pattern 2 |

**TL;DR:** Pattern 1 gives better UX but costs more. Pattern 2 is cheaper and simpler but users can't see progress. Both solve the 30-second timeout problem.

---

## 🚫 Never Use API Gateway

### Two Critical Guides

#### 1. [NO-API-GATEWAY.md](./NO-API-GATEWAY.md) - For Internal Backend Operations

**When:** You need to invoke a Lambda function from your frontend

**Solution:** Use GraphQL custom mutations/queries with the Amplify Data client

**Example use cases:**
- Process payments
- Run background jobs
- Admin operations
- Batch processing
- External API integrations

**Pattern:**
```typescript
// Schema: Define custom mutation
processPayment: a.mutation()
  .arguments({ orderId: a.string().required() })
  .handler(a.handler.function('processPayment'))

// Frontend: Call it
const { data } = await client.mutations.processPayment({ orderId });
```

#### 2. [WEBHOOKS-GUIDE.md](./WEBHOOKS-GUIDE.md) - For External Services

**When:** External services need to POST to your app

**Solution:** Use Next.js API routes in `app/api/`

**Example use cases:**
- Slack event subscriptions
- Stripe payment webhooks
- GitHub webhooks
- Twilio callbacks
- SendGrid events

**Pattern:**
```typescript
// app/api/slack/events/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  // Handle webhook
  return Response.json({ ok: true });
}
```

**URL:** `https://yourdomain.com/api/slack/events`

---

## 🔗 Webhooks from External Services

### [`webhooks/` folder](./webhooks/)

**Comprehensive guides for handling webhooks using Next.js API Routes + Amplify Data client.**

#### What's Inside:

1. **[README.md](./webhooks/README.md)** - Navigation hub and overview
   - Quick start guide
   - Common use cases (Slack, Stripe, GitHub)
   - Security best practices
   - Cost optimization with TTL

2. **[NEXTJS_API_ROUTES_PATTERN.md](./webhooks/NEXTJS_API_ROUTES_PATTERN.md)** ⭐ **MAIN GUIDE**
   - Complete implementation pattern
   - How `amplify_outputs.json` works as a bridge
   - The 3-second timeout problem and buffer pattern
   - Decision matrix: when to use this vs alternatives
   - Complete working examples

3. **[API_KEY_AUTH_EXPLAINED.md](./webhooks/API_KEY_AUTH_EXPLAINED.md)** - Deep Dive
   - How API key authentication works
   - ELI5 explanation
   - Security considerations
   - API key rotation
   - Testing and debugging

4. **[authorization-modes.md](./webhooks/authorization-modes.md)** - Reference
   - What works with API key vs what doesn't
   - Complete authorization comparison table
   - Decision trees for auth modes

5. **[troubleshooting.md](./webhooks/troubleshooting.md)** - Debugging
   - Most common errors and fixes
   - Debugging techniques
   - Testing checklist
   - Error lookup table

6. **[examples/](./webhooks/examples/)** - Production-Ready Code
   - **[slack-events/](./webhooks/examples/slack-events/)** - Complete Slack webhook ✅
   - **[stripe-payments/](./webhooks/examples/stripe-payments/)** - Stripe webhooks (coming soon)
   - **[github-events/](./webhooks/examples/github-events/)** - GitHub webhooks (coming soon)
   - **[shared/](./webhooks/examples/shared/)** - Reusable utilities

#### The Pattern:

**Key Discovery:**
- AppSync is NOT frontend-only - it's a cloud service
- Next.js API routes CAN access `amplify_outputs.json` when deployed
- API key authentication lets public endpoints write to DynamoDB
- No CDK. No API Gateway. No standalone Lambda resources.

**The Flow:**
```
External Webhook (Slack/Stripe/GitHub)
  ↓
Next.js API Route (becomes Lambda when deployed)
  ↓
Amplify Data Client (uses API key from amplify_outputs.json)
  ↓
AppSync GraphQL API
  ↓
DynamoDB
```

#### Quick Example:

```typescript
// lib/amplify-data-client.ts - Shared client
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from '@/amplify_outputs.json';

Amplify.configure(outputs, { ssr: true });

export const dataClient = generateClient<Schema>({
  authMode: 'apiKey', // Uses API key from outputs
});

// app/api/slack/events/route.ts - Webhook handler
import { dataClient, calculateTTL } from '@/lib/amplify-data-client';

export async function POST(request: Request) {
  const body = await request.json();

  // Write to DynamoDB with 10-minute TTL
  await dataClient.models.SlackEvent.create({
    eventId: body.event_id,
    data: body,
    ttl: calculateTTL(10), // Auto-delete
  });

  return Response.json({ ok: true });
}

// amplify/data/resource.ts - Schema
const schema = a.schema({
  SlackEvent: a.model({
    eventId: a.string().required(),
    data: a.json().required(),
    ttl: a.integer(),
  })
  .authorization((allow) => [
    allow.publicApiKey(), // ← Required for webhook access
  ]),
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
    apiKeyAuthorizationMode: { expiresInDays: 30 }, // ← Enable API key
  },
});
```

#### Why This Matters:

**❌ The old way (CDK):**
- API Gateway + standalone Lambda + manual IAM
- Hardcoded names → deployment conflicts
- Lots of boilerplate code
- Difficult to maintain

**✅ The new way (this pattern):**
- Next.js API routes + Amplify Data client
- Zero CDK code
- Simple API key authentication
- Fast iteration

#### Common Questions:

**Q: Can I use this for user-authenticated endpoints?**
A: No - this is for PUBLIC webhooks only. For user operations, use GraphQL custom mutations (see [NO-API-GATEWAY.md](./NO-API-GATEWAY.md)).

**Q: How do I handle slow processing (> 3 seconds)?**
A: Use the buffer pattern - acknowledge fast, then trigger a mutation for async processing. See [NEXTJS_API_ROUTES_PATTERN.md](./webhooks/NEXTJS_API_ROUTES_PATTERN.md#the-buffer-pattern).

**Q: What about webhook signature verification?**
A: Every example includes complete signature verification. See [examples/slack-events/route.ts](./webhooks/examples/slack-events/route.ts).

**Q: Is the API key secure?**
A: Yes for public webhooks - see [API_KEY_AUTH_EXPLAINED.md](./webhooks/API_KEY_AUTH_EXPLAINED.md#security-considerations).

#### Related Documentation:

- **[WEBHOOKS-GUIDE.md](./WEBHOOKS-GUIDE.md)** - Quick reference (redirects to webhooks/ folder)
- **[NO-API-GATEWAY.md](./NO-API-GATEWAY.md)** - For internal backend operations
- **[AI-DEVELOPMENT-GUIDELINES.md](./AI-DEVELOPMENT-GUIDELINES.md)** - The "No CDK" rule

---

## 🔐 Authentication

### [`auth/` folder](./auth/)

**Production-ready authentication with Amplify Gen 2 + Next.js. Complete client/server setup guides, OAuth patterns, and security best practices.**

#### 🎯 Start Here: [auth/README.md](./auth/README.md)

Navigation hub with "I Need To..." table for quick access to all auth guides.

#### What's Inside:

**🚀 Setup Guides (Required Reading):**

1. **[CLIENT_SIDE_SETUP.md](./auth/CLIENT_SIDE_SETUP.md)** ⭐ **NEW**
   - Complete client-side auth configuration
   - **🔥 CRITICAL:** `enable-oauth-listener` import (fixes OAuth callback issues)
   - AuthProvider with Hub events
   - OAuth flow timeline (14 steps explained)
   - Troubleshooting OAuth problems

2. **[SERVER_SIDE_SETUP.md](./auth/SERVER_SIDE_SETUP.md)** ⭐ **NEW**
   - Server-side auth for middleware/server components/API routes
   - `runWithAmplifyServerContext` deep dive
   - What `contextSpec` is (cookie accessor explained)
   - Three server contexts: Edge vs Node runtime
   - Route protection with middleware

**🧠 Conceptual Guides:**

3. **[HOW_AUTH_WORKS.md](./auth/HOW_AUTH_WORKS.md)**
   - Browser storage (cookies, localStorage)
   - OAuth callback flow - the ACTUAL story
   - JWT tokens explained
   - Hub events system

**🎨 Pattern Guides:**

4. **[AUTH_PATTERNS.md](./auth/AUTH_PATTERNS.md)** - 5 Complete Patterns
   - Pattern 1: Basic Email Auth (MVP)
   - Pattern 2: Social Authentication (Consumer apps)
   - Pattern 3: **B2B Multi-Tenant SaaS** ⭐ Most common
   - Pattern 4: Enterprise SSO (Corporate tools)
   - Pattern 5: Passwordless Auth (Modern UX)

5. **[TRIGGERS_GUIDE.md](./auth/TRIGGERS_GUIDE.md)** - Lambda Triggers
   - Pre Sign-up, Post Confirmation, Pre Token Generation
   - Custom claims for multi-tenancy
   - Complete Lambda examples

**🛠️ Practical Guides:**

6. **[GOOGLE_OAUTH_SETUP.md](./auth/GOOGLE_OAUTH_SETUP.md)**
   - Google Cloud Console configuration
   - OAuth credentials setup
   - Testing and troubleshooting

7. **[AUTO_CONFIRM_SETUP.md](./auth/AUTO_CONFIRM_SETUP.md)** ⭐ **NEW**
   - Enable instant sign-in without email verification
   - Pre Sign-up Lambda trigger implementation
   - Security trade-offs and CAPTCHA integration

8. **[SECURITY_CHECKLIST.md](./auth/SECURITY_CHECKLIST.md)**
   - ⚠️ **The One-Shot Schema Problem** - Custom attributes are permanent!
   - Cognito vs DynamoDB decision matrix

#### Key Discovery: The Missing Import

**Most OAuth implementations fail because of ONE missing line:**

```typescript
import "aws-amplify/auth/enable-oauth-listener";
```

Without this in your `AuthProvider`, OAuth callbacks don't fire Hub events and UI never updates. See [CLIENT_SIDE_SETUP.md](./auth/CLIENT_SIDE_SETUP.md) for full explanation.

#### Quick Decision: Which Auth Pattern?

```
Building a B2B SaaS? → Pattern 3 (Multi-Tenant)
Need Google/Facebook login? → Pattern 2 (Social)
Simple MVP with email/password? → Pattern 1 (Basic)
Corporate tool with Okta/Azure AD? → Pattern 4 (Enterprise SSO)
Magic link or SMS auth? → Pattern 5 (Passwordless)
```

#### Common Workflows:

| I Need To... | Go To |
|--------------|-------|
| **Set up auth from scratch** | CLIENT_SIDE_SETUP.md + SERVER_SIDE_SETUP.md |
| **Fix OAuth not updating UI** | CLIENT_SIDE_SETUP.md → `enable-oauth-listener` |
| **Auto-confirm users without email verification** | AUTO_CONFIRM_SETUP.md |
| **Protect routes on server** | SERVER_SIDE_SETUP.md → Middleware pattern |
| **Understand how it works** | HOW_AUTH_WORKS.md |

---

## 📊 Data / Database

### [`data/` folder](./data/)

**GraphQL schema examples and DynamoDB patterns.**

#### What's Inside:

1. **[simple-custom-operations.ts](./data/simple-custom-operations.ts)**
   - Basic Todo model (starter example)
   - Custom query example (`getUserStats`)
   - Custom mutation patterns
   - Authorization examples
   - Field types and validation

2. **[blog-schema.ts](./data/blog-schema.ts)**
   - Complete blog platform
   - Posts, profiles, comments
   - Search and trending operations
   - SEO metadata
   - Follow/unfollow functionality

3. **[ecommerce-schema.ts](./data/ecommerce-schema.ts)**
   - Full e-commerce platform
   - Products, variants, inventory
   - Shopping cart and checkout
   - Orders with status workflow
   - Reviews and ratings

4. **[TTL_PATTERN.md](./data/TTL_PATTERN.md)** ⭐ **NEW**
   - DynamoDB Time To Live (automatic data expiration)
   - Zero-cost automatic cleanup
   - Perfect for webhooks, sessions, rate limits
   - Cost savings: 85% reduction vs manual cleanup
   - Complete examples with caching patterns

#### Quick Start:

```typescript
// In amplify/data/resource.ts
const schema = a.schema({
  Todo: a.model({
    content: a.string()
  }).authorization((allow) => [allow.owner()])
});
```

#### Common Tasks:

| Task | Pattern |
|------|---------|
| **Create a database table** | Define a model in schema |
| **Add custom backend logic** | Create custom mutation/query |
| **Connect frontend to DynamoDB** | Use `client.models.ModelName.list()` |
| **Add authorization** | Use `.authorization((allow) => [...])` |
| **Query by specific field** | Add `.secondaryIndexes()` |

---

## 🔐 Lambda Permissions

### **NEVER Use CDK for Lambda Permissions**

Need your Lambda function to access DynamoDB, S3, or Cognito?

**❌ DON'T**: Import CDK libraries and create `PolicyStatement` objects
**✅ DO**: Use `resourceGroupName` and read the appropriate access guide

### Access Guides:

| What You Need | Read This Guide |
|---------------|-----------------|
| **Lambda → DynamoDB** | **[LAMBDA_DYNAMODB_ACCESS.md](./functions/LAMBDA_DYNAMODB_ACCESS.md)** ✅ Available |
| **Lambda → S3** | `LAMBDA_S3_ACCESS.md` (coming soon) |
| **Lambda → Cognito** | `LAMBDA_COGNITO_ACCESS.md` (coming soon) |

### Quick Example (DynamoDB Access):

```typescript
// In amplify/functions/myFunction/resource.ts
export const myFunction = defineFunction({
  name: 'my-function',
  entry: './handler.ts',
  resourceGroupName: 'data',  // ← One line. Done!
});
```

**No CDK imports. No PolicyStatements. No manual IAM management.**

Each access guide explains:
- The two-part pattern (resourceGroupName + allow.resource)
- Common errors and solutions ("malformed environment variables")
- Complete working examples
- ELI5 explanations

**See also**: [AI-DEVELOPMENT-GUIDELINES.md](./AI-DEVELOPMENT-GUIDELINES.md#-lambda-permissions-never-use-cdk) for the full "No CDK" rule.

---

## 🐳 Docker Lambda Functions

### [functions/docker-lambda/](./functions/docker-lambda/)

**Deploy Lambda functions with custom system binaries, ML models, or heavy dependencies that exceed the 250MB limit.**

**NEW:** Comprehensive guide with language-specific instructions:
- **[README.md](./functions/docker-lambda/README.md)** - Architecture decision tree (ARM64 vs AMD64)
- **[PYTHON.md](./functions/docker-lambda/PYTHON.md)** - ML models with XGBoost, TensorFlow, PyTorch
- **[TYPESCRIPT.md](./functions/docker-lambda/TYPESCRIPT.md)** - Custom binaries like yt-dlp, FFmpeg, Puppeteer

#### The Problem:

Standard Lambda deployment has a **250MB limit** (uncompressed), making ML workloads impossible:
- `numpy` + `pandas` + `scikit-learn` + `xgboost` = **~305MB** ❌
- Lambda Layers hit the same 250MB limit
- Optimization tricks (stripping .so files) are fragile and break

#### The Solution: Docker Container Lambda

**10 GB image limit** (40x larger!) - Modern best practice for ML workloads.

```typescript
// backend.ts - CDK escape hatch required
import * as lambda from 'aws-cdk-lib/aws-lambda';

const mlFunction = new lambda.DockerImageFunction(customStack, 'MLFunction', {
  code: lambda.DockerImageCode.fromImageAsset('./functions/ml-pipeline'),
  timeout: Duration.minutes(10),
  memorySize: 2048
});
```

#### Critical Discovery: Docker in Amplify Builds

**You MUST configure custom build environment or deployments will fail!**

1. **Set custom CodeBuild image:**
   - In Amplify Console → Build settings → Custom image
   - Use: `public.ecr.aws/codebuild/amazonlinux-x86_64-standard:5.0`

2. **Start Docker daemon in amplify.yml:**
   ```yaml
   backend:
     phases:
       build:
         commands:
           - /usr/local/bin/dockerd-entrypoint.sh  # Critical!
           - npm ci
           - npx ampx pipeline-deploy
   ```

**Without these steps**: Builds fail with `Unable to execute 'docker'` error

#### What's Inside the Guide:

- **Architecture decision tree** - ARM64 vs AMD64 (critical for Apple Silicon Macs!)
- **Complete step-by-step setup** - Directory structure, Dockerfile, handler
- **The "Felipe discovery"** - Critical CodeBuild configuration (saves hours of debugging!)
- **ARM64 native builds** - No cross-compilation needed on M1/M2/M3 Macs (20-34% cheaper!)
- **InvalidEntrypoint troubleshooting** - Fix architecture mismatch errors
- **Production examples** - XGBoost models, yt-dlp caption extraction, FFmpeg processing
- **Best practices** - Image optimization, monitoring, cost management

#### Quick Example:

```dockerfile
# functions/ml-pipeline/Dockerfile
FROM public.ecr.aws/lambda/python:3.11

COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r requirements.txt

COPY *.py ${LAMBDA_TASK_ROOT}/

CMD ["handler.lambda_handler"]
```

```python
# handler.py
import xgboost as xgb
import pandas as pd

def lambda_handler(event, context):
    # Load 150MB XGBoost model - no problem!
    model = xgb.Booster()
    model.load_model('/tmp/model.xgb')

    # Run prediction
    prediction = model.predict(data)

    return {'prediction': prediction}
```

#### When to Use This:

| Use Case | Use Docker Lambda? |
|----------|-------------------|
| **XGBoost, scikit-learn, TensorFlow** | ✅ Yes |
| **PyTorch, large models** | ✅ Yes |
| **Dependencies > 250MB** | ✅ Yes |
| **Simple Node.js/TypeScript** | ❌ No - use `defineFunction()` |
| **Small Python scripts** | ❌ No - use `defineFunction()` with runtime: 'python' |

#### Key Takeaways:

- ✅ **10 GB limit** removes size constraints entirely
- ✅ **CDK escape hatch required** (Amplify Gen2 has no native Docker abstraction)
- ✅ **CodeBuild configuration critical** (Docker daemon + custom image)
- ✅ **Modern best practice** for ML workloads (AWS samples use this)
- ⚠️ **Longer cold starts** (~5-15s vs ~1s for standard Lambda)
- 💡 **Use provisioned concurrency** for latency-sensitive ML APIs

#### Related Guides:

- [AI-DEVELOPMENT-GUIDELINES.md](./AI-DEVELOPMENT-GUIDELINES.md) - When to use CDK escape hatches
- [functions/scheduledFunction/](./functions/scheduledFunction/) - Cron job patterns (works with Docker Lambda)
- [functions/LAMBDA_DYNAMODB_ACCESS.md](./functions/LAMBDA_DYNAMODB_ACCESS.md) - Granting Docker Lambdas DynamoDB access

---

## ⚡ Lambda Functions

### [`functions/` folder](./functions/)

**Production-ready Lambda function patterns.**

#### What's Inside:

1. **[LAMBDA_FUNCTION_URLS.md](./functions/LAMBDA_FUNCTION_URLS.md)** ⭐ **NEW** - Public HTTPS Endpoints
   - Direct Lambda invocation without API Gateway
   - Built-in CORS configuration
   - Perfect for backend-only webhooks
   - 29-30 second timeout (same as API Gateway)
   - Complete examples with signature verification
   - Decision matrix: Function URL vs Next.js API route

2. **[SECRETS_MANAGER_IAM.md](./functions/SECRETS_MANAGER_IAM.md)** ⭐ **NEW** - Secure Credentials
   - AWS Secrets Manager for production secrets
   - IAM policy patterns (single secret, wildcard families, read/write)
   - OAuth token refresh examples
   - Secret caching (95% cost reduction)
   - Sandbox secrets vs Secrets Manager comparison
   - Complete troubleshooting guide

3. **[graphqlResolver/](./functions/graphqlResolver/)** - Custom GraphQL Operations
   - Type-safe handlers
   - IAM auth for system-level access
   - Data aggregation patterns
   - Business logic examples

4. **[scheduledFunction/](./functions/scheduledFunction/)** - Cron Jobs
   - EventBridge scheduled tasks
   - Direct DynamoDB access
   - Background processing
   - Data sync patterns

5. **[webhookHandler/](./functions/webhookHandler/)** - ⚠️ **DON'T USE THIS**
   - **Use Next.js API routes instead** (see WEBHOOKS-GUIDE.md)
   - This example is for educational purposes only

6. **[cognitoTrigger/](./functions/cognitoTrigger/)** - User Lifecycle
   - Pre/post sign-up hooks
   - Custom claims
   - User management

7. **[userTriggered/](./functions/userTriggered/)** - User-Initiated Jobs
   - Background processing from frontend
   - Async operations
   - Long-running tasks

#### Common Use Cases:

| Use Case | Solution |
|----------|----------|
| **Invoke Lambda from frontend** | GraphQL custom mutation (see NO-API-GATEWAY.md) |
| **Run every hour/day** | Scheduled function with `schedule: 'rate(1 hour)'` |
| **Process webhook from Slack** | Next.js API route (see WEBHOOKS-GUIDE.md) |
| **Deploy ML models (XGBoost, PyTorch)** | Docker Lambda (see docker-lambda/PYTHON.md) |
| **Deploy custom binaries (yt-dlp, FFmpeg)** | Docker Lambda (see docker-lambda/TYPESCRIPT.md) |
| **Customize auth flow** | Cognito trigger |
| **Background job from user action** | User-triggered function |

---

## 🎨 Frontend / Client-Side

### [`frontend/` folder](./frontend/)

**React/Next.js examples for connecting to your Amplify backend, plus complete design system guide.**

#### 🎯 Start Here: [frontend/README.md](./frontend/README.md)

Navigation hub with "I Need To..." table for quick access to all frontend guides.

#### What's Inside:

**⚙️ Configuration & Setup:**

1. **[PATH_ALIASES.md](./frontend/PATH_ALIASES.md)** ⭐ **NEW**
   - TypeScript path alias reference (`@/` vs `@root/`)
   - How to import from Amplify backend
   - Fix "Cannot find module" errors
   - Common import patterns for Schema types
   - Decision tree for choosing correct paths

**🎨 Design System:**

2. **[design/LIQUID_GLASS_DESIGN.md](./frontend/design/LIQUID_GLASS_DESIGN.md)** ⭐ **NEW**
   - Industrial Tron + Liquid Glass aesthetic
   - Apple-style glassmorphism with backdrop blur
   - **Physics-aided design** - Why white borders create glass illusion
   - Tron-style yellow glowing accents
   - MUI theme implementation
   - Radial gradient backgrounds
   - Oswald typography setup
   - Performance optimization tips
   - Complete real-world examples

**Key Design Technique:**
```css
/* The Secret Sauce for Liquid Glass */
background: rgba(255, 255, 255, 0.15);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.3);  /* WHITE border - critical! */
```

**📦 Data Operations:**

- **Authentication flows** - Sign up, sign in, password reset, MFA
- **Queries** - Read data from DynamoDB
- **Mutations** - Create, update, delete records
- **Subscriptions** - Real-time updates
- **Custom operations** - Call custom GraphQL mutations/queries

#### Quick Examples:

**Query data:**
```typescript
const { data } = await client.models.Todo.list();
```

**Create record:**
```typescript
const { data } = await client.mutations.createTodo({ content: "Learn Amplify" });
```

**Real-time subscription:**
```typescript
client.models.Todo.onCreate().subscribe({
  next: (newTodo) => console.log(newTodo)
});
```

**Call custom operation:**
```typescript
const { data } = await client.mutations.processPayment({ orderId: "123" });
```

**Import Schema type (correct path):**
```typescript
// ✅ CORRECT - Use @root for Amplify backend
import type { Schema } from '@root/amplify/data/resource';
import { generateClient } from 'aws-amplify/data';

const client = generateClient<Schema>();
```

#### Design System Quick Reference:

**Beon Color Palette:**
- Black `#000000` - Primary text, headers
- Yellow `#FFEF00` - CTAs, glows, highlights
- Cloud `#F1F4FA` - Page backgrounds
- Dark Teal `#007587` - Charts only

**Common Mistakes to Avoid:**
- ❌ Using black borders on glass (looks flat)
- ❌ Forgetting `-webkit-backdrop-filter` for Safari
- ❌ Solid backgrounds behind glass (effect invisible)
- ✅ Use white borders at low opacity
- ✅ Layer multiple radial gradients
- ✅ Double shadows for glow effects

---

## 🔧 Troubleshooting

### [`troubleshooting/` folder](./troubleshooting/)

**Common issues and solutions for AWS Amplify Gen 2 deployments.**

#### What's Inside:

1. **[troubleshooting/README.md](./troubleshooting/README.md)** - Navigation hub
   - Quick links to all troubleshooting guides
   - General debugging strategy
   - Common permission issues
   - Schema authorization problems

2. **[deployment/PARCEL_WATCHER_ERROR.md](./troubleshooting/deployment/PARCEL_WATCHER_ERROR.md)** ⭐ **NEW**
   - Fix `@parcel/watcher` build errors on AWS Amplify
   - Cross-platform npm dependency issues
   - `npm ci` vs `npm install` explained
   - Complete solution with `amplify.yml` updates

#### Common Deployment Errors:

**Error: No prebuild or local build of @parcel/watcher found**
- **Quick fix:** Regenerate `package-lock.json` with `npm install`, update `amplify.yml`
- **Full guide:** [PARCEL_WATCHER_ERROR.md](./troubleshooting/deployment/PARCEL_WATCHER_ERROR.md)

**Authentication issues:**
- See [auth/troubleshooting/](./auth/troubleshooting/)

**Webhook debugging:**
- See [webhooks/troubleshooting.md](./webhooks/troubleshooting.md)

**Scheduled function issues:**
- See [functions/scheduledFunction/TROUBLESHOOTING.md](./functions/scheduledFunction/TROUBLESHOOTING.md)

#### General Debugging Tips:

- ✅ Check CloudWatch logs (use MCP amplify tools)
- ✅ Verify `amplify.yml` build commands
- ✅ Validate schema authorization modes
- ✅ Confirm resource permissions (`resourceGroupName`)

---

## 🚀 Deployment / Infrastructure

### [`deployment/` folder](./deployment/)

**Infrastructure setup for multi-tenant client applications.**

#### What's Inside:

1. **[CUSTOM_HOSTING_DOMAIN.md](./deployment/CUSTOM_HOSTING_DOMAIN.md)** ⭐ **NEW**
   - Custom subdomain setup: `{client}.chinchilla-ai.com`
   - Multi-tenant naming pattern
   - AWS CLI automation (no more console clicking!)
   - MCP tool integration (coming soon)
   - Complete client setup workflow

**The Pattern:**
```
Client: Sony
Frontend: sony.chinchilla-ai.com
Auth: auth.sony.chinchilla-ai.com (see pending/)
```

**Automation:**
```bash
# One command to set up custom domain
aws amplify create-domain-association \
  --app-id $APP_ID \
  --domain-name sony.chinchilla-ai.com \
  --sub-domain-settings prefix=,branchName=main
```

**What This Replaces:**
- ❌ Manual clicking through AWS Console
- ❌ Copying/pasting domain names for each client
- ❌ Forgetting the naming pattern

**What You Get:**
- ✅ Consistent naming across all clients
- ✅ One-command domain setup
- ✅ Professional branded URLs for demos

---

## ⚠️ Pending / Future Implementations

### [`pending/` folder](./pending/)

**Features that are researched but not yet automated in the template.**

#### What's Inside:

1. **[pending/README.md](./pending/README.md)** - What belongs in this folder
   - Criteria for pending features
   - How to contribute research
   - When features graduate to main handbook

2. **[pending/COGNITO_CUSTOM_DOMAIN.md](./pending/COGNITO_CUSTOM_DOMAIN.md)** ⚠️ **PENDING**
   - Custom auth domains: `auth.{client}.chinchilla-ai.com`
   - Why this isn't automated yet
   - Manual workaround with CDK escape hatch
   - Waiting on Amplify Gen 2 native support

**Why Features Are Pending:**
- Amplify Gen 2 doesn't support them natively yet
- Requires too many manual steps to be practical
- Waiting on AWS to add features (tracked in GitHub issues)
- Complex workarounds that need more research

**How to Use Pending Docs:**
- Read to understand what's possible
- Use manual workarounds if needed for production
- Check back when Amplify Gen 2 adds native support

---

## 🧠 Common Workflows

### "I'm Starting a New Feature"

1. **Go to the handbook**: Read this README
2. **Find your task**: Use "I Need To..." table above
3. **Read the relevant guide**: Follow the pattern
4. **Implement**: Copy and customize
5. **Verify**: Check against security/best practices

### "I Need to Add Auth"

1. **Read:** `auth/AUTH_PATTERNS.md`
2. **Choose pattern:** Use decision tree
3. **Review security:** Read `auth/SECURITY_CHECKLIST.md`
4. **Implement:** Copy configuration to `amplify/auth/resource.ts`
5. **Test:** Run sandbox and verify

### "I Need to Connect Frontend to Database"

1. **Backend:** Define schema in `amplify/data/resource.ts` (see `data/` examples)
2. **Deploy:** Run `npx ampx sandbox` to create DynamoDB tables
3. **Frontend:** Use `client.models.ModelName.list()` (see `frontend/` examples)
4. **Done:** Your frontend now talks to DynamoDB via GraphQL

### "External Service Needs to Send Webhooks"

1. **Read:** `WEBHOOKS-GUIDE.md`
2. **Create:** Next.js API route in `app/api/servicename/route.ts`
3. **Verify:** Add signature verification
4. **Deploy:** Push to Amplify
5. **Configure:** Point external service to your URL

### "I Need a Backend API Endpoint"

1. **Read:** `NO-API-GATEWAY.md`
2. **Schema:** Define custom mutation in `amplify/data/resource.ts`
3. **Lambda:** Create handler in `amplify/functions/operationName/handler.ts`
4. **Frontend:** Call via `client.mutations.operationName()`
5. **Done:** Type-safe end-to-end API

### "I'm Setting Up a New Client App"

1. **Read:** `deployment/CUSTOM_HOSTING_DOMAIN.md`
2. **Deploy:** `npx ampx sandbox` or push to main
3. **Get app ID:** `aws amplify list-apps`
4. **Add domain:** `aws amplify create-domain-association --app-id $APP_ID --domain-name {client}.chinchilla-ai.com`
5. **Done:** Professional branded URL for client demo

---

## 📚 File Structure

```
resources/handbook/
├── README.md                         ← YOU ARE HERE (Navigation hub)
│
├── AI-DEVELOPMENT-GUIDELINES.md      ← MUST READ: Rules and patterns
├── ASYNC_PATTERNS.md                 ← Bypassing 30-second timeout ⭐ NEW
├── BACKEND_ENV_CONFIG.md             ← Environment-aware backend code
├── ENVIRONMENT_VARIABLES.md          ← Passing env vars to Lambda functions
├── NO-API-GATEWAY.md                 ← Internal backend operations
├── SECRETS_MANAGEMENT_STANDARD.md    ← ⚖️ THE RULE: Unified secrets management ⭐ NEW
├── WEBHOOKS-GUIDE.md                 ← External webhooks (quick ref)
│
├── auth/                             ← Authentication
│   ├── README.md                     ├─ Start here (navigation hub)
│   ├── CLIENT_SIDE_SETUP.md          ├─ Client setup ⭐ NEW
│   ├── SERVER_SIDE_SETUP.md          ├─ Server setup ⭐ NEW
│   ├── HOW_AUTH_WORKS.md             ├─ Conceptual guide
│   ├── AUTH_PATTERNS.md              ├─ 5 complete patterns
│   ├── TRIGGERS_GUIDE.md             ├─ Lambda triggers
│   ├── GOOGLE_OAUTH_SETUP.md         ├─ Google OAuth
│   ├── SECURITY_CHECKLIST.md         ├─ Common mistakes
│   └── troubleshooting/              └─ Debugging guides
│       ├── README.md                     ├─ Troubleshooting hub
│       └── CALLBACK_URL_BEHAVIOR.md      └─ OAuth callback issues
│
├── data/                             ← Database schemas
│   ├── README.md                     ├─ Overview
│   ├── TTL_PATTERN.md                ├─ DynamoDB TTL (auto-delete data) ⭐ NEW
│   ├── simple-custom-operations.ts   ├─ Basic example
│   ├── blog-schema.ts                ├─ Blog platform
│   └── ecommerce-schema.ts           └─ E-commerce
│
├── webhooks/                         ← Webhook handling (NEW!)
│   ├── README.md                     ├─ Navigation hub
│   ├── NEXTJS_API_ROUTES_PATTERN.md  ├─ Main guide ⭐
│   ├── API_KEY_AUTH_EXPLAINED.md     ├─ API key deep dive
│   ├── authorization-modes.md        ├─ Auth modes reference
│   ├── troubleshooting.md            ├─ Debugging guide
│   └── examples/                     └─ Working code examples
│       ├── slack-events/             ├─ Complete Slack example ✅
│       ├── stripe-payments/          ├─ Stripe (coming soon)
│       ├── github-events/            ├─ GitHub (coming soon)
│       └── shared/                   └─ Reusable utilities
│
├── functions/                        ← Lambda functions
│   ├── DOCKER_LAMBDA_WITH_AMPLIFY_GEN2.md ├─ Docker Lambda for ML workloads ⭐
│   ├── LAMBDA_DYNAMODB_ACCESS.md     ├─ DynamoDB access (NEVER use CDK!)
│   ├── LAMBDA_FUNCTION_URLS.md       ├─ Public HTTPS endpoints (no API Gateway) ⭐ NEW
│   ├── SECRETS_MANAGER_IAM.md        ├─ Secrets Manager + IAM patterns ⭐ NEW
│   ├── AUTHORIZATION_EXPLAINED.md    ├─ Auth modes guide
│   ├── graphqlResolver/              ├─ Custom GraphQL ops
│   ├── scheduledFunction/            ├─ Cron jobs
│   ├── cognitoTrigger/               ├─ Auth triggers
│   ├── userTriggered/                ├─ User-initiated jobs
│   └── webhookHandler/               └─ (Use Next.js API routes instead)
│
├── troubleshooting/                  ← Debugging & fixes ⭐ NEW
│   ├── README.md                     ├─ Navigation hub
│   └── deployment/                   └─ Deployment issues
│       └── PARCEL_WATCHER_ERROR.md       └─ Fix @parcel/watcher build error
│
├── deployment/                       ← Infrastructure & deployment ⭐ NEW
│   └── CUSTOM_HOSTING_DOMAIN.md      └─ Multi-tenant subdomain setup (client.chinchilla-ai.com)
│
├── pending/                          ← Future implementations ⚠️ NEW
│   ├── README.md                     ├─ What belongs here
│   └── COGNITO_CUSTOM_DOMAIN.md      └─ Custom auth domains (awaiting Amplify Gen 2 support)
│
└── frontend/                         ← Client-side code
    ├── README.md                     ├─ Navigation hub
    ├── PATH_ALIASES.md               ├─ TypeScript import path reference ⭐ NEW
    └── design/                       └─ Design system ⭐ NEW
        └── LIQUID_GLASS_DESIGN.md        └─ Industrial Tron + Liquid Glass aesthetic
```

---

## 🎓 Learning Paths

### Path 1: New to Amplify

1. Read `AI-DEVELOPMENT-GUIDELINES.md` → Understand the rules
2. Browse `data/simple-custom-operations.ts` → See basic patterns
3. Read `auth/AUTH_PATTERNS.md` → Choose auth pattern
4. Start building!

### Path 2: Building a B2B SaaS

1. Read `auth/AUTH_PATTERNS.md` → Pattern 3 (Multi-Tenant)
2. Read `auth/SECURITY_CHECKLIST.md` → Avoid mistakes
3. Read `NO-API-GATEWAY.md` → Backend operations
4. Browse `data/blog-schema.ts` or `data/ecommerce-schema.ts` for schema ideas

### Path 3: Adding Features to Existing App

1. Use "I Need To..." table at the top
2. Jump to relevant guide
3. Copy pattern and customize
4. Verify against security checklist

---

## 💡 Pro Tips

### For AI Assistants

- **Always start here** when asked about Amplify backend
- **Use the "I Need To..." table** to find the right guide
- **Reference specific files** - don't make up patterns
- **Check security guidelines** before suggesting auth configs
- **Never suggest raw CDK** - point to Amplify abstractions

### For Humans

- **Bookmark this page** - it's your starting point
- **Use search (Cmd/Ctrl+F)** - find your task quickly
- **Read security checklists first** - avoid costly mistakes
- **Start with examples** - don't reinvent patterns
- **Custom attributes are permanent** - choose carefully in auth

---

## 🚦 Quick Reference

### Commands

```bash
# Start sandbox (creates AWS resources)
npx ampx sandbox

# Generate types after schema changes
npx ampx generate

# Deploy to production
git push  # Amplify auto-deploys
```

### Amplify Abstractions (The Only Things You Should Use)

```typescript
import { defineAuth } from '@aws-amplify/backend';     // Authentication
import { defineData, a } from '@aws-amplify/backend';   // Database
import { defineFunction } from '@aws-amplify/backend';  // Lambda
import { defineStorage } from '@aws-amplify/backend';   // S3
```

### Never Import These

```typescript
❌ import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
❌ import { Queue } from 'aws-cdk-lib/aws-sqs';
❌ import { Alarm } from 'aws-cdk-lib/aws-cloudwatch';
// ... or anything else from 'aws-cdk-lib'
```

---

## 🔗 External Resources

- **[Amplify Gen 2 Official Docs](https://docs.amplify.aws/react/)** - AWS documentation
- **[Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)** - For webhooks
- **[Cognito Best Practices](https://docs.aws.amazon.com/cognito/latest/developerguide/best-practices.html)** - Security guidelines
- **[DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)** - Database optimization

---

## ❓ FAQ

**Q: Where do I start?**
A: Use the "I Need To..." table at the top of this page.

**Q: Can I use API Gateway?**
A: No. Never. Read NO-API-GATEWAY.md and WEBHOOKS-GUIDE.md for alternatives.

**Q: How do I connect my frontend to DynamoDB?**
A: Define schema in `data/resource.ts`, then use `client.models.ModelName.list()` in frontend.

**Q: Can I delete custom attributes in Cognito?**
A: No. They're permanent. Read `auth/SECURITY_CHECKLIST.md` before creating them.

**Q: Should I use raw CDK?**
A: No. Only use Amplify abstractions. Read AI-DEVELOPMENT-GUIDELINES.md.

**Q: How do I handle webhooks from Stripe/Slack?**
A: Use Next.js API routes. Read WEBHOOKS-GUIDE.md.

**Q: How do I create a backend API endpoint?**
A: GraphQL custom mutations. Read NO-API-GATEWAY.md.

**Q: How do I give Lambda access to DynamoDB?**
A: Use `resourceGroupName: 'data'` in your function definition. Read `functions/LAMBDA_DYNAMODB_ACCESS.md` for the complete two-part pattern.

**Q: Should I use CDK to create IAM policies for Lambda?**
A: No. Never. Use `resourceGroupName` instead. See AI-DEVELOPMENT-GUIDELINES.md.

**Q: How do I deploy ML models with heavy dependencies (XGBoost, TensorFlow)?**
A: Use Docker Lambda with CDK escape hatch. Read `functions/DOCKER_LAMBDA_WITH_AMPLIFY_GEN2.md` for complete setup including critical CodeBuild configuration.

---

## 🎯 Remember

1. **Start here** - This README is your navigation hub
2. **Read the rules** - AI-DEVELOPMENT-GUIDELINES.md is mandatory
3. **Never use CDK** - Only Amplify abstractions
4. **Security first** - Check checklists before deploying
5. **Copy patterns** - Don't reinvent, use examples

Happy building! 🚀
