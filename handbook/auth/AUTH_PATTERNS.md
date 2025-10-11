# Amplify Auth Patterns - Complete Guide

**Choose the right authentication pattern for your app, then copy the configuration directly into your `amplify/auth/resource.ts` file.**

---

## 🎯 Quick Decision Tree

**What type of app are you building?**

```
START HERE
│
├─ Simple MVP / Consumer App → Pattern 1: Basic Email Auth
│
├─ Consumer App with Social Login → Pattern 2: Social Auth
│
├─ B2B SaaS / Multi-Tenant Platform → Pattern 3: B2B Multi-Tenant ⭐
│
├─ Enterprise Internal Tool → Pattern 4: Enterprise SSO
│
└─ Modern Passwordless UX → Pattern 5: Passwordless Auth
```

---

## Pattern 1: Basic Email Authentication

### When to use this
- Getting started quickly with minimal setup
- Simple consumer apps
- Internal tools without compliance requirements
- MVPs without social login

### Copy-paste configuration

```typescript
// amplify/auth/resource.ts
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },

  passwordPolicy: {
    minimumLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialCharacters: true,
  },

  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
  },
});
```

### Client-side implementation

```typescript
import { signUp, confirmSignUp, signIn } from 'aws-amplify/auth';

// Sign up
await signUp({
  username: "user@example.com",
  password: "MySecurePassword123!",
  options: {
    userAttributes: {
      email: "user@example.com"
    }
  }
});

// Confirm with code from email
await confirmSignUp({
  username: "user@example.com",
  confirmationCode: "123456"
});

// Sign in
await signIn({
  username: "user@example.com",
  password: "MySecurePassword123!"
});
```

### When to upgrade
- Need social login → Move to Pattern 2
- Need multi-tenancy → Move to Pattern 3
- Need enterprise SSO → Move to Pattern 4

---

## Pattern 2: Social Authentication

### When to use this
- Consumer-facing apps
- Want to reduce friction in signup
- Need multiple login methods (email, phone, social)
- Apps requiring MFA for security

### Copy-paste configuration

```typescript
// amplify/auth/resource.ts
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    phone: true,
    username: true,

    externalProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        scopes: ['email', 'profile'],
      },
      facebook: {
        clientId: process.env.FACEBOOK_APP_ID!,
        clientSecret: process.env.FACEBOOK_APP_SECRET!,
        scopes: ['email', 'public_profile'],
      },
      loginWithAmazon: {
        clientId: process.env.AMAZON_CLIENT_ID!,
        clientSecret: process.env.AMAZON_CLIENT_SECRET!,
      },
      signInWithApple: {
        clientId: process.env.APPLE_CLIENT_ID!,
        teamId: process.env.APPLE_TEAM_ID!,
        keyId: process.env.APPLE_KEY_ID!,
        privateKey: process.env.APPLE_PRIVATE_KEY!,
      },
      callbackUrls: [
        'http://localhost:3000/',
        'https://yourdomain.com/',
      ],
      logoutUrls: [
        'http://localhost:3000/',
        'https://yourdomain.com/',
      ],
    },
  },

  multifactor: {
    mode: 'OPTIONAL',
    sms: true,
    totp: true,
  },

  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    phoneNumber: {
      required: false,  // Keep optional for social login compatibility
      mutable: true,
    },
    givenName: {
      required: false,
      mutable: true,
    },
    familyName: {
      required: false,
      mutable: true,
    },
    profilePicture: {
      required: false,
      mutable: true,
    },
    preferredUsername: {
      required: false,
      mutable: true,
    },
  },
});
```

### Client-side implementation

```typescript
import { signInWithRedirect, signUp, setUpTOTP, updateMFAPreference } from 'aws-amplify/auth';

// Sign in with Google
await signInWithRedirect({
  provider: 'Google'
});

// Sign up with phone
await signUp({
  username: '+1234567890',
  password: 'SecurePass123!',
  options: {
    userAttributes: {
      phone_number: '+1234567890',
      email: 'user@example.com',
    }
  }
});

// Enable MFA
const totpSetup = await setUpTOTP();
// Show QR code: totpSetup.getSetupUri('My App')

await updateMFAPreference({
  totp: 'PREFERRED',
  sms: 'ENABLED'
});
```

### Environment setup

You need to register your app with each provider and get credentials:

**Google:**
1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Set authorized redirect URIs
4. Get Client ID and Secret

**Facebook:**
1. Go to Facebook Developers
2. Create a new app
3. Add Facebook Login
4. Get App ID and Secret

**Apple:**
1. Go to Apple Developer
2. Create a Service ID
3. Configure Sign in with Apple
4. Get Team ID, Client ID, Key ID, and Private Key

Set these as environment variables:
```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
# etc...
```

---

## Pattern 3: B2B Multi-Tenant Authentication ⭐

### When to use this
- Multi-tenant SaaS platforms
- Company-based data isolation
- SSO integration (Okta, Google Workspace, Microsoft Entra)
- Role-based permissions per company
- Enterprise sales model

### ⚠️ CRITICAL: The One-Shot Schema Decision

**You can NEVER delete custom attributes or change mutable/required properties after deployment.**

This is your one chance to get it right. This schema is production-tested and follows AWS best practices.

### Copy-paste configuration

```typescript
// amplify/auth/resource.ts
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,

    externalProviders: {
      // Google Workspace for companies using Google
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        scopes: ['email', 'profile'],
      },

      // Okta, Microsoft Entra, or other OIDC providers
      oidc: [
        {
          name: 'Okta',
          clientId: process.env.OKTA_CLIENT_ID!,
          clientSecret: process.env.OKTA_CLIENT_SECRET!,
          issuerUrl: process.env.OKTA_ISSUER_URL!,
          scopes: ['openid', 'email', 'profile'],
          attributeMapping: {
            email: 'email',
            givenName: 'given_name',
            familyName: 'family_name',
            preferredUsername: 'preferred_username',
            'custom:companyId': 'companyId',
            'custom:companyName': 'companyName',
            'custom:role': 'role',
            'custom:oktaId': 'sub',
          },
        },
      ],

      callbackUrls: [
        'http://localhost:3000/auth/callback',
        'https://yourdomain.com/auth/callback',
      ],
      logoutUrls: [
        'http://localhost:3000',
        'https://yourdomain.com',
      ],
    },
  },

  userAttributes: {
    // ✅ Core identity attributes
    email: {
      required: true,
      mutable: true,
    },
    givenName: {
      required: false,  // Keep optional for SSO compatibility
      mutable: true,
    },
    familyName: {
      required: false,
      mutable: true,
    },
    profilePicture: {
      required: false,
      mutable: true,
    },

    // ✅ Future-proofing: Enable these NOW (can't add them later!)
    phoneNumber: {
      required: false,
      mutable: true,
    },
    locale: {
      required: false,
      mutable: true,
    },
    zoneinfo: {
      required: false,
      mutable: true,
    },
    preferredUsername: {
      required: false,
      mutable: true,
    },
    address: {
      required: false,
      mutable: true,  // Useful for billing addresses
    },

    // ✅ Multi-tenancy custom attributes (minimal set - choose carefully!)
    'custom:companyId': {
      dataType: 'String',
      mutable: false,  // ⚠️ IMMUTABLE - prevents users from switching companies
    },
    'custom:companyName': {
      dataType: 'String',
      mutable: true,   // ⚠️ MUTABLE - allows company rebrand without breaking Okta sync
    },
    'custom:role': {
      dataType: 'String',
      mutable: true,   // ⚠️ MUTABLE - allows promotions/role changes
    },
    'custom:oktaId': {
      dataType: 'String',
      mutable: false,  // ⚠️ IMMUTABLE - set once during creation, never changes
    },
  },

  // Groups for global roles (SUPER_ADMINS manage the platform itself)
  groups: ['SUPER_ADMINS', 'ADMINS', 'USERS'],
});
```

### 🚨 Critical Warnings

**DON'T add these as custom attributes** (use DynamoDB instead):

```typescript
// ❌ WRONG - Don't add these to Cognito
'custom:lastLoginDate'        // Changes too frequently → DynamoDB
'custom:subscriptionTier'     // Company-level data → Company table
'custom:department'           // Only if you need sub-company permissions
'custom:billingTier'          // Company-level data → Company table
'custom:apiQuota'             // Usage data → DynamoDB usage table
'custom:accountStatus'        // Changes too frequently → DynamoDB
'custom:onboardingCompleted'  // User state → DynamoDB
```

**Why only 4 custom attributes?**
- ✅ Cognito attributes are for **identity and authorization**, not analytics
- ✅ Keeps JWT tokens small (performance)
- ✅ Unlimited DynamoDB storage for everything else
- ✅ Custom attributes can NEVER be deleted (keep it minimal)

### Why this mutability configuration?

| Attribute | Mutable | Why? |
|-----------|---------|------|
| `custom:companyId` | ❌ No | Users can't switch companies (security) |
| `custom:companyName` | ✅ Yes | Company can rebrand without breaking Okta attribute mapping |
| `custom:role` | ✅ Yes | Users can be promoted from User → Admin |
| `custom:oktaId` | ❌ No | Set once during SSO creation, never changes |

### Attribute decision matrix

**Should this be a Cognito attribute or DynamoDB?**

| Data | Cognito? | DynamoDB? | Why? |
|------|----------|-----------|------|
| companyId | ✅ Yes (immutable) | Maybe (denormalized) | Needed in JWT for authorization |
| companyName | ✅ Yes (mutable) | Yes (source of truth) | Useful for display in UI |
| role | ✅ Yes (mutable) | Maybe (denormalized) | Needed in JWT for permissions |
| oktaId | ✅ Yes (immutable) | Maybe | Needed for Okta sync |
| lastLogin | ❌ No | ✅ Yes | Changes every login → too frequent |
| queryCount | ❌ No | ✅ Yes | Analytics data → DynamoDB |
| subscriptionTier | ❌ No | ✅ Yes | Company-level → Company table |
| preferences | ❌ No | ✅ Yes | Complex object → DynamoDB |
| onboarding | ❌ No | ✅ Yes | User state → DynamoDB |

### Client-side implementation

```typescript
import { signIn, signInWithRedirect, fetchAuthSession } from 'aws-amplify/auth';

// Sign in with email/password
await signIn({
  username: "user@example.com",
  password: "SecurePass123!"
});

// Sign in with Okta SSO
await signInWithRedirect({
  provider: { custom: 'Okta' }
});

// Get current user's company and role from JWT
const session = await fetchAuthSession();
const companyId = session.tokens?.idToken?.payload['custom:companyId'];
const role = session.tokens?.idToken?.payload['custom:role'];
const companyName = session.tokens?.idToken?.payload['custom:companyName'];

// Use for authorization
if (role === 'ADMIN') {
  // Show admin features
}
```

### Multi-tenant authorization patterns

**In your data schema (amplify/data/resource.ts):**

```typescript
const schema = a.schema({
  Company: a.model({
    id: a.id().required(),
    name: a.string().required(),
    subscriptionTier: a.string(),
    // ... other company fields
  })
  .authorization(allow => [
    // Only super admins can manage companies
    allow.group('SUPER_ADMINS'),
  ]),

  Project: a.model({
    companyId: a.id().required(),
    name: a.string().required(),
    // ... other project fields
  })
  .authorization(allow => [
    // Users can only access projects in their company
    allow.custom({
      operations: ['read', 'create', 'update', 'delete'],
      when: (ctx) => ctx.identity.claims['custom:companyId'].eq(ctx.record.companyId)
    }),
    // Admins can do everything in their company
    allow.custom({
      operations: ['read', 'create', 'update', 'delete'],
      when: (ctx) => ctx.identity.claims['custom:companyId'].eq(ctx.record.companyId)
        .and(ctx.identity.claims['custom:role'].eq('ADMIN'))
    }),
  ]),
});
```

### Setting up SSO providers

**Okta Setup:**
1. Log in to Okta Admin Console
2. Applications → Create App Integration
3. Choose "OIDC - OpenID Connect"
4. Application type: "Web Application"
5. Grant type: "Authorization Code"
6. Set redirect URIs to your callback URLs
7. Copy Client ID and Client Secret
8. Set Issuer URL (usually `https://your-domain.okta.com`)

**Attribute Mapping:**
Configure these in Okta to send to Cognito:
- `email` → User's email
- `given_name` → First name
- `family_name` → Last name
- `companyId` → Your company identifier
- `companyName` → Company display name
- `role` → User's role (ADMIN or USER)

**Environment variables:**
```bash
OKTA_CLIENT_ID=your-okta-client-id
OKTA_CLIENT_SECRET=your-okta-client-secret
OKTA_ISSUER_URL=https://your-domain.okta.com
```

---

## Pattern 4: Enterprise SSO

### When to use this
- Internal corporate applications
- Required MFA for compliance
- Advanced security requirements
- User migration from legacy systems
- Strict password policies

### Copy-paste configuration

```typescript
// amplify/auth/resource.ts
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    username: true,

    externalProviders: {
      // Microsoft Entra ID (formerly Azure AD)
      oidc: [
        {
          name: 'CorporateAD',
          clientId: process.env.AD_CLIENT_ID!,
          clientSecret: process.env.AD_CLIENT_SECRET!,
          issuerUrl: 'https://login.microsoftonline.com/tenant-id/v2.0',
          scopes: ['openid', 'email', 'profile', 'User.Read'],
          attributeMapping: {
            email: 'email',
            preferredUsername: 'upn',
            givenName: 'given_name',
            familyName: 'family_name',
            'custom:department': 'department',
            'custom:employeeId': 'employee_id',
          },
        },
      ],

      // SAML support
      saml: {
        name: 'CorporateSAML',
        metadata: {
          metadataContent: process.env.SAML_METADATA!,
          metadataType: 'FILE',
        },
      },

      callbackUrls: ['https://app.company.com/auth/callback'],
      logoutUrls: ['https://app.company.com/auth/logout'],
    },
  },

  // Strict password policy
  passwordPolicy: {
    minimumLength: 12,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialCharacters: true,
  },

  // Required MFA
  multifactor: {
    mode: 'REQUIRED',
    sms: true,
    totp: true,
  },

  userAttributes: {
    email: {
      required: true,
      mutable: false,  // Email cannot be changed in enterprise
    },
    phoneNumber: {
      required: false,
      mutable: true,
    },
    givenName: {
      required: false,
      mutable: true,
    },
    familyName: {
      required: false,
      mutable: true,
    },
    'custom:employeeId': {
      dataType: 'String',
      mutable: false,
      maxLen: 50,
    },
    'custom:department': {
      dataType: 'String',
      mutable: true,
      maxLen: 100,
    },
  },

  groups: [
    'Admins',
    'Managers',
    'Employees',
    'ReadOnly',
  ],
});
```

### Client-side implementation

```typescript
import { signIn, fetchAuthSession } from 'aws-amplify/auth';

// Check user's group membership
const session = await fetchAuthSession();
const groups = session.tokens?.idToken?.payload['cognito:groups'] || [];
const isAdmin = groups.includes('Admins');
const isManager = groups.includes('Managers');
```

---

## Pattern 5: Passwordless Authentication

### When to use this
- Modern consumer apps prioritizing UX
- Reducing password fatigue
- Lower support costs (no forgotten passwords)
- Apps targeting mobile-first users

### Copy-paste configuration

```typescript
// amplify/auth/resource.ts
import { defineAuth } from '@aws-amplify/backend';
import { Duration } from 'aws-cdk-lib';

export const auth = defineAuth({
  loginWith: {
    email: true,
    phone: true,
  },

  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    phoneNumber: {
      required: false,
      mutable: true,
    },
  },

  // Custom auth flow for passwordless
  triggers: {
    defineAuthChallenge: defineFunction({
      name: 'defineAuthChallenge',
      entry: './triggers/passwordless/define-auth-challenge.ts',
      timeout: Duration.seconds(10),
    }),

    createAuthChallenge: defineFunction({
      name: 'createAuthChallenge',
      entry: './triggers/passwordless/create-auth-challenge.ts',
      environment: {
        APP_URL: process.env.APP_URL || 'http://localhost:3000',
        SENDER_EMAIL: 'auth@myapp.com',
      },
      timeout: Duration.seconds(30),
    }),

    verifyAuthChallengeResponse: defineFunction({
      name: 'verifyAuthChallenge',
      entry: './triggers/passwordless/verify-auth-challenge.ts',
      timeout: Duration.seconds(10),
    }),

    preSignUp: defineFunction({
      name: 'preSignUpAutoConfirm',
      entry: './triggers/passwordless/pre-sign-up.ts',
    }),
  },
});
```

### Client-side implementation

```typescript
import { signIn, confirmSignIn } from 'aws-amplify/auth';

// Request magic link or OTP
async function signInPasswordless(email: string) {
  try {
    const result = await signIn({
      username: email,
      options: {
        authFlowType: 'CUSTOM_WITHOUT_SRP',
      },
    });

    if (result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE') {
      return { success: true, message: 'Check your email for the login code' };
    }
  } catch (error) {
    console.error('Sign in error:', error);
  }
}

// Verify the code
async function verifyCode(code: string) {
  const result = await confirmSignIn({
    challengeResponse: code,
  });

  return result.isSignedIn;
}
```

**Note:** See `TRIGGERS_GUIDE.md` for complete passwordless trigger implementations.

---

## 📊 Comparison Table

| Feature | Basic Email | Social Auth | B2B Multi-Tenant | Enterprise SSO | Passwordless |
|---------|-------------|-------------|------------------|----------------|--------------|
| **Setup Complexity** | ⭐ Simple | ⭐⭐ Medium | ⭐⭐⭐ Complex | ⭐⭐⭐ Complex | ⭐⭐⭐ Complex |
| **Email/Password** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **Social Login** | ❌ No | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| **Enterprise SSO** | ❌ No | Optional | ✅ Yes | ✅ Yes | ❌ No |
| **Multi-Tenancy** | ❌ No | ❌ No | ✅ Yes | ❌ No | ❌ No |
| **MFA** | Optional | Optional | Optional | ✅ Required | N/A |
| **Lambda Triggers** | Optional | Optional | Recommended | ✅ Required | ✅ Required |
| **Best For** | MVPs | Consumer Apps | B2B SaaS | Corporate Tools | Modern UX |

---

## 🔒 Security Considerations for All Patterns

### Password policies
- Minimum 12 characters for enterprise
- Require all character types
- Consider passwordless for better UX

### MFA recommendations
- Required for admin users
- Optional but encouraged for regular users
- Support both SMS and TOTP

### Session management
- Short session durations for sensitive apps
- Implement refresh token rotation
- Track devices for anomaly detection

### Monitoring
- Enable CloudTrail for auth events
- Set up CloudWatch alarms for failed logins
- Monitor for brute force attempts
- Track unusual login patterns

### Compliance
- Encrypt user attributes at rest
- Implement data residency controls
- Regular security audits
- GDPR/CCPA compliance measures

---

## 🚀 Next Steps

1. **Choose your pattern** based on the decision tree
2. **Copy the configuration** to `amplify/auth/resource.ts`
3. **Set up environment variables** for any external providers
4. **Implement Lambda triggers** if needed (see `TRIGGERS_GUIDE.md`)
5. **Review security checklist** (see `SECURITY_CHECKLIST.md`)
6. **Test your auth flows** in sandbox mode

---

## 📚 Additional Resources

- [Amplify Auth Documentation](https://docs.amplify.aws/gen2/build-a-backend/auth/)
- [Cognito Best Practices](https://docs.aws.amazon.com/cognito/latest/developerguide/best-practices.html)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [OpenID Connect](https://openid.net/connect/)
- Triggers Guide: `TRIGGERS_GUIDE.md`
- Security Checklist: `SECURITY_CHECKLIST.md`
