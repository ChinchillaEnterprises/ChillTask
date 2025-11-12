# Auto-Confirm Users Without Email Verification

**Enable instant sign-in by automatically confirming users and verifying their email addresses without requiring confirmation codes.**

---

## Overview

By default, AWS Cognito requires users to verify their email address before they can sign in. This guide shows you how to disable email verification using a Pre Sign-up Lambda trigger, allowing users to sign in immediately after registration.

**What This Does:**
- ✅ Users can sign in immediately after sign-up
- ✅ No email confirmation codes required
- ✅ Email addresses are automatically marked as verified
- ✅ Phone numbers are automatically verified (if provided)

**When to Use:**
- Consumer apps where friction matters more than email validation
- Development/testing environments
- Apps with alternative verification methods (OAuth, magic links, etc.)
- Internal tools where email verification is unnecessary

**When NOT to Use:**
- When you need to verify users actually own their email addresses
- Compliance requirements mandate email verification
- You need to prevent fake/disposable email addresses

---

## The Problem

**Default Cognito behavior:**

1. User signs up with email/password
2. Cognito sends verification code to email
3. User must enter code to verify email
4. Only then can user sign in

**This creates friction:**
- Extra step in onboarding flow
- Users might not receive email (spam folder, typos, etc.)
- Poor UX for instant sign-in experiences

**What we want instead:**

1. User signs up
2. User can sign in immediately ✅

---

## The Solution

Use a **Pre Sign-up Lambda trigger** to automatically confirm users and verify their email/phone before Cognito processes the registration.

**How it works:**

```
User submits sign-up form
         ↓
Pre Sign-up trigger runs
         ↓
Sets: autoConfirmUser = true
      autoVerifyEmail = true
      autoVerifyPhone = true
         ↓
Cognito completes registration
         ↓
User can sign in immediately ✅
```

---

## Implementation

### Step 1: Create Lambda Handler

Create the auto-confirm logic:

**File:** `amplify/auth/pre-sign-up/handler.ts`

```typescript
import type { PreSignUpTriggerHandler } from 'aws-lambda';

/**
 * PRE SIGN-UP AUTO-CONFIRM HANDLER
 *
 * Automatically confirms users and verifies their email/phone
 * so they can sign in immediately without confirmation codes.
 *
 * Response Parameters:
 * - autoConfirmUser: Set to true to auto-confirm the user
 * - autoVerifyEmail: Set to true to mark email as verified
 * - autoVerifyPhone: Set to true to mark phone as verified
 *
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html
 */
export const handler: PreSignUpTriggerHandler = async (event) => {
  // Auto-confirm the user (skip email confirmation step)
  event.response.autoConfirmUser = true;

  // Auto-verify email if present
  if (event.request.userAttributes.email) {
    event.response.autoVerifyEmail = true;
  }

  // Auto-verify phone if present
  if (event.request.userAttributes.phone_number) {
    event.response.autoVerifyPhone = true;
  }

  return event;
};
```

### Step 2: Define Lambda Function

Define the Lambda function resource:

**File:** `amplify/auth/pre-sign-up/resource.ts`

```typescript
import { defineFunction } from '@aws-amplify/backend';

/**
 * PRE SIGN-UP LAMBDA TRIGGER
 *
 * Purpose: Automatically confirm users and verify their email addresses
 * without requiring email confirmation codes.
 *
 * This allows users to sign in immediately after registration.
 *
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html
 */
export const preSignUp = defineFunction({
  name: 'pre-sign-up-auto-confirm',
  entry: './handler.ts',
});
```

### Step 3: Attach Trigger to Auth

Update your auth configuration to use the trigger:

**File:** `amplify/auth/resource.ts`

```typescript
import { defineAuth, secret } from '@aws-amplify/backend';
import { preSignUp } from './pre-sign-up/resource';

export const auth = defineAuth({
  loginWith: {
    email: true,
    // ... your other auth config
  },

  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    // ... your other attributes
  },

  // Lambda Triggers - Auto-confirm users without email verification
  triggers: {
    preSignUp,
  },
});
```

### Step 4: Deploy

Deploy to sandbox or production:

```bash
# Sandbox
npx ampx sandbox

# Production
git add . && git commit -m "Add auto-confirm for user sign-up" && git push
```

---

## File Structure

After implementation, your auth folder should look like:

```
amplify/auth/
├── resource.ts                    # Main auth config (imports preSignUp)
├── pre-sign-up/
│   ├── resource.ts                # Function definition
│   └── handler.ts                 # Auto-confirm logic
```

---

## Testing

### Test Auto-Confirm Works

1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **Sign up with a NEW email:**
   - Go to sign-up page
   - Enter email, password, name
   - Submit form

3. **Verify instant sign-in:**
   - Should NOT see "Please confirm your email" message
   - Should be able to sign in immediately
   - No confirmation code required

### Important Notes

**⚠️ Trigger only affects NEW signups:**
- Users created BEFORE the trigger was deployed will still require email verification
- Users created AFTER deployment are auto-confirmed
- To test, use a completely new email address you haven't used before

**Testing in sandbox:**
```bash
# Check Lambda logs to verify trigger is running
npx ampx sandbox --stream-function-logs

# In another terminal
npm run dev

# Sign up with new email and watch logs
```

You should see log entries from the Pre Sign-up Lambda showing it's executing.

---

## Variations

### Auto-Confirm Only Specific Domains

If you want to auto-confirm only certain email domains (e.g., company employees):

```typescript
// amplify/auth/pre-sign-up/handler.ts
export const handler: PreSignUpTriggerHandler = async (event) => {
  const email = event.request.userAttributes.email;

  // Auto-confirm only @company.com emails
  const autoConfirmDomains = ['company.com', 'partner.com'];
  const shouldAutoConfirm = email && autoConfirmDomains.some(
    domain => email.endsWith(`@${domain}`)
  );

  if (shouldAutoConfirm) {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }

  // Other users still need to verify their email
  return event;
};
```

### Auto-Confirm with Additional Validation

Combine auto-confirm with other validation logic:

```typescript
export const handler: PreSignUpTriggerHandler = async (event) => {
  const { email } = event.request.userAttributes;

  // Block disposable email domains
  const blockedDomains = ['tempmail.com', 'guerrillamail.com'];
  const domain = email?.split('@')[1];

  if (domain && blockedDomains.includes(domain)) {
    throw new Error('Please use a permanent email address');
  }

  // Auto-confirm all valid emails
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;

  return event;
};
```

### Log User Sign-ups

Track when users sign up:

```typescript
export const handler: PreSignUpTriggerHandler = async (event) => {
  console.log('New user signing up:', {
    email: event.request.userAttributes.email,
    timestamp: new Date().toISOString(),
    clientId: event.callerContext.clientId,
  });

  // Auto-confirm
  event.response.autoConfirmUser = true;
  if (event.request.userAttributes.email) {
    event.response.autoVerifyEmail = true;
  }

  return event;
};
```

---

## Troubleshooting

### Users still seeing "confirm email" message

**Problem:** After deploying, users still get email confirmation prompts.

**Causes:**
1. User account was created BEFORE trigger was deployed
2. Trigger isn't actually running (deployment issue)
3. Trigger is throwing errors

**Solutions:**

**Check if trigger is deployed:**
```bash
# Tail sandbox logs
npx ampx sandbox --stream-function-logs

# Try signing up - you should see Pre Sign-up logs
```

**Verify trigger is attached:**
```bash
# Check CloudFormation outputs
cat amplify_outputs.json | grep -i "lambda"

# Or check AWS Console → Cognito → User Pool → Triggers
```

**Test with fresh email:**
- Old users created before trigger won't be auto-confirmed
- Sign up with a completely new email address
- Should work immediately

### Trigger not executing

**Problem:** Pre Sign-up Lambda isn't running at all.

**Debug steps:**

1. **Check `amplify/auth/resource.ts` imports:**
   ```typescript
   import { preSignUp } from './pre-sign-up/resource';
   ```

2. **Verify trigger is configured:**
   ```typescript
   triggers: {
     preSignUp,  // Must be here
   },
   ```

3. **Check for deployment errors:**
   ```bash
   # Look for CloudFormation errors
   npx ampx sandbox --stream-function-logs
   ```

4. **Verify file structure:**
   ```
   amplify/auth/
   ├── resource.ts
   └── pre-sign-up/
       ├── resource.ts
       └── handler.ts
   ```

### Trigger throwing errors

**Problem:** Lambda runs but throws errors, preventing sign-up.

**Debug:**

```typescript
// Add comprehensive error logging
export const handler: PreSignUpTriggerHandler = async (event) => {
  try {
    console.log('Pre-signup event:', JSON.stringify(event, null, 2));

    event.response.autoConfirmUser = true;

    if (event.request.userAttributes.email) {
      event.response.autoVerifyEmail = true;
    }

    console.log('Auto-confirm successful');
    return event;
  } catch (error) {
    console.error('Pre-signup error:', error);
    throw error; // Re-throw to reject sign-up
  }
};
```

View logs:
```bash
npx ampx sandbox --stream-function-logs
# Or check CloudWatch Logs in AWS Console
```

---

## Security Considerations

### Email Verification Bypass

**Risk:** Auto-confirming means you can't verify users actually own their email addresses.

**Mitigations:**
- Implement additional verification (phone, ID upload, etc.)
- Block known disposable email domains
- Use email validation APIs to check email quality
- Require verified email for sensitive actions (payments, data export)

### Spam Sign-ups

**Risk:** Bots can create unlimited accounts without email verification barrier.

**Mitigations:**
- Add CAPTCHA to sign-up form (hCaptcha, reCAPTCHA)
- Rate limit sign-ups by IP address
- Use invitation codes for closed beta
- Implement domain allowlists for B2B apps

### Example: CAPTCHA + Auto-Confirm

```typescript
// Client-side: Include CAPTCHA token in sign-up
const { isSignUpComplete } = await signUp({
  username: email,
  password: password,
  options: {
    userAttributes: { email },
    // Pass CAPTCHA token via clientMetadata
    clientMetadata: {
      captchaToken: captchaResponse,
    },
  },
});

// Lambda: Verify CAPTCHA before auto-confirming
export const handler: PreSignUpTriggerHandler = async (event) => {
  const captchaToken = event.request.clientMetadata?.captchaToken;

  if (!captchaToken) {
    throw new Error('CAPTCHA verification required');
  }

  // Verify CAPTCHA with provider
  const isValid = await verifyCaptcha(captchaToken);
  if (!isValid) {
    throw new Error('CAPTCHA verification failed');
  }

  // Auto-confirm only after CAPTCHA passes
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;

  return event;
};
```

---

## Related Documentation

- [TRIGGERS_GUIDE.md](./TRIGGERS_GUIDE.md) - Complete guide to all Cognito triggers
- [AUTH_PATTERNS.md](./AUTH_PATTERNS.md) - Different authentication patterns
- [CLIENT_SIDE_SETUP.md](./CLIENT_SIDE_SETUP.md) - Client-side sign-up configuration
- [AWS Cognito Pre Sign-up Trigger](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html) - Official AWS docs

---

## Summary

**What you get:**
- Instant user sign-in without email verification
- Simplified onboarding flow
- Production-ready Lambda trigger implementation

**Trade-offs:**
- Can't verify users own their email addresses
- Potential for spam sign-ups (mitigate with CAPTCHA)
- Not suitable for apps requiring strict email verification

**Implementation checklist:**
- [ ] Create `amplify/auth/pre-sign-up/handler.ts`
- [ ] Create `amplify/auth/pre-sign-up/resource.ts`
- [ ] Update `amplify/auth/resource.ts` to include trigger
- [ ] Deploy to sandbox/production
- [ ] Test with NEW email address
- [ ] Add CAPTCHA if spam is a concern
- [ ] Document security trade-offs for your team
