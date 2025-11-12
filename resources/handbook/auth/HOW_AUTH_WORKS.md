# How Authentication Works in Web Apps (Complete Guide)

> **What we learned:** A comprehensive breakdown of browser authentication, OAuth flows, React Context, and the ACTUAL Cognito + Google OAuth redirect chain.

## Table of Contents
1. [How Browsers Store "Who You Are"](#how-browsers-store-who-you-are)
2. [The Two-Layer Auth System](#the-two-layer-auth-system)
3. [The Provider Pattern (React Context)](#the-provider-pattern-react-context)
4. [OAuth Callback Flow - The ACTUAL Story](#oauth-callback-flow---the-actual-story)
5. [The Two Sets of Redirects](#the-two-sets-of-redirects)
6. [JWT Tokens Explained](#jwt-tokens-explained)
7. [Hub Events - The Missing Link](#hub-events---the-missing-link)

---

## How Browsers Store "Who You Are"

### Browser Memory vs Storage

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER MEMORY (Lost on refresh/close)                    │
├─────────────────────────────────────────────────────────────┤
│  - React state (useState)                                   │
│  - Variables in JavaScript                                  │
│  ❌ PROBLEM: Gone when page reloads!                        │
└─────────────────────────────────────────────────────────────┘
              vs
┌─────────────────────────────────────────────────────────────┐
│  BROWSER STORAGE (Survives refreshes)                      │
├─────────────────────────────────────────────────────────────┤
│  1. localStorage - Key/value pairs, never expires           │
│     └─> Amplify stores tokens here ✅                       │
│                                                              │
│  2. sessionStorage - Key/value pairs, expires on tab close  │
│                                                              │
│  3. Cookies - Small text files, can expire, sent to server  │
│     └─> Used for traditional session-based auth            │
└─────────────────────────────────────────────────────────────┘
```

**In Amplify:** Tokens are stored in `localStorage` with keys like:
- `CognitoIdentityServiceProvider.{clientId}.{username}.idToken`
- `CognitoIdentityServiceProvider.{clientId}.{username}.accessToken`
- `CognitoIdentityServiceProvider.{clientId}.{username}.refreshToken`

**To check tokens in browser console:**
```javascript
Object.keys(localStorage).filter(k => k.includes('Cognito'))
```

---

## The Two-Layer Auth System

```
LAYER 1: STORAGE (persistent)
     │
     ├─> localStorage has tokens
     │   (Survives page refresh)
     │
     ▼
LAYER 2: REACT STATE (in-memory)
     │
     ├─> AuthProvider checks localStorage
     ├─> Loads tokens into React state
     └─> UI updates based on state

WHY TWO LAYERS?
- Storage = Truth (what's really stored)
- React State = UI mirror (what user sees)
```

### The Common Problem

```
✅ LAYER 1: OAuth callback → Amplify stores tokens → localStorage HAS them
❌ LAYER 2: AuthProvider doesn't know → React state NOT updated → UI shows logged out

SOLUTION: Use Hub events to detect when tokens are stored, then update React state
```

---

## The Provider Pattern (React Context)

### Why We Need It

```
┌────────────────────────────────────────────────────────────┐
│  app/layout.tsx (Root of your app)                         │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ <AuthProvider>  ← Creates auth context               │ │
│  │   ├─> Holds: { user, isAuthenticated, signOut }     │ │
│  │   │                                                   │ │
│  │   ├─> <HomePage />  ← Can access auth via useAuth() │ │
│  │   ├─> <Dashboard /> ← Can access auth via useAuth() │ │
│  │   └─> <Profile />   ← Can access auth via useAuth() │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### How It Works

**Without Provider (❌ Props Hell):**
```javascript
<HomePage checkAuth={checkAuth} user={user} isAuthenticated={isAuthenticated} />
<Dashboard checkAuth={checkAuth} user={user} isAuthenticated={isAuthenticated} />
<Profile checkAuth={checkAuth} user={user} isAuthenticated={isAuthenticated} />
// Every component needs props passed down!
```

**With Provider (✅ Clean):**
```javascript
// In layout.tsx
<AuthProvider>
  <HomePage />
  <Dashboard />
  <Profile />
</AuthProvider>

// In any component
function Dashboard() {
  const { user, isAuthenticated, signOut } = useAuth();
  // Magic! Data flows from provider
}
```

### The Flow

1. `AuthProvider` wraps entire app (in `layout.tsx`)
2. Provider creates a "context" - shared data accessible anywhere
3. Any child component calls `useAuth()` to access that data
4. When provider updates state → all consuming components re-render

---

## OAuth Callback Flow - The ACTUAL Story

### ⚠️ IMPORTANT CORRECTION

**COMMON MISCONCEPTION (❌):**
```
Your App → Google → Your App
```

**ACTUAL FLOW (✅):**
```
Your App → Cognito → Google → Cognito → Your App
```

Cognito is ALWAYS the middleman, even with "direct" integration!

### The Complete Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: USER CLICKS "SIGN IN WITH GOOGLE"                  │
└─────────────────────────────────────────────────────────────┘
     │
     ├─> signInWithRedirect({ provider: 'Google' })
     │
     ├─> Amplify SDK redirects to COGNITO (not Google!):
     │   https://YOUR_COGNITO_DOMAIN.auth.us-east-1.amazoncognito.com/oauth2/authorize?
     │     client_id=YOUR_COGNITO_CLIENT_ID&
     │     response_type=code&
     │     scope=email+profile+openid&
     │     redirect_uri=http://localhost:3000&
     │     identity_provider=Google
     │
     └─> Browser leaves your app, goes to Cognito

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: COGNITO REDIRECTS TO GOOGLE                        │
└─────────────────────────────────────────────────────────────┘
     │
     ├─> Cognito automatically redirects to:
     │   https://accounts.google.com/o/oauth2/v2/auth?
     │     client_id=YOUR_GOOGLE_CLIENT_ID&
     │     redirect_uri=https://COGNITO_DOMAIN/oauth2/idpresponse&
     │     response_type=code&
     │     scope=email+profile+openid
     │
     └─> Browser now on Google

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: USER LOGS IN ON GOOGLE                             │
└─────────────────────────────────────────────────────────────┘
     │
     ├─> User enters email/password
     ├─> User clicks "Allow" for permissions
     └─> Google validates credentials ✅

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: GOOGLE REDIRECTS BACK TO COGNITO                   │
└─────────────────────────────────────────────────────────────┘
     │
     ├─> https://COGNITO_DOMAIN.auth.us-east-1.amazoncognito.com/oauth2/idpresponse?
     │     code=GOOGLE_AUTH_CODE&
     │     state=RANDOM_STRING
     │
     ├─> Cognito receives Google's auth code
     ├─> Cognito exchanges code for Google tokens (backend)
     ├─> Cognito creates Cognito tokens based on Google data
     │
     └─> Cognito prepares to send user to your app

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: COGNITO REDIRECTS TO YOUR APP                      │
└─────────────────────────────────────────────────────────────┘
     │
     ├─> http://localhost:3000/?code=COGNITO_AUTH_CODE&state=XYZ
     │   └─> This code is from COGNITO, not Google!
     │
     └─> Browser loads your app again (fresh page load)

┌─────────────────────────────────────────────────────────────┐
│ STEP 6: AMPLIFY DETECTS CALLBACK URL (automatic)           │
└─────────────────────────────────────────────────────────────┘
     │
     ├─> Amplify SDK detects "?code=" parameter
     │
     ├─> Validates "state" matches (prevents CSRF attacks)
     │
     ├─> Makes POST request to Cognito token endpoint:
     │   POST https://COGNITO_DOMAIN/oauth2/token
     │   {
     │     grant_type: "authorization_code",
     │     code: "COGNITO_AUTH_CODE",
     │     client_id: "YOUR_COGNITO_CLIENT_ID",
     │     redirect_uri: "http://localhost:3000"
     │   }
     │
     ├─> Cognito responds with:
     │   {
     │     id_token: "eyJhbGc...",      // Who you are
     │     access_token: "eyJhbGc...",  // What you can do
     │     refresh_token: "eyJhbGc...", // Get new tokens
     │     expires_in: 3600             // 1 hour
     │   }
     │
     └─> Amplify stores tokens in localStorage

┌─────────────────────────────────────────────────────────────┐
│ STEP 7: HUB EVENT FIRES                                    │
└─────────────────────────────────────────────────────────────┘
     │
     ├─> Hub.dispatch('auth', { event: 'signInWithRedirect' })
     │
     ├─> AuthProvider listener catches event
     │
     ├─> Calls checkAuth() → reads tokens from localStorage
     │
     ├─> Updates React state: setIsAuthenticated(true)
     │
     └─> UI re-renders → User sees dashboard ✅
```

---

## The Two Sets of Redirects

This is the KEY insight that's often misunderstood:

### Set 1: In Google OAuth Console (Google → Cognito)

```
Authorized redirect URIs:
✅ https://5b3520e24b27ecc1f44d.auth.us-east-1.amazoncognito.com/oauth2/idpresponse

WHY?
Because Google sends the user back to COGNITO, not to your app!
```

**Where to configure:**
- Go to: https://console.cloud.google.com/apis/credentials
- Click your OAuth 2.0 Client ID
- Add the Cognito domain + `/oauth2/idpresponse`

### Set 2: In Amplify auth/resource.ts (Cognito → Your App)

```typescript
externalProviders: {
  google: {
    clientId: secret('GOOGLE_CLIENT_ID'),
    clientSecret: secret('GOOGLE_CLIENT_SECRET'),
  },

  // These are for Cognito → Your App
  callbackUrls: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    // Add production URLs when deploying
  ],

  logoutUrls: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ],
}
```

**WHY?**
Cognito uses these to redirect the user back to your app after authentication.

### Visual Summary

```
┌──────────────────────────────────────────────────────────────┐
│                     THE REDIRECT CHAIN                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Your App                                                     │
│     ↓ (Amplify redirects)                                    │
│  Cognito                                                      │
│     ↓ (Cognito redirects)                                    │
│  Google                                                       │
│     ↓ (Google redirects) - Uses redirect from Set 1          │
│  Cognito                                                      │
│     ↓ (Cognito redirects) - Uses redirect from Set 2         │
│  Your App                                                     │
│                                                               │
│  Set 1: Google → Cognito (in Google Console)                │
│  Set 2: Cognito → Your App (in auth/resource.ts)            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## JWT Tokens Explained

### What is a JWT?

JWT = JSON Web Token (3 parts separated by dots)

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9  ← HEADER (algorithm)
.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6  ← PAYLOAD (your data)
.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_  ← SIGNATURE (tamper-proof)
```

### Decoded Payload Example

```json
{
  "sub": "google-oauth2|123456",      // User ID
  "email": "you@gmail.com",           // Your email
  "email_verified": true,             // Google verified it
  "name": "Your Name",                // From Google profile
  "given_name": "Your",               // First name
  "family_name": "Name",              // Last name
  "picture": "https://...",           // Profile picture URL
  "exp": 1699999999,                  // Expires at this timestamp
  "iat": 1699999999,                  // Issued at this timestamp
  "aud": "your-cognito-client-id",    // Intended audience
  "iss": "https://cognito..."         // Issuer (Cognito)
}
```

### Why Use Tokens?

1. **Stateless** - Server doesn't need to remember you
2. **Self-contained** - All info in the token
3. **Secure** - Can't be modified without breaking signature
4. **Expirable** - Automatically expires for security
5. **Portable** - Works across different services

### The Three Tokens

```
1. ID Token (idToken)
   └─> WHO you are (user profile data)
   └─> Use for: Displaying user info in UI

2. Access Token (accessToken)
   └─> WHAT you can access (permissions)
   └─> Use for: Making API calls to backend

3. Refresh Token (refreshToken)
   └─> HOW to get new tokens when they expire
   └─> Use for: Automatic token refresh (handled by Amplify)
```

---

## Hub Events - The Missing Link

### Why Hub Events Are Critical

**The Problem Without Hub:**
```
1. OAuth callback happens
2. Amplify stores tokens in localStorage ✅
3. React state doesn't update ❌
4. UI still shows "Sign In" button
5. User is confused!
```

**The Solution With Hub:**
```
1. OAuth callback happens
2. Amplify stores tokens in localStorage ✅
3. Hub emits 'signInWithRedirect' event ✅
4. AuthProvider catches event ✅
5. checkAuth() runs → updates React state ✅
6. UI shows dashboard ✅
```

### Setting Up Hub Listener

```typescript
import { Hub } from 'aws-amplify/utils';

Hub.listen('auth', async ({ payload }) => {
  console.log('[Auth] Event:', payload.event);

  switch (payload.event) {
    case 'signInWithRedirect':
      // OAuth redirect completed - check auth state
      console.log('[Auth] OAuth redirect successful, checking auth...');
      await checkAuth();
      break;

    case 'signInWithRedirect_failure':
      console.error('[Auth] OAuth redirect failed:', payload.data);
      setError('Social sign-in failed. Please try again.');
      break;

    case 'signedIn':
      console.log('User signed in successfully');
      await checkAuth();
      break;

    case 'signedOut':
      setUser(null);
      setIsAuthenticated(false);
      break;

    case 'tokenRefresh':
      console.log('Tokens refreshed automatically');
      break;

    case 'tokenRefresh_failure':
      console.error('Token refresh failed - session expired');
      setError('Session expired. Please sign in again.');
      break;
  }
});
```

### Available Auth Events

| Event | When It Fires | What To Do |
|-------|---------------|------------|
| `signedIn` | User signs in with email/password | Call `checkAuth()` |
| `signedOut` | User signs out | Clear user state |
| `signInWithRedirect` | OAuth redirect completes | Call `checkAuth()` ✅ CRITICAL! |
| `signInWithRedirect_failure` | OAuth redirect fails | Show error |
| `tokenRefresh` | Tokens auto-refresh | Optional: Update UI |
| `tokenRefresh_failure` | Token refresh fails | Show "session expired" |
| `customOAuthState` | OAuth with custom state | Handle custom data |

### Cleanup

Always cleanup Hub listeners to prevent memory leaks:

```typescript
useEffect(() => {
  const hubListener = Hub.listen('auth', async (data) => {
    // Handle events
  });

  return () => {
    hubListener(); // Cleanup on unmount
  };
}, []);
```

---

## Debugging Checklist

When authentication isn't working:

### 1. Check localStorage
```javascript
// In browser console
Object.keys(localStorage).filter(k => k.includes('Cognito'))
```
- ✅ If you see keys → Tokens are stored (OAuth flow worked)
- ❌ If empty → OAuth flow failed (check Google Console redirects)

### 2. Check Hub Events
```javascript
// Should see in console:
[Auth] Event: signInWithRedirect
[Auth] OAuth redirect successful, checking auth...
```
- ✅ If you see these → Hub is working
- ❌ If not → Hub listener not set up or not firing

### 3. Check Google Console
- Verify redirect URI: `https://YOUR_COGNITO_DOMAIN/oauth2/idpresponse`
- Must be EXACT match (https, no trailing slash)

### 4. Check auth/resource.ts
- Verify `callbackUrls` includes your app URL
- Must match where Cognito redirects

### 5. Check Browser Console Errors
- Look for red errors
- Check Network tab for failed requests
- Look for CORS errors

---

## Summary

**The Three Key Insights:**

1. **Storage vs State:** Tokens in localStorage (persistent) vs React state (in-memory)
   - Hub events bridge the gap

2. **The Real Flow:** Your App → Cognito → Google → Cognito → Your App
   - Cognito is always the middleman

3. **Two Redirect Sets:** Google Console (Google→Cognito) vs auth/resource.ts (Cognito→Your App)
   - Both must be configured correctly

**Remember:** Authentication is a two-layer system - storage (truth) and React state (UI mirror). Hub events keep them in sync!
