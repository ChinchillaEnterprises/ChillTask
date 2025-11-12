# Amplify Auth Security Checklist

**Critical security considerations and common mistakes to avoid when implementing authentication.**

---

## 🚨 The One-Shot Schema Problem

### ⚠️ Custom Attributes Are Permanent

**YOU CAN NEVER:**
- Delete a custom attribute once created
- Change `required` from true to false
- Change `mutable` from false to true
- Rename a custom attribute

**This is a one-shot decision. Choose carefully.**

### ✅ What to do

**Minimal is better:**
```typescript
// ✅ GOOD - Only 4 custom attributes
userAttributes: {
  'custom:companyId': { dataType: 'String', mutable: false },
  'custom:companyName': { dataType: 'String', mutable: true },
  'custom:role': { dataType: 'String', mutable: true },
  'custom:oktaId': { dataType: 'String', mutable: false },
}
```

**Don't store analytics in Cognito:**
```typescript
// ❌ BAD - These belong in DynamoDB
'custom:lastLoginDate'       // Changes every login → too frequent
'custom:queryCount'          // Analytics → DynamoDB
'custom:subscriptionTier'    // Company data → Company table
'custom:onboardingComplete'  // User state → DynamoDB
'custom:preferences'         // Complex object → DynamoDB
```

### 📊 Decision Matrix: Cognito vs DynamoDB

| Data Type | Cognito Attribute? | DynamoDB? | Why? |
|-----------|-------------------|-----------|------|
| **companyId** | ✅ Yes (immutable) | Maybe (denormalized) | Needed in JWT for authorization |
| **role** | ✅ Yes (mutable) | Maybe (denormalized) | Needed in JWT for permissions |
| **oktaId** | ✅ Yes (immutable) | Maybe | Needed for SSO sync |
| **email** | ✅ Yes | No | Core identity |
| **lastLogin** | ❌ No | ✅ Yes | Changes too frequently |
| **preferences** | ❌ No | ✅ Yes | Complex nested object |
| **onboarding** | ❌ No | ✅ Yes | User state/progress |
| **analytics** | ❌ No | ✅ Yes | Not related to identity |
| **billingTier** | ❌ No | ✅ Yes | Company-level data |
| **apiQuota** | ❌ No | ✅ Yes | Usage tracking |

**Rule of thumb:** If it changes frequently or is complex, use DynamoDB.

---

## 🔒 Required Attributes Break SSO

### ⚠️ The Problem

```typescript
// ❌ BAD - Breaks social login and SSO
userAttributes: {
  email: { required: true, mutable: true },
  phoneNumber: { required: true, mutable: true },  // ❌ WRONG
  givenName: { required: true, mutable: true },    // ❌ WRONG
}
```

**What happens:**
1. User clicks "Sign in with Google"
2. Google doesn't send `phoneNumber`
3. Cognito rejects: "phoneNumber is required"
4. Sign-in fails

### ✅ The Fix

```typescript
// ✅ GOOD - Only email required
userAttributes: {
  email: { required: true, mutable: true },
  phoneNumber: { required: false, mutable: true },  // ✅ Optional
  givenName: { required: false, mutable: true },    // ✅ Optional
  familyName: { required: false, mutable: true },   // ✅ Optional
}
```

**Rule:** Keep ALL attributes `required: false` except `email`.

---

## 🔄 Immutable Attributes Break SSO Updates

### ⚠️ The Problem

```typescript
// ❌ BAD - Breaks Okta sync on second login
userAttributes: {
  'custom:companyName': {
    dataType: 'String',
    mutable: false,  // ❌ WRONG for SSO-mapped attributes
  },
  'custom:role': {
    dataType: 'String',
    mutable: false,  // ❌ WRONG - users can't be promoted
  },
}
```

**What happens:**
1. User signs in via Okta → `companyName: "Acme Corp"`
2. Company rebrands to "Acme Inc" in Okta
3. User signs in again → Okta sends `companyName: "Acme Inc"`
4. Cognito rejects: "custom:companyName is immutable"
5. Sign-in fails

### ✅ The Fix

```typescript
// ✅ GOOD - Thoughtful mutability
userAttributes: {
  'custom:companyId': {
    dataType: 'String',
    mutable: false,  // ✅ Immutable - users shouldn't switch companies
  },
  'custom:companyName': {
    dataType: 'String',
    mutable: true,   // ✅ Mutable - allows company rebrand
  },
  'custom:role': {
    dataType: 'String',
    mutable: true,   // ✅ Mutable - allows promotions
  },
  'custom:oktaId': {
    dataType: 'String',
    mutable: false,  // ✅ Immutable - set once
  },
}
```

**Rule:** Only make attributes immutable if they should NEVER change (like `companyId`, `oktaId`).

---

## 🛡️ Privilege Escalation Risk

### ⚠️ The Problem

**By default, users can edit their own custom attributes!**

```typescript
// User can do this from the client:
import { updateUserAttributes } from 'aws-amplify/auth';

// ⚠️ User promotes themselves to admin!
await updateUserAttributes({
  userAttributes: {
    'custom:role': 'ADMIN',  // ❌ Privilege escalation
    'custom:companyId': 'different-company-id',  // ❌ Company switching
  },
});
```

### ✅ The Fix

**1. Make attributes read-only in App Client settings:**

In your auth configuration, configure app client to prevent user updates:

```typescript
// In amplify/auth/resource.ts
export const auth = defineAuth({
  // ... your config
});

// Then in amplify/backend.ts, add CDK overrides:
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';

const backend = defineBackend({ auth });

// Override user pool client to make custom attributes read-only
const userPoolClient = backend.auth.resources.userPoolClient;
userPoolClient.addPropertyOverride('ReadAttributes', [
  'email',
  'given_name',
  'family_name',
  'custom:companyId',
  'custom:companyName',
  'custom:role',
  'custom:oktaId',
]);

userPoolClient.addPropertyOverride('WriteAttributes', [
  'email',
  'given_name',
  'family_name',
  // ⚠️ Notice: custom attributes NOT in write list
]);
```

**2. Only update custom attributes via Lambda triggers or Admin API:**

```typescript
// In Lambda triggers or backend functions
import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({});

// Only admins can change roles
await cognitoClient.send(
  new AdminUpdateUserAttributesCommand({
    UserPoolId: userPoolId,
    Username: username,
    UserAttributes: [
      { Name: 'custom:role', Value: 'ADMIN' },
    ],
  })
);
```

---

## 📏 Standard Attributes - Enable Now or Never

### ⚠️ The Problem

**You CANNOT add standard attributes after user pool creation.**

```typescript
// Day 1: Create user pool
userAttributes: {
  email: { required: true, mutable: true },
  givenName: { required: false, mutable: true },
}

// Day 30: "We need phoneNumber for MFA"
userAttributes: {
  email: { required: true, mutable: true },
  givenName: { required: false, mutable: true },
  phoneNumber: { required: false, mutable: true },  // ❌ Can't add this later!
}

// Result: You have to use custom:phoneNumber instead
// This wastes one of your 50 custom attribute slots
```

### ✅ The Fix

**Enable all potentially useful standard attributes NOW:**

```typescript
// ✅ GOOD - Future-proofed
userAttributes: {
  // Core (you're definitely using)
  email: { required: true, mutable: true },
  givenName: { required: false, mutable: true },
  familyName: { required: false, mutable: true },
  profilePicture: { required: false, mutable: true },

  // Future-proofing (enable now, use later)
  phoneNumber: { required: false, mutable: true },
  locale: { required: false, mutable: true },
  zoneinfo: { required: false, mutable: true },
  preferredUsername: { required: false, mutable: true },
  address: { required: false, mutable: true },

  // Only use custom attributes for truly custom data
  'custom:companyId': { dataType: 'String', mutable: false },
  'custom:role': { dataType: 'String', mutable: true },
}
```

**Costs you nothing to enable. Can't add them later.**

---

## 🔐 Password Policy

### ⚠️ Common Mistakes

```typescript
// ❌ BAD - Too weak for production
passwordPolicy: {
  minimumLength: 6,  // Too short
  requireLowercase: false,
  requireUppercase: false,
}
```

### ✅ Best Practices

```typescript
// ✅ GOOD - Secure defaults
passwordPolicy: {
  minimumLength: 12,  // At least 12 for enterprise
  requireLowercase: true,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialCharacters: true,
}
```

**Or use passwordless for better UX and security.**

---

## 🎫 JWT Token Security

### ⚠️ Token Size Limits

**JWT tokens have a 4KB limit. Don't stuff too much in them.**

```typescript
// ❌ BAD - Too much data in tokens
event.response.claimsOverrideDetails = {
  claimsToAddOrOverride: {
    'custom:permissions': JSON.stringify(hugePermissionsObject),  // ❌ Too big
    'custom:preferences': JSON.stringify(allUserPreferences),     // ❌ Too big
    'custom:metadata': JSON.stringify(lotsOfMetadata),            // ❌ Too big
  },
};
// Result: Token exceeds size limit, auth fails
```

### ✅ Best Practices

```typescript
// ✅ GOOD - Minimal claims
event.response.claimsOverrideDetails = {
  claimsToAddOrOverride: {
    'custom:companyId': companyId,
    'custom:role': role,
    'custom:subscriptionTier': tier,
    // Keep it small!
  },
};

// Fetch detailed data from DynamoDB when needed
const permissions = await getDetailedPermissions(userId);
```

**Store complex data in DynamoDB, not tokens.**

---

## 🌐 Callback URL Configuration

### ⚠️ Common Mistakes

```typescript
// ❌ BAD - Missing callback URLs
externalProviders: {
  google: { /* ... */ },
  callbackUrls: [
    'http://localhost:3000',  // ❌ Missing /auth/callback path
  ],
}
// Result: OAuth redirect fails
```

### ✅ Best Practices

```typescript
// ✅ GOOD - Complete URLs
externalProviders: {
  google: { /* ... */ },
  callbackUrls: [
    'http://localhost:3000/auth/callback',     // Local dev
    'https://yourdomain.com/auth/callback',    // Production
    'https://staging.yourdomain.com/auth/callback',  // Staging
  ],
  logoutUrls: [
    'http://localhost:3000',
    'https://yourdomain.com',
    'https://staging.yourdomain.com',
  ],
}
```

**Must match EXACTLY in OAuth provider console.**

---

## 🔄 Multi-Tenant Data Isolation

### ⚠️ The Problem

```typescript
// ❌ BAD - No tenant isolation
const schema = a.schema({
  Project: a.model({
    name: a.string(),
  })
  .authorization(allow => [
    allow.authenticated(),  // ❌ All users can see all projects!
  ]),
});
```

### ✅ The Fix

```typescript
// ✅ GOOD - Company-based isolation
const schema = a.schema({
  Project: a.model({
    companyId: a.id().required(),  // ✅ Every record has companyId
    name: a.string(),
  })
  .authorization(allow => [
    // Users can only access their company's data
    allow.custom({
      operations: ['read', 'create', 'update', 'delete'],
      when: (ctx) => ctx.identity.claims['custom:companyId'].eq(ctx.record.companyId)
    }),
  ]),
});
```

**Always filter by `companyId` in authorization rules.**

---

## 🚫 Don't Store Secrets in Cognito

### ⚠️ Never do this

```typescript
// ❌ BAD - Secrets exposed in JWT
userAttributes: {
  'custom:apiKey': { dataType: 'String', mutable: true },      // ❌ Exposed
  'custom:stripeKey': { dataType: 'String', mutable: true },   // ❌ Exposed
  'custom:password': { dataType: 'String', mutable: true },    // ❌ Exposed
}
```

**JWT tokens are base64-encoded, NOT encrypted. Anyone can decode them.**

### ✅ Best Practices

```typescript
// ✅ GOOD - Secrets in AWS Secrets Manager or DynamoDB with encryption
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({});

const apiKey = await secretsClient.send(
  new GetSecretValueCommand({
    SecretId: `user/${userId}/api-key`,
  })
);
```

---

## 📝 Lambda Trigger Gotchas

### ⚠️ Throwing Errors in Post-Confirmation

```typescript
// ❌ BAD - Throws error after user is confirmed
export const handler: PostConfirmationTriggerHandler = async (event) => {
  await sendWelcomeEmail(event);  // Fails
  throw new Error('Email failed');  // ❌ User is confused - already confirmed but error shown
};
```

### ✅ Best Practices

```typescript
// ✅ GOOD - Catch errors, don't throw
export const handler: PostConfirmationTriggerHandler = async (event) => {
  try {
    await sendWelcomeEmail(event);
  } catch (error) {
    console.error('Email failed:', error);
    // Don't throw - user is already confirmed
    // Alert monitoring system instead
  }
  return event;
};
```

---

## 🎯 MFA Recommendations

### ⚠️ Common Mistakes

```typescript
// ❌ BAD - No MFA for admins
multifactor: {
  mode: 'OPTIONAL',
}
```

### ✅ Best Practices

```typescript
// ✅ GOOD - Required for admins
multifactor: {
  mode: 'OPTIONAL',  // Optional for regular users
  sms: true,
  totp: true,
}

// Then in pre-token generation trigger:
export const handler = async (event) => {
  const groups = event.request.groupConfiguration.groupsToOverride || [];

  // Require MFA for admin users
  if (groups.includes('ADMINS') || groups.includes('SUPER_ADMINS')) {
    if (!event.request.userContextData?.mfaAuthenticated) {
      throw new Error('MFA is required for admin users');
    }
  }

  return event;
};
```

---

## 📋 Pre-Production Checklist

Before going to production, verify:

- [ ] Custom attributes are minimal (< 10)
- [ ] All attributes except email are `required: false`
- [ ] SSO-mapped attributes are `mutable: true` (except IDs)
- [ ] Standard attributes enabled for future use
- [ ] Custom attributes read-only to users (use CDK override)
- [ ] Multi-tenant data isolation configured
- [ ] MFA required for admins
- [ ] Password policy is secure (12+ chars)
- [ ] All callback URLs configured correctly
- [ ] Lambda triggers have error handling
- [ ] No secrets in custom attributes
- [ ] JWT token size tested (< 4KB)
- [ ] CloudTrail logging enabled
- [ ] Failed login alarms configured

---

## 🆘 What to Do If You Made a Mistake

### Can't delete a custom attribute?
**Solution:** Stop using it and let it be empty. Create a new one with a different name.

### Made an attribute required by mistake?
**Solution:** Can't fix. You'll need to migrate to a new user pool.

### Made an attribute immutable by mistake?
**Solution:** Can't fix. You'll need to use a different attribute or migrate to a new user pool.

### Forgot to enable a standard attribute?
**Solution:** Use a custom attribute instead (wastes one of your 50 slots).

**The nuclear option:** Create a new user pool and migrate users. This is painful, so get it right the first time!

---

## 📚 Additional Resources

- [Cognito Security Best Practices](https://docs.aws.amazon.com/cognito/latest/developerguide/security.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- Auth Patterns: `AUTH_PATTERNS.md`
- Triggers Guide: `TRIGGERS_GUIDE.md`
