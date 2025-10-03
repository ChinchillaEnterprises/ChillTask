# Add Social Login (Google, Facebook, Apple, Amazon)

**Step-by-step pattern for adding social authentication providers to your Amplify Gen 2 app**

---

## ✅ Prerequisites

- Basic email auth already configured (`amplify/auth/resource.ts` exists)
- OAuth credentials from social providers
- Redirect URLs configured in provider consoles

---

## 📋 Step 1: Get OAuth Credentials

### Google
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable Google+ API
3. Create OAuth 2.0 credentials
4. Get `Client ID` and `Client Secret`
5. Add redirect URLs:
   - `http://localhost:3000/` (development)
   - `https://yourdomain.com/` (production)

### Facebook
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create app → Add Facebook Login product
3. Get `App ID` and `App Secret`
4. Configure redirect URLs in Facebook Login settings

### Apple
1. Go to [Apple Developer](https://developer.apple.com)
2. Create Service ID and Key
3. Get `Client ID`, `Team ID`, `Key ID`, and download private key

### Amazon
1. Go to [Amazon Developer Console](https://developer.amazon.com)
2. Create Security Profile
3. Get `Client ID` and `Client Secret`

---

## 📋 Step 2: Set Environment Variables

Create `.env.local` (for Next.js) or set in your deployment environment:

```bash
# Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Apple
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key

# Amazon
AMAZON_CLIENT_ID=your-amazon-client-id
AMAZON_CLIENT_SECRET=your-amazon-client-secret
```

**IMPORTANT:** Never commit secrets to git! Add `.env.local` to `.gitignore`

---

## 📋 Step 3: Update Auth Configuration

Update `amplify/auth/resource.ts`:

```typescript
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,

    // Add social providers
    externalProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        scopes: ['email', 'profile', 'openid'],
      },

      facebook: {
        clientId: process.env.FACEBOOK_APP_ID!,
        clientSecret: process.env.FACEBOOK_APP_SECRET!,
        scopes: ['email', 'public_profile'],
      },

      signInWithApple: {
        clientId: process.env.APPLE_CLIENT_ID!,
        teamId: process.env.APPLE_TEAM_ID!,
        keyId: process.env.APPLE_KEY_ID!,
        privateKey: process.env.APPLE_PRIVATE_KEY!,
      },

      loginWithAmazon: {
        clientId: process.env.AMAZON_CLIENT_ID!,
        clientSecret: process.env.AMAZON_CLIENT_SECRET!,
        scopes: ['profile'],
      },

      // Configure callback URLs
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
});
```

**Choose Only What You Need:**
- Don't include all providers if you only use Google
- Remove unused provider configurations
- Update callback URLs for your domain

---

## 📋 Step 4: Redeploy Sandbox

```bash
npx ampx sandbox
```

Wait for deployment to complete. The hosted UI URLs will be displayed.

---

## 📋 Step 5: Update Provider Redirect URLs

**CRITICAL:** Copy the Cognito hosted UI URLs from sandbox output and add them to each provider console:

Example Cognito URLs:
```
https://your-user-pool-domain.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

Add these to:
- **Google Console** → OAuth redirect URIs
- **Facebook Dashboard** → Valid OAuth Redirect URIs
- **Apple Console** → Return URLs
- **Amazon Console** → Allowed Return URLs

---

## 📋 Step 6: Client-Side Implementation

### Sign In with Social Provider

```typescript
"use client";

import { signInWithRedirect } from 'aws-amplify/auth';

export default function SocialLoginButtons() {
  const handleGoogleSignIn = async () => {
    try {
      await signInWithRedirect({
        provider: 'Google',
      });
    } catch (error: any) {
      console.error('Google sign in error:', error);
      alert(error.message);
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      await signInWithRedirect({
        provider: 'Facebook',
      });
    } catch (error: any) {
      console.error('Facebook sign in error:', error);
      alert(error.message);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithRedirect({
        provider: 'Apple',
      });
    } catch (error: any) {
      console.error('Apple sign in error:', error);
      alert(error.message);
    }
  };

  return (
    <div>
      <button onClick={handleGoogleSignIn}>
        Sign in with Google
      </button>
      <button onClick={handleFacebookSignIn}>
        Sign in with Facebook
      </button>
      <button onClick={handleAppleSignIn}>
        Sign in with Apple
      </button>
    </div>
  );
}
```

**Provider Names:**
- `'Google'` for Google
- `'Facebook'` for Facebook
- `'Apple'` for Apple
- `'Amazon'` for Amazon
- `'OIDC'` for custom OIDC providers
- `'SAML'` for SAML providers

---

## 📋 Step 7: Handle OAuth Callback

After social login, user is redirected back to your app. Check authentication status:

```typescript
"use client";

import { useEffect, useState } from 'react';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

export default function AuthHandler() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check current auth state
    checkUser();

    // Listen for auth events
    const hubListener = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signInWithRedirect':
          checkUser();
          break;
        case 'signInWithRedirect_failure':
          console.error('Sign in failed:', payload.data);
          break;
      }
    });

    return () => hubListener();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.log('Not authenticated');
      setUser(null);
    }
  };

  if (!user) {
    return <div>Please sign in</div>;
  }

  return <div>Welcome, {user.username}!</div>;
}
```

---

## 📋 Step 8: Get User Profile from Social Provider

Access social profile data:

```typescript
import { fetchUserAttributes } from 'aws-amplify/auth';

async function getUserProfile() {
  try {
    const attributes = await fetchUserAttributes();

    console.log('User attributes:', {
      email: attributes.email,
      name: attributes.name,
      picture: attributes.picture,
      sub: attributes.sub, // User ID
    });

    return attributes;
  } catch (error) {
    console.error('Error fetching attributes:', error);
  }
}
```

---

## 🎯 Complete Social Login Page Example

```typescript
"use client";

import { useState, useEffect } from 'react';
import { signInWithRedirect, getCurrentUser, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

export default function SocialAuthPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    const hubListener = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signInWithRedirect':
          checkUser();
          break;
        case 'signInWithRedirect_failure':
          console.error('OAuth error:', payload.data);
          setLoading(false);
          break;
      }
    });

    return () => hubListener();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (user) {
    return (
      <div>
        <h1>Welcome, {user.username}!</h1>
        <button onClick={handleSignOut}>Sign Out</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Sign In</h1>
      <button onClick={() => signInWithRedirect({ provider: 'Google' })}>
        Continue with Google
      </button>
      <button onClick={() => signInWithRedirect({ provider: 'Facebook' })}>
        Continue with Facebook
      </button>
      <button onClick={() => signInWithRedirect({ provider: 'Apple' })}>
        Continue with Apple
      </button>
    </div>
  );
}
```

---

## ⚠️ Common Pitfalls

1. **Redirect URL mismatch** → URLs in provider console MUST exactly match Cognito URLs
2. **Missing scopes** → Request 'email' scope to get user email
3. **Not handling Hub events** → Listen for 'signInWithRedirect' event
4. **Testing in production only** → Add localhost URLs for development
5. **Exposing secrets** → Never commit `.env.local` to git
6. **Wrong provider name** → Use exact case: 'Google' not 'google'

---

## 🔒 Security Best Practices

1. **Use HTTPS in production** → OAuth requires secure connections
2. **Validate redirect URLs** → Only allow your domains
3. **Request minimal scopes** → Only request data you need
4. **Store tokens securely** → Amplify handles this automatically
5. **Implement PKCE** → Amplify uses PKCE by default for OAuth

---

## 🧪 Testing Social Login

### Development
1. Add `http://localhost:3000/` to all provider consoles
2. Test each provider separately
3. Verify user attributes are populated

### Production
1. Add production domain to all provider consoles
2. Test on staging environment first
3. Monitor for OAuth errors in CloudWatch

---

## ✅ Checklist

Before moving on, verify:
- [ ] OAuth credentials obtained from all providers
- [ ] Environment variables set correctly
- [ ] Auth configuration updated with social providers
- [ ] Callback URLs added to provider consoles
- [ ] Cognito hosted UI URLs added to provider consoles
- [ ] Sandbox redeployed successfully
- [ ] Social login buttons implemented
- [ ] Hub event listener for auth events
- [ ] User profile fetching works
- [ ] Sign out flow tested
- [ ] All providers tested individually

---

**You're done! Your app now supports social authentication! 🎉**
