# User-Triggered Function Example

This example demonstrates how to create Lambda functions that handle user-initiated actions through GraphQL mutations. It showcases generic patterns for file processing, data exports, report generation, and other background tasks.

## What You'll Learn

- **User Authentication**: How to access authenticated user context in Lambda functions
- **Permission Validation**: Checking user status and authorization before processing
- **External API Integration**: Securely calling third-party services with proper error handling
- **Multi-Model Updates**: Updating multiple DynamoDB tables in a transaction-like pattern
- **Structured Error Handling**: Returning consistent responses instead of throwing errors

## Files Overview

### `resource.ts`
Configures the Lambda function with:
- **Resource Group**: `data` for database access
- **Environment Variables**: Region, environment, and custom settings
- **Performance**: 30-second timeout, 512MB memory allocation
- **Security**: IAM permissions for Secrets Manager and DynamoDB

### `handler.ts`
Main function logic implementing:
- **User Context Extraction**: Getting authenticated user from `context.identity.sub`
- **Permission Validation**: Checking user status and authorization levels
- **External API Calls**: Using AWS Secrets Manager for credentials
- **Database Operations**: Creating records with proper error handling
- **Cache Management**: Invalidating relevant caches after actions

## Core Pattern: User Context & Authorization

```typescript
// ✅ Get authenticated user from context
const userId = context.identity?.sub;

if (!userId) {
  throw new Error('Unauthorized - must be signed in');
}

// ✅ Initialize Amplify client with IAM permissions
const client = generateClient<Schema>({
  authMode: 'iam', // Function runs with elevated permissions
});

// ✅ Validate user exists and is active
const user = await client.models.User.get({ id: userId });

if (!user.data?.isActive) {
  throw new Error('User account is not active');
}

// ✅ Check specific permissions for different action types
if (actionType === 'GENERATE_REPORT' && user.data.userType !== 'ADMIN') {
  throw new Error('Insufficient permissions for report generation');
}

if (actionType === 'EXPORT_DATA' && !user.data.canExportData) {
  throw new Error('Data export not enabled for this user');
}
```

## External Service Integration Pattern

```typescript
// ✅ Get credentials from Secrets Manager
const secretId = `amplify-template/${environment}/external-services`;
const command = new GetSecretValueCommand({ SecretId: secretId });
const secretResponse = await secretsClient.send(command);
const secrets = JSON.parse(secretResponse.SecretString);

// ✅ Call external service based on action type
let apiEndpoint;
switch (actionType) {
  case 'PROCESS_FILE':
    apiEndpoint = '/file-processor/upload';
    break;
  case 'GENERATE_REPORT':
    apiEndpoint = '/report-generator/create';
    break;
  case 'EXPORT_DATA':
    apiEndpoint = '/data-exporter/queue';
    break;
  default:
    apiEndpoint = '/generic-processor';
}

const response = await fetch(`https://api.example.com${apiEndpoint}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${secrets.api_key}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(10000) // 10 second timeout
});

if (!response.ok) {
  throw new Error(`Service failed: ${response.status}`);
}
```

## Database Update Pattern

```typescript
// ✅ Create primary record for tracking the action
const actionRecord = await client.models.UserAction.create({
  userId,
  actionType,
  externalId: externalResult.id,
  status: 'COMPLETED',
  owner: userId // Enables user to query their own actions
});

// ✅ Update related records based on action type
try {
  // Update user's last action timestamp
  await client.models.User.update({
    id: userId,
    lastActionAt: new Date().toISOString()
  });
  
  // For file processing actions, update file status
  if (actionType === 'PROCESS_FILE' && metadata?.fileId) {
    await client.models.File.update({
      id: metadata.fileId,
      status: 'PROCESSED',
      processedAt: new Date().toISOString()
    });
  }
} catch (updateError) {
  console.warn('Non-critical update failed:', updateError);
  // Don't fail the main operation for secondary updates
}
```

## Schema Definition

Add this to your `amplify/data/resource.ts`:

```typescript
// Custom mutation for user-initiated actions
processUserFile: a
  .mutation()
  .arguments({
    fileId: a.string().required(),
    processingType: a.string().required(), // 'resize', 'convert', 'analyze'
    options: a.json()
  })
  .returns(a.customType({
    success: a.boolean().required(),
    jobId: a.string(),
    message: a.string().required(),
    estimatedTime: a.string(),
    resultUrl: a.string()
  }))
  .handler(a.handler.function(userTriggeredExample))
  .authorization((allow) => [allow.authenticated()]),

generateReport: a
  .mutation()
  .arguments({
    reportType: a.string().required(), // 'usage', 'analytics', 'summary'
    dateRange: a.json().required(),
    filters: a.json()
  })
  .returns(a.customType({
    success: a.boolean().required(),
    reportId: a.string(),
    downloadUrl: a.string(),
    message: a.string().required()
  }))
  .handler(a.handler.function(userTriggeredExample))
  .authorization((allow) => [allow.authenticated()]),

exportUserData: a
  .mutation()
  .arguments({
    dataTypes: a.string().array().required(), // ['profile', 'activities', 'files']
    format: a.string().required(), // 'json', 'csv', 'pdf'
    email: a.string()
  })
  .returns(a.customType({
    success: a.boolean().required(),
    exportId: a.string(),
    deliveryMethod: a.string().required(),
    message: a.string().required()
  }))
  .handler(a.handler.function(userTriggeredExample))
  .authorization((allow) => [allow.authenticated()]),

// Data models
UserAction: a
  .model({
    userId: a.string().required(),
    actionType: a.string().required(),
    metadata: a.string(),
    externalId: a.string(),
    externalStatus: a.string(),
    status: a.enum(['PENDING', 'COMPLETED', 'FAILED']),
    createdAt: a.string(),
    owner: a.string()
  })
  .authorization((allow) => [
    // Users can only see their own actions
    allow.owner(),
    // Functions can access all records
    allow.resource(userTriggeredExample)
  ])
```

## Client-Side Usage

```typescript
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

const client = generateClient<Schema>();

// Example 1: Process a file (resize image, convert document, etc.)
const fileResult = await client.mutations.processUserFile({
  fileId: 'file-123',
  processingType: 'resize',
  options: {
    width: 800,
    height: 600,
    quality: 80
  }
});

// Example 2: Generate a report
const reportResult = await client.mutations.generateReport({
  reportType: 'usage',
  dateRange: {
    start: '2024-01-01',
    end: '2024-01-31'
  },
  filters: {
    includeInactive: false
  }
});

// Example 3: Export user data
const exportResult = await client.mutations.exportUserData({
  dataTypes: ['profile', 'activities'],
  format: 'json',
  email: 'user@example.com'
});

if (exportResult.data?.success) {
  console.log('Export started:', exportResult.data.exportId);
} else {
  console.error('Export failed:', exportResult.data?.message);
}
```

## Error Handling Strategy

This example demonstrates **structured error handling** - instead of throwing errors that crash the function, it returns consistent response objects:

```typescript
// ✅ Good: Structured response
return {
  success: false,
  actionId: null,
  message: error.message,
  error: {
    type: error.constructor.name,
    code: error.code || 'UNKNOWN_ERROR'
  }
};

// ❌ Avoid: Throwing errors (crashes function)
throw new Error('Something went wrong');
```

## Security Considerations

1. **Authentication**: Always validate `context.identity.sub`
2. **Authorization**: Check user permissions before processing
3. **Input Validation**: Validate all arguments before using them
4. **Secrets Management**: Use AWS Secrets Manager, never hardcode credentials
5. **Rate Limiting**: Consider implementing rate limiting for high-frequency actions
6. **Audit Logging**: Log all actions for security monitoring

## Performance Tips

1. **Timeout Management**: Use `AbortSignal.timeout()` for external API calls
2. **Error Recovery**: Handle non-critical failures gracefully
3. **Memory Optimization**: Start with 512MB, increase only if needed
4. **Cold Starts**: Keep function code minimal, lazy-load heavy dependencies
5. **Batch Operations**: Group multiple database operations when possible

## Common Use Cases

- **File Processing**: Resize images, convert documents, analyze media files
- **Report Generation**: Create usage reports, analytics dashboards, data summaries
- **Data Export**: Generate and deliver user data in various formats (JSON, CSV, PDF)
- **Background Tasks**: Send emails, process webhooks, sync with external services
- **Batch Operations**: Bulk updates, data migration, cleanup tasks
- **AI/ML Processing**: Content analysis, image recognition, text processing

## Next Steps

1. **Deploy**: Add the function to your `amplify/backend.ts`
2. **Test**: Use the Amplify console to test mutations
3. **Monitor**: Set up CloudWatch alarms for errors and latency
4. **Scale**: Add more specific action types as needed
5. **Secure**: Configure proper IAM permissions for production

This pattern scales well for any user-initiated action that needs to:
- Validate user permissions
- Call external services
- Update multiple data models
- Provide consistent responses to the client