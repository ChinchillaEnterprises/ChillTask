# Add Basic Email Authentication

**Step-by-step pattern for adding email/password authentication to your Amplify Gen 2 app**

---

## ✅ Prerequisites

- Amplify Gen 2 project initialized
- `amplify/backend.ts` exists

---

## 📋 Step 1: Create Auth Resource File

Create `amplify/auth/resource.ts`:

```typescript
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});
```

**Key Points:**
- ✅ Minimal configuration for email/password auth
- ✅ Email verification is automatic
- ✅ Password reset via email included

---

## 📋 Step 2: Add Password Requirements (Optional)

Enhance security with password policy:

```typescript
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
});
```

**Recommended:**
- Minimum 8 characters for basic apps
- Minimum 12 characters for enterprise apps
- All character types for security

---

## 📋 Step 3: Configure User Attributes (Optional)

Add profile fields:

```typescript
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },

  userAttributes: {
    email: {
      required: true,
      mutable: true, // Users can change their email
    },
    givenName: {
      required: false,
      mutable: true,
    },
    familyName: {
      required: false,
      mutable: true,
    },
  },
});
```

**Available Attributes:**
- `email`, `phoneNumber`, `givenName`, `familyName`
- `nickname`, `preferredUsername`, `profilePicture`
- Custom attributes with `'custom:fieldName'` prefix

---

## 📋 Step 4: Register Auth in Backend

Update `amplify/backend.ts`:

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';

const backend = defineBackend({
  auth,
  // ... other resources
});
```

---

## 📋 Step 5: Deploy with Sandbox

```bash
npx ampx sandbox
```

Wait for:
```
[Sandbox] Watching for file changes...
amplify_outputs.json updated
```

---

## 📋 Step 6: Configure Amplify in Your App

In your root layout or app entry point:

```typescript
import { Amplify } from 'aws-amplify';
import outputs from '@/amplify_outputs.json';

Amplify.configure(outputs, { ssr: true });
```

**For Next.js App Router:**
- Add to `app/layout.tsx` (server component is fine)
- Client components will inherit configuration

---

## 📋 Step 7: Client-Side Implementation

### Sign Up

```typescript
"use client";

import { signUp } from 'aws-amplify/auth';

async function handleSignUp(email: string, password: string) {
  try {
    const { isSignUpComplete, userId, nextStep } = await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
        },
      },
    });

    if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
      // Show confirmation code input
      console.log('Check your email for confirmation code');
    }
  } catch (error: any) {
    console.error('Sign up error:', error);
    alert(error.message);
  }
}
```

### Confirm Sign Up

```typescript
import { confirmSignUp } from 'aws-amplify/auth';

async function handleConfirmSignUp(email: string, code: string) {
  try {
    const { isSignUpComplete } = await confirmSignUp({
      username: email,
      confirmationCode: code,
    });

    if (isSignUpComplete) {
      // User confirmed, redirect to sign in
      router.push('/signin');
    }
  } catch (error: any) {
    console.error('Confirmation error:', error);
    alert(error.message);
  }
}
```

### Sign In

```typescript
import { signIn } from 'aws-amplify/auth';

async function handleSignIn(email: string, password: string) {
  try {
    const { isSignedIn, nextStep } = await signIn({
      username: email,
      password,
    });

    if (isSignedIn) {
      // Redirect to dashboard/home
      router.push('/dashboard');
    }
  } catch (error: any) {
    console.error('Sign in error:', error);
    alert(error.message);
  }
}
```

### Sign Out

```typescript
import { signOut } from 'aws-amplify/auth';

async function handleSignOut() {
  try {
    await signOut();
    router.push('/signin');
  } catch (error: any) {
    console.error('Sign out error:', error);
  }
}
```

### Get Current User

```typescript
import { getCurrentUser } from 'aws-amplify/auth';

async function checkUser() {
  try {
    const user = await getCurrentUser();
    console.log('Current user:', user);
    return user;
  } catch (error) {
    console.log('No user signed in');
    return null;
  }
}
```

---

## 📋 Step 8: Password Reset

### Request Reset

```typescript
import { resetPassword } from 'aws-amplify/auth';

async function handleForgotPassword(email: string) {
  try {
    const { nextStep } = await resetPassword({
      username: email,
    });

    if (nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE') {
      // Show code input and new password form
      console.log('Check your email for reset code');
    }
  } catch (error: any) {
    console.error('Reset password error:', error);
    alert(error.message);
  }
}
```

### Confirm Reset

```typescript
import { confirmResetPassword } from 'aws-amplify/auth';

async function handleConfirmReset(email: string, code: string, newPassword: string) {
  try {
    await confirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword,
    });

    // Redirect to sign in
    router.push('/signin');
  } catch (error: any) {
    console.error('Confirm reset error:', error);
    alert(error.message);
  }
}
```

---

## 🎯 Complete Auth Component Example

```typescript
"use client";

import { useState } from 'react';
import { signUp, confirmSignUp, signIn } from 'aws-amplify/auth';

export default function AuthPage() {
  const [mode, setMode] = useState<'signup' | 'confirm' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { nextStep } = await signUp({
        username: email,
        password,
        options: { userAttributes: { email } },
      });

      if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        setMode('confirm');
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      setMode('signin');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { isSignedIn } = await signIn({ username: email, password });
      if (isSignedIn) {
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div>
      {mode === 'signup' && (
        <form onSubmit={handleSignUp}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          <button type="submit">Sign Up</button>
        </form>
      )}

      {mode === 'confirm' && (
        <form onSubmit={handleConfirm}>
          <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Confirmation Code" />
          <button type="submit">Confirm</button>
        </form>
      )}

      {mode === 'signin' && (
        <form onSubmit={handleSignIn}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          <button type="submit">Sign In</button>
        </form>
      )}
    </div>
  );
}
```

---

## ⚠️ Common Pitfalls

1. **Not configuring Amplify before using auth** → Call `Amplify.configure()` first
2. **Wrong username format** → Use email as username (not a separate username field)
3. **Not handling confirmation step** → Check `nextStep` in signup response
4. **Weak passwords** → Set proper password policy requirements
5. **No error handling** → Always wrap auth calls in try-catch

---

## ✅ Checklist

Before moving on, verify:
- [ ] `amplify/auth/resource.ts` created with email login
- [ ] Auth registered in `amplify/backend.ts`
- [ ] Sandbox deployed successfully
- [ ] `Amplify.configure()` called in app
- [ ] Sign up flow implemented with confirmation
- [ ] Sign in flow implemented
- [ ] Password reset flow implemented
- [ ] Error handling in place

---

**You're done! Your app now has email/password authentication! 🎉**
