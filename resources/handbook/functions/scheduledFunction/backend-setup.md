# Complete Backend Configuration for Scheduled Functions

This file contains production-ready code for setting up scheduled Lambda functions in AWS Amplify Gen 2.
Copy and paste these examples directly into your `amplify/backend.ts` file.

## 🚨 CRITICAL: The #1 Cause of "Malformed Environment Variables" Error

**If your Lambda function fails with "The data environment variables are malformed", you're missing schema-level authorization!**

```typescript
// ❌ WRONG - This will cause "malformed environment variables" error
const schema = a.schema({
  MyModel: a.model({...})
    .authorization((allow) => [
      allow.guest(),
      allow.resource(myFunction), // TypeScript error if placed here!
    ])
});

// ✅ CORRECT - Two separate authorization blocks
const schema = a.schema({
  MyModel: a.model({...})
    .authorization((allow) => [
      allow.guest(), // Model-level: Frontend access
    ])
})
.authorization((allow) => [
  allow.resource(myFunction), // Schema-level: Lambda gets GraphQL config!
]);
```

**Without schema-level `allow.resource()`, your Lambda will NOT receive the GraphQL endpoint configuration, even with `resourceGroupName: 'data'`!**

## Required Imports

```typescript
// CORRECT IMPORTS - Duration comes from aws-cdk-lib, NOT aws-events
import { defineBackend } from '@aws-amplify/backend';
import { Stack, Duration } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { myScheduledFunction } from './functions/myScheduledFunction/resource';
```

## Complete Working Backend Configuration

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { Stack, Duration } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { myScheduledFunction } from './functions/myScheduledFunction/resource';

// Define the backend with all resources
const backend = defineBackend({
  auth,
  data,
  myScheduledFunction, // CRITICAL: Must be registered here for permissions to work
});

// Get the Lambda function's stack for creating the EventBridge rule
const functionStack = Stack.of(backend.myScheduledFunction.resources.lambda);

// Create EventBridge rule for scheduled execution
const scheduledRule = new events.Rule(
  functionStack,
  'MyScheduledFunctionRule',
  {
    description: 'Trigger function every 5 minutes',
    // CORRECT: Duration is imported from aws-cdk-lib
    schedule: events.Schedule.rate(Duration.minutes(5)),
  }
);

// Add Lambda as target with retry configuration
scheduledRule.addTarget(
  new targets.LambdaFunction(backend.myScheduledFunction.resources.lambda, {
    retryAttempts: 1, // Retry once on failure
    maxEventAge: Duration.hours(1), // Discard events older than 1 hour
  })
);
```

## Multiple Schedule Examples

### Example 1: Different Schedules for Different Environments

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { Stack, Duration } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

const backend = defineBackend({
  auth,
  data,
  myScheduledFunction,
});

const functionStack = Stack.of(backend.myScheduledFunction.resources.lambda);

// Environment-specific scheduling
const environment = process.env.ENV || 'dev';

let schedule: events.Schedule;
let description: string;

switch (environment) {
  case 'production':
    // Daily at 2 AM UTC in production
    schedule = events.Schedule.cron({ minute: '0', hour: '2' });
    description = 'Production: Daily sync at 2 AM UTC';
    break;
  case 'staging':
    // Every 6 hours in staging
    schedule = events.Schedule.rate(Duration.hours(6));
    description = 'Staging: Sync every 6 hours';
    break;
  default:
    // Every 15 minutes in development
    schedule = events.Schedule.rate(Duration.minutes(15));
    description = 'Development: Sync every 15 minutes';
}

const scheduledRule = new events.Rule(functionStack, 'ScheduledRule', {
  description,
  schedule,
});

scheduledRule.addTarget(
  new targets.LambdaFunction(backend.myScheduledFunction.resources.lambda)
);
```

### Example 2: Multiple Schedules for Same Function

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { Stack, Duration } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

const backend = defineBackend({
  auth,
  data,
  myScheduledFunction,
});

const functionStack = Stack.of(backend.myScheduledFunction.resources.lambda);

// Schedule 1: High-frequency during business hours
const businessHoursRule = new events.Rule(
  functionStack,
  'BusinessHoursRule',
  {
    description: 'Every 30 minutes during business hours',
    schedule: events.Schedule.cron({
      minute: '0,30',
      hour: '9-17',
      weekDay: 'MON-FRI',
    }),
  }
);

businessHoursRule.addTarget(
  new targets.LambdaFunction(backend.myScheduledFunction.resources.lambda)
);

// Schedule 2: Daily comprehensive sync at night
const nightlySyncRule = new events.Rule(
  functionStack,
  'NightlySyncRule',
  {
    description: 'Daily comprehensive sync at 2 AM UTC',
    schedule: events.Schedule.cron({
      minute: '0',
      hour: '2',
    }),
  }
);

nightlySyncRule.addTarget(
  new targets.LambdaFunction(backend.myScheduledFunction.resources.lambda, {
    event: events.RuleTargetInput.fromObject({
      syncType: 'comprehensive', // Pass custom data to distinguish sync types
    }),
  })
);

// Schedule 3: Weekly cleanup on Sunday
const weeklyCleanupRule = new events.Rule(
  functionStack,
  'WeeklyCleanupRule',
  {
    description: 'Weekly cleanup on Sunday at 3 AM UTC',
    schedule: events.Schedule.cron({
      minute: '0',
      hour: '3',
      weekDay: 'SUN',
    }),
  }
);

weeklyCleanupRule.addTarget(
  new targets.LambdaFunction(backend.myScheduledFunction.resources.lambda, {
    event: events.RuleTargetInput.fromObject({
      operation: 'cleanup',
    }),
  })
);
```

## Complete Authorization Setup (THREE Required Parts)

### ✅ Part 1: In `amplify/data/resource.ts` (MOST CRITICAL):

```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
// CRITICAL: Import your function to use in schema authorization
import { myScheduledFunction } from '../functions/myScheduledFunction/resource';

const schema = a.schema({
  MyModel: a
    .model({
      word: a.string().required(),
      createdAt: a.datetime(),
      isActive: a.boolean().default(true),
      syncedAt: a.datetime(),
      source: a.string(),
    })
    .authorization((allow) => [
      allow.guest(), // Model-level: Frontend access for users
    ]),
})
// 🚨 CRITICAL: Schema-level authorization - WITHOUT THIS, YOU GET "MALFORMED ENV VARS"!
.authorization((allow) => [
  allow.resource(myScheduledFunction), // This injects GraphQL config into Lambda!
]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'identityPool',
  },
});
```

**⚠️ COMMON MISTAKE**: Forgetting the schema-level `.authorization()` block causes:
- ❌ "The data environment variables are malformed" error
- ❌ Empty `AMPLIFY_SSM_ENV_CONFIG` in Lambda environment
- ❌ Missing `AMPLIFY_DATA_GRAPHQL_ENDPOINT` environment variable

### ✅ Part 2: In `amplify/functions/myScheduledFunction/resource.ts`:

```typescript
import { defineFunction } from '@aws-amplify/backend';

export const myScheduledFunction = defineFunction({
  name: 'myScheduledFunction',
  entry: './handler.ts',
  // This grants IAM permissions to access DynamoDB tables
  // BUT DOES NOT provide GraphQL endpoint config - that comes from allow.resource()!
  resourceGroupName: 'data',
  timeoutSeconds: 300,
  memoryMB: 1024,
  environment: {
    // Your custom environment variables
  },
});
```

**What `resourceGroupName: 'data'` does:**
- ✅ Grants IAM permissions to access DynamoDB tables
- ❌ Does NOT automatically inject GraphQL endpoint configuration
- ❌ Does NOT set AMPLIFY_DATA_GRAPHQL_ENDPOINT environment variable

### ✅ Part 3: In `amplify/functions/myScheduledFunction/handler.ts`:

```typescript
import { EventBridgeEvent } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import type { Schema } from '../../data/resource';

export const handler = async (event: EventBridgeEvent<string, any>) => {
  try {
    // This function REQUIRES schema-level allow.resource() to work!
    // Without it, getAmplifyDataClientConfig throws "malformed environment variables"
    const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
      process.env.AWS_REGION!
    );
    
    Amplify.configure(resourceConfig, libraryOptions);
    
    // CRITICAL: Use 'iam' authMode for Lambda functions
    const client = generateClient<Schema>({ authMode: 'iam' });
    
    // Now you can access DynamoDB through GraphQL
    const result = await client.models.MyModel.create({
      word: 'test',
      createdAt: new Date().toISOString(),
      isActive: true,
      syncedAt: new Date().toISOString(),
      source: 'scheduled-function',
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Success',
        recordId: result.data?.id,
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    // If you see "malformed environment variables" here, 
    // you're missing allow.resource() in your schema!
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Processing failed' }),
    };
  }
};
```

## Common Schedule Patterns

### Daily Schedules

```typescript
// Every day at midnight UTC
schedule: events.Schedule.cron({ minute: '0', hour: '0' })

// Every day at 9 AM UTC
schedule: events.Schedule.cron({ minute: '0', hour: '9' })

// Twice daily (6 AM and 6 PM UTC)
schedule: events.Schedule.cron({ minute: '0', hour: '6,18' })

// Weekdays only at 9 AM UTC
schedule: events.Schedule.cron({ minute: '0', hour: '9', weekDay: 'MON-FRI' })
```

### Frequent Schedules

```typescript
// Every 5 minutes
schedule: events.Schedule.rate(Duration.minutes(5))

// Every hour
schedule: events.Schedule.rate(Duration.hours(1))

// Every 30 minutes during business hours
schedule: events.Schedule.cron({
  minute: '0,30',
  hour: '9-17',
  weekDay: 'MON-FRI'
})
```

### Weekly/Monthly Schedules

```typescript
// Every Sunday at 3 AM UTC
schedule: events.Schedule.cron({
  minute: '0',
  hour: '3',
  weekDay: 'SUN'
})

// First day of each month at 1 AM UTC
schedule: events.Schedule.cron({
  minute: '0',
  hour: '1',
  day: '1'
})

// Last Friday of each month (approximate)
schedule: events.Schedule.cron({
  minute: '0',
  hour: '2',
  day: '25-31',
  weekDay: 'FRI'
})
```

## Troubleshooting Common Issues

### Issue: "Property 'Duration' does not exist on type 'typeof events'"

**Problem**: Trying to use `events.Duration.minutes(5)`

**Solution**: Import Duration from 'aws-cdk-lib' directly:
```typescript
import { Duration } from 'aws-cdk-lib';
// Then use: Duration.minutes(5)
```

### Issue: "Type 'Promise<{ statusCode: number; body: string; }>' is not assignable to type 'void | Promise<void>'"

**Problem**: Using `ScheduledHandler` type which expects void return

**Solution**: Use `EventBridgeEvent<string, any>` type:
```typescript
export const handler = async (event: EventBridgeEvent<string, any>) => {
  // Can now return status codes
  return { statusCode: 200, body: JSON.stringify({ message: 'Success' }) };
};
```

### Issue: "The data environment variables are malformed" (MOST COMMON!)

**Problem**: Missing schema-level authorization - Lambda can't find GraphQL endpoint

**Solution**: Add schema-level authorization to your data/resource.ts:
```typescript
const schema = a.schema({
  // your models...
})
.authorization((allow) => [
  allow.resource(yourFunction), // THIS IS REQUIRED!
]);
```

**Debug Steps**:
1. Check Lambda environment variables in AWS Console
2. Look for `AMPLIFY_DATA_GRAPHQL_ENDPOINT` - if missing, you forgot schema-level auth
3. Check `AMPLIFY_SSM_ENV_CONFIG` - if empty `{}`, same issue

### Issue: "AccessDeniedException" when Lambda tries to access DynamoDB

**Problem**: Missing proper authorization setup

**Solution**: Ensure THREE things:
1. Function has `resourceGroupName: 'data'` in resource.ts (grants IAM permissions)
2. Schema has `.authorization((allow) => [allow.resource(functionName)])` (injects config)
3. Function is registered in `defineBackend({ ..., functionName })` (wires everything up)

### Issue: "Existing schema attributes cannot be modified or deleted" during deployment

**Problem**: Trying to modify Cognito user attributes after initial deployment

**Solution**: Delete sandbox and redeploy:
```bash
npx ampx sandbox delete
npx ampx sandbox
```

## Testing Your Scheduled Function

### 1. Manual Testing in AWS Console

```json
// Create this test event in Lambda console
{
  "version": "0",
  "id": "test-event-id",
  "detail-type": "Scheduled Event",
  "source": "aws.events",
  "account": "123456789012",
  "time": "2024-01-01T12:00:00Z",
  "region": "us-east-1",
  "resources": [],
  "detail": {}
}
```

### 2. Local Testing Script

```typescript
// test-scheduled-function.ts
import { handler } from './handler';

const testEvent = {
  version: "0",
  id: "test-123",
  "detail-type": "Scheduled Event",
  source: "aws.events",
  account: "123456789012",
  time: new Date().toISOString(),
  region: "us-east-1",
  resources: [],
  detail: {}
};

async function test() {
  const result = await handler(testEvent as any);
  console.log('Result:', result);
}

test().catch(console.error);
```

### 3. Monitoring in CloudWatch

After deployment, monitor your function:
1. Go to CloudWatch Console
2. Navigate to Logs > Log groups
3. Find `/aws/lambda/your-function-name`
4. Check for execution logs and errors

## Best Practices Summary

1. **Always use correct types**: `EventBridgeEvent<string, any>` not `ScheduledHandler`
2. **Import Duration correctly**: From 'aws-cdk-lib' not 'aws-events'
3. **Set resourceGroupName**: Always use `'data'` for DynamoDB access
4. **Use IAM auth mode**: `{ authMode: 'iam' }` in Lambda functions
5. **Register functions**: Include in `defineBackend()` call
6. **Return status codes**: For proper monitoring and error tracking
7. **Environment-specific schedules**: Different frequencies for dev/staging/prod
8. **Add retry logic**: Configure retryAttempts and maxEventAge
9. **Comprehensive logging**: Use structured JSON logging
10. **Test thoroughly**: Use Lambda console before relying on schedules