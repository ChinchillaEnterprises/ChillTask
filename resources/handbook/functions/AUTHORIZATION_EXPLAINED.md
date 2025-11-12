# 🔐 Lambda Authorization Explained (The Two-Pass System)

## The Simple Version

Your Lambda function needs **TWO things** to access your database:

1. **🎫 Pass #1: Permission to access the database** (`resourceGroupName: 'data'`)
2. **📍 Pass #2: The address of the database** (`allow.resource()` at schema level)

Most people only do Pass #1 and wonder why their Lambda fails with "malformed environment variables"!

## The Problem

```
Lambda: "Hey, I need to access the database!"
AWS: "Do you have permission?" 
Lambda: "Yes! I have resourceGroupName: 'data'!"
AWS: "Great! Go ahead!"
Lambda: "Wait... where IS the database?"
AWS: "🤷‍♂️ You never asked for the address..."
Lambda: "ERROR: The data environment variables are malformed!" 💥
```

## The Solution

You need BOTH passes:

### Pass #1: Permission (in your function definition)
```typescript
// amplify/functions/myFunction/resource.ts
export const myFunction = defineFunction({
  name: 'myFunction',
  entry: './handler.ts',
  resourceGroupName: 'data', // 🎫 Pass #1: "I can access databases"
});
```

### Pass #2: Address (in your schema)
```typescript
// amplify/data/resource.ts
import { myFunction } from '../functions/myFunction/resource';

const schema = a.schema({
  // Your models here
})
.authorization((allow) => [
  allow.resource(myFunction), // 📍 Pass #2: "Here's where the database is"
]);
```

## Why Two Levels of Authorization?

Think of it like a concert:
- **Model-level authorization** = Who can enter which sections (VIP, General, etc.)
- **Schema-level authorization** = Who gets the venue address and parking pass

```typescript
const schema = a.schema({
  MyModel: a.model({...})
    .authorization((allow) => [
      allow.guest(), // Guests can access this model section
    ])
})
.authorization((allow) => [
  allow.resource(myFunction), // Lambda gets venue address + all-access pass
]);
```

## The Complete Checklist

✅ **Step 1**: Define your function with `resourceGroupName: 'data'`
```typescript
export const myFunction = defineFunction({
  resourceGroupName: 'data', // Permission to access
});
```

✅ **Step 2**: Import your function in the schema file
```typescript
import { myFunction } from '../functions/myFunction/resource';
```

✅ **Step 3**: Add schema-level authorization
```typescript
.authorization((allow) => [
  allow.resource(myFunction), // Gives database address
]);
```

✅ **Step 4**: Register in backend
```typescript
const backend = defineBackend({
  auth,
  data,
  myFunction, // Must be here!
});
```

✅ **Step 5**: Use IAM auth in Lambda
```typescript
const client = generateClient<Schema>({ authMode: 'iam' });
```

## Common Mistakes

### ❌ Mistake 1: Trying to put everything in model authorization
```typescript
// This causes TypeScript errors!
.model({...})
.authorization((allow) => [
  allow.guest(),
  allow.resource(myFunction), // TypeScript: "Nope!"
])
```

### ❌ Mistake 2: Only using resourceGroupName
```typescript
// Lambda has permission but no address!
resourceGroupName: 'data' // Only half the solution
// Missing: allow.resource() in schema
```

### ❌ Mistake 3: Forgetting to import the function
```typescript
// Can't use what you didn't import!
.authorization((allow) => [
  allow.resource(myFunction), // Error: myFunction is not defined
]);
```

## Debugging Tips

### Check 1: Look at Lambda Environment Variables
In AWS Console, check your Lambda's environment variables:
- ✅ Should see: `AMPLIFY_DATA_GRAPHQL_ENDPOINT` with a URL
- ❌ If missing: You forgot schema-level `allow.resource()`

### Check 2: Look for Empty Config
- ✅ Should see: `AMPLIFY_SSM_ENV_CONFIG` with actual configuration
- ❌ If you see: `AMPLIFY_SSM_ENV_CONFIG: "{}"` (empty) - missing schema auth

### Check 3: Error Messages
- "malformed environment variables" = Missing schema-level authorization
- "AccessDeniedException" = Missing resourceGroupName or wrong auth mode
- "Cannot find module" = Wrong import paths

## The Golden Rule

**If your Lambda needs to access DynamoDB through GraphQL, it needs BOTH:**
1. `resourceGroupName: 'data'` (permission)
2. `allow.resource(functionName)` at schema level (address)

Without both, it's like having a key but not knowing which door to use!

## Quick Test

Ask yourself:
1. Does my function have `resourceGroupName: 'data'`? ✅
2. Did I import my function in `data/resource.ts`? ✅
3. Did I add `.authorization((allow) => [allow.resource(myFunction)])` to the SCHEMA? ✅
4. Is my function in `defineBackend()`? ✅

If all four are ✅, your Lambda will work! If any are ❌, you'll get errors.