# Client-Side Authentication Setup - Amplify Gen 2 + Next.js

**Complete guide for setting up authentication in the browser/React components.**

---

## 🎯 What This Guide Covers

This guide shows you how to:
1. Configure Amplify for client-side use
2. **Enable OAuth listener** (CRITICAL for Next.js multi-page apps)
3. Set up AuthProvider with Hub events
4. Handle authentication state in React

**Prerequisites:**
- Amplify backend already configured (`amplify/auth/resource.ts`)
- `amplify_outputs.json` exists in project root
- Next.js App Router project

---

## 🚨 CRITICAL: The Missing Piece

**Most OAuth implementations fail because of ONE missing import:**

```typescript
import "aws-amplify/auth/enable-oauth-listener";
```

**Why it's needed:**
- Next.js is a **multi-page application** (each route is a fresh page load)
- When Google redirects back to your app, it's a NEW page - not the same JavaScript context
- The OAuth listener registers handlers that process OAuth callbacks on ANY page
- Without it: OAuth codes don't exchange for tokens, Hub events never fire, UI never updates

**Where to add it:** In your AuthProvider component (shown below)

---

## Step 1: Configure Amplify for Client-Side

### File: `src/components/ConfigureAmplifyClientSide.tsx`

Create this component to configure Amplify when the app loads in the browser:

```typescript
"use client";

import { Amplify } from 'aws-amplify';
import outputs from '@root/amplify_outputs.json';

/**
 * Configure Amplify for Client-Side Usage
 *
 * This component configures Amplify when the app loads in the browser.
 * It should be rendered early in your component tree (in layout.tsx).
 *
 * IMPORTANT: This is for CLIENT-SIDE only!
 * For server-side (middleware, API routes), use amplify-server-utils.ts
 */

// Configure Amplify with SSR support
Amplify.configure(outputs, {
  ssr: true, // Enable SSR mode for Next.js
});

export default function ConfigureAmplifyClientSide() {
  // This component just runs the configuration on import
  // No UI needed
  return null;
}
```

**Key points:**
- ✅ Must have `"use client"` directive
- ✅ Import from `@root/amplify_outputs.json` (project root)
- ✅ Set `ssr: true` for Next.js compatibility
- ✅ Returns `null` - no UI needed

### Add to Layout

**File: `src/app/layout.tsx`**

```typescript
import ConfigureAmplifyClientSide from "@/components/ConfigureAmplifyClientSide";
import { AuthProvider } from "@/providers/AuthProvider";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* IMPORTANT: ConfigureAmplifyClientSide MUST come BEFORE AuthProvider */}
        <ConfigureAmplifyClientSide />

        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Order matters:**
1. ConfigureAmplifyClientSide (configure Amplify)
2. AuthProvider (use Amplify)
3. Children (use auth context)

---

## Step 2: Create AuthProvider with OAuth Listener

### File: `src/providers/AuthProvider.tsx`

This is the COMPLETE implementation with the critical OAuth listener:

```typescript
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { fetchAuthSession, getCurrentUser, signOut } from "aws-amplify/auth";
import type { AuthUser } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

// 🚨 CRITICAL: Enable OAuth listener for multi-page apps (Next.js)
// This allows Amplify to process OAuth callbacks and fire Hub events
import "aws-amplify/auth/enable-oauth-listener";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prevent race conditions with ref
  const isCheckingAuth = useRef(false);

  const checkAuth = async () => {
    // Prevent concurrent auth checks
    if (isCheckingAuth.current) {
      return;
    }

    try {
      isCheckingAuth.current = true;
      setIsLoading(true);
      setError(null);

      // Check if user has valid session
      const session = await fetchAuthSession({ forceRefresh: false });
      const authenticated = !!session.tokens?.idToken;

      if (authenticated) {
        // Get current user info
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err: any) {
      console.error('[Auth] Check failed:', err);

      // Handle specific error cases
      if (err.name === 'UserUnAuthenticatedException' || err.name === 'NotAuthorizedException') {
        // User not authenticated - this is expected for logged-out users
        setUser(null);
        setIsAuthenticated(false);
        setError(null);
      } else {
        // Unexpected error
        setUser(null);
        setIsAuthenticated(false);
        setError(err.message || 'Authentication check failed');
      }
    } finally {
      setIsLoading(false);
      isCheckingAuth.current = false;
    }
  };

  const handleSignOut = async () => {
    try {
      setError(null);
      await signOut({ global: true });
      setUser(null);
      setIsAuthenticated(false);
    } catch (err: any) {
      console.error('[Auth] Sign out failed:', err);
      setError(err.message || 'Sign out failed');

      // Even if signOut fails, clear local state
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    // Check auth on mount
    checkAuth();

    // 🎯 Listen for auth events via Hub
    const hubListener = Hub.listen('auth', async (data) => {
      const { payload } = data;

      console.log('[Auth] Hub Event:', payload.event);

      switch (payload.event) {
        case 'signInWithRedirect':
          // 🎉 OAuth redirect completed successfully!
          console.log('[Auth] OAuth redirect successful, checking auth...');
          await checkAuth();
          break;

        case 'signInWithRedirect_failure':
          console.error('[Auth] OAuth redirect failed:', payload.data);
          setError('Social sign-in failed. Please try again.');
          setIsLoading(false);
          break;

        case 'signedIn':
          await checkAuth();
          break;

        case 'signedOut':
          setUser(null);
          setIsAuthenticated(false);
          setError(null);
          break;

        case 'tokenRefresh':
          await checkAuth();
          break;

        case 'tokenRefresh_failure':
          console.error('[Auth] Token refresh failed');
          setError('Session expired. Please sign in again.');
          break;

        case 'customOAuthState':
          // Handle custom OAuth state if needed
          console.log('[Auth] Custom OAuth state:', payload.data);
          break;
      }
    });

    // Cleanup listener on unmount
    return () => {
      hubListener();
    };
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    signOut: handleSignOut,
    refreshAuth: checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to access authentication context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
```

### Key Components Explained

#### 1. The OAuth Listener Import (Line 10)

```typescript
import "aws-amplify/auth/enable-oauth-listener";
```

**What it does:**
- Registers internal handlers that process OAuth callbacks
- Enables automatic detection of `?code=...&state=...` in URL
- Exchanges OAuth codes for tokens
- Fires Hub events when OAuth completes

**Without it:**
- `fetchAuthSession()` hangs on OAuth callback pages
- No Hub events fire
- UI never updates after OAuth
- Users see "Sign In" button even after successful authentication

#### 2. Hub Event Listener (Lines 91-132)

```typescript
Hub.listen('auth', async (data) => {
  switch (data.payload.event) {
    case 'signInWithRedirect':
      // OAuth completed! Update UI
      await checkAuth();
      break;
    // ... other events
  }
});
```

**Why it exists:**
- OAuth is asynchronous (takes 100-500ms to exchange tokens)
- React renders synchronously (components mount immediately)
- Hub provides notification when async OAuth finishes
- Your UI updates in response to the event

**Key events:**
- `signInWithRedirect` - OAuth succeeded, tokens ready
- `signInWithRedirect_failure` - OAuth failed, show error
- `signedIn` - User signed in (email/password or OAuth)
- `signedOut` - User signed out
- `tokenRefresh` - Tokens refreshed automatically
- `tokenRefresh_failure` - Token refresh failed (session expired)

#### 3. Race Condition Protection (Line 44)

```typescript
const isCheckingAuth = useRef(false);
```

Prevents multiple simultaneous auth checks from interfering with each other.

---

## Step 3: Use Auth in Components

### Example: Protected Page

```typescript
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/authentication/sign-in');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null; // Redirecting...
  }

  return (
    <div>
      <h1>Welcome, {user?.username}!</h1>
      <p>This is a protected page.</p>
    </div>
  );
}
```

### Example: Sign In Button with OAuth

```typescript
"use client";

import { signInWithRedirect } from "aws-amplify/auth";
import { useAuth } from "@/providers/AuthProvider";

export default function SignInButton() {
  const { isAuthenticated } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithRedirect({ provider: "Google" });
      // User will be redirected to Google
      // When they return, enable-oauth-listener processes the callback
      // Hub event fires → AuthProvider updates → UI switches to authenticated state
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  if (isAuthenticated) {
    return <div>Already signed in!</div>;
  }

  return (
    <button onClick={handleGoogleSignIn}>
      Sign in with Google
    </button>
  );
}
```

---

## 📊 OAuth Flow Timeline

Understanding the complete flow helps debug issues:

```
USER CLICKS "SIGN IN WITH GOOGLE"
  ↓
1. signInWithRedirect({ provider: "Google" }) called
  ↓
2. Browser navigates to Google authentication page
  ↓
3. User authenticates with Google
  ↓
4. Google redirects back: yourapp.com/?code=abc&state=xyz
  ↓
5. Page loads in browser
  ↓
6. ConfigureAmplifyClientSide runs → Amplify.configure()
  ↓
7. AuthProvider mounts → enable-oauth-listener active
  ↓
8. checkAuth() called → fetchAuthSession() detects ?code=...
  ↓
9. enable-oauth-listener: Exchanges code for tokens (async, 100-500ms)
  ↓
10. Tokens stored in cookies/localStorage
  ↓
11. Hub event fires: signInWithRedirect
  ↓
12. Hub listener catches event → calls checkAuth() again
  ↓
13. checkAuth() finds tokens → setIsAuthenticated(true)
  ↓
14. React re-renders → UI switches to authenticated state
  ↓
DONE: User sees dashboard/profile UI
```

**Key timing:**
- Steps 1-8: Instant (< 100ms)
- Step 9: Network call to Cognito (100-500ms) ← Brief loading state
- Steps 10-14: Instant (< 50ms)

**Total:** ~200-600ms from OAuth callback to authenticated UI

---

## 🐛 Troubleshooting

### Issue 1: OAuth callback doesn't update UI

**Symptoms:**
- User returns from Google to homepage
- "Sign In" button still visible
- Must click "Sign In" again to see dashboard

**Solution:**
Check if `enable-oauth-listener` is imported in AuthProvider:

```typescript
import "aws-amplify/auth/enable-oauth-listener"; // ← Must be here!
```

### Issue 2: No Hub events firing

**Debug:**
Add console logs to verify listener is registered:

```typescript
useEffect(() => {
  console.log('[Auth] Registering Hub listener');

  const hubListener = Hub.listen('auth', (data) => {
    console.log('[Auth] Hub event received:', data.payload.event);
  });

  console.log('[Auth] Hub listener registered');

  return () => hubListener();
}, []);
```

**Check console:**
- Should see "Registering Hub listener" on mount
- Should see "Hub event received: signInWithRedirect" after OAuth

**If not:** `enable-oauth-listener` import is missing

### Issue 3: ConfigureAmplifyClientSide not running

**Debug:**
Add console log:

```typescript
console.log('[Amplify] Configuring client-side');
Amplify.configure(outputs, { ssr: true });
console.log('[Amplify] Configuration complete');
```

**If not in console:** Check layout.tsx has `<ConfigureAmplifyClientSide />` before `<AuthProvider>`

### Issue 4: "Module not found: @root/amplify_outputs.json"

**Solution:**
Add path alias to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@root/*": ["./*"]  // ← Add this for project root
    }
  }
}
```

### Issue 5: OAuth redirects to wrong URL

**Check:** `amplify/auth/resource.ts` has correct callback URLs:

```typescript
export const auth = defineAuth({
  loginWith: {
    externalProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      callbackUrls: [
        'http://localhost:3000',  // ← Development
        'https://yourdomain.com', // ← Production
      ],
      logoutUrls: [
        'http://localhost:3000',
        'https://yourdomain.com',
      ],
    },
  },
});
```

---

## ✅ Verification Checklist

After implementing client-side auth:

- [ ] ConfigureAmplifyClientSide component created
- [ ] Added to layout.tsx BEFORE AuthProvider
- [ ] AuthProvider imports `enable-oauth-listener`
- [ ] Hub event listener set up in useEffect
- [ ] Console logs show Hub events firing
- [ ] OAuth flow updates UI without clicking "Sign In" twice
- [ ] useAuth() hook available to all components
- [ ] Protected pages redirect unauthenticated users

---

## 🎯 Next Steps

Client-side auth is now set up! Next:

1. **Add server-side protection:** See [SERVER_SIDE_SETUP.md](./SERVER_SIDE_SETUP.md)
2. **Configure social providers:** See [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)
3. **Choose auth pattern:** See [AUTH_PATTERNS.md](./AUTH_PATTERNS.md)
4. **Add security features:** See [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)

---

## 📚 Key Takeaways

1. **`enable-oauth-listener` is MANDATORY** for Next.js OAuth
2. **ConfigureAmplifyClientSide must run first** before AuthProvider
3. **Hub events notify your app** when async OAuth completes
4. **Client-side handles UX** (loading states, UI updates)
5. **Server-side handles security** (route protection - see SERVER_SIDE_SETUP.md)

**Remember:** Client-side auth = Great UX. Server-side auth = Security. You need BOTH!
