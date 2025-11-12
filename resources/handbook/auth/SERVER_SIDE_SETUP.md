# Server-Side Authentication Setup - Amplify Gen 2 + Next.js

**Complete guide for using Amplify authentication on the server (middleware, server components, API routes).**

---

## 🎯 What This Guide Covers

This guide shows you how to:
1. Understand WHY server-side auth is different from client-side
2. Create server utilities with `runWithAmplifyServerContext`
3. Use auth in middleware for route protection
4. Use auth in server components
5. Use auth in API routes

**Prerequisites:**
- Amplify backend already configured (`amplify/auth/resource.ts`)
- `amplify_outputs.json` exists in project root
- `@aws-amplify/adapter-nextjs` package installed
- Next.js App Router project

---

## 🧠 Core Concept: Why Server-Side Auth is Different

### In the Browser (Client-Side)

```typescript
// This works in the browser:
const session = await fetchAuthSession();
// Amplify automatically:
// 1. Reads cookies from document.cookie
// 2. Reads localStorage
// 3. Returns session data
```

**Why it works:**
- Browser provides global access to cookies and localStorage
- Single JavaScript context per user
- Amplify can access auth tokens directly

### On the Server (Edge/Node)

```typescript
// ❌ This FAILS on the server:
const session = await fetchAuthSession();
// Error: Can't read cookies without request context!
```

**Why it fails:**
- Server handles MULTIPLE users simultaneously
- Each request is isolated (no shared state)
- Cookies must be explicitly parsed from request headers
- No `localStorage` exists on server

**The Problem:**
How do you tell Amplify which user's cookies to read when handling hundreds of concurrent requests?

**The Solution:**
`runWithAmplifyServerContext` - creates a request-scoped context that passes the current request's cookies to Amplify.

---

## 📦 Step 1: Install Server Adapter

```bash
npm install @aws-amplify/adapter-nextjs
```

This package provides:
- `createServerRunner()` - Creates the runner context
- Server-side versions of Amplify auth functions
- Cookie management for SSR/Edge environments

---

## 🔧 Step 2: Create Server Utilities

### File: `src/utils/amplify-server-utils.ts`

This file creates the server runner and provides helper functions:

```typescript
import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { cookies } from 'next/headers';
import { getCurrentUser } from 'aws-amplify/auth/server';
import outputs from '@root/amplify_outputs.json';

/**
 * Server Runner: Creates request-scoped contexts for Amplify operations
 *
 * This is the ONLY way to use Amplify auth on the server.
 * Use it in middleware, server components, and API routes.
 */
export const { runWithAmplifyServerContext } = createServerRunner({
  config: outputs,
});

/**
 * Helper: Get authenticated user on server
 *
 * Returns user object or null if not authenticated.
 * Use this in server components when you need user info.
 *
 * @example
 * // In a server component:
 * const user = await getAuthenticatedUser();
 * if (!user) redirect('/login');
 */
export async function getAuthenticatedUser() {
  try {
    const currentUser = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => getCurrentUser(contextSpec),
    });
    return currentUser;
  } catch (error) {
    console.log('[Server Auth] User not authenticated:', error);
    return null;
  }
}
```

**What `createServerRunner` does:**
1. Takes your Amplify configuration (`outputs`)
2. Returns `runWithAmplifyServerContext` function
3. This function creates isolated contexts for each request

---

## 🔍 Understanding `runWithAmplifyServerContext`

### The Anatomy

```typescript
const result = await runWithAmplifyServerContext({
  // 1️⃣ Provide the Next.js request context
  nextServerContext: { request, response }, // or { cookies }

  // 2️⃣ Define operation that needs auth
  operation: async (contextSpec) => {
    // 3️⃣ Use contextSpec to access cookies
    const session = await fetchAuthSession(contextSpec);
    return session;
  },
});
```

Let's break down each part:

#### 1️⃣ `nextServerContext`

This tells Amplify where to find the cookies for THIS specific request.

**In middleware/API routes (Edge runtime):**
```typescript
nextServerContext: { request, response }
```

**In server components (Node runtime):**
```typescript
nextServerContext: { cookies }
// where cookies = cookies() from 'next/headers'
```

#### 2️⃣ `operation`

Your custom logic that needs authentication. This can be:
- Checking if user is authenticated
- Getting current user info
- Fetching user attributes
- Any Amplify auth operation

#### 3️⃣ `contextSpec`

**This is the KEY concept!**

`contextSpec` is a **cookie accessor object** that Amplify uses to read auth tokens.

**Think of it as:** "Here's how to read cookies for THIS request"

**In the browser:**
```typescript
// No contextSpec needed - cookies are globally accessible
const session = await fetchAuthSession();
```

**On the server:**
```typescript
// Must pass contextSpec - tells Amplify which request's cookies
const session = await fetchAuthSession(contextSpec);
```

**Why it exists:**
- Server handles 1000s of concurrent requests
- Each request has different cookies (different users!)
- `contextSpec` ensures Amplify reads the RIGHT user's cookies
- Prevents mixing User A's cookies with User B's request

**Visual:**

```
Request from User A     Request from User B
  ↓                       ↓
Middleware runs         Middleware runs
  ↓                       ↓
runWithAmplifyServerContext creates:
  contextSpec A           contextSpec B
  ↓                       ↓
fetchAuthSession(contextSpecA)  fetchAuthSession(contextSpecB)
  ↓                       ↓
Reads User A's cookies  Reads User B's cookies
  ↓                       ↓
Returns A's session     Returns B's session
```

---

## 🛡️ Step 3: Use in Middleware (Route Protection)

Middleware is the **first line of defense** - it runs BEFORE pages load.

### File: `middleware.ts` (at project root)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { runWithAmplifyServerContext } from '@/utils/amplify-server-utils';

/**
 * Routes that require authentication
 */
const protectedRoutes = [
  '/dashboard',
  '/settings',
  '/profile',
];

/**
 * Public routes (skip auth check)
 */
const publicRoutes = [
  '/',
  '/about',
  '/authentication/sign-in',
];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // Skip public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return response;
  }

  // Check if protected route
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return response;
  }

  // 🎯 Check authentication using server context
  const authenticated = await runWithAmplifyServerContext({
    // Pass Edge runtime request/response
    nextServerContext: { request, response },

    // Define auth check operation
    operation: async (contextSpec) => {
      try {
        // Use contextSpec to read cookies from THIS request
        const session = await fetchAuthSession(contextSpec);
        return !!session.tokens?.idToken;
      } catch (error) {
        return false;
      }
    },
  });

  if (!authenticated) {
    // Block access - redirect to sign in
    const signInUrl = new URL('/authentication/sign-in', request.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Allow access
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|images).*)',
  ],
};
```

**How it works:**
1. Request comes in for `/settings`
2. Middleware intercepts BEFORE page loads
3. Creates server context with this request's cookies
4. Checks if valid auth token exists
5. Either allows or redirects (fail-secure)

**Security benefits:**
- ✅ Blocks unauthorized access at server level
- ✅ Page never loads for unauthorized users
- ✅ Can't be bypassed by client-side manipulation
- ✅ Works even with JavaScript disabled

---

## 🖥️ Step 4: Use in Server Components

Server components run on the server during page rendering.

### Example: Profile Page

```typescript
// app/profile/page.tsx
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/utils/amplify-server-utils';

export default async function ProfilePage() {
  // Get current user on server
  const user = await getAuthenticatedUser();

  // Redirect if not authenticated
  if (!user) {
    redirect('/authentication/sign-in');
  }

  // Render with user data (no loading state needed!)
  return (
    <div>
      <h1>Profile</h1>
      <p>Username: {user.username}</p>
      <p>User ID: {user.userId}</p>
    </div>
  );
}
```

**Why this is powerful:**
- No loading state needed (data fetched on server)
- SEO-friendly (content in initial HTML)
- Fast time-to-interactive
- Secure (auth check on server)

### Example: Personalized Dashboard

```typescript
// app/dashboard/page.tsx
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/utils/amplify-server-utils';
import { fetchUserAttributes } from 'aws-amplify/auth/server';

export default async function DashboardPage() {
  // Get user attributes on server
  const userAttributes = await runWithAmplifyServerContext({
    nextServerContext: { cookies }, // Node runtime uses cookies()
    operation: (contextSpec) => fetchUserAttributes(contextSpec),
  });

  return (
    <div>
      <h1>Welcome, {userAttributes.name}!</h1>
      <p>Email: {userAttributes.email}</p>
    </div>
  );
}
```

**Node runtime (server components) uses:**
```typescript
nextServerContext: { cookies } // cookies from 'next/headers'
```

**Edge runtime (middleware) uses:**
```typescript
nextServerContext: { request, response } // from middleware params
```

---

## 🔌 Step 5: Use in API Routes

API routes can check authentication before processing requests.

### Example: User Settings API

```typescript
// app/api/user/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runWithAmplifyServerContext } from '@/utils/amplify-server-utils';
import { getCurrentUser } from 'aws-amplify/auth/server';

export async function GET(request: NextRequest) {
  const response = NextResponse.next();

  // Check authentication
  const user = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: (contextSpec) => getCurrentUser(contextSpec),
  });

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Return user-specific data
  return NextResponse.json({
    userId: user.userId,
    username: user.username,
  });
}

export async function POST(request: NextRequest) {
  const response = NextResponse.next();

  // Verify authentication
  const user = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: (contextSpec) => getCurrentUser(contextSpec),
  });

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Process authenticated request
  const body = await request.json();

  return NextResponse.json({
    success: true,
    userId: user.userId,
  });
}
```

---

## 📊 Comparison: Three Server Contexts

| Context | Runtime | nextServerContext | Use Case |
|---------|---------|-------------------|----------|
| **Middleware** | Edge | `{ request, response }` | Route protection |
| **Server Components** | Node | `{ cookies }` | Pre-render with user data |
| **API Routes** | Edge/Node | `{ request, response }` | Authenticated endpoints |

**Import differences:**

```typescript
// Middleware (Edge runtime)
import { NextRequest, NextResponse } from 'next/server';
nextServerContext: { request, response }

// Server Components (Node runtime)
import { cookies } from 'next/headers';
nextServerContext: { cookies }

// API Routes (Edge or Node runtime)
import { NextRequest, NextResponse } from 'next/server';
nextServerContext: { request, response }
```

---

## 🐛 Troubleshooting

### Issue 1: "Cannot read cookies"

**Error:**
```
TypeError: Cannot read properties of undefined (reading 'getAll')
```

**Cause:** Forgot to pass `nextServerContext`

**Solution:**
```typescript
// ❌ Missing context
const session = await fetchAuthSession();

// ✅ Correct
const session = await runWithAmplifyServerContext({
  nextServerContext: { request, response },
  operation: (contextSpec) => fetchAuthSession(contextSpec),
});
```

### Issue 2: "Module not found: @root/amplify_outputs.json"

**Solution:** Add path alias to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@root/*": ["./*"]
    }
  }
}
```

### Issue 3: Middleware not running

**Check:**
- Is `middleware.ts` at **project root** (not in `src/`)?
- Does `config.matcher` include your route?
- Check Next.js server logs for errors

### Issue 4: Using wrong context for runtime

**Error:** `cookies is not a function`

**Cause:** Using Node runtime syntax in Edge runtime

**Solution:**

```typescript
// Edge runtime (middleware, edge API routes)
nextServerContext: { request, response }

// Node runtime (server components, node API routes)
nextServerContext: { cookies }
```

### Issue 5: Auth works in dev but not production

**Check:**
- Are cookies being set with correct domain?
- Are callback URLs configured for production domain?
- Check CloudWatch logs for server-side errors

---

## ✅ Verification Checklist

After implementing server-side auth:

- [ ] `amplify-server-utils.ts` created with `runWithAmplifyServerContext`
- [ ] `@root/*` path alias in tsconfig.json
- [ ] Middleware created at project root (not in src/)
- [ ] Protected routes list defined
- [ ] Middleware blocks unauthorized access to protected routes
- [ ] Can access user data in server components
- [ ] API routes check authentication
- [ ] Console logs show middleware running

**Test:**
1. Sign out
2. Try accessing `/settings` → Should redirect to sign-in
3. Sign in
4. Access `/settings` → Should load immediately
5. Refresh page → Should still show authenticated state

---

## 🎯 Complete Example: All Three Contexts

### 1. Middleware (Route Protection)

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const authenticated = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: (contextSpec) => {
      const session = await fetchAuthSession(contextSpec);
      return !!session.tokens?.idToken;
    },
  });

  return authenticated ? response : NextResponse.redirect('/login');
}
```

### 2. Server Component (Pre-rendered Page)

```typescript
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const user = await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: (contextSpec) => getCurrentUser(contextSpec),
  });

  return <div>Welcome, {user.username}!</div>;
}
```

### 3. API Route (Backend Endpoint)

```typescript
// app/api/user/route.ts
export async function GET(request: NextRequest) {
  const user = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: (contextSpec) => getCurrentUser(contextSpec),
  });

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ user });
}
```

**All three use the same pattern:**
1. Call `runWithAmplifyServerContext`
2. Pass appropriate `nextServerContext`
3. Use `contextSpec` in operation
4. Get user data or check authentication

---

## 📚 Key Takeaways

1. **Server-side auth is DIFFERENT** - Can't use global cookies like browser
2. **`runWithAmplifyServerContext` creates isolated contexts** - One per request
3. **`contextSpec` is a cookie accessor** - Tells Amplify which user's cookies to read
4. **Three server contexts:** Middleware (Edge), Server Components (Node), API Routes (Both)
5. **Middleware is first line of defense** - Blocks unauthorized access before page loads
6. **Server components can pre-fetch user data** - No loading state needed
7. **Always pass `contextSpec` to Amplify functions** - Required on server

---

## 🔗 Related Documentation

- **[CLIENT_SIDE_SETUP.md](./CLIENT_SIDE_SETUP.md)** - Client-side auth with OAuth listener
- **[MIDDLEWARE_PATTERN.md](./new/MIDDLEWARE_PATTERN.md)** - Deep dive on middleware auth
- **[SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)** - Security best practices
- **[AUTH_PATTERNS.md](./AUTH_PATTERNS.md)** - Complete authentication patterns

---

## 🎓 Understanding the Philosophy

**Why Amplify designed it this way:**

1. **Security:** Each request must be isolated to prevent user data leakage
2. **Scalability:** Server handles 1000s of concurrent users
3. **Flexibility:** Works in Edge runtime (Vercel/Cloudflare) and Node runtime
4. **Type Safety:** `contextSpec` ensures you can't forget to pass cookies

**The Trade-off:**
- More explicit code (must pass `contextSpec`)
- But: Safer, faster, more scalable

**Remember:** Client-side = Great UX. Server-side = Security. You need BOTH!
