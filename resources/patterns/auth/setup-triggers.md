# Set Up Authentication Triggers

**Step-by-step pattern for adding Lambda triggers to Cognito user lifecycle events**

---

## ✅ Prerequisites

- Amplify Gen 2 project with auth configured
- Basic understanding of Lambda functions
- Node.js/TypeScript knowledge

---

## 📋 Available Trigger Events

Cognito supports these Lambda trigger events:

**Sign-Up Flow:**
- `preSignUp` - Before user registration (validate, auto-confirm)
- `postConfirmation` - After email/phone verification (create profile, send welcome)
- `userMigration` - Migrate users from legacy system

**Sign-In Flow:**
- `preAuthentication` - Before sign in (custom validation)
- `postAuthentication` - After successful sign in (logging, analytics)
- `preTokenGeneration` - Modify JWT tokens (add custom claims)

**Custom Challenges:**
- `defineAuthChallenge` - Custom auth flow logic
- `createAuthChallenge` - Generate custom challenge
- `verifyAuthChallenge` - Verify custom challenge response

**Other:**
- `customMessage` - Customize email/SMS messages
- `customEmailSender` - Custom email delivery
- `customSMSSender` - Custom SMS delivery

---

## 📋 Step 1: Create Pre-SignUp Trigger

Use this to validate registrations and auto-confirm users.

### Create `amplify/auth/pre-signup/resource.ts`:

```typescript
import { defineFunction } from '@aws-amplify/backend';

export const preSignUp = defineFunction({
  name: 'pre-signup-validation',
  entry: './handler.ts',
  environment: {
    ALLOWED_DOMAINS: 'company.com,partner.com',
    REQUIRE_INVITE: 'false',
  },
});
```

### Create `amplify/auth/pre-signup/handler.ts`:

```typescript
import type { PreSignUpTriggerHandler } from 'aws-lambda';

export const handler: PreSignUpTriggerHandler = async (event) => {
  console.log('Pre-signup trigger:', JSON.stringify(event, null, 2));

  const { email } = event.request.userAttributes;

  // Validate email domain
  if (email) {
    const domain = email.split('@')[1];
    const allowedDomains = process.env.ALLOWED_DOMAINS?.split(',') || [];

    if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
      throw new Error(`Only ${allowedDomains.join(', ')} emails are allowed`);
    }
  }

  // Auto-confirm internal users
  const internalDomains = ['company.com', 'internal.company.com'];
  if (email && internalDomains.includes(email.split('@')[1])) {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }

  // Validate invitation code
  const inviteCode = event.request.clientMetadata?.inviteCode;
  if (process.env.REQUIRE_INVITE === 'true' && !inviteCode) {
    throw new Error('An invitation code is required');
  }

  return event;
};
```

**Key Points:**
- ✅ Throw errors to reject registration
- ✅ Use `event.response` to modify behavior
- ✅ Access client metadata for custom data
- ✅ Keep logic fast (< 5 seconds timeout)

---

## 📋 Step 2: Create Post-Confirmation Trigger

Use this to set up user profiles and send welcome emails.

### Create `amplify/auth/post-confirmation/resource.ts`:

```typescript
import { defineFunction } from '@aws-amplify/backend';

export const postConfirmation = defineFunction({
  name: 'post-confirmation-setup',
  entry: './handler.ts',
  environment: {
    SENDER_EMAIL: 'noreply@myapp.com',
    APP_URL: 'https://myapp.com',
  },
});
```

### Create `amplify/auth/post-confirmation/handler.ts`:

```typescript
import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new SESClient({});

export const handler: PostConfirmationTriggerHandler = async (event) => {
  console.log('Post-confirmation:', JSON.stringify(event, null, 2));

  try {
    // 1. Create user profile
    await createUserProfile(event);

    // 2. Send welcome email
    await sendWelcomeEmail(event);

    // 3. Track signup analytics
    await trackSignup(event);
  } catch (error) {
    console.error('Post-confirmation error:', error);
    // Don't throw - user is already confirmed
  }

  return event;
};

async function createUserProfile(event: any) {
  await docClient.send(
    new PutCommand({
      TableName: process.env.USER_PROFILE_TABLE!,
      Item: {
        userId: event.request.userAttributes.sub,
        email: event.request.userAttributes.email,
        givenName: event.request.userAttributes.given_name,
        familyName: event.request.userAttributes.family_name,
        createdAt: new Date().toISOString(),
        onboardingCompleted: false,
      },
    })
  );
}

async function sendWelcomeEmail(event: any) {
  const email = event.request.userAttributes.email;
  if (!email) return;

  await sesClient.send(
    new SendEmailCommand({
      Source: process.env.SENDER_EMAIL!,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: 'Welcome to MyApp! 🎉' },
        Body: {
          Html: {
            Data: `
              <h1>Welcome ${event.request.userAttributes.given_name || 'there'}!</h1>
              <p>We're excited to have you on board.</p>
              <a href="${process.env.APP_URL}/onboarding">Get Started</a>
            `,
          },
        },
      },
    })
  );
}

async function trackSignup(event: any) {
  console.log('User signed up:', {
    userId: event.request.userAttributes.sub,
    email: event.request.userAttributes.email,
    source: event.request.clientMetadata?.source,
  });
}
```

**Key Points:**
- ✅ DON'T throw errors (user is already confirmed)
- ✅ Log errors for monitoring
- ✅ Make operations idempotent
- ✅ Use try-catch for each operation

---

## 📋 Step 3: Grant Trigger Permissions

Triggers need IAM permissions to access AWS resources.

### In `amplify/auth/post-confirmation/resource.ts`:

```typescript
import { defineFunction } from '@aws-amplify/backend';

export const postConfirmation = defineFunction({
  name: 'post-confirmation-setup',
  entry: './handler.ts',
  environment: {
    SENDER_EMAIL: 'noreply@myapp.com',
    APP_URL: 'https://myapp.com',
  },
});
```

### In `amplify/backend.ts`:

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { postConfirmation } from './auth/post-confirmation/resource';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,
  data,
  postConfirmation,
});

// Grant DynamoDB access
const userProfileTable = backend.data.resources.tables['UserProfile'];
backend.postConfirmation.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['dynamodb:PutItem'],
    resources: [userProfileTable.tableArn],
  })
);

// Grant SES access
backend.postConfirmation.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['ses:SendEmail', 'ses:SendRawEmail'],
    resources: ['*'],
  })
);
```

---

## 📋 Step 4: Register Triggers in Auth Config

Update `amplify/auth/resource.ts`:

```typescript
import { defineAuth } from '@aws-amplify/backend';
import { preSignUp } from './pre-signup/resource';
import { postConfirmation } from './post-confirmation/resource';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },

  triggers: {
    preSignUp,
    postConfirmation,
  },
});
```

---

## 📋 Step 5: Pass Client Metadata from Frontend

Send custom data to triggers:

```typescript
import { signUp } from 'aws-amplify/auth';

async function handleSignUp(email: string, password: string, inviteCode?: string) {
  await signUp({
    username: email,
    password,
    options: {
      userAttributes: {
        email,
        given_name: firstName,
        family_name: lastName,
      },
      clientMetadata: {
        inviteCode: inviteCode || '',
        source: 'web-app',
        campaign: 'spring-2024',
        referrer: document.referrer,
      },
    },
  });
}
```

Access in trigger:
```typescript
const inviteCode = event.request.clientMetadata?.inviteCode;
const source = event.request.clientMetadata?.source;
```

---

## 📋 Step 6: Deploy and Test

```bash
npx ampx sandbox
```

Test the trigger flow:
1. Sign up a new user
2. Check CloudWatch logs for trigger execution
3. Verify user profile created in DynamoDB
4. Check email inbox for welcome message

---

## 🎯 Pre-Token Generation Trigger (Add Custom Claims)

Use this to add custom data to JWT tokens.

### Create `amplify/auth/pre-token/handler.ts`:

```typescript
import type { PreTokenGenerationTriggerHandler } from 'aws-lambda';

export const handler: PreTokenGenerationTriggerHandler = async (event) => {
  // Add custom claims to token
  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {
        'custom:role': 'admin',
        'custom:tenantId': 'tenant-123',
        'custom:plan': 'premium',
      },
      claimsToSuppress: ['email_verified'], // Optional
      groupOverrideDetails: {
        groupsToOverride: ['Admins', 'PowerUsers'],
      },
    },
  };

  return event;
};
```

Access in frontend:
```typescript
import { fetchAuthSession } from 'aws-amplify/auth';

const session = await fetchAuthSession();
const role = session.tokens?.idToken?.payload['custom:role'];
const tenantId = session.tokens?.idToken?.payload['custom:tenantId'];
```

---

## 📋 All Trigger Types Reference

```typescript
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: { email: true },

  triggers: {
    // Sign-up flow
    preSignUp,              // Validate before signup
    postConfirmation,       // Setup after confirmation
    userMigration,          // Migrate from legacy system

    // Sign-in flow
    preAuthentication,      // Validate before signin
    postAuthentication,     // Track after signin
    preTokenGeneration,     // Modify JWT tokens

    // Custom challenges
    defineAuthChallenge,    // Define custom flow
    createAuthChallenge,    // Create challenge
    verifyAuthChallenge,    // Verify response

    // Messages
    customMessage,          // Customize emails/SMS
    customEmailSender,      // Custom email delivery
    customSMSSender,        // Custom SMS delivery
  },
});
```

---

## ⚠️ Common Pitfalls

1. **Throwing errors in post-confirmation** → User is already confirmed, log instead
2. **Slow trigger execution** → Keep under 5 seconds or risk timeout
3. **Missing permissions** → Grant IAM permissions for AWS services
4. **Not handling errors** → Always use try-catch in triggers
5. **Forgetting to return event** → Must return event object
6. **Not testing with CloudWatch** → Check logs for debugging

---

## 🔍 Debugging Triggers

### View CloudWatch Logs:

```bash
# Find log group
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/pre-signup

# Get recent logs
aws logs tail /aws/lambda/pre-signup-validation --follow
```

### Add Detailed Logging:

```typescript
export const handler: PreSignUpTriggerHandler = async (event) => {
  console.log('Full event:', JSON.stringify(event, null, 2));
  console.log('User attributes:', event.request.userAttributes);
  console.log('Client metadata:', event.request.clientMetadata);

  try {
    // Your logic here
  } catch (error) {
    console.error('Error:', error);
    throw error; // Only in pre-signup, not post-confirmation
  }

  return event;
};
```

---

## ✅ Checklist

Before moving on, verify:
- [ ] Trigger functions created in `amplify/auth/` subfolders
- [ ] Triggers registered in `amplify/auth/resource.ts`
- [ ] IAM permissions granted in `amplify/backend.ts`
- [ ] Environment variables set correctly
- [ ] Client metadata passed from frontend
- [ ] Sandbox deployed successfully
- [ ] Triggers tested with real signup flow
- [ ] CloudWatch logs reviewed
- [ ] Error handling in place
- [ ] All required AWS SDK dependencies installed

---

**You're done! Your app now has custom authentication triggers! 🎉**
