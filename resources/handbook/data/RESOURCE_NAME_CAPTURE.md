# Capturing AWS Resource Names in Amplify_outputs.json

## Overview

When Amplify Gen 2 deploys your backend, AWS resources are created with auto-generated physical names:
- **DynamoDB tables**: `Todo-4mogzwizrffkrmux5kud2mtuiy-NONE`
- **Lambda functions**: `amplify-myapp-sayHello-xyz789abc`

These names are hard to discover and are essential for AWS CLI operations and debugging.

This guide explains how to automatically capture and export these physical resource names to `amplify_outputs.json` so they're easily accessible to your entire team.

## The Problem

❌ **Without this pattern:**
- Developers can't easily find DynamoDB table or Lambda function names
- Must dig through AWS Console to find physical names
- AWS CLI operations require trial-and-error name guessing
- Resource names are lost when switching projects

✅ **With this pattern:**
- Physical names are in `amplify_outputs.json` alongside other config
- Available in code: `outputs.custom?.resourceNames?.tables?.Todo`
- Available in code: `outputs.custom?.resourceNames?.functions?.sayHello`
- Works in both local sandbox and production deployments
- Exported automatically during CDK synthesis

## Implementation

### Step 1: Update backend.ts

**Location:** `amplify/backend.ts`

Add resource name capture after your `defineBackend()` call:

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource';
import { auth } from './auth/resource';

// Define your backend
const backend = defineBackend({
  auth,
  data,
});

// ========================================
// CAPTURE AWS RESOURCE NAMES
// ========================================
// Automatically export physical resource names to amplify_outputs.json
// This makes it easy to discover and use actual AWS resource names.
//
// Why this is needed:
// - Amplify auto-generates physical resource names with unique IDs
// - DynamoDB tables: "Todo-4mogzwizrffkrmux5kud2mtuiy-NONE"
// - Lambda functions: "amplify-chilltemplate-feather-myFunction-abc123"
// - These names are hard to discover via AWS Console
// - Essential for AWS CLI operations and debugging
// - Exported to amplify_outputs.json for easy access:
//   - outputs.custom?.resourceNames?.tables?.Todo
//   - outputs.custom?.resourceNames?.functions?.myFunction

const resourceNames: Record<string, Record<string, string>> = {
  tables: {},
  functions: {}
};

// Capture DynamoDB table names
Object.entries(backend.data.resources.tables).forEach(([modelName, table]) => {
  resourceNames.tables[modelName] = table.tableName;
});

// Capture Lambda function names (if any functions are defined)
// When you add functions to defineBackend(), they will automatically be captured here
// Example:
//   const backend = defineBackend({ auth, data, myFunction });
//   → outputs.custom.resourceNames.functions.myFunction = "amplify-...-myFunction-abc123"
Object.entries(backend).forEach(([key, value]) => {
  // Skip known non-function resources
  if (key === 'auth' || key === 'data' || key === 'storage') return;

  // Check if this is a function resource
  if (value && typeof value === 'object' && 'resources' in value) {
    const resources = (value as any).resources;
    if (resources && 'lambda' in resources && resources.lambda && 'functionName' in resources.lambda) {
      resourceNames.functions[key] = resources.lambda.functionName;
    }
  }
});

// Export to amplify_outputs.json
backend.addOutput({
  custom: {
    resourceNames: resourceNames
  }
});
```

### Step 2: Deploy and Verify

Deploy your sandbox and check the output:

```bash
# Start or update your sandbox
npx ampx sandbox

# After deployment (2-3 minutes), verify the output file contains resource names
cat amplify_outputs.json | jq '.custom.resourceNames'

# Expected output:
# {
#   "tables": {
#     "Todo": "Todo-4mogzwizrffkrmux5kud2mtuiy-NONE",
#     "Company": "Company-abc123xyz-NONE"
#   },
#   "functions": {
#     "sayHello": "amplify-myapp-sayHello-xyz789abc"
#   }
# }
```

### Step 3: Use in Your Code

**Frontend (React/Next.js):**
```typescript
import outputs from '../amplify_outputs.json';

const { tables, functions } = outputs.custom?.resourceNames || {};

// Access table names
if (tables?.Todo) {
  console.log('Todo table name:', tables.Todo);
}

// Access function names
if (functions?.sayHello) {
  console.log('sayHello function name:', functions.sayHello);
}
```

**Lambda Functions:**
```typescript
// You can now reference the actual resource names if needed
// But prefer using the Data Client for DynamoDB operations!
const outputs = require('../amplify_outputs.json');
const todoTableName = outputs.custom?.resourceNames?.tables?.Todo;
const helloFuncName = outputs.custom?.resourceNames?.functions?.sayHello;
```

## How It Works

### CDK Access Pattern

The `backend.data.resources.tables` object gives you access to all DynamoDB table constructs after `defineBackend()` runs:

```typescript
// backend.data.resources.tables is a map of:
// {
//   "ModelName": TableConstruct,
//   "AnotherModel": TableConstruct,
// }

// Each TableConstruct has a .tableName property that returns
// the CloudFormation physical name (auto-generated by AWS)
```

### Backend.addOutput() Pattern

The `backend.addOutput()` method merges your custom values into `amplify_outputs.json`:

```typescript
backend.addOutput({
  custom: {
    resourceNames: {...}  // Your custom data
  }
});

// Results in:
// {
//   "data": { ... existing },
//   "auth": { ... existing },
//   "custom": {
//     "resourceNames": { ... your data }
//   }
// }
```

## Resource Name Formats

Amplify-generated resource names follow consistent patterns:

### DynamoDB Tables

```
{ModelName}-{AppSyncApiId}-{Environment}

Examples:
- Todo-4mogzwizrffkrmux5kud2mtuiy-NONE
- User-abc123xyz-prod
- Company-xyz789-staging
```

Where:
- `{ModelName}` = Your schema model name
- `{AppSyncApiId}` = Unique AppSync API identifier
- `{Environment}` = Usually "NONE" for sandbox, or your environment name

### Lambda Functions

```
amplify-{appName}-{functionName}-{uniqueId}

Examples:
- amplify-myapp-sayHello-xyz789abc
- amplify-chilltemplate-feather-processWebhook-abc123
```

Where:
- `{appName}` = Your project/stack name
- `{functionName}` = Function name from defineFunction()
- `{uniqueId}` = CloudFormation-generated unique identifier

## Common Use Cases

### Use Case 1: DynamoDB CLI Operations

Query items from a DynamoDB table using AWS CLI:

```bash
# Get table name from amplify_outputs.json
TABLE_NAME=$(jq -r '.custom.resourceNames.tables.Todo' amplify_outputs.json)

# Query items
aws dynamodb scan --table-name "$TABLE_NAME"

# Get item by key
aws dynamodb get-item --table-name "$TABLE_NAME" \
  --key '{"id":{"S":"item-123"}}'
```

### Use Case 2: Lambda Function Invocation

Invoke a Lambda function directly for testing:

```bash
# Get function name from amplify_outputs.json
FUNC_NAME=$(jq -r '.custom.resourceNames.functions.sayHello' amplify_outputs.json)

# Invoke function
aws lambda invoke \
  --function-name "$FUNC_NAME" \
  --payload '{"test": "data"}' \
  output.json

# View output
cat output.json
```

### Use Case 3: Debugging & Inspection

Inspect table structure and item count:

```bash
TABLE_NAME=$(jq -r '.custom.resourceNames.tables.Todo' amplify_outputs.json)

# Describe table
aws dynamodb describe-table --table-name "$TABLE_NAME"

# Count items
aws dynamodb scan --table-name "$TABLE_NAME" --select COUNT
```

### Use Case 4: Testing & Data Migration

Prepare test data or migrate between environments:

```typescript
import outputs from '../amplify_outputs.json';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';

const tableName = outputs.custom?.resourceNames?.tables?.Todo;
const client = new DynamoDBClient({ region: 'us-east-1' });

const command = new ScanCommand({
  TableName: tableName
});

const result = await client.send(command);
```

## Important Considerations

### Circular Dependencies (Safe Here)

✅ **This pattern is SAFE** because:
- You're only capturing metadata
- You're not creating custom Lambda resolvers
- The automatic Amplify resolvers are unaffected

⚠️ **Would be UNSAFE if:**
- You created custom Lambda functions as GraphQL resolvers
- You tried to reference these names in resolver functions
- You passed names to functions that are also data resolvers

### Multiple Data Models

The pattern automatically handles all your models:

```typescript
// If your schema has:
// - Todo model
// - User model
// - Company model

// Result in amplify_outputs.json:
// {
//   "custom": {
//     "resourceNames": {
//       "Todo": "Todo-...",
//       "User": "User-...",
//       "Company": "Company-..."
//     }
//   }
// }
```

### Environment Variations

Works identically across environments:

```bash
# Local sandbox
npx ampx sandbox
# → amplify_outputs.json with local resource names

# Production deployment
npx ampx pipeline-deploy --branch main --app-id YOUR_APP_ID
# → Generates outputs for production with production resource names
```

## Troubleshooting

### Issue: `amplify_outputs.json` doesn't have `custom.resourceNames`

**Cause:** Sandbox deployment incomplete or CDK synthesis error

**Solution:**
```bash
# Check that sandbox fully deployed
npx ampx sandbox

# Wait 2-3 minutes for CloudFormation to complete

# If still missing, regenerate outputs
npx ampx generate outputs

# Check the file
cat amplify_outputs.json | jq '.custom'
```

### Issue: `resourceNames` is empty object `{}`

**Cause:** No data models defined or `backend.data` not passed to `defineBackend()`

**Solution:**
1. Verify `amplify/data/resource.ts` has models defined
2. Check `amplify/backend.ts` includes `data` in `defineBackend()`
3. Restart sandbox: `npx ampx sandbox`

### Issue: TypeScript error on `table.tableName`

**Cause:** Table construct type not properly recognized

**Solution:**
1. Ensure you're accessing via `backend.data.resources.tables`
2. Not via `cfnResources.amplifyDynamoDbTables` (different pattern)
3. Check TypeScript types: `npm run build`

## Best Practices

✅ **DO:**
- Capture names right after `defineBackend()`
- Include comments explaining the pattern
- Test in local sandbox first
- Use the names in AWS CLI scripts
- Store outputs in version control (.gitignore for local sandbox)

❌ **DON'T:**
- Hardcode table names in your code
- Use captured names in Lambda resolver functions
- Pass names to functions that are data resolvers
- Assume names are static (they change per environment)

## Related Documentation

- [Modify Amplify-generated AWS Resources](https://docs.amplify.aws/react/build-a-backend/data/override-resources/)
- [AWS CDK Table Properties](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html)
- [Amplify Gen 2 Data Setup](https://docs.amplify.aws/react/build-a-backend/data/set-up-data/)
- [Backend Override Patterns](./GROUP_AUTHORIZATION.md)

## Implementation Checklist

- [ ] Added resource capture code to `amplify/backend.ts`
- [ ] Deployed sandbox: `npx ampx sandbox`
- [ ] Verified `amplify_outputs.json` contains `custom.resourceNames`
- [ ] Tested accessing names in your code
- [ ] Used table names for AWS CLI operations
- [ ] Added comments explaining the pattern for team
