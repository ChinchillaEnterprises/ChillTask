# 🔍 Environment Variables Quick Reference

## What's Available in Your Scheduled Lambda

### ✅ You DO Get These:
```typescript
process.env.AWS_REGION                     // e.g., "us-east-1"
process.env.AWS_LAMBDA_FUNCTION_NAME      // Your function name
process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT  // GraphQL endpoint (if allow.resource() is set!)
```

### ❌ You DON'T Get These (Common Misconceptions):
```typescript
process.env.AMPLIFY_DATA_GRAPHQL_API_KEY   // ❌ Uses IAM instead
process.env.[MODEL_NAME]_TABLE_NAME        // ❌ Table names not exposed
process.env.AMPLIFY_APP_ID                 // ❌ App metadata not available
process.env.TABLE_PREFIX                   // ❌ Would be nice, but nope!
```

## 🚨 The Two-Pass System

Your Lambda needs BOTH of these to work:

### Pass #1: Permission Ticket
```typescript
// In resource.ts
resourceGroupName: 'data' // Grants IAM permissions to DynamoDB
```

### Pass #2: Database Address
```typescript
// In amplify/data/resource.ts at SCHEMA level
.authorization((allow) => [
  allow.resource(scheduledFunctionExample), // Injects GraphQL endpoint!
]);
```

**Without BOTH = "The data environment variables are malformed" error!**

## 🔧 Debug Like a Pro

Add this to your handler to see what's actually available:

```typescript
export const handler = async (event: any) => {
  console.log('=== ENVIRONMENT DEBUG ===');
  console.log('Amplify vars:', 
    Object.keys(process.env)
      .filter(k => k.includes('AMPLIFY'))
      .reduce((acc, key) => ({ ...acc, [key]: process.env[key] }), {})
  );
  
  // Your actual code...
}
```

## 🎯 Key Takeaway

**Stop looking for environment variables that don't exist!**

Instead of:
```typescript
// ❌ Don't do this
const tableName = `Todo-${process.env.SOME_SUFFIX}-NONE`;
```

Do this:
```typescript
// ✅ Use the GraphQL client
const client = generateClient<Schema>({ authMode: 'iam' });
const result = await client.models.Todo.create({...});
```

## 📚 Want to Learn More?

For the complete deep dive, use the MCP amplify-docs tool:
```
get_lambda_environment_explained
```

This explains the philosophy behind Amplify's design and why certain things work the way they do.