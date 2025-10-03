# Google OAuth Setup for Amplify Gen 2

## Overview
This document explains how Google OAuth is configured in this Amplify Gen 2 application.

## Prerequisites
1. Google Cloud Console project with OAuth 2.0 credentials
2. AWS account with appropriate permissions for SSM Parameter Store
3. Amplify application deployed

## Configuration Steps

### 1. Google Cloud Console Setup
Add these authorized redirect URIs to your OAuth 2.0 Client ID:
- `https://08f9382977ca4e35aebc.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
- Your Cognito domain callback (check Amplify Console for exact URL)

### 2. AWS Systems Manager Parameter Store
The secrets are stored in SSM Parameter Store at:
- `/amplify/d2tlu989jnvdd3/main/GOOGLE_CLIENT_ID`
- `/amplify/d2tlu989jnvdd3/main/GOOGLE_CLIENT_SECRET`

To update secrets:
```bash
aws ssm put-parameter \
  --name "/amplify/d2tlu989jnvdd3/main/GOOGLE_CLIENT_ID" \
  --type "SecureString" \
  --value "your-client-id" \
  --region "us-east-1" \
  --overwrite
```

### 3. Amplify Auth Configuration
The auth configuration in `amplify/auth/resource.ts` uses the `secret()` function to reference SSM parameters:
```typescript
google: {
  clientId: secret('GOOGLE_CLIENT_ID'),
  clientSecret: secret('GOOGLE_CLIENT_SECRET'),
  // ...
}
```

### 4. Callback URLs
Make sure these URLs are configured:
- Local development: `http://localhost:3000/`
- Production: `https://www.template.chinchilla-ai.com/`

## Troubleshooting

### Secret Not Found Error
If you see "Failed to retrieve backend secret", ensure:
1. SSM parameters exist in the correct path
2. The Amplify service role has permission to read SSM parameters
3. The parameter names match exactly (case-sensitive)

### OAuth Redirect Error
If Google OAuth redirects fail:
1. Check the Cognito domain in AWS Console
2. Verify all redirect URIs are added in Google Cloud Console
3. Ensure the Amplify app has the correct callback URLs

## Testing
1. Run locally with `npm run dev`
2. Test OAuth flow at `/authentication/sign-in`
3. Verify redirect to dashboard after successful login