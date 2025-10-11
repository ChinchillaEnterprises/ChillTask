# 🚨 Scheduled Lambda Troubleshooting Decision Tree

## Quick Diagnostic Checklist

When your scheduled Lambda fails, follow this decision tree to identify the root cause quickly.

### 🔍 Step 1: What Error Are You Getting?

#### A) "The data environment variables are malformed"
➡️ **Go to [Environment Variables Section](#environment-variables-malformed)**

#### B) "Cannot read properties of undefined"
➡️ **Go to [GraphQL Client Issues](#graphql-client-issues)**  

#### C) Function runs but no database changes
➡️ **Go to [Authorization Issues](#authorization-issues)**

#### D) External API timeouts/failures
➡️ **Go to [External API Issues](#external-api-issues)**

#### E) Function never runs at all
➡️ **Go to [EventBridge Issues](#eventbridge-issues)**

---

## 🛠️ Environment Variables Malformed

**Problem**: `"The data environment variables are malformed"`

### Decision Tree:
```
❌ Malformed Environment Variables
    ├─ Check: Do you have resourceGroupName: 'data'?
    │   ├─ No → Add it to amplify/functions/[name]/resource.ts
    │   └─ Yes → Continue to next check
    └─ Check: Do you have allow.resource() in schema?
        ├─ No → Add to amplify/data/resource.ts authorization
        └─ Yes → Redeploy and check CloudWatch logs
```

### ✅ Solution Steps:
1. **Check resource.ts**:
   ```typescript
   // amplify/functions/scheduledFunction/resource.ts
   resourceGroupName: 'data' // ← MUST BE HERE
   ```

2. **Check schema authorization**:
   ```typescript
   // amplify/data/resource.ts
   .authorization((allow) => [
     allow.resource(scheduledFunctionExample), // ← MUST BE HERE
   ])
   ```

3. **Redeploy**: `npx ampx sandbox`

### 🔬 Debug Commands:
```bash
# Check what env vars actually exist
npx ampx sandbox --outputs | grep -i amplify
```

---

## 🔌 GraphQL Client Issues

**Problem**: Client initialization fails or undefined errors

### Decision Tree:
```
❌ GraphQL Client Issues
    ├─ Error: Cannot read properties of undefined (reading 'models')
    │   ├─ Check: Is Amplify.configure() called before generateClient()?
    │   └─ Check: Are you using await getAmplifyDataClientConfig()?
    ├─ Error: GraphQL schema not found
    │   └─ Check: Is authMode set to 'iam'?
    └─ Error: Access denied
        └─ Go to Authorization Issues section
```

### ✅ Solution Pattern:
```typescript
// Correct initialization order:
const env = process.env as any;
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>({ authMode: 'iam' }); // ← IAM not 'userPool'
```

---

## 🔐 Authorization Issues

**Problem**: Function runs but can't access database

### Decision Tree:
```
❌ Authorization Issues
    ├─ Error: "Access Denied" or "Unauthorized"
    │   ├─ Check: Using authMode: 'iam'?
    │   │   ├─ No → Change to 'iam'
    │   │   └─ Yes → Continue
    │   └─ Check: Lambda execution role permissions
    ├─ Error: "User is not authorized to access"
    │   └─ Check: Schema authorization rules
    └─ No error but no data changes
        └─ Check: CloudWatch logs for silent failures
```

### ✅ Solution Checklist:
- [ ] Using `authMode: 'iam'` (not 'userPool')
- [ ] Schema has `allow.resource(functionName)` 
- [ ] Function has `resourceGroupName: 'data'`
- [ ] Both deployed successfully

### 🔬 Debug Commands:
```typescript
// Add to your handler for debugging
console.log('Auth mode:', client.config?.Auth?.defaultAuthMode);
console.log('GraphQL endpoint:', process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT);
```

---

## 🌐 External API Issues

**Problem**: External API calls failing

### Decision Tree:
```
❌ External API Issues
    ├─ Timeout errors
    │   ├─ Check: Using AbortSignal.timeout()?
    │   └─ Increase timeout or check API performance
    ├─ Network errors (ECONNRESET, ENOTFOUND)
    │   ├─ Check: API endpoint correct?
    │   └─ Check: Lambda has internet access (VPC config)
    ├─ 401/403 Authentication errors
    │   ├─ Check: API key in environment variables
    │   └─ Check: Token not expired
    └─ 429 Rate limit errors
        └─ Implement retry logic with exponential backoff
```

### ✅ Common Fixes:
```typescript
// Add proper timeout
const response = await fetch(url, {
  signal: AbortSignal.timeout(30000), // 30 second timeout
  headers: {
    'Authorization': `Bearer ${process.env.API_TOKEN}`,
    'User-Agent': 'Amplify-Function/1.0'
  }
});
```

---

## ⏰ EventBridge Issues

**Problem**: Scheduled function never runs

### Decision Tree:
```
❌ EventBridge Issues
    ├─ Function exists but no invocations in CloudWatch
    │   ├─ Check: EventBridge rule created?
    │   │   └─ Look in AWS Console → EventBridge → Rules
    │   └─ Check: Rule enabled and targets set?
    ├─ Function runs manually but not on schedule
    │   └─ Check: Schedule expression syntax
    └─ Schedule running but wrong times
        └─ Check: Timezone (EventBridge uses UTC)
```

### ✅ Common Schedule Formats:
```typescript
// In backend.ts
Schedule.cron({ minute: '0', hour: '2' })        // 2:00 AM UTC daily
Schedule.cron({ minute: '*/15' })                // Every 15 minutes  
Schedule.rate(Duration.hours(6))                 // Every 6 hours
```

### 🔬 Debug Steps:
1. Check AWS Console → EventBridge → Rules
2. Look for rule matching your function name
3. Verify target is set to your Lambda function
4. Check rule is enabled

---

## 🧰 Advanced Debugging Tools

### CloudWatch Logs Investigation:
```bash
# Get recent logs
aws logs tail /aws/lambda/[function-name] --follow

# Search for specific errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/[function-name] \
  --filter-pattern "ERROR"
```

### Environment Variable Inspector:
```typescript
// Add this temporarily to your handler
console.log('=== FULL DEBUG INFO ===');
console.log('All env vars:', JSON.stringify(process.env, null, 2));
console.log('Amplify vars:', Object.keys(process.env).filter(k => k.includes('AMPLIFY')));
console.log('Event details:', JSON.stringify(event, null, 2));
```

### Permission Testing:
```typescript
// Test if you can list tables (requires DynamoDB permissions)
const { resourceConfig } = await getAmplifyDataClientConfig(process.env as any);
console.log('Resource config:', JSON.stringify(resourceConfig, null, 2));
```

---

## 🚀 Quick Recovery Commands

### Emergency Fixes:
```bash
# Redeploy everything
npx ampx sandbox --clean

# Reset CloudFormation if stuck  
npx ampx sandbox delete
npx ampx sandbox

# Check current deployment status
npx ampx sandbox --outputs
```

### MCP Tool Chain:
When all else fails, use the MCP documentation tools:
1. `get_lambda_environment_explained` - Deep dive into env vars
2. `get_scheduled_lambda_setup` - Complete setup guide  
3. `get_debugging_guide` - Advanced debugging techniques

---

## 📞 When to Escalate

**Contact your team lead when:**
- All steps above completed but issue persists
- CloudFormation deployment is stuck > 30 minutes
- AWS service-level issues (check AWS Status page)
- Need to modify IAM policies manually

**Before escalating, gather:**
- CloudWatch logs from the failing function
- Complete error messages (not just snippets)
- Your amplify/functions/[name]/resource.ts
- Your amplify/data/resource.ts authorization section