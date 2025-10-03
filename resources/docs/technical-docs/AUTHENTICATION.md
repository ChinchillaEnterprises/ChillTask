# Authentication Architecture

## Overview
This application uses a **3-layer authentication system** with AWS Amplify Gen 2 (Cognito) following AWS best practices for Next.js SSR applications.

## Three Layers of Protection

### Layer 1: Edge Middleware (Coarse-grained)
**File:** `src/middleware.ts`
- Runs at the edge before any page loads
- Prevents unauthenticated users from accessing protected routes
- Redirects to sign-in page if not authenticated
- Zero client-side flash of protected content

### Layer 2: Server Components (Authoritative)
**Files:** `src/utils/server-auth.ts`, `src/app/dashboard/page.tsx`
- Server-side authentication checks using `runWithAmplifyServerContext`
- Fetches user data securely on the server
- Authoritative source for role-based access control
- Protected API routes validate tokens server-side

### Layer 3: Client Provider (UX Enhancement)
**Files:** `src/providers/AuthProvider.tsx`, `src/components/ProtectedClientComponent.tsx`
- Maintains auth state for smooth client-side navigation
- Handles auth events (sign-in, sign-out, token refresh)
- Provides fallback protection for dynamic routes
- Enhanced UX with loading states and error handling

## Key Components

### Server-Side Utilities (`src/utils/server-auth.ts`)
- `getServerUser()` - Get authenticated user on server
- `isAuthenticated()` - Check auth status
- `getAuthSession()` - Get full session with tokens
- `hasRole()` - Check user roles/permissions

### Middleware (`src/middleware.ts`)
Protected paths:
- `/dashboard`
- `/admin`
- `/profile`
- `/apps`
- `/projects`
- `/settings`

Public paths:
- `/authentication/*`
- `/_next/*`
- `/api/auth/*`

### Protected API Routes
Example: `src/app/api/protected/user/route.ts`
```typescript
const user = await getServerUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Configuration Requirements

### 1. Install Dependencies
```bash
npm install @aws-amplify/adapter-nextjs
```

### 2. Configure Amplify with SSR
```typescript
// src/components/ConfigureAmplify.tsx
Amplify.configure(outputs, { ssr: true });
```

### 3. Deploy Amplify Backend
The auth system will use mock authentication in development until you deploy your Amplify backend and have `amplify_outputs.json`.

## Usage Examples

### Protected Server Component
```tsx
// app/admin/page.tsx
import { getServerUser } from '@/utils/server-auth';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const user = await getServerUser();
  if (!user) redirect('/authentication/sign-in');
  
  // Fetch admin data
  return <AdminDashboard user={user} />;
}
```

### Protected Client Component
```tsx
'use client';
import { ProtectedClientComponent } from '@/components/ProtectedClientComponent';

export default function Settings() {
  return (
    <ProtectedClientComponent requiredRole="admin">
      <SettingsPanel />
    </ProtectedClientComponent>
  );
}
```

### Protected API Route
```tsx
// app/api/admin/route.ts
import { hasRole } from '@/utils/server-auth';

export async function GET() {
  if (!await hasRole('admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Return admin data
}
```

## Authentication Flow

1. **User visits protected route** → Middleware checks auth at edge
2. **If not authenticated** → Redirect to `/authentication/sign-in`
3. **If authenticated** → Continue to server component
4. **Server component** → Verifies auth and fetches user data
5. **Client receives page** → AuthProvider maintains session state
6. **API calls** → Include auth cookies automatically with SSR mode

## Security Benefits

- **No client-side auth flash** - Middleware blocks at edge
- **Server-side data protection** - Auth verified before data fetch
- **Automatic token management** - Cookies handled by Amplify SSR
- **Role-based access control** - Check permissions server-side
- **Session refresh** - Automatic token renewal via Hub events

## Development vs Production

### Development (No Amplify Backend)
- Uses mock authentication via localStorage
- Allows testing without AWS resources
- AuthProvider falls back to mock mode

### Production (With Amplify Backend)
- Real Cognito authentication
- SSR with secure httpOnly cookies
- Full token validation at all layers
- Support for Google OAuth and email/password

## Troubleshooting

### Common Issues

1. **"Amplify outputs not found"**
   - Normal in development before deployment
   - System uses mock auth automatically

2. **Middleware not blocking routes**
   - Check middleware matcher config
   - Verify path is in PROTECTED_PATTERNS

3. **Session errors after sign-in**
   - Known Amplify v6 issue with email/password
   - Recommend using Google OAuth
   - System has retry logic as workaround

## Next Steps

1. Deploy your Amplify backend to enable real authentication
2. Configure Cognito user pools and identity pools
3. Set up custom user attributes for roles
4. Implement role-based middleware rules
5. Add MFA for enhanced security