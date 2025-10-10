# ChillTask Code Patterns Analysis

## Overview
This document analyzes the existing ChillTask codebase architecture patterns for implementing the message archiving Lambda function.

---

## 1. Lambda Function Patterns

### 1.1 Function Structure Pattern

All Lambda functions in ChillTask follow this consistent pattern:

**Location:** `/amplify/functions/{function-name}/`

**Required Files:**
- `handler.ts` - Main Lambda handler logic
- `resource.ts` - Amplify function definition
- `package.json` (optional) - If function needs specific dependencies

### 1.2 Handler Pattern (from `get-slack-channels/handler.ts`)

```typescript
import type { Schema } from '../../data/resource';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

export const handler: Schema['functionName']['functionHandler'] = async (event) => {
  try {
    // 1. Fetch secrets from AWS Secrets Manager
    const secretResponse = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: process.env.SECRET_NAME,
      })
    );

    const secrets = JSON.parse(secretResponse.SecretString || '{}');
    const token = secrets.TOKEN_KEY || secrets.fallback_key;

    if (!token) {
      throw new Error('Token not found in secrets');
    }

    // 2. Call external API
    const response = await fetch('https://api.example.com/endpoint', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API failed: ${response.status}`);
    }

    // 3. Parse and transform data
    const data = await response.json();

    // 4. Return transformed data
    return transformedData;
  } catch (error: any) {
    console.error('Error description:', error);
    throw new Error(`Failed: ${error.message}`);
  }
};
```

**Key Pattern Elements:**
- Type-safe handler: `Schema['functionName']['functionHandler']`
- Secrets Manager client initialized at module scope (reused across invocations)
- Environment variables accessed via `process.env`
- Consistent error handling with descriptive messages
- JSON parsing with fallback for secret keys

### 1.3 Resource Definition Pattern (from `get-slack-channels/resource.ts`)

```typescript
import { defineFunction } from '@aws-amplify/backend';

export const functionName = defineFunction({
  name: 'function-name',
  entry: './handler.ts',
  timeoutSeconds: 30,
  environment: {
    SECRET_NAME: 'secret/path/in/secrets-manager',
    OPTIONAL_VAR: 'value',
  },
});
```

**Key Pattern Elements:**
- Export matches import in `backend.ts`
- `name` should match folder name (kebab-case)
- `entry` always points to `./handler.ts`
- `timeoutSeconds` defaults to 30 for API calls
- Environment variables passed as object

---

## 2. Secrets Manager Access Pattern

### 2.1 Secret Naming Convention

**Existing Secrets:**
- Slack: `chinchilla-ai-academy/slack`
- GitHub: `github-token`

**Recommended for Archive Function:**
- Same as above (reuse existing secrets)

### 2.2 Secret Structure

**Slack Secret (JSON):**
```json
{
  "SLACK_BOT_TOKEN": "xoxb-...",
  "bot_token": "xoxb-..."  // Fallback key
}
```

**GitHub Secret (JSON):**
```json
{
  "GITHUB_TOKEN": "ghp_...",
  "token": "ghp_..."  // Fallback key
}
```

**Access Pattern:**
```typescript
const secrets = JSON.parse(secretResponse.SecretString || '{}');
const token = secrets.PRIMARY_KEY || secrets.fallback_key;
```

---

## 3. GraphQL Schema Extension Pattern

### 3.1 Custom Types

**Location:** `/amplify/data/resource.ts`

**Pattern for API Response Types:**
```typescript
SlackChannel: a.customType({
  id: a.string().required(),
  name: a.string().required(),
  isPrivate: a.boolean().required(),
}),
```

### 3.2 Custom Queries

**Pattern for Lambda-backed Queries:**
```typescript
getSlackChannels: a
  .query()
  .returns(a.ref('SlackChannel').array())
  .handler(a.handler.function(getSlackChannels))
  .authorization((allow) => [allow.authenticated()]),
```

**Key Elements:**
- `.query()` for read operations
- `.mutation()` for write operations (if needed)
- `.returns()` specifies return type
- `.handler(a.handler.function(importedFunction))`
- `.authorization()` defines who can call it

### 3.3 Data Models

**Pattern for Database Tables:**
```typescript
ChannelMapping: a
  .model({
    slackChannel: a.string().required(),
    slackChannelId: a.string().required(),
    githubRepo: a.string().required(),
    githubUrl: a.string().required(),
    githubBranch: a.string().required(),
    contextFolder: a.string().required(),
    isActive: a.boolean().required(),
    lastSync: a.string(),
    messageCount: a.integer(),
  })
  .authorization((allow) => [allow.authenticated(), allow.groups(['ADMINS'])]),
```

**Key Elements:**
- `.model()` creates DynamoDB table
- `.required()` for non-nullable fields
- Optional fields don't have `.required()`
- Authorization supports multiple rules

---

## 4. IAM Permission Patterns

### 4.1 Backend Permission Assignment

**Location:** `/amplify/backend.ts`

**Pattern:**
```typescript
const backend = defineBackend({
  auth,
  data,
  functionName,
});

// Get Lambda function reference
const lambdaFunction = backend.functionName.resources.lambda;

// Add IAM permissions
lambdaFunction.addToRolePolicy(
  new (await import('aws-cdk-lib/aws-iam')).PolicyStatement({
    actions: ['secretsmanager:GetSecretValue'],
    resources: ['arn:aws:secretsmanager:us-east-1:*:secret:secret-name-*'],
  })
);
```

**Key Patterns:**
- Import CDK library dynamically: `await import('aws-cdk-lib/aws-iam')`
- Use wildcard in ARN for flexibility: `secret-name-*`
- Chain `.resources.lambda` to get function
- Multiple permissions can be added with multiple `addToRolePolicy()` calls

### 4.2 Common Permission Actions

**Secrets Manager:**
```typescript
actions: ['secretsmanager:GetSecretValue']
```

**DynamoDB (for future archive function):**
```typescript
actions: [
  'dynamodb:GetItem',
  'dynamodb:PutItem',
  'dynamodb:UpdateItem',
  'dynamodb:Query',
  'dynamodb:Scan'
]
```

**S3 (if storing message attachments):**
```typescript
actions: [
  's3:GetObject',
  's3:PutObject',
  's3:DeleteObject'
]
```

---

## 5. Adding New Functions to Amplify Gen 2

### 5.1 Step-by-Step Pattern

1. **Create function folder:**
   ```bash
   mkdir -p amplify/functions/function-name
   ```

2. **Create `resource.ts`:**
   ```typescript
   import { defineFunction } from '@aws-amplify/backend';

   export const functionName = defineFunction({
     name: 'function-name',
     entry: './handler.ts',
     timeoutSeconds: 30,
     environment: {
       VAR_NAME: 'value',
     },
   });
   ```

3. **Create `handler.ts`:**
   ```typescript
   import type { Schema } from '../../data/resource';

   export const handler: Schema['functionName']['functionHandler'] = async (event) => {
     // Implementation
   };
   ```

4. **Add to GraphQL schema** (`amplify/data/resource.ts`):
   ```typescript
   import { functionName } from '../functions/function-name/resource';

   // In schema:
   functionName: a
     .query() // or .mutation()
     .returns(a.ref('ReturnType').array()) // or single type
     .handler(a.handler.function(functionName))
     .authorization((allow) => [allow.authenticated()]),
   ```

5. **Register in backend** (`amplify/backend.ts`):
   ```typescript
   import { functionName } from './functions/function-name/resource.js';

   const backend = defineBackend({
     auth,
     data,
     functionName, // Add here
   });
   ```

6. **Add IAM permissions** (in `backend.ts`):
   ```typescript
   const lambdaFunction = backend.functionName.resources.lambda;
   lambdaFunction.addToRolePolicy(
     new (await import('aws-cdk-lib/aws-iam')).PolicyStatement({
       actions: ['service:Action'],
       resources: ['arn:aws:service:region:*:resource/*'],
     })
   );
   ```

### 5.2 Testing Pattern

**Local Testing:**
- Not directly supported for Amplify Gen 2 functions
- Use Amplify Sandbox: `npx ampx sandbox`
- CloudWatch logs available in sandbox mode

**Deployment Testing:**
- Deploy to sandbox environment
- Test via GraphQL API
- Check CloudWatch logs for errors

---

## 6. Frontend Integration Pattern

### 6.1 Calling Lambda Functions from Frontend

**Pattern (from `channel-mappings/page.tsx`):**

```typescript
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

// Call custom query
const { data, errors } = await client.queries.functionName();

// Handle response
if (errors) {
  console.error("Failed:", errors);
} else {
  // Use data
}
```

### 6.2 Real-time Subscriptions Pattern

```typescript
// Subscribe to model changes
const createSub = client.models.ModelName.onCreate().subscribe({
  next: (newItem) => {
    // Handle new item
  },
  error: (error) => console.error("Subscription error:", error),
});

// Cleanup
return () => {
  createSub.unsubscribe();
};
```

---

## 7. Environment Variables and Configuration

### 7.1 Lambda Environment Variables

**Set in `resource.ts`:**
```typescript
environment: {
  SLACK_SECRET_NAME: 'chinchilla-ai-academy/slack',
  GITHUB_SECRET_NAME: 'github-token',
  GITHUB_ORG: 'ChinchillaEnterprises',
}
```

**Access in `handler.ts`:**
```typescript
const secretName = process.env.SLACK_SECRET_NAME;
const org = process.env.GITHUB_ORG || 'default-org';
```

### 7.2 TypeScript Configuration

**Function TypeScript files automatically use:**
- Project root `tsconfig.json`
- AWS Lambda types via `@types/aws-lambda`
- Amplify-generated types via `Schema` import

---

## 8. Error Handling Best Practices

### 8.1 Consistent Error Pattern

```typescript
try {
  // Operation
} catch (error: any) {
  console.error('Descriptive context:', error);
  throw new Error(`User-friendly message: ${error.message}`);
}
```

### 8.2 API Error Handling

```typescript
if (!response.ok) {
  throw new Error(`API failed: ${response.status}`);
}

const data = await response.json();

if (!data.ok) {
  throw new Error(`API error: ${data.error}`);
}
```

---

## 9. Dependencies and Imports

### 9.1 Available AWS SDK Clients

Already in `package.json`:
- `@aws-sdk/client-secrets-manager`
- `@aws-sdk/client-cognito-identity-provider`

**To add more AWS services:**
```bash
npm install @aws-sdk/client-{service-name}
```

### 9.2 Standard Imports for Lambda

```typescript
import type { Schema } from '../../data/resource';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
```

---

## Summary

The ChillTask codebase follows a highly consistent pattern for Lambda functions:

1. **Folder structure:** `/amplify/functions/{function-name}/`
2. **Required files:** `handler.ts` and `resource.ts`
3. **Type safety:** Using `Schema['functionName']['functionHandler']`
4. **Secrets:** AWS Secrets Manager with JSON parsing and fallback keys
5. **Permissions:** IAM policies added in `backend.ts`
6. **Integration:** GraphQL schema bindings in `data/resource.ts`
7. **Error handling:** Consistent try-catch with descriptive messages

This pattern makes adding new Lambda functions predictable and maintainable.
