# AI Development Guidelines for Chill Amplify Template

## Overview

This template is designed for **educational, Amplify-first development**. Follow these guidelines to maintain clean, cost-effective, and conflict-free code.

---

## 🚫 CRITICAL RULE: No Raw CDK

### The Golden Rule

**If Amplify Gen 2 doesn't have an abstraction for it, you probably don't need it yet.**

### What This Means

- ✅ **DO**: Use Amplify abstractions (`defineAuth`, `defineData`, `defineFunction`, `defineStorage`)
- ❌ **DON'T**: Import raw CDK constructs from `aws-cdk-lib`

### Why No CDK?

1. **Sandbox Deployment Conflicts**
   - Hardcoded resource names conflict when multiple developers run sandboxes
   - Example: `queueName: 'slack-webhook-dlq'` causes `AlreadyExists` errors
   - Each developer's sandbox tries to create the same resource name

2. **Cost Surprises**
   - Easy to add expensive resources without realizing it
   - SQS Dead Letter Queues + CloudWatch alarms = ongoing costs
   - Students/AI may not understand AWS pricing

3. **Added Complexity**
   - Students need to learn CDK + CloudFormation on top of Amplify
   - More code to maintain and debug
   - Defeats the "component-first simplicity" philosophy

4. **Maintenance Headaches**
   - Raw CDK requires manual permission management
   - No auto-cleanup when sandbox is deleted
   - More surface area for bugs

---

## ✅ What You CAN Use

### Amplify Gen 2 Abstractions

```typescript
// ✅ Authentication (Cognito)
import { defineAuth } from '@aws-amplify/backend';
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});

// ✅ Data (AppSync GraphQL + DynamoDB)
import { defineData, a } from '@aws-amplify/backend';
export const data = defineData({
  schema: a.schema({
    Todo: a.model({
      content: a.string(),
    }).authorization((allow) => [allow.guest()]),
  }),
});

// ✅ Functions (Lambda)
import { defineFunction } from '@aws-amplify/backend';
export const myFunction = defineFunction({
  name: 'my-function',
  entry: './handler.ts',
});

// ✅ Storage (S3)
import { defineStorage } from '@aws-amplify/backend';
export const storage = defineStorage({
  name: 'myProjectFiles',
});
```

### Available Amplify Resources

- **`defineAuth()`** - User authentication (Cognito)
- **`defineData()`** - GraphQL API + database (AppSync + DynamoDB)
- **`defineFunction()`** - Serverless functions (Lambda)
- **`defineStorage()`** - File storage (S3)

**That's it. That's all you need.**

---

## ❌ What You CANNOT Use

### Never Import Raw CDK

```typescript
// ❌ NEVER DO THIS
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Alarm } from 'aws-cdk-lib/aws-cloudwatch';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Topic } from 'aws-cdk-lib/aws-sns';

// ❌ Don't create raw CDK resources in backend.ts
const queue = new Queue(backend.stack, 'MyQueue', {
  queueName: 'my-hardcoded-name', // Causes conflicts!
});
```

### Common Temptations (and Alternatives)

| ❌ Don't Do This | ✅ Do This Instead |
|-----------------|-------------------|
| Raw SQS Queue | Use `defineFunction` with retry logic |
| Raw DynamoDB Table | Use `defineData` with GraphQL schema |
| Raw S3 Bucket | Use `defineStorage` |
| CloudWatch Alarms | Use CloudWatch outside sandbox or accept default monitoring |
| API Gateway HTTP API | Use `defineFunction` with function URLs or AppSync |
| SNS Topics | Use `defineFunction` to send emails/notifications |
| Step Functions | Chain Lambda functions together |

---

## 🧠 Decision Tree: "Should I Use This AWS Service?"

```
Do I need [AWS Service X]?
│
├─ Does Amplify have a `define[X]()` abstraction?
│  │
│  ├─ YES → Use the Amplify abstraction
│  │
│  └─ NO → Continue to next question
│
└─ Can I solve this with defineFunction + defineData?
   │
   ├─ YES → Implement with Amplify primitives
   │
   └─ NO → Ask project lead before proceeding
```

### Example: "I need a queue for background jobs"

**❌ Don't**: Create raw SQS queue with CDK

**✅ Do Instead**:
- Use `defineFunction` with async invocation
- Store jobs in DynamoDB table via `defineData`
- Use Lambda retry logic (built-in)
- Schedule functions with EventBridge (via `defineFunction`)

### Example: "I need to monitor errors"

**❌ Don't**: Create CloudWatch alarms with CDK

**✅ Do Instead**:
- Use CloudWatch Logs (automatic for Lambda)
- Check logs in AWS Console
- Set up alarms manually in AWS Console (outside sandbox)
- For production, create separate monitoring stack

---

## 🎯 Architecture Philosophy

### The "Progressive Reveal" Model

This template follows a **progressive complexity reveal** model:

1. **Day 1**: Students see clean, minimal interface
2. **Day 3**: Add `defineAuth` for real authentication
3. **Week 2**: Add `defineData` for database
4. **Week 4**: Add `defineFunction` for business logic
5. **Week 8**: Add `defineStorage` for file uploads

**Never**: Jump straight to raw CDK, SQS, Step Functions, etc.

### The "Source of Truth" Principle

For data sync applications (like Slack archiving):

- **Source of Truth**: External system (Slack, GitHub, etc.)
- **Your Database**: Cache/mirror of source data
- **Failed syncs**: Not data loss - just re-sync from source

**This means:**
- Dead Letter Queues are overkill
- CloudWatch alarms are overkill
- Just retry from the source

---

## 🛠️ If You Absolutely Need CDK

If you're 100% certain you need a raw CDK resource:

### Step 1: Stop and Reconsider
- Can you solve this with `defineFunction` + `defineData`?
- Is this feature really necessary for the MVP?
- Will students understand this architecture?

### Step 2: Ask the Project Lead
- **Don't** just add CDK and commit
- **Do** message the project lead first
- Explain what you need and why

### Step 3: If Approved, Follow These Rules
1. **Never use hardcoded resource names**
   ```typescript
   // ❌ Don't
   queueName: 'my-queue'

   // ✅ Do (let CDK auto-generate)
   // No queueName property = unique name per sandbox
   ```

2. **Document why CDK is necessary**
   ```typescript
   // Explanation: We need SQS because [specific reason]
   // Alternatives considered: [list alternatives]
   // Approved by: [project lead name]
   ```

3. **Consider cost implications**
   - Document estimated monthly cost
   - Ensure it's acceptable for educational use

---

## 📚 Common Patterns

### Pattern 1: Background Jobs

**Scenario**: Process data asynchronously

```typescript
// ✅ Good: Use Lambda with async invocation
export const processJob = defineFunction({
  name: 'process-job',
  entry: './process-job.ts',
});

// Store job status in DynamoDB via defineData
const schema = a.schema({
  Job: a.model({
    status: a.string(),
    result: a.string(),
  }),
});
```

### Pattern 2: Scheduled Tasks

**Scenario**: Run a function every hour

```typescript
// ✅ Good: Use defineFunction with schedule
export const dailySync = defineFunction({
  name: 'daily-sync',
  entry: './daily-sync.ts',
  schedule: 'rate(1 hour)',
});
```

### Pattern 3: Webhooks

**Scenario**: Receive webhooks from external service

```typescript
// ✅ Good: Use defineFunction with function URL
export const webhook = defineFunction({
  name: 'webhook-handler',
  entry: './webhook.ts',
  // Function URL is automatically created
});

// Access URL from amplify_outputs.json
```

### Pattern 4: File Processing

**Scenario**: Process uploaded files

```typescript
// ✅ Good: Use defineStorage with Lambda trigger
export const storage = defineStorage({
  name: 'uploads',
  triggers: {
    onUpload: defineFunction({
      entry: './process-upload.ts',
    }),
  },
});
```

---

## 🔐 Lambda Permissions: NEVER Use CDK

### The Rule

**Need your Lambda function to access DynamoDB, S3, or Cognito?**

**❌ DON'T**: Import CDK libraries and create `PolicyStatement` objects
**✅ DO**: Use `resourceGroupName` and read the appropriate access guide

### Quick Reference

| What You Need | What To Read |
|---------------|--------------|
| **Lambda → DynamoDB access** | [`functions/LAMBDA_DYNAMODB_ACCESS.md`](./functions/LAMBDA_DYNAMODB_ACCESS.md) |
| **Lambda → S3 access** | `functions/LAMBDA_S3_ACCESS.md` (coming soon) |
| **Lambda → Cognito access** | `functions/LAMBDA_COGNITO_ACCESS.md` (coming soon) |

### The Amplify Way

```typescript
// ✅ This is all you need for DynamoDB access
export const myFunction = defineFunction({
  name: 'my-function',
  entry: './handler.ts',
  resourceGroupName: 'data',  // ← Grants DynamoDB access automatically!
});
```

**No CDK imports. No PolicyStatements. No manual IAM management.**

### Why This Matters

**The CDK anti-pattern we're avoiding:**
```typescript
// ❌ NEVER DO THIS
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

myFunction.addToRolePolicy(new PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', ...],
  resources: [`arn:aws:dynamodb:...`],
}));
```

**The Amplify-native solution:**
```typescript
// ✅ DO THIS
resourceGroupName: 'data'  // One line. Done.
```

### Learn More

For complete guides with examples, troubleshooting, and best practices:

- **[LAMBDA_DYNAMODB_ACCESS.md](./functions/LAMBDA_DYNAMODB_ACCESS.md)** - Everything about accessing DynamoDB from Lambda
- More access guides coming soon (S3, Cognito)

These guides show you the two-part pattern (resourceGroupName + allow.resource) and explain common errors like "malformed environment variables."

---

## 🚨 Anti-Pattern: Don't Use API Gateway CDK

### The Mistake

Developers often think: "I need a public HTTPS endpoint → I'll use API Gateway with CDK"

**Common scenarios where this mistake happens:**
- Webhooks (Slack, Stripe, GitHub, etc.)
- Public REST APIs
- Lambda function endpoints
- Third-party integrations

```typescript
// ❌ NEVER DO THIS
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
const httpApi = new HttpApi(backend.stack, 'WebhookApi', {
  apiName: 'my-webhook-api',  // Causes sandbox conflicts
});
```

**Problems with this approach:**
- Violates "No CDK" rule
- Hardcoded names cause sandbox conflicts
- Adds unnecessary AWS costs
- Extra complexity

### The Correct Solution: Next.js API Routes

Next.js API routes automatically become Lambda-backed HTTPS endpoints when deployed to Amplify Gen 2.

```typescript
// app/api/webhook/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  // Handle webhook
  return Response.json({ success: true });
}
```

**What happens when deployed:**
- Amplify automatically creates a Lambda function
- Accessible at: `https://yourdomain.com/api/webhook`
- Uses your app's domain (no separate API Gateway)
- No CDK required
- No naming conflicts

### How Amplify Deploys It

When you deploy a Next.js app to Amplify Gen 2, any files in `app/api/*/route.ts` are automatically:
1. Bundled as individual Lambda functions
2. Connected to your app's CloudFront distribution
3. Accessible via HTTPS at the corresponding path

It's all handled by Amplify's Next.js deployment process - you just write the route file.

### AI Guidance

**When you see:** "I need a public HTTPS endpoint for [anything]"

**Don't create:** API Gateway with CDK

**Do create:** Next.js API route in `app/api/`

**Pattern recognition:**
- Slack webhooks → `app/api/slack/events/route.ts`
- Stripe webhooks → `app/api/stripe/webhook/route.ts`
- Public REST API → `app/api/users/route.ts`
- Lambda endpoint → `app/api/function-name/route.ts`

**The rule:** Never use API Gateway. Next.js API routes give you everything you need.

---

## 🚨 Warning Signs You're Going Off Track

### Red Flags

1. You're importing from `aws-cdk-lib`
2. You're googling "CloudFormation error"
3. You're manually managing IAM policies
4. You're creating resources with hardcoded names
5. You're asking "how do I make this unique per sandbox?"
6. The solution feels overly complex

### Green Flags

1. You're only importing from `@aws-amplify/backend`
2. You're using `defineAuth`, `defineData`, `defineFunction`, or `defineStorage`
3. Permissions are handled automatically
4. No hardcoded resource names
5. The solution feels simple and educational
6. A student could understand this

---

## 📖 Additional Resources

- **Main README**: See root `README.md` for component-first frontend development
- **Auth Examples**: `resources/handbook/auth/` - Authentication patterns
- **Data Examples**: `resources/handbook/data/` - GraphQL schema examples
- **Function Examples**: `resources/handbook/functions/` - Lambda patterns
- **Frontend Examples**: `resources/handbook/frontend/` - MUI component usage

---

## ✅ Checklist Before Committing

- [ ] I used only Amplify abstractions (`defineAuth`, `defineData`, `defineFunction`, `defineStorage`)
- [ ] I did NOT import anything from `aws-cdk-lib`
- [ ] No hardcoded resource names anywhere
- [ ] Solution is simple enough for students to understand
- [ ] I considered cost implications
- [ ] If I used CDK, I got approval from project lead first

---

**Remember**: This template is designed for **education-first**, **AI-optimized**, **component-first** development. Keep it simple, keep it clean, keep it Amplify-native.
