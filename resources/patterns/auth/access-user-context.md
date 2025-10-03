# Access User Context Throughout Your App

**Step-by-step pattern for getting current user info, attributes, and roles in any component**

---

## ✅ Prerequisites

- Authentication configured (`amplify/auth/resource.ts` exists)
- Users can sign in successfully
- Amplify configured in your app

---

## 📋 Step 1: Get Current User in Any Component

### Client Components

```typescript
"use client";

import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import { useEffect, useState } from 'react';

export default function UserProfile() {
  const [user, setUser] = useState<any>(null);
  const [attributes, setAttributes] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        const userAttributes = await fetchUserAttributes();
        setAttributes(userAttributes);
      } catch (error) {
        console.log('Not signed in');
      }
    }
    loadUser();
  }, []);

  if (!user) {
    return <div>Not signed in</div>;
  }

  return (
    <div>
      <h1>Welcome, {attributes?.name || attributes?.email}!</h1>
      <p>User ID: {user.userId}</p>
      <p>Username: {user.username}</p>
      <p>Email: {attributes?.email}</p>
    </div>
  );
}
```

**Key Points:**
- ✅ `getCurrentUser()` returns basic user info (userId, username)
- ✅ `fetchUserAttributes()` returns all user attributes (email, name, custom attributes)
- ✅ Wrap in try-catch to handle signed-out state

---

## 📋 Step 2: Access User Attributes

### Available Standard Attributes

```typescript
import { fetchUserAttributes } from 'aws-amplify/auth';

const attributes = await fetchUserAttributes();

// Standard attributes
const email = attributes.email;
const name = attributes.name;
const givenName = attributes.given_name;
const familyName = attributes.family_name;
const phoneNumber = attributes.phone_number;
const picture = attributes.picture;
const sub = attributes.sub; // User ID (never changes)

// Custom attributes (if you defined them in auth config)
const accountType = attributes['custom:accountType'];
const department = attributes['custom:department'];
const companyId = attributes['custom:companyId'];
```

**Key Points:**
- ✅ `sub` is the permanent user ID (use this for database relations)
- ✅ Custom attributes are prefixed with `custom:`
- ✅ Attributes are strings (convert if needed)

---

## 📋 Step 3: Check User Groups/Roles

```typescript
import { fetchAuthSession } from 'aws-amplify/auth';

async function checkUserRole() {
  try {
    const session = await fetchAuthSession();

    // Get user groups from JWT token
    const groups = session.tokens?.accessToken?.payload['cognito:groups'] as string[] || [];

    const isAdmin = groups.includes('ADMINS');
    const isModerator = groups.includes('MODERATORS');
    const isPremium = groups.includes('PREMIUM_USERS');

    return { groups, isAdmin, isModerator, isPremium };
  } catch (error) {
    console.error('Error checking roles:', error);
    return { groups: [], isAdmin: false, isModerator: false, isPremium: false };
  }
}
```

**Usage:**

```typescript
"use client";

import { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

export default function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const session = await fetchAuthSession();
      const groups = session.tokens?.accessToken?.payload['cognito:groups'] as string[] || [];
      setIsAdmin(groups.includes('ADMINS'));
    }
    checkAdmin();
  }, []);

  if (!isAdmin) {
    return <div>Access denied. Admins only.</div>;
  }

  return <div>Admin Panel Content</div>;
}
```

---

## 📋 Step 4: Create User Context Provider (Recommended)

For apps where you need user info in many components, create a context provider:

### Create `src/contexts/AuthContext.tsx`:

```typescript
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

interface User {
  userId: string;
  username: string;
  email?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  groups: string[];
  attributes: Record<string, any>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    try {
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      const session = await fetchAuthSession();

      const groups = session.tokens?.accessToken?.payload['cognito:groups'] as string[] || [];

      setUser({
        userId: currentUser.userId,
        username: currentUser.username,
        email: attributes.email,
        name: attributes.name,
        givenName: attributes.given_name,
        familyName: attributes.family_name,
        groups,
        attributes,
      });
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();

    // Listen for auth events
    const hubListener = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          loadUser();
          break;
        case 'signedOut':
          setUser(null);
          break;
      }
    });

    return () => hubListener();
  }, []);

  const handleSignOut = async () => {
    const { signOut } = await import('aws-amplify/auth');
    await signOut();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.groups.includes('ADMINS') || false,
    signOut: handleSignOut,
    refreshUser: loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Wrap Your App with Provider

In `app/layout.tsx`:

```typescript
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Use in Any Component

```typescript
"use client";

import { useAuth } from '@/contexts/AuthContext';

export default function UserMenu() {
  const { user, loading, isAuthenticated, isAdmin, signOut } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <a href="/signin">Sign In</a>;
  }

  return (
    <div>
      <p>Welcome, {user?.name || user?.email}!</p>
      {isAdmin && <a href="/admin">Admin Panel</a>}
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

---

## 📋 Step 5: Server-Side User Access (Next.js)

### In Server Components

```typescript
import { cookies } from 'next/headers';
import { runWithAmplifyServerContext } from '@/utils/amplify-server-utils';
import { fetchAuthSession } from 'aws-amplify/auth/server';

export default async function ServerProtectedPage() {
  const session = await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: (contextSpec) => fetchAuthSession(contextSpec),
  });

  if (!session.tokens) {
    redirect('/signin');
  }

  const groups = session.tokens.accessToken.payload['cognito:groups'] as string[] || [];
  const isAdmin = groups.includes('ADMINS');

  return (
    <div>
      <h1>Server-Side Protected Page</h1>
      {isAdmin && <p>You are an admin</p>}
    </div>
  );
}
```

### Create `src/utils/amplify-server-utils.ts`:

```typescript
import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import outputs from '@/amplify_outputs.json';

export const { runWithAmplifyServerContext } = createServerRunner({
  config: outputs,
});
```

---

## 🎯 Common Use Cases

### Show User Name in Nav

```typescript
"use client";

import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated } = useAuth();

  return (
    <nav>
      <a href="/">Home</a>
      {isAuthenticated ? (
        <>
          <span>Hi, {user?.givenName || user?.email}</span>
          <a href="/profile">Profile</a>
        </>
      ) : (
        <a href="/signin">Sign In</a>
      )}
    </nav>
  );
}
```

### Conditional Rendering by Role

```typescript
"use client";

import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Everyone sees this */}
      <section>Your Stats</section>

      {/* Only admins see this */}
      {isAdmin && (
        <section>
          <h2>Admin Controls</h2>
          <button>Manage Users</button>
        </section>
      )}

      {/* Check custom attribute */}
      {user?.attributes['custom:accountType'] === 'premium' && (
        <section>Premium Features</section>
      )}
    </div>
  );
}
```

### Filter Data by User

```typescript
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

export default function MyPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (user) {
      loadUserPosts();
    }
  }, [user]);

  async function loadUserPosts() {
    const { data } = await client.models.Post.list({
      filter: { userId: { eq: user!.userId } },
    });
    setPosts(data);
  }

  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

---

## 📋 Step 6: Access Custom Token Claims

If you're using pre-token generation trigger to add custom claims:

```typescript
import { fetchAuthSession } from 'aws-amplify/auth';

async function getCustomClaims() {
  const session = await fetchAuthSession();

  // Access custom claims from ID token
  const tenantId = session.tokens?.idToken?.payload['custom:tenantId'];
  const role = session.tokens?.idToken?.payload['custom:role'];
  const permissions = session.tokens?.idToken?.payload['custom:permissions'];

  return { tenantId, role, permissions };
}
```

---

## ⚠️ Common Pitfalls

1. **Using username instead of userId for database relations**
   - ❌ Wrong: `userId: user.username` (usernames can change)
   - ✅ Correct: `userId: user.userId` or `userId: attributes.sub`

2. **Not handling loading state**
   - Always show loading UI while checking auth status

3. **Forgetting custom: prefix**
   - ❌ Wrong: `attributes.accountType`
   - ✅ Correct: `attributes['custom:accountType']`

4. **Not refreshing user after attribute updates**
   - Call `refreshUser()` after updating user attributes

5. **Checking groups in wrong token**
   - Groups are in `accessToken.payload['cognito:groups']`
   - NOT in `idToken`

---

## 🔄 Update User Attributes

```typescript
import { updateUserAttributes } from 'aws-amplify/auth';

async function updateProfile(name: string) {
  try {
    await updateUserAttributes({
      userAttributes: {
        name,
        given_name: name.split(' ')[0],
        family_name: name.split(' ')[1] || '',
      },
    });

    // Refresh user context
    await refreshUser(); // If using AuthProvider
  } catch (error: any) {
    console.error('Update failed:', error);
  }
}
```

---

## ✅ Checklist

Before moving on, verify:
- [ ] Can get current user in components with `getCurrentUser()`
- [ ] Can access user attributes with `fetchUserAttributes()`
- [ ] Can check user groups with `fetchAuthSession()`
- [ ] Created AuthProvider context (if needed)
- [ ] Provider wraps app in layout.tsx
- [ ] `useAuth()` hook works in components
- [ ] Can access user server-side (Next.js)
- [ ] Loading states handled properly
- [ ] Using `userId`/`sub` for database relations (not username)
- [ ] Custom attributes accessed with `custom:` prefix

---

**You're done! You can now access user info anywhere in your app! 👤**
