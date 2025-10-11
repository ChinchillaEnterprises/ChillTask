# Amplify Auth Triggers - Complete Guide

**Lambda triggers let you customize Cognito's authentication flow. This guide shows you when to use each trigger and provides production-ready implementations.**

---

## 🎯 Quick Reference

| Trigger | When It Runs | Common Use Cases |
|---------|-------------|------------------|
| **Pre Sign-up** | Before user registration | Domain validation, invitation codes, auto-confirm |
| **Post Confirmation** | After email/phone verification | Create profile, welcome email, assign groups |
| **Pre Authentication** | Before sign-in | Block suspended users, check IP allowlist |
| **Post Authentication** | After successful sign-in | Track last login, update analytics |
| **Pre Token Generation** | Before issuing JWT | Add custom claims, inject permissions |
| **Custom Message** | Before sending email/SMS | Customize verification codes, branding |
| **Define Auth Challenge** | Custom auth flow | Passwordless, magic links, WebAuthn |
| **Create Auth Challenge** | Generate challenge | Send OTP, magic link, biometric prompt |
| **Verify Auth Challenge** | Validate response | Verify code, validate signature |
| **User Migration** | On first login | Migrate from legacy system |

---

## 1. Pre Sign-up Trigger

### When to use
- Validate email domains before allowing registration
- Check invitation codes
- Verify employee IDs against external systems
- Auto-confirm specific user types
- Prevent unwanted registrations

### Implementation

```typescript
// amplify/auth/triggers/pre-signup.ts
import type { PreSignUpTriggerHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: PreSignUpTriggerHandler = async (event) => {
  console.log('Pre-signup event:', JSON.stringify(event, null, 2));

  const { email, phone_number } = event.request.userAttributes;

  // ✅ 1. Domain allowlist validation
  if (email) {
    const domain = email.split('@')[1];
    const allowedDomains = process.env.ALLOWED_DOMAINS?.split(',') || [];

    if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
      throw new Error(
        `Registration is restricted to ${allowedDomains.join(', ')} email addresses`
      );
    }
  }

  // ✅ 2. Invitation code validation (for B2B apps)
  const inviteCode = event.request.clientMetadata?.inviteCode;

  if (process.env.REQUIRE_INVITE === 'true') {
    if (!inviteCode) {
      throw new Error('An invitation code is required to register');
    }

    // Verify invitation exists and is valid
    const invitation = await dynamoClient.send(
      new GetCommand({
        TableName: process.env.INVITATION_TABLE!,
        Key: { code: inviteCode },
      })
    );

    if (!invitation.Item) {
      throw new Error('Invalid invitation code');
    }

    if (invitation.Item.used) {
      throw new Error('This invitation has already been used');
    }

    if (invitation.Item.email !== email) {
      throw new Error('This invitation is for a different email address');
    }

    if (new Date(invitation.Item.expiresAt) < new Date()) {
      throw new Error('This invitation has expired');
    }
  }

  // ✅ 3. Auto-confirm for specific domains
  const autoConfirmDomains = ['company.com', 'internal.company.com'];
  if (email && autoConfirmDomains.some(d => email.endsWith(`@${d}`))) {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }

  // ✅ 4. Employee ID validation (enterprise)
  const employeeId = event.request.userAttributes['custom:employeeId'];
  if (employeeId) {
    const isValid = await validateEmployeeId(employeeId);
    if (!isValid) {
      throw new Error('Invalid employee ID');
    }
  }

  // ✅ 5. Rate limiting (prevent signup spam)
  const ipAddress = event.request.clientMetadata?.ipAddress;
  if (ipAddress) {
    const recentSignups = await getRecentSignupCount(ipAddress);
    if (recentSignups > 5) {
      throw new Error('Too many registration attempts. Please try again later.');
    }
  }

  return event;
};

async function validateEmployeeId(employeeId: string): Promise<boolean> {
  // Check format
  if (!/^EMP\d{6}$/.test(employeeId)) {
    return false;
  }

  // In production: verify against HR system API
  // const response = await fetch(`${process.env.HR_API_URL}/verify/${employeeId}`);
  // return response.ok;

  return true;
}

async function getRecentSignupCount(ipAddress: string): Promise<number> {
  // In production: check DynamoDB or Redis for recent signups from this IP
  // const result = await dynamoClient.send(
  //   new QueryCommand({
  //     TableName: process.env.SIGNUP_TRACKING_TABLE,
  //     KeyConditionExpression: 'ipAddress = :ip AND #ts > :time',
  //     ExpressionAttributeNames: { '#ts': 'timestamp' },
  //     ExpressionAttributeValues: {
  //       ':ip': ipAddress,
  //       ':time': Date.now() - 3600000, // Last hour
  //     },
  //   })
  // );
  // return result.Items?.length || 0;

  return 0;
}
```

### Client-side usage

```typescript
import { signUp } from 'aws-amplify/auth';

// Pass invitation code via clientMetadata
await signUp({
  username: email,
  password: password,
  options: {
    userAttributes: {
      email,
      'custom:employeeId': 'EMP123456',
    },
    clientMetadata: {
      inviteCode: 'ABC123XYZ',
      ipAddress: '192.168.1.1', // Get from request
      source: 'marketing-campaign',
    },
  },
});
```

---

## 2. Post Confirmation Trigger

### When to use
- Create user profile in DynamoDB after verification
- Assign users to default groups
- Send welcome emails
- Initialize user workspaces/projects
- Track analytics
- Notify external systems (CRM, mailing list)

### Implementation

```typescript
// amplify/auth/triggers/post-confirmation.ts
import type { PostConfirmationTriggerHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand
} from '@aws-sdk/client-cognito-identity-provider';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sesClient = new SESClient({});
const cognitoClient = new CognitoIdentityProviderClient({});

export const handler: PostConfirmationTriggerHandler = async (event) => {
  console.log('Post-confirmation event:', JSON.stringify(event, null, 2));

  try {
    // ✅ 1. Create user profile in DynamoDB
    await createUserProfile(event);

    // ✅ 2. Assign to default group
    await assignDefaultGroup(event);

    // ✅ 3. Send welcome email
    await sendWelcomeEmail(event);

    // ✅ 4. Initialize user workspace
    await initializeUserWorkspace(event);

    // ✅ 5. Mark invitation as used (if applicable)
    const inviteCode = event.request.clientMetadata?.inviteCode;
    if (inviteCode) {
      await markInvitationUsed(inviteCode, event.request.userAttributes.sub);
    }

    // ✅ 6. Track analytics
    await trackUserSignup(event);

    // ✅ 7. Notify external systems
    await notifyExternalSystems(event);

  } catch (error) {
    // ⚠️ IMPORTANT: Don't throw errors here - user is already confirmed
    // Just log for monitoring
    console.error('Error in post-confirmation trigger:', error);
  }

  return event;
};

async function createUserProfile(event: any) {
  const profile = {
    userId: event.request.userAttributes.sub,
    email: event.request.userAttributes.email,
    givenName: event.request.userAttributes.given_name,
    familyName: event.request.userAttributes.family_name,

    // Multi-tenant attributes
    companyId: event.request.userAttributes['custom:companyId'],
    companyName: event.request.userAttributes['custom:companyName'],
    role: event.request.userAttributes['custom:role'] || 'USER',

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    onboarding: {
      completed: false,
      currentStep: 0,
    },

    preferences: {
      notifications: {
        email: true,
        sms: false,
        push: true,
      },
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
    },

    metadata: {
      source: event.request.clientMetadata?.source || 'organic',
      campaign: event.request.clientMetadata?.campaign,
      referrer: event.request.clientMetadata?.referrer,
    },
  };

  await dynamoClient.send(
    new PutCommand({
      TableName: process.env.USER_PROFILE_TABLE!,
      Item: profile,
      ConditionExpression: 'attribute_not_exists(userId)', // Prevent overwrites
    })
  );
}

async function assignDefaultGroup(event: any) {
  // Check if user was invited with a specific role
  const invitedRole = event.request.clientMetadata?.role;
  const companyId = event.request.userAttributes['custom:companyId'];

  // Default group based on role
  let groupName = 'USERS';

  if (invitedRole === 'ADMIN') {
    groupName = 'ADMINS';
  } else if (invitedRole === 'SUPER_ADMIN') {
    groupName = 'SUPER_ADMINS';
  }

  await cognitoClient.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: event.userPoolId,
      Username: event.userName,
      GroupName: groupName,
    })
  );
}

async function sendWelcomeEmail(event: any) {
  const email = event.request.userAttributes.email;
  if (!email) return;

  const firstName = event.request.userAttributes.given_name || 'there';
  const companyName = event.request.userAttributes['custom:companyName'];

  await sesClient.send(
    new SendEmailCommand({
      Source: process.env.SENDER_EMAIL || 'noreply@myapp.com',
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: `Welcome to ${companyName || 'our platform'}! 🎉`,
        },
        Body: {
          Html: {
            Data: `
              <!DOCTYPE html>
              <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #333;">Welcome ${firstName}!</h1>
                  <p style="font-size: 16px; line-height: 1.5;">
                    We're thrilled to have you on board${companyName ? ` at ${companyName}` : ''}.
                  </p>

                  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="margin-top: 0;">Get Started:</h2>
                    <ul style="font-size: 16px; line-height: 1.8;">
                      <li><a href="${process.env.APP_URL}/onboarding">Complete your profile</a></li>
                      <li><a href="${process.env.APP_URL}/docs">Read our getting started guide</a></li>
                      <li><a href="${process.env.APP_URL}/support">Get help from support</a></li>
                    </ul>
                  </div>

                  <p style="font-size: 14px; color: #666; margin-top: 30px;">
                    Need help? Just reply to this email!
                  </p>

                  <p style="font-size: 14px; color: #666;">
                    Best regards,<br>
                    The Team
                  </p>
                </body>
              </html>
            `,
          },
          Text: {
            Data: `Welcome ${firstName}!\n\nWe're thrilled to have you on board.\n\nGet Started:\n- Complete your profile: ${process.env.APP_URL}/onboarding\n- Read our guide: ${process.env.APP_URL}/docs\n- Get help: ${process.env.APP_URL}/support\n\nBest regards,\nThe Team`,
          },
        },
      },
    })
  );
}

async function initializeUserWorkspace(event: any) {
  const userId = event.request.userAttributes.sub;
  const companyId = event.request.userAttributes['custom:companyId'];

  // Create default workspace (if not part of a company)
  if (!companyId) {
    await dynamoClient.send(
      new PutCommand({
        TableName: process.env.WORKSPACE_TABLE!,
        Item: {
          workspaceId: `ws_${userId}`,
          userId,
          name: 'My Workspace',
          type: 'personal',
          createdAt: new Date().toISOString(),
          settings: {
            timezone: 'UTC',
            dateFormat: 'MM/DD/YYYY',
            currency: 'USD',
          },
        },
      })
    );
  }
}

async function markInvitationUsed(inviteCode: string, userId: string) {
  await dynamoClient.send(
    new UpdateCommand({
      TableName: process.env.INVITATION_TABLE!,
      Key: { code: inviteCode },
      UpdateExpression: 'SET #used = :true, usedBy = :userId, usedAt = :timestamp',
      ExpressionAttributeNames: { '#used': 'used' },
      ExpressionAttributeValues: {
        ':true': true,
        ':userId': userId,
        ':timestamp': new Date().toISOString(),
      },
    })
  );
}

async function trackUserSignup(event: any) {
  // Track in analytics table
  await dynamoClient.send(
    new PutCommand({
      TableName: process.env.ANALYTICS_TABLE!,
      Item: {
        eventId: `${Date.now()}_${event.request.userAttributes.sub}`,
        eventType: 'user_signup',
        userId: event.request.userAttributes.sub,
        timestamp: new Date().toISOString(),
        properties: {
          email: event.request.userAttributes.email,
          source: event.request.clientMetadata?.source || 'organic',
          campaign: event.request.clientMetadata?.campaign,
          triggerSource: event.triggerSource,
        },
      },
    })
  );
}

async function notifyExternalSystems(event: any) {
  const webhookUrl = process.env.CRM_WEBHOOK_URL;

  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRM_API_KEY}`,
      },
      body: JSON.stringify({
        event: 'user_signup',
        user: {
          email: event.request.userAttributes.email,
          firstName: event.request.userAttributes.given_name,
          lastName: event.request.userAttributes.family_name,
          userId: event.request.userAttributes.sub,
          companyId: event.request.userAttributes['custom:companyId'],
        },
        source: 'app_signup',
        timestamp: new Date().toISOString(),
      }),
    });
  }
}
```

---

## 3. Pre Token Generation Trigger

### When to use
- Add custom claims to JWT tokens
- Inject user permissions into tokens
- Add company context for multi-tenant apps
- Include user preferences in tokens
- Add feature flags

### Implementation

```typescript
// amplify/auth/triggers/pre-token-generation.ts
import type { PreTokenGenerationTriggerHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler: PreTokenGenerationTriggerHandler = async (event) => {
  console.log('Pre-token generation event:', JSON.stringify(event, null, 2));

  const userId = event.request.userAttributes.sub;
  const companyId = event.request.userAttributes['custom:companyId'];

  // ✅ 1. Get user's full permissions from DynamoDB
  const permissions = await getUserPermissions(userId, companyId);

  // ✅ 2. Get company features/limits
  const companyFeatures = companyId ? await getCompanyFeatures(companyId) : null;

  // ✅ 3. Add custom claims to token
  event.response.claimsOverrideDetails = {
    claimsToAddOrOverride: {
      // Company context
      'custom:companyId': companyId || '',
      'custom:companyName': event.request.userAttributes['custom:companyName'] || '',
      'custom:role': event.request.userAttributes['custom:role'] || 'USER',

      // Permissions (as JSON string)
      'custom:permissions': JSON.stringify(permissions),

      // Company features
      'custom:subscriptionTier': companyFeatures?.subscriptionTier || 'free',
      'custom:features': JSON.stringify(companyFeatures?.enabledFeatures || []),

      // User preferences
      'custom:theme': event.request.userAttributes['custom:theme'] || 'light',
      'custom:language': event.request.userAttributes['custom:language'] || 'en',
    },
  };

  return event;
};

async function getUserPermissions(userId: string, companyId?: string) {
  // Get from DynamoDB or permission service
  if (companyId) {
    const result = await dynamoClient.send(
      new GetCommand({
        TableName: process.env.USER_PROFILE_TABLE!,
        Key: { userId },
      })
    );

    const role = result.Item?.role || 'USER';

    // Return permissions based on role
    const rolePermissions: Record<string, string[]> = {
      SUPER_ADMIN: ['*'],
      ADMIN: ['read', 'write', 'delete', 'manage_users', 'view_analytics'],
      USER: ['read', 'write'],
    };

    return rolePermissions[role] || rolePermissions.USER;
  }

  return ['read'];
}

async function getCompanyFeatures(companyId: string) {
  const result = await dynamoClient.send(
    new GetCommand({
      TableName: process.env.COMPANY_TABLE!,
      Key: { companyId },
    })
  );

  return {
    subscriptionTier: result.Item?.subscriptionTier || 'free',
    enabledFeatures: result.Item?.enabledFeatures || [],
    maxUsers: result.Item?.maxUsers || 5,
    maxProjects: result.Item?.maxProjects || 10,
  };
}
```

### Client-side usage

```typescript
import { fetchAuthSession } from 'aws-amplify/auth';

// Access custom claims from token
const session = await fetchAuthSession();
const claims = session.tokens?.idToken?.payload;

const companyId = claims?.['custom:companyId'];
const role = claims?.['custom:role'];
const permissions = JSON.parse(claims?.['custom:permissions'] || '[]');
const subscriptionTier = claims?.['custom:subscriptionTier'];
const features = JSON.parse(claims?.['custom:features'] || '[]');

// Use for client-side authorization
if (permissions.includes('manage_users')) {
  // Show user management UI
}

if (features.includes('advanced_analytics')) {
  // Show advanced analytics feature
}
```

---

## 4. Passwordless Auth Triggers

### Complete passwordless flow

```typescript
// amplify/auth/triggers/passwordless/define-auth-challenge.ts
export const handler = async (event: any) => {
  // First attempt - issue challenge
  if (event.request.session.length === 0) {
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = 'CUSTOM_CHALLENGE';
  }
  // Challenge answered correctly
  else if (
    event.request.session.length === 1 &&
    event.request.session[0].challengeName === 'CUSTOM_CHALLENGE' &&
    event.request.session[0].challengeResult === true
  ) {
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
  }
  // Too many failed attempts
  else {
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
  }

  return event;
};
```

```typescript
// amplify/auth/triggers/passwordless/create-auth-challenge.ts
import { randomBytes } from 'crypto';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({});

export const handler = async (event: any) => {
  if (event.request.challengeName === 'CUSTOM_CHALLENGE') {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store in event for verification
    event.response.publicChallengeParameters = {
      email: event.request.userAttributes.email,
    };

    event.response.privateChallengeParameters = {
      code,
      expires: expires.toString(),
    };

    // Send code via email
    await sesClient.send(
      new SendEmailCommand({
        Source: process.env.SENDER_EMAIL!,
        Destination: {
          ToAddresses: [event.request.userAttributes.email],
        },
        Message: {
          Subject: { Data: 'Your login code' },
          Body: {
            Html: {
              Data: `
                <h2>Your login code is:</h2>
                <h1 style="font-size: 36px; letter-spacing: 5px;">${code}</h1>
                <p>This code expires in 5 minutes.</p>
              `,
            },
          },
        },
      })
    );
  }

  return event;
};
```

```typescript
// amplify/auth/triggers/passwordless/verify-auth-challenge.ts
export const handler = async (event: any) => {
  const expectedCode = event.request.privateChallengeParameters.code;
  const expires = parseInt(event.request.privateChallengeParameters.expires);
  const userCode = event.request.challengeAnswer;

  // Check if code matches and hasn't expired
  if (userCode === expectedCode && Date.now() < expires) {
    event.response.answerCorrect = true;
  } else {
    event.response.answerCorrect = false;
  }

  return event;
};
```

---

## 🔑 Best Practices

### General
- ✅ Always return the event object
- ✅ Log all events for debugging
- ✅ Keep triggers fast (< 5 seconds)
- ✅ Handle errors gracefully
- ✅ Make operations idempotent

### Pre Sign-up
- ✅ Throw errors to reject registration
- ✅ Use `autoConfirmUser` carefully
- ✅ Validate early to save resources

### Post Confirmation
- ❌ DON'T throw errors (user already confirmed)
- ✅ Use try-catch for each operation
- ✅ Log errors for monitoring

### Pre Token Generation
- ✅ Keep claims small (JWT size limit)
- ✅ Cache expensive lookups
- ✅ Use JSON.stringify for complex data

### Passwordless
- ✅ Short expiration times (5 min)
- ✅ One-time use codes
- ✅ Rate limit attempts
- ✅ Secure code generation

---

## 📚 Additional Resources

- [Cognito Lambda Triggers](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- Auth Patterns: `AUTH_PATTERNS.md`
- Security Checklist: `SECURITY_CHECKLIST.md`
