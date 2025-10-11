# Authentication Code Archive

This folder contains all authentication-related code that was removed from ChillTask.

## Date Archived
2025-10-11

## Reason for Removal
Authentication was completely disabled to make the application publicly accessible without requiring user sign-in.

## Archived Files

### Backend (Amplify)
- `amplify/auth/resource.ts` - Cognito authentication configuration
  - Email/password login
  - Google OAuth (commented out)
  - User attributes (email, givenName, familyName, profilePicture)
  - Admin groups

### Frontend Components
- `src/providers/AuthProvider.tsx` - React auth context provider
  - Sign in/sign up/sign out logic
  - Session management
  - OAuth redirect handling
  - Retry logic for Amplify v6 issues

- `src/utils/server-auth.ts` - Server-side auth utilities
  - `getServerUser()` - Get current authenticated user
  - `isAuthenticated()` - Check auth status
  - `getAuthSession()` - Get session tokens
  - `hasRole()` - Check user roles

- `src/components/ProtectedClientComponent.tsx` - Protected route wrapper
  - Client-side auth checks
  - Role-based access control
  - Protected fetch hook

- `src/components/Authentication/SignInForm.tsx` - Sign in/sign up form
  - Email/password authentication
  - Google OAuth button
  - Confirmation code handling

- `src/app/api/protected/user/route.ts` - Protected API routes
  - GET /api/protected/user - Get user info
  - POST /api/protected/user - Update user profile

## Changes Made to Active Codebase

### Backend
- `amplify/backend.ts` - Removed auth import and configuration

### Frontend
- `src/app/layout.tsx` - Removed AuthProvider wrapper
- `src/components/ConfigureAmplify.tsx` - Updated to work without auth
- `src/providers/LayoutProvider.tsx` - Removed auth page checks
- `src/components/Layout/TopNavbar/Profile.tsx` - Simplified to static profile

## To Restore Authentication

1. Copy files from `_archive/` back to their original locations
2. Uncomment auth imports in `amplify/backend.ts`
3. Uncomment AuthProvider in `src/app/layout.tsx`
4. Restore auth checks in `src/providers/LayoutProvider.tsx`
5. Update Profile component to use auth hooks
6. Deploy backend with `npx ampx sandbox` or push to Amplify
7. Auth will be restored with Cognito User Pool

## Notes
- The data schema already uses `publicApiKey` authorization, so it continues to work without auth
- All Lambda functions have appropriate IAM permissions and don't rely on Cognito
- The middleware (`src/middleware.ts`) had minimal auth logic, so no changes needed
