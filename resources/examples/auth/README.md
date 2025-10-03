# Amplify Auth Examples

This directory contains comprehensive authentication examples for AWS Amplify Gen 2, from basic email auth to enterprise-grade multi-tenant systems.

## 📁 Auth Configuration Examples

### 1. **basic-email-auth.ts**
The simplest authentication setup - perfect for getting started:
- Email and password authentication
- Email verification
- Password reset
- Basic password requirements

### 2. **multi-auth-methods.ts** 
Support multiple authentication methods:
- Email, phone, and username login
- Social providers (Google, Facebook, Apple, Amazon)
- Multi-factor authentication (SMS and TOTP)
- OIDC and SAML for enterprise SSO
- Custom user attributes

### 3. **enterprise-auth.ts**
Enterprise-grade authentication with compliance:
- Required MFA for all users
- User groups and roles
- Advanced security features
- Custom authentication flows
- Lambda triggers for business logic
- User migration from legacy systems
- Audit logging and compliance

### 4. **passwordless-auth.ts**
Modern passwordless authentication:
- Magic links via email
- SMS one-time passwords
- WebAuthn support (biometrics, security keys)
- Custom authentication challenge flows
- No password fatigue

### 5. **b2b-multi-tenant.ts**
B2B SaaS multi-tenant authentication:
- Multiple organizations per user
- Organization-specific roles
- Invitation-based onboarding
- Tenant switching
- Usage tracking and limits
- Custom domains per tenant

## 📁 Trigger Examples

### **triggers/** Directory
Example Lambda trigger implementations:
- `pre-signup-validation.ts` - Validate registrations, check domains, auto-confirm
- `post-confirmation-setup.ts` - Create profiles, send welcome emails, assign groups

## 🚀 How to Use These Examples

### Step 1: Choose Your Auth Strategy
1. Start with `basic-email-auth.ts` for simple apps
2. Use `multi-auth-methods.ts` for consumer apps
3. Choose `enterprise-auth.ts` for corporate apps
4. Pick `passwordless-auth.ts` for modern UX
5. Select `b2b-multi-tenant.ts` for SaaS platforms

### Step 2: Copy to Your Project
```typescript
// In your amplify/auth/resource.ts
import { defineAuth } from '@aws-amplify/backend';

// Copy the configuration you need
export const auth = defineAuth({
  // Configuration from examples...
});
```

### Step 3: Implement Triggers (Optional)
```typescript
// Copy trigger examples to amplify/auth/triggers/
// Reference them in your auth configuration
import { preSignUp } from './triggers/pre-signup';

export const auth = defineAuth({
  // ... other config
  triggers: {
    preSignUp,
  },
});
```

### Step 4: Update Backend Configuration
```typescript
// In amplify/backend.ts
import { auth } from './auth/resource';

const backend = defineBackend({
  auth,
  // ... other resources
});
```

## 🎯 Common Patterns

### Social Login Setup
1. Register your app with each provider
2. Get OAuth credentials
3. Set environment variables
4. Configure redirect URLs

```typescript
// Example environment variables
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
```

### Multi-Factor Authentication
```typescript
// Enable MFA
multifactor: {
  mode: 'OPTIONAL', // or 'REQUIRED'
  sms: true,
  totp: true,
}
```

### Custom User Attributes
```typescript
userAttributes: {
  'custom:department': {
    dataType: 'String',
    mutable: true,
    maxLen: 100,
  },
  'custom:employeeId': {
    dataType: 'String',
    mutable: false,
    maxLen: 50,
  },
}
```

### User Groups
```typescript
groups: [
  {
    name: 'Admins',
    description: 'Administrative users',
    precedence: 1,
  },
  {
    name: 'Users',
    description: 'Regular users',
    precedence: 100,
  },
]
```

## 💻 Client-Side Implementation

### Basic Sign Up/In
```typescript
import { signUp, signIn, confirmSignUp } from 'aws-amplify/auth';

// Sign up
await signUp({
  username: email,
  password,
  options: {
    userAttributes: {
      email,
      given_name: firstName,
      family_name: lastName,
    },
  },
});

// Confirm with code
await confirmSignUp({
  username: email,
  confirmationCode: code,
});

// Sign in
await signIn({
  username: email,
  password,
});
```

### Social Sign In
```typescript
import { signInWithRedirect } from 'aws-amplify/auth';

// Sign in with Google
await signInWithRedirect({
  provider: 'Google',
});

// Handle callback
import { getCurrentUser } from 'aws-amplify/auth';
const user = await getCurrentUser();
```

### MFA Setup
```typescript
import { setUpTOTP, updateMFAPreference } from 'aws-amplify/auth';

// Set up authenticator app
const totpSetup = await setUpTOTP();
const qrCodeUrl = totpSetup.getSetupUri('MyApp');

// Enable MFA
await updateMFAPreference({
  totp: 'PREFERRED',
  sms: 'ENABLED',
});
```

## 🔒 Security Best Practices

1. **Password Requirements**
   - Minimum 12 characters for enterprise
   - Require all character types
   - Consider passwordless for better UX

2. **MFA**
   - Required for admin users
   - Optional but encouraged for others
   - Support multiple MFA methods

3. **Session Management**
   - Short session durations for sensitive apps
   - Refresh token rotation
   - Device tracking

4. **Monitoring**
   - Enable CloudTrail for auth events
   - Set up anomaly detection
   - Monitor failed login attempts

5. **Compliance**
   - Encrypt user attributes
   - Implement data residency
   - Regular security audits
   - GDPR/CCPA compliance

## 🧪 Testing Auth Flows

### Local Testing
```bash
# Start Amplify sandbox
npx ampx sandbox

# Test with different user types
# Admin user, regular user, etc.
```

### Integration Testing
```typescript
// Test signup flow
const testUser = {
  username: `test-${Date.now()}@example.com`,
  password: 'TempPassword123!',
};

await signUp(testUser);
// Verify email programmatically
await confirmSignUp({
  username: testUser.username,
  confirmationCode: '123456', // From test email
});
```

## 📚 Additional Resources

- [Amplify Auth Documentation](https://docs.amplify.aws/gen2/build-a-backend/auth/)
- [Cognito Best Practices](https://docs.aws.amazon.com/cognito/latest/developerguide/best-practices.html)
- [OAuth 2.0 and OpenID Connect](https://oauth.net/2/)
- [WebAuthn Specification](https://webauthn.guide/)

## ⚠️ Important Notes

- These are **examples only** - customize for your needs
- Always use environment variables for secrets
- Test auth flows thoroughly before production
- Consider user experience in your auth design
- Plan for account recovery scenarios