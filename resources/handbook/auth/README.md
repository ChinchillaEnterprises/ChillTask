# 🔐 Authentication Guide - Amplify Gen 2 + Next.js

**Complete authentication setup and patterns for production-ready apps.**

---

## 🎯 Quick Navigation: "I Need To..."

| I Need To... | Go Here |
|--------------|---------|
| **Set up authentication from scratch** | Start with [CLIENT_SIDE_SETUP.md](#-client-side-setup) + [SERVER_SIDE_SETUP.md](#-server-side-setup) |
| **Fix OAuth callback not updating UI** | [CLIENT_SIDE_SETUP.md](#-client-side-setup) - See `enable-oauth-listener` |
| **Protect routes on the server** | [SERVER_SIDE_SETUP.md](#-server-side-setup) - Middleware pattern |
| **Understand how auth actually works** | [HOW_AUTH_WORKS.md](#-how-auth-works) |
| **Choose an auth pattern** | [AUTH_PATTERNS.md](#-auth-patterns) |
| **Set up Google OAuth** | [GOOGLE_OAUTH_SETUP.md](#-google-oauth-setup) |
| **Auto-confirm users without email verification** | [AUTO_CONFIRM_SETUP.md](#-auto-confirm-setup) |
| **Add Lambda triggers to auth flow** | [TRIGGERS_GUIDE.md](#-auth-triggers) |
| **Avoid common security mistakes** | [SECURITY_CHECKLIST.md](#-security-checklist) |
| **Fix OAuth redirecting to wrong port** | [troubleshooting/CALLBACK_URL_BEHAVIOR.md](#-callback-url-behavior) - Cookie conflicts |

---

## 📚 Complete Guide Index

### 🚀 Setup Guides (Start Here!)

#### 📱 Client-Side Setup
**File:** [CLIENT_SIDE_SETUP.md](./CLIENT_SIDE_SETUP.md)

**What's inside:**
- Complete client-side auth configuration
- **🔥 CRITICAL:** `enable-oauth-listener` import (fixes OAuth callback issues)
- `ConfigureAmplifyClientSide` component pattern
- `AuthProvider` with Hub event listeners
- OAuth flow timeline (14-step breakdown)
- Troubleshooting OAuth callback problems
- Complete working examples

**Key discovery:** Most OAuth implementations fail because of ONE missing import:
```typescript
import "aws-amplify/auth/enable-oauth-listener";
```

This enables Amplify to process OAuth callbacks in Next.js (multi-page app). Without it, Hub events never fire and UI never updates after OAuth.

**When to use:** Setting up auth in the browser/React components

---

#### 🖥️ Server-Side Setup
**File:** [SERVER_SIDE_SETUP.md](./SERVER_SIDE_SETUP.md)

**What's inside:**
- Why server-side auth is different from client-side
- Deep dive on `runWithAmplifyServerContext`
- What `contextSpec` is and why it exists (cookie accessor)
- Three server contexts: middleware, server components, API routes
- Edge vs Node runtime differences
- Security benefits of server-side protection
- Complete examples for all use cases

**Key concept:** `contextSpec` is a cookie accessor that tells Amplify which user's cookies to read when handling concurrent requests. Prevents mixing User A's cookies with User B's request.

**When to use:** Middleware, server components, API routes

---

### 🧠 Conceptual Guides

#### 📖 How Auth Works
**File:** [HOW_AUTH_WORKS.md](./HOW_AUTH_WORKS.md)

**What's inside:**
- How browsers store "who you are" (cookies, localStorage, sessionStorage)
- The two-layer auth system (server vs client)
- The Provider Pattern (React Context explained)
- OAuth callback flow - the ACTUAL story
- JWT tokens explained
- Hub events - the missing link

**Why read this:** Understanding the fundamentals helps you debug issues and make better architecture decisions.

**Best for:** Developers who want to understand "why" not just "how"

---

### 🎨 Pattern Guides

#### 🔑 Auth Patterns
**File:** [AUTH_PATTERNS.md](./AUTH_PATTERNS.md)

**What's inside:**
- Pattern 1: Basic Email Auth (MVP)
- Pattern 2: Social Authentication (Consumer apps)
- Pattern 3: **B2B Multi-Tenant SaaS** ⭐ Most common
- Pattern 4: Enterprise SSO (Corporate tools)
- Pattern 5: Passwordless Auth (Modern UX)

**Quick decision tree:**
```
Building a B2B SaaS? → Pattern 3 (Multi-Tenant)
Need Google/Facebook login? → Pattern 2 (Social)
Simple MVP with email/password? → Pattern 1 (Basic)
Corporate tool with Okta/Azure AD? → Pattern 4 (Enterprise SSO)
Magic link or SMS auth? → Pattern 5 (Passwordless)
```

**When to use:** Choosing which authentication approach for your app

---

#### ⚡ Auth Triggers
**File:** [TRIGGERS_GUIDE.md](./TRIGGERS_GUIDE.md)

**What's inside:**
- Pre Sign-up (domain validation, invitation codes)
- Post Confirmation (create profiles, welcome emails)
- Pre Token Generation (custom claims, permissions)
- Passwordless flows (magic links, OTP)
- Complete Lambda function examples

**When to use:** Customizing auth flow with backend logic

---

### 🛠️ Practical Guides

#### 🔵 Google OAuth Setup
**File:** [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)

**What's inside:**
- Google Cloud Console configuration
- OAuth credentials setup
- Callback URL configuration
- Environment variable setup
- Testing and troubleshooting

**When to use:** Adding "Sign in with Google" to your app

---

#### ✅ Auto-Confirm Setup
**File:** [AUTO_CONFIRM_SETUP.md](./AUTO_CONFIRM_SETUP.md)

**What's inside:**
- Enable instant sign-in without email verification codes
- Pre Sign-up Lambda trigger implementation
- Complete file structure and code examples
- Testing methodology
- Security considerations and trade-offs
- Variations (domain-specific auto-confirm, CAPTCHA integration)

**Key benefit:** Users can sign in immediately after registration without waiting for email confirmation codes.

**When to use:** Consumer apps where onboarding friction matters, development environments, or apps with alternative verification methods

---

#### ⚠️ Security Checklist
**File:** [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)

**What's inside:**
- ⚠️ **The One-Shot Schema Problem** - Custom attributes are permanent!
- Required attributes break SSO
- Immutable attributes break SSO updates
- Cognito vs DynamoDB decision matrix
- Common security mistakes

**Critical takeaway:** Custom attributes in Cognito are PERMANENT. You can't delete them. Choose carefully!

**When to use:** Before deploying auth to production

---

### 🔧 Troubleshooting Guides

#### 🔄 Callback URL Behavior & Cookie Conflicts
**File:** [troubleshooting/CALLBACK_URL_BEHAVIOR.md](./troubleshooting/CALLBACK_URL_BEHAVIOR.md)

**What's inside:**
- How Cognito chooses callback URLs (spoiler: it doesn't, the client does!)
- Cookie conflicts when running multiple Amplify apps on localhost
- Why OAuth redirects to wrong port
- Testing methodology and proof
- Solutions for running multiple apps simultaneously
- Best practices for callback URL configuration

**Critical discovery:** Callback URL arrays are WHITELISTS, not "options for Cognito to choose from." The Amplify SDK sends `redirect_uri` using `window.location.origin`, and Cognito validates it. If OAuth redirects to the wrong port, it's cookie conflicts from multiple apps on the same domain, not a Cognito issue.

**When to use:** Debugging OAuth redirect issues, understanding callback URL arrays, running multiple Amplify apps

---

## 🚦 Common Workflows

### "I'm Setting Up Auth from Scratch"

1. **Choose pattern:** Read [AUTH_PATTERNS.md](./AUTH_PATTERNS.md) → Pick one
2. **Client setup:** Follow [CLIENT_SIDE_SETUP.md](./CLIENT_SIDE_SETUP.md) step-by-step
3. **Server setup:** Follow [SERVER_SIDE_SETUP.md](./SERVER_SIDE_SETUP.md) step-by-step
4. **Security review:** Check [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
5. **Test:** Try OAuth flow, verify middleware blocks unauthorized access
6. **Done!** You now have production-ready auth

---

### "OAuth Callback Doesn't Update UI"

**Symptom:** User returns from Google, "Sign In" button still visible, must click again

**Solution:**

1. **Read:** [CLIENT_SIDE_SETUP.md](./CLIENT_SIDE_SETUP.md) → Issue 1
2. **Check:** Does `AuthProvider.tsx` have this import?
   ```typescript
   import "aws-amplify/auth/enable-oauth-listener";
   ```
3. **If missing:** Add it (line 10 in AuthProvider)
4. **Test:** Sign in with Google → Should switch to dashboard immediately
5. **Still broken?** Check console logs for Hub events

**Root cause:** Next.js is a multi-page app. Without `enable-oauth-listener`, Amplify can't process OAuth callbacks on fresh page loads.

---

### "I Need to Protect Routes"

**Goal:** Block unauthorized users from accessing `/settings` or `/profile`

**Solution:**

1. **Read:** [SERVER_SIDE_SETUP.md](./SERVER_SIDE_SETUP.md) → Step 3: Middleware
2. **Create:** `middleware.ts` at project root
3. **Add:** Protected routes list (e.g., `/dashboard`, `/settings`)
4. **Test:** Sign out → Try accessing `/settings` → Should redirect to sign-in
5. **Done!** Routes protected at server level

**Why server-side:** Client-side protection can be bypassed. Server-side middleware blocks requests BEFORE page loads.

---

### "I Want to Add Custom Claims to JWT Tokens"

**Example:** Add `organizationId` to tokens for multi-tenant apps

**Solution:**

1. **Read:** [TRIGGERS_GUIDE.md](./TRIGGERS_GUIDE.md) → Pre Token Generation
2. **Create:** Lambda function in `amplify/auth/pre-token-generation/`
3. **Add logic:** Read org from DynamoDB, add to token claims
4. **Configure:** Connect trigger in `amplify/auth/resource.ts`
5. **Test:** Sign in → Decode JWT → Verify custom claim exists

---

### "I'm Adding Google Sign-In"

1. **Read:** [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)
2. **Google Console:** Create OAuth credentials
3. **Configure:** Add client ID/secret to `amplify/auth/resource.ts`
4. **Client-side:** Follow [CLIENT_SIDE_SETUP.md](./CLIENT_SIDE_SETUP.md)
5. **Test:** Click "Sign in with Google" → Should work without flicker
6. **Troubleshoot:** If broken, check `enable-oauth-listener` import

---

### "OAuth Redirects to Wrong Port"

**Symptom:** Running app on port 3003, but OAuth redirects to 3000 after Google sign-in

**Root Cause:** Cookie conflicts from running multiple Amplify apps on the same domain (localhost)

**Solution:**

1. **Read:** [troubleshooting/CALLBACK_URL_BEHAVIOR.md](./troubleshooting/CALLBACK_URL_BEHAVIOR.md) → Understanding the issue
2. **Stop other Amplify apps:** Only run one app at a time on localhost
3. **Clear cookies:** Clear all localhost cookies in browser
4. **Restart your app:** Start on desired port (e.g., 3003)
5. **Test:** Sign in with Google → Should redirect to correct port

**Alternative Solutions (for multiple apps):**
- Use different domains: `app1.localhost:3000` vs `app2.localhost:3001`
- Use different browsers/incognito mode
- Use `127.0.0.1:3000` vs `localhost:3001` (different cookie domains)

**Key Understanding:** The callback URL array is a whitelist for different ENVIRONMENTS (dev, staging, prod), not for running multiple apps simultaneously on localhost.

---

## 🎓 Learning Paths

### Path 1: New to Amplify Auth

1. **Concepts:** Read [HOW_AUTH_WORKS.md](./HOW_AUTH_WORKS.md) first
2. **Choose:** Browse [AUTH_PATTERNS.md](./AUTH_PATTERNS.md) → Pick your pattern
3. **Implement:** Follow [CLIENT_SIDE_SETUP.md](./CLIENT_SIDE_SETUP.md) + [SERVER_SIDE_SETUP.md](./SERVER_SIDE_SETUP.md)
4. **Secure:** Review [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
5. **Deploy:** You're ready!

### Path 2: Fixing OAuth Issues

1. **Diagnose:** Is UI not updating after OAuth callback?
2. **Fix:** Add `enable-oauth-listener` (see [CLIENT_SIDE_SETUP.md](./CLIENT_SIDE_SETUP.md))
3. **Understand:** Read OAuth flow section in [HOW_AUTH_WORKS.md](./HOW_AUTH_WORKS.md)
4. **Test:** Verify Hub events fire in console

### Path 3: Securing an Existing App

1. **Audit:** Read [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) first
2. **Add middleware:** Follow [SERVER_SIDE_SETUP.md](./SERVER_SIDE_SETUP.md)
3. **Test:** Verify unauthorized users can't access protected routes
4. **Review custom attributes:** Make sure they're not problematic

### Path 4: Debugging OAuth Redirect Issues

1. **Symptom:** OAuth redirects to wrong port or wrong URL
2. **Understand:** Read [troubleshooting/CALLBACK_URL_BEHAVIOR.md](./troubleshooting/CALLBACK_URL_BEHAVIOR.md) first
3. **Diagnose:** Are you running multiple Amplify apps on localhost?
4. **Fix:** Stop other apps, clear cookies, restart on desired port
5. **Test:** Verify OAuth redirects to correct port
6. **Alternative:** Use different domains if you need multiple apps running

---

## 🔑 Key Concepts

### Client-Side vs Server-Side

**Client-Side (Browser):**
- ✅ Great UX (smooth transitions, loading states)
- ✅ Hub events for real-time updates
- ❌ Can be bypassed (inspect element, disable JS)
- **Use for:** UI state management, OAuth callbacks

**Server-Side (Edge/Node):**
- ✅ True security (can't be bypassed)
- ✅ Blocks requests BEFORE page loads
- ✅ SEO-friendly (auth check before rendering)
- **Use for:** Route protection, API endpoints, server components

**You need BOTH!** Client = UX, Server = Security

---

### The `enable-oauth-listener` Import

**Most critical line for Next.js OAuth:**
```typescript
import "aws-amplify/auth/enable-oauth-listener";
```

**What it does:**
- Registers handlers that process OAuth callbacks
- Enables detection of `?code=...&state=...` in URL
- Exchanges OAuth code for tokens
- Fires Hub events when complete

**Why it's needed:**
- Next.js is a multi-page app (each route is a fresh page load)
- When Google redirects back, it's a NEW JavaScript context
- Without this, Amplify doesn't process the OAuth callback
- Result: Tokens never load, UI never updates

**Where to add:** In `AuthProvider.tsx` (see [CLIENT_SIDE_SETUP.md](./CLIENT_SIDE_SETUP.md))

---

### The `contextSpec` Concept

**On the server, you MUST pass `contextSpec` to Amplify functions:**

```typescript
// ❌ Browser only
const session = await fetchAuthSession();

// ✅ Server (middleware, server components, API routes)
const session = await runWithAmplifyServerContext({
  nextServerContext: { request, response },
  operation: (contextSpec) => fetchAuthSession(contextSpec),
});
```

**Why?**
- Server handles 1000s of concurrent requests
- Each request has different cookies (different users!)
- `contextSpec` is a cookie accessor that tells Amplify which user's cookies to read
- Prevents mixing User A's cookies with User B's request

**Full explanation:** See [SERVER_SIDE_SETUP.md](./SERVER_SIDE_SETUP.md)

---

### Hub Events

**The notification system for async auth operations:**

```typescript
Hub.listen('auth', ({ payload }) => {
  switch (payload.event) {
    case 'signInWithRedirect':
      // OAuth completed! Tokens ready
      await checkAuth(); // Update UI
      break;
  }
});
```

**Why they exist:**
- OAuth token exchange is async (100-500ms)
- React renders synchronously
- Hub provides notification when async work finishes
- Your UI updates in response

**Common events:**
- `signInWithRedirect` - OAuth succeeded
- `signInWithRedirect_failure` - OAuth failed
- `signedIn` - User signed in
- `signedOut` - User signed out
- `tokenRefresh` - Tokens auto-refreshed

---

## ❓ FAQ

**Q: Why isn't my OAuth callback updating the UI?**
A: Missing `enable-oauth-listener` import. See [CLIENT_SIDE_SETUP.md](./CLIENT_SIDE_SETUP.md) Issue 1.

**Q: How do I protect routes?**
A: Server-side middleware. See [SERVER_SIDE_SETUP.md](./SERVER_SIDE_SETUP.md) Step 3.

**Q: What's the difference between client and server auth?**
A: Client = UX (loading states, smooth transitions). Server = Security (true protection). You need both! See [CLIENT_SIDE_SETUP.md](./CLIENT_SIDE_SETUP.md) + [SERVER_SIDE_SETUP.md](./SERVER_SIDE_SETUP.md).

**Q: Can I delete custom attributes in Cognito?**
A: No. They're permanent. Read [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) before creating them.

**Q: Which auth pattern should I use?**
A: See decision tree in [AUTH_PATTERNS.md](./AUTH_PATTERNS.md). Most B2B apps use Pattern 3 (Multi-Tenant).

**Q: How do I add custom claims to JWT tokens?**
A: Use Pre Token Generation trigger. See [TRIGGERS_GUIDE.md](./TRIGGERS_GUIDE.md).

**Q: What is `contextSpec` in server-side code?**
A: A cookie accessor that tells Amplify which user's cookies to read. See [SERVER_SIDE_SETUP.md](./SERVER_SIDE_SETUP.md).

**Q: Can I use client-side protection only?**
A: No. It can be bypassed. Always add server-side middleware. See [SERVER_SIDE_SETUP.md](./SERVER_SIDE_SETUP.md).

**Q: Why does OAuth redirect to wrong port (3000 instead of 3003)?**
A: Cookie conflicts from running multiple Amplify apps on localhost. Cookies are domain-scoped (localhost), not port-scoped (localhost:3003). Stop other apps and clear cookies. See [troubleshooting/CALLBACK_URL_BEHAVIOR.md](./troubleshooting/CALLBACK_URL_BEHAVIOR.md).

**Q: How does Cognito choose which callback URL from the array?**
A: It doesn't! The client (Amplify SDK) specifies the URL in the `redirect_uri` parameter. Cognito validates it against the whitelist. The array is for different environments (dev, staging, prod), not simultaneous selection. See [troubleshooting/CALLBACK_URL_BEHAVIOR.md](./troubleshooting/CALLBACK_URL_BEHAVIOR.md).

**Q: Can I run multiple Amplify apps on different localhost ports simultaneously?**
A: Not recommended. They'll share cookies and interfere with each other. Use different domains (app1.localhost vs app2.localhost) or different browsers/incognito mode. See [troubleshooting/CALLBACK_URL_BEHAVIOR.md](./troubleshooting/CALLBACK_URL_BEHAVIOR.md).

---

## 🎯 Remember

1. **Two setup guides:** CLIENT_SIDE_SETUP.md + SERVER_SIDE_SETUP.md (do both!)
2. **OAuth needs listener:** Import `enable-oauth-listener` in AuthProvider
3. **Server is different:** Must use `runWithAmplifyServerContext` with `contextSpec`
4. **Custom attributes permanent:** Read SECURITY_CHECKLIST.md before creating
5. **Client = UX, Server = Security:** You need both layers
6. **Callback URLs are whitelists:** Not for Cognito to "choose from" - client specifies URL
7. **One app at a time on localhost:** Multiple Amplify apps = cookie conflicts

---

## 🔗 Related Handbook Sections

- **[functions/](../functions/)** - Lambda permissions (use with auth triggers)
- **[data/](../data/)** - Database schema (user profiles, multi-tenancy)
- **[webhooks/](../webhooks/)** - Public endpoints (no auth required)
- **[AI-DEVELOPMENT-GUIDELINES.md](../AI-DEVELOPMENT-GUIDELINES.md)** - Never use raw CDK

---

Happy authenticating! 🚀
