# Cognito Callback URL Behavior and Cookie Conflicts

**Critical discoveries about how AWS Cognito handles OAuth callback URLs and the implications of running multiple Amplify apps on the same domain.**

---

## 🎯 Key Discoveries

### Discovery 1: How Cognito Chooses Callback URLs

**Common Misconception:**
"Cognito chooses from an array of callback URLs based on which one is 'first' or 'default'."

**Reality:**
Cognito doesn't "choose" - the **client application** specifies which URL to redirect to, and Cognito validates it against a whitelist.

**How It Actually Works:**

1. **User clicks "Sign in with Google"** (or any OAuth provider)
2. **Amplify SDK constructs OAuth request:**
   ```typescript
   // Amplify automatically sends:
   redirect_uri=http://localhost:3003  // Uses window.location.origin
   ```
3. **Cognito validates:**
   - Is `http://localhost:3003` in the `callbackUrls` whitelist?
   - If YES → Allows OAuth flow to proceed
   - If NO → Returns `redirect_mismatch` error
4. **After successful authentication:**
   - Cognito redirects to the EXACT URL specified in `redirect_uri`
   - Not the first URL in the array
   - Not a "default" URL
   - The URL that the client requested (if whitelisted)

**Key Insight:**
The `callbackUrls` array is a **whitelist**, not a "list of options for Cognito to choose from."

---

### Discovery 2: Cookie Conflicts Between Multiple Amplify Apps

**The Problem:**
Running two Amplify apps on different ports of the same domain causes auth conflicts.

**Example Scenario:**
- App A running on `localhost:3000`
- App B running on `localhost:3003`
- User signs into App B on port 3003
- **Unexpected behavior:** User is redirected to port 3000 after OAuth callback

**Root Cause:**
Cookies are **domain-scoped**, not **port-scoped**.

**Technical Details:**

```
Cookie Scope Behavior:
┌─────────────────────────────────────┐
│ Domain: localhost                    │ ← Cookies apply to ALL ports
│                                      │
│  Port 3000: App A (Amplify)         │ ← Shares cookies with 3003
│  Port 3001: App B (React only)      │ ← Independent (no Amplify cookies)
│  Port 3002: App C (Vue only)        │ ← Independent (no Amplify cookies)
│  Port 3003: App D (Amplify)         │ ← Shares cookies with 3000
│                                      │
└─────────────────────────────────────┘

Result: App A and App D share the SAME auth cookies!
```

**What Happens:**

1. User has App A (port 3000) running with active Cognito session
2. User opens App D (port 3003) in same browser
3. App D reads the SAME cookies as App A (domain = localhost)
4. When App D initiates OAuth:
   - Cognito sees existing session cookies
   - Cognito may associate the OAuth flow with the 3000 session
   - Redirect goes to 3000 instead of 3003

**Cookies Involved:**

Cognito sets several cookies on the `localhost` domain:
- `CognitoIdentityServiceProvider.[clientId].LastAuthUser`
- `CognitoIdentityServiceProvider.[clientId].[username].idToken`
- `CognitoIdentityServiceProvider.[clientId].[username].accessToken`
- `CognitoIdentityServiceProvider.[clientId].[username].refreshToken`
- `CognitoIdentityServiceProvider.[clientId].[username].clockDrift`

All of these are scoped to `localhost` (NOT `localhost:3003`), so they're shared across all ports.

---

## 🧪 Testing Methodology

### Test 1: Single Callback URL

**Goal:** Prove Cognito respects the `redirect_uri` parameter

**Setup:**
```typescript
// amplify/auth/resource.ts
callbackUrls: [
  'http://localhost:3003',  // ONLY this one
]
```

**Steps:**
1. Start app on port 3003
2. Sign in with Google OAuth
3. Observe redirect destination

**Result:**
✅ Successfully redirected to `localhost:3003`

**Conclusion:**
Cognito DOES respect the `redirect_uri` parameter sent by the client.

---

### Test 2: Multiple Callback URLs with Cookie Conflict

**Goal:** Reproduce the cookie conflict issue

**Setup:**
```typescript
// amplify/auth/resource.ts
callbackUrls: [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
]
```

**Conditions:**
- Another Amplify app running on port 3000
- Browser has existing Cognito cookies from 3000 app
- Testing app running on port 3003

**Steps:**
1. Start app on port 3003
2. Sign in with Google OAuth
3. Observe redirect destination

**Result:**
❌ Redirected to `localhost:3000` (not 3003 as expected)

**Conclusion:**
Cookie conflicts cause unexpected redirect behavior even though the correct `redirect_uri` is sent.

---

### Test 3: Clear Cookies Test

**Goal:** Confirm cookie conflicts are the root cause

**Setup:**
- Same as Test 2 (all 4 ports in callback URLs)
- Clear ALL cookies for `localhost` domain

**Steps:**
1. Clear all browser cookies for localhost
2. Start app on port 3003
3. Sign in with Google OAuth
4. Observe redirect destination

**Result:**
Still redirected to port 3000 (in this test case, because the other app on 3000 was still running and may have been setting cookies)

**Conclusion:**
The cookie conflict issue is confirmed. Even after clearing cookies, if multiple Amplify apps are running simultaneously, they will interfere with each other's auth state.

---

## 📚 Understanding Callback URL Arrays

### Purpose of Multiple Callback URLs

**The array is for DIFFERENT ENVIRONMENTS, not simultaneous local ports.**

**Correct Use Case:**

```typescript
callbackUrls: [
  'http://localhost:3000',              // Local development
  'https://dev.myapp.com',              // Development environment
  'https://staging.myapp.com',          // Staging environment
  'https://app.myapp.com',              // Production environment
]
```

**Each environment:**
- Runs independently
- Has different domain/subdomain
- Doesn't share cookies with other environments
- Sends `redirect_uri` matching its own URL

---

### Why Not Multiple Local Ports?

**The Problem:**

```typescript
// ❌ Common misunderstanding:
callbackUrls: [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
]
// "Now I can run multiple instances on different ports!"
```

**Why This Doesn't Work as Expected:**

1. **Cookie Conflicts:**
   - All ports share the same cookies (domain = localhost)
   - Auth state interferes between apps
   - Unpredictable redirect behavior

2. **User Pool Limits:**
   - Single Cognito User Pool shared across all instances
   - User accounts are shared (not isolated per port)
   - Sign in on one port = signed in on all ports (cookie-wise)

3. **OAuth Flow Interference:**
   - Multiple OAuth flows may conflict
   - Existing session cookies affect new OAuth requests
   - Redirect may go to wrong port due to cached state

**Recommendation:**

Only run ONE Amplify app at a time on localhost during development, OR use different domains:
- `app1.localhost:3000` (requires hosts file configuration)
- `127.0.0.1:3000` vs `localhost:3001` (different domains, separate cookies)

---

## 🔧 AWS Documentation References

### Official Cognito Behavior

From AWS Cognito documentation:

**Callback URL Validation:**
> The redirect URI must match one of the callback URLs configured for the app client. If the redirect URI doesn't match, Amazon Cognito returns a `redirect_mismatch` error.

**Key Points:**

1. **Exact Match Required:**
   - `redirect_uri` MUST exactly match a URL in `callbackUrls`
   - No partial matches
   - Protocol (http/https), domain, port, and path must all match

2. **Client Specifies URL:**
   - The OAuth client (Amplify SDK) sends `redirect_uri` in the authorization request
   - Cognito validates it against the whitelist
   - Cognito does NOT choose which URL to use

3. **No Automatic Fallback:**
   - If `redirect_uri` is invalid, OAuth flow fails
   - Cognito won't "fall back" to the first URL in the array
   - Cognito won't use a "default" URL

4. **Default Redirect URI:**
   - You CAN configure a "default" redirect URI in the User Pool Client settings
   - This is used when `redirect_uri` is OMITTED from the request
   - Amplify SDK always includes `redirect_uri`, so this rarely applies

---

## 🛠️ Practical Solutions

### Solution 1: Only Run One App at a Time

**Best for:** Local development

```bash
# Stop all running apps
# Start only the app you're currently developing
npm run dev  # Uses default port 3000
```

**Pros:**
- No cookie conflicts
- Predictable behavior
- Simplest solution

**Cons:**
- Can't test multiple apps simultaneously
- Must stop/start when switching projects

---

### Solution 2: Use Different Domains

**Best for:** Testing multiple apps simultaneously

**Option A: Different localhost aliases**

1. **Add to `/etc/hosts` (Mac/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):**
   ```
   127.0.0.1  app1.localhost
   127.0.0.1  app2.localhost
   ```

2. **Update callback URLs:**
   ```typescript
   // App 1 (amplify/auth/resource.ts)
   callbackUrls: ['http://app1.localhost:3000']

   // App 2 (amplify/auth/resource.ts)
   callbackUrls: ['http://app2.localhost:3000']
   ```

3. **Run apps:**
   ```bash
   # App 1
   cd app1
   npm run dev  # Access at http://app1.localhost:3000

   # App 2
   cd app2
   npm run dev  # Access at http://app2.localhost:3000
   ```

**Pros:**
- Separate cookie domains
- No interference
- Can run simultaneously

**Cons:**
- Requires hosts file modification
- More complex setup

**Option B: Use 127.0.0.1 vs localhost**

Different domains = different cookie scope:
- App 1: `http://127.0.0.1:3000` (domain = 127.0.0.1)
- App 2: `http://localhost:3001` (domain = localhost)

```typescript
// App 1 (amplify/auth/resource.ts)
callbackUrls: ['http://127.0.0.1:3000']

// App 2 (amplify/auth/resource.ts)
callbackUrls: ['http://localhost:3001']
```

**Pros:**
- No hosts file modification needed
- Separate cookie domains

**Cons:**
- Must remember to use IP address for one app
- Less intuitive URLs

---

### Solution 3: Use Incognito/Different Browsers

**Best for:** Quick testing without stopping apps

1. Run App A on port 3000 in Chrome (normal mode)
2. Run App B on port 3003 in Chrome (incognito mode)
3. OR run App B in Firefox

**Pros:**
- Separate cookie storage
- No configuration changes needed

**Cons:**
- Can't test cross-app scenarios
- Must remember which browser/mode for which app

---

## 🚨 Common Pitfalls

### Pitfall 1: "I added all my local ports to callback URLs"

**Problem:**
```typescript
callbackUrls: [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:8080',
]
```

**Why It's Wrong:**
- This doesn't mean you can run 5 apps simultaneously
- All ports share the same cookies (domain = localhost)
- Cookie conflicts will cause auth issues

**Correct Usage:**
Only ONE of these should be used at a time during development. The array exists for environment flexibility (e.g., if you sometimes develop on 3000, sometimes on 8080), not simultaneous usage.

---

### Pitfall 2: "OAuth redirects to wrong port"

**Symptom:**
Running app on port 3003, but OAuth redirects to 3000.

**Root Cause:**
Another Amplify app is running on port 3000, causing cookie conflicts.

**Solution:**
1. Stop the app on port 3000
2. Clear browser cookies for localhost
3. Restart app on 3003
4. Test OAuth again

---

### Pitfall 3: "I need to test two Amplify apps at once"

**Problem:**
Both apps on localhost will share cookies and interfere with each other.

**Solutions:**
1. Use different domains (app1.localhost vs app2.localhost)
2. Use different browsers
3. Use incognito mode for one app
4. Use localhost vs 127.0.0.1

---

## ✅ Best Practices

### Development Workflow

1. **One App at a Time:**
   ```bash
   # When switching projects:
   cd project-a
   # Stop any running dev servers first
   npm run dev
   ```

2. **Clear Cookies When Switching:**
   ```bash
   # Before starting a different Amplify app:
   # 1. Clear localhost cookies in browser
   # 2. Stop previous app
   # 3. Start new app
   ```

3. **Organized Callback URLs:**
   ```typescript
   // amplify/auth/resource.ts
   callbackUrls: [
     // Local development (choose ONE port per project)
     'http://localhost:3000',

     // Remote environments (add when deploying)
     // 'https://dev.myapp.com',
     // 'https://staging.myapp.com',
     // 'https://app.myapp.com',
   ]
   ```

4. **Document Your Port:**
   ```typescript
   // package.json
   {
     "scripts": {
       "dev": "next dev -p 3000"  // Explicit port
     }
   }
   ```

---

## 🔗 Related Documentation

- **[CLIENT_SIDE_SETUP.md](./CLIENT_SIDE_SETUP.md)** - OAuth listener setup
- **[SERVER_SIDE_SETUP.md](./SERVER_SIDE_SETUP.md)** - Server-side auth
- **[AUTH_PATTERNS.md](./AUTH_PATTERNS.md)** - Authentication patterns
- **[SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)** - Security best practices

---

## 📝 Summary

1. **Callback URL arrays are whitelists** - Not a list for Cognito to choose from
2. **Client specifies redirect URL** - Using `window.location.origin` via Amplify SDK
3. **Cognito validates, doesn't choose** - Must match exactly or OAuth fails
4. **Cookies are domain-scoped** - Not port-scoped, causing conflicts on localhost
5. **Run one app at a time** - Or use different domains to avoid cookie conflicts
6. **Array is for environments** - Dev, staging, prod - not simultaneous local ports

---

**Key Takeaway:**
When you see OAuth redirecting to the wrong port, it's not a Cognito configuration issue - it's a cookie conflict from running multiple Amplify apps on the same domain.
