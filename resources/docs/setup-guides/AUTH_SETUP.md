# Chill Amplify Template - Authentication Setup

## Overview

This template implements AWS Amplify Gen 2 authentication with support for:
- Email/Password authentication
- Google SSO (Single Sign-On)
- Mock authentication for development
- Shared backend strategy for organizational use

## Architecture

The authentication system uses:
1. **AuthProvider** - React Context provider that manages auth state
2. **Amplify Auth** - AWS Cognito for user management
3. **Mock Auth** - Fallback for development without AWS credentials

## Setup Instructions

### 1. Configure Google OAuth

First, set up Google OAuth credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/`
   - Your production URL

### 2. Set Amplify Secrets

Add your Google OAuth credentials to Amplify:

```bash
npx ampx sandbox secret set GOOGLE_CLIENT_ID
npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
```

### 3. Deploy to Amplify

Deploy the app to generate `amplify_outputs.json`:

```bash
# Start the sandbox for development
npx ampx sandbox

# Or deploy to production
npx ampx pipeline-deploy --branch main --app-id YOUR_APP_ID
```

### 4. Shared Backend Strategy

This template uses a shared backend approach:
- The `amplify_outputs.json` file IS committed to the repository
- All users/students connect to the same Cognito User Pool
- The template owner collects all user emails in their Cognito

**Important**: This is intentional for organizational/educational use cases.

## How It Works

### Development Mode (No amplify_outputs.json)

When `amplify_outputs.json` doesn't exist:
- Uses mock authentication with localStorage
- Allows testing without AWS setup
- Automatically switches to real auth when deployed

### Production Mode (With amplify_outputs.json)

When `amplify_outputs.json` exists:
- Uses real AWS Cognito authentication
- Supports Google SSO
- Manages sessions with JWT tokens

## File Structure

```
src/
├── providers/
│   └── AuthProvider.tsx       # Auth context and logic
├── components/
│   ├── ConfigureAmplify.tsx   # Amplify configuration
│   └── Authentication/
│       └── SignInForm.tsx     # Sign in UI
└── app/
    └── layout.tsx             # App layout with providers

amplify/
└── auth/
    └── resource.ts            # Auth backend configuration
```

## Usage in Components

### Check Authentication Status

```typescript
import { useAuth } from '@/providers/AuthProvider';

function MyComponent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please sign in</div>;
  
  return <div>Welcome {user?.name}!</div>;
}
```

### Sign In/Out

```typescript
import { useAuth } from '@/providers/AuthProvider';

function AuthButtons() {
  const { signIn, signOut } = useAuth();
  
  return (
    <>
      <button onClick={() => signIn('Google')}>
        Sign in with Google
      </button>
      <button onClick={() => signOut()}>
        Sign out
      </button>
    </>
  );
}
```

## Customization

### Add More OAuth Providers

Edit `amplify/auth/resource.ts` to add providers:

```typescript
externalProviders: {
  google: { /* ... */ },
  facebook: {
    clientId: secret('FACEBOOK_CLIENT_ID'),
    clientSecret: secret('FACEBOOK_CLIENT_SECRET'),
  },
  // Add more providers here
}
```

### Customize User Attributes

Add custom attributes in `amplify/auth/resource.ts`:

```typescript
userAttributes: {
  email: { required: true, mutable: true },
  phoneNumber: { required: false, mutable: true },
  // Add custom attributes
  'custom:organization': {
    dataType: 'String',
    mutable: true,
  }
}
```

## Troubleshooting

### "Amplify outputs not found" in console
- This is normal in development
- The app uses mock auth until deployed

### Google sign-in not working
- Verify Google OAuth credentials are set
- Check redirect URIs match your domain
- Ensure secrets are set with `ampx sandbox secret set`

### Users can't sign in after deployment
- Check AWS Cognito User Pool settings
- Verify callback URLs in `amplify/auth/resource.ts`
- Check browser console for specific errors

## Security Notes

1. **Never commit secrets** - Use `ampx sandbox secret` for sensitive data
2. **Review callback URLs** - Ensure they match your domains exactly
3. **Enable MFA** - Consider adding multi-factor authentication for production
4. **Monitor usage** - Check AWS Cognito metrics regularly

## Support

For issues or questions:
- Check the [Amplify Gen 2 Docs](https://docs.amplify.aws/gen2)
- Review the [Authentication Guide](https://docs.amplify.aws/gen2/build-a-backend/auth)
- Contact your organization's admin for shared backend access