# 📖 Amplify Gen 2 Developer Handbook

**Your complete guide to building production-ready apps with AWS Amplify Gen 2 and Next.js.**

---

## 🎯 Quick Navigation: "I Need To..."

Use this table to jump directly to what you need:

| I Need To... | Go Here |
|--------------|---------|
| **Set up authentication** | [`auth/` folder](#-authentication) |
| **Connect to DynamoDB / Create database schema** | [`data/` folder](#-data--database) |
| **Give Lambda access to DynamoDB/S3/Cognito** | [`functions/LAMBDA_*_ACCESS.md`](#-lambda-permissions) |
| **Create a backend API endpoint** | [NO-API-GATEWAY.md](#-never-use-api-gateway) |
| **Handle webhooks from Slack/Stripe/GitHub** | [`webhooks/` folder](#-webhooks-from-external-services) |
| **Run background jobs / scheduled tasks** | [`functions/` folder](#-lambda-functions) |
| **Build the frontend / Connect to backend** | [`frontend/` folder](#-frontend--client-side) |
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

**Comprehensive authentication patterns and security best practices.**

#### What's Inside:

1. **[AUTH_PATTERNS.md](./auth/AUTH_PATTERNS.md)** - 5 Complete Auth Patterns
   - Pattern 1: Basic Email Auth (MVP)
   - Pattern 2: Social Authentication (Consumer apps)
   - Pattern 3: **B2B Multi-Tenant SaaS** ⭐ Most common
   - Pattern 4: Enterprise SSO (Corporate tools)
   - Pattern 5: Passwordless Auth (Modern UX)

2. **[TRIGGERS_GUIDE.md](./auth/TRIGGERS_GUIDE.md)** - Lambda Triggers
   - Pre Sign-up (domain validation, invitation codes)
   - Post Confirmation (create profiles, welcome emails)
   - Pre Token Generation (custom claims, permissions)
   - Passwordless flows (magic links, OTP)

3. **[SECURITY_CHECKLIST.md](./auth/SECURITY_CHECKLIST.md)** - Critical Mistakes
   - ⚠️ **The One-Shot Schema Problem** - Custom attributes are permanent!
   - Required attributes break SSO
   - Immutable attributes break SSO updates
   - Cognito vs DynamoDB decision matrix

#### Quick Decision: Which Auth Pattern?

```
Building a B2B SaaS? → Pattern 3 (Multi-Tenant)
Need Google/Facebook login? → Pattern 2 (Social)
Simple MVP with email/password? → Pattern 1 (Basic)
Corporate tool with Okta/Azure AD? → Pattern 4 (Enterprise SSO)
Magic link or SMS auth? → Pattern 5 (Passwordless)
```

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

## ⚡ Lambda Functions

### [`functions/` folder](./functions/)

**Production-ready Lambda function patterns.**

#### What's Inside:

1. **[graphqlResolver/](./functions/graphqlResolver/)** - Custom GraphQL Operations
   - Type-safe handlers
   - IAM auth for system-level access
   - Data aggregation patterns
   - Business logic examples

2. **[scheduledFunction/](./functions/scheduledFunction/)** - Cron Jobs
   - EventBridge scheduled tasks
   - Direct DynamoDB access
   - Background processing
   - Data sync patterns

3. **[webhookHandler/](./functions/webhookHandler/)** - ⚠️ **DON'T USE THIS**
   - **Use Next.js API routes instead** (see WEBHOOKS-GUIDE.md)
   - This example is for educational purposes only

4. **[cognitoTrigger/](./functions/cognitoTrigger/)** - User Lifecycle
   - Pre/post sign-up hooks
   - Custom claims
   - User management

5. **[userTriggered/](./functions/userTriggered/)** - User-Initiated Jobs
   - Background processing from frontend
   - Async operations
   - Long-running tasks

#### Common Use Cases:

| Use Case | Solution |
|----------|----------|
| **Invoke Lambda from frontend** | GraphQL custom mutation (see NO-API-GATEWAY.md) |
| **Run every hour/day** | Scheduled function with `schedule: 'rate(1 hour)'` |
| **Process webhook from Slack** | Next.js API route (see WEBHOOKS-GUIDE.md) |
| **Customize auth flow** | Cognito trigger |
| **Background job from user action** | User-triggered function |

---

## 🎨 Frontend / Client-Side

### [`frontend/` folder](./frontend/)

**React/Next.js examples for connecting to your Amplify backend.**

#### What's Inside:

**Note:** This folder contains comprehensive examples but might be empty in your template. The examples show:

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

---

## 📚 File Structure

```
resources/handbook/
├── README.md                         ← YOU ARE HERE (Navigation hub)
│
├── AI-DEVELOPMENT-GUIDELINES.md      ← MUST READ: Rules and patterns
├── NO-API-GATEWAY.md                 ← Internal backend operations
├── WEBHOOKS-GUIDE.md                 ← External webhooks (quick ref)
│
├── auth/                             ← Authentication
│   ├── README.md                     ├─ Start here
│   ├── AUTH_PATTERNS.md              ├─ 5 complete patterns
│   ├── TRIGGERS_GUIDE.md             ├─ Lambda triggers
│   └── SECURITY_CHECKLIST.md         └─ Common mistakes
│
├── data/                             ← Database schemas
│   ├── README.md                     ├─ Overview
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
│   ├── LAMBDA_DYNAMODB_ACCESS.md     ├─ DynamoDB access (NEVER use CDK!)
│   ├── AUTHORIZATION_EXPLAINED.md    ├─ Auth modes guide
│   ├── graphqlResolver/              ├─ Custom GraphQL ops
│   ├── scheduledFunction/            ├─ Cron jobs
│   ├── cognitoTrigger/               ├─ Auth triggers
│   ├── userTriggered/                ├─ User-initiated jobs
│   └── webhookHandler/               └─ (Use Next.js API routes instead)
│
└── frontend/                         ← Client-side code
    └── README.md                     └─ React/Next.js examples
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

---

## 🎯 Remember

1. **Start here** - This README is your navigation hub
2. **Read the rules** - AI-DEVELOPMENT-GUIDELINES.md is mandatory
3. **Never use CDK** - Only Amplify abstractions
4. **Security first** - Check checklists before deploying
5. **Copy patterns** - Don't reinvent, use examples

Happy building! 🚀
