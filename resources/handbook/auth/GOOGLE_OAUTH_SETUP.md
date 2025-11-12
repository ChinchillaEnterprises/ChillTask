# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth for your Amplify app.

## Prerequisites

- An AWS account with Amplify sandbox running
- A Google Cloud account
- The Amplify CLI installed (`npm install -g @aws-amplify/cli`)

## Step 1: Create Google OAuth Credentials

### 1.1 Go to Google Cloud Console

Visit: https://console.cloud.google.com/

### 1.2 Create or Select a Project

- Click the project dropdown at the top
- Either select an existing project or create a new one

### 1.3 Enable Google+ API

1. Go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click "Enable"

### 1.4 Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen first:
   - User Type: External (for testing) or Internal (for workspace)
   - App name: Your app name (e.g., "Chill App")
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add `email`, `profile`, `openid`
   - Test users: Add your email for testing

4. After consent screen is configured, create OAuth client ID:
   - Application type: **Web application**
   - Name: "Chill App Web Client" (or your app name)

### 1.5 Add Authorized Redirect URIs

Add these redirect URIs (you'll get the actual Cognito domain from Step 2):

**For local development:**
```
https://YOUR_COGNITO_DOMAIN.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

**For production:**
```
https://YOUR_COGNITO_DOMAIN.auth.YOUR_REGION.amazoncognito.com/oauth2/idpresponse
```

> **Note:** You'll get your actual Cognito domain after deploying the Amplify backend in Step 2.

### 1.6 Save Your Credentials

Copy:
- **Client ID** (looks like: `123456789-abc123xyz.apps.googleusercontent.com`)
- **Client Secret** (looks like: `GOCSPX-abc123xyz...`)

**Keep these secure!** Never commit them to Git.

---

## Step 2: Configure Amplify Backend

### 2.1 Create `.env` File

Create a `.env` file in your project root:

```bash
# .env (DO NOT commit this file!)
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

### 2.2 Add to `.gitignore`

Make sure `.env` is in your `.gitignore`:

```
# .gitignore
.env
.env.local
.env.*.local
```

### 2.3 Deploy Amplify Backend

Run the sandbox to deploy your auth configuration:

```bash
npx ampx sandbox
```

This will:
1. Read the environment variables from `.env`
2. Configure Cognito with Google OAuth
3. Generate `amplify_outputs.json` with your Cognito configuration

### 2.4 Get Your Cognito Domain

After deployment completes, check the Amplify outputs:

```bash
cat amplify_outputs.json | grep -A 5 oauth
```

You'll see something like:
```json
"oauth": {
  "domain": "5b3520e24b27ecc1f44d.auth.us-east-1.amazoncognito.com",
  ...
}
```

Copy this domain.

---

## Step 3: Update Google OAuth Redirect URIs

### 3.1 Go Back to Google Cloud Console

1. "APIs & Services" → "Credentials"
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add:

```
https://YOUR_COGNITO_DOMAIN.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

Replace `YOUR_COGNITO_DOMAIN` with the domain from Step 2.4.

**Example:**
```
https://5b3520e24b27ecc1f44d.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

4. Click "Save"

---

## Step 4: Configure Google as Identity Provider in Cognito

You need to manually add Google as an identity provider in the AWS Cognito console.

### 4.1 Go to AWS Cognito Console

Visit: https://console.aws.amazon.com/cognito/

### 4.2 Find Your User Pool

1. Select your region (e.g., us-east-1)
2. Click on your user pool (it will have a name like `amplify-backend-...`)

### 4.3 Add Google Identity Provider

1. Go to "Sign-in experience" tab
2. Scroll to "Federated identity provider sign-in"
3. Click "Add identity provider"
4. Select "Google"
5. Enter:
   - **Client ID**: Your Google Client ID
   - **Client Secret**: Your Google Client Secret
   - **Authorized scopes**: `email profile openid`
6. Under "Attribute mapping":
   - `email` → `email`
   - `given_name` → `given_name`
   - `family_name` → `family_name`
   - `picture` → `picture`
7. Click "Add identity provider"

### 4.4 Configure App Client

1. Go to "App integration" tab
2. Click on your app client
3. Under "Hosted UI settings", click "Edit"
4. Under "Identity providers", check **Google**
5. Click "Save changes"

---

## Step 5: Test the Integration

### 5.1 Start Your App

```bash
npm run dev
```

### 5.2 Test Google Sign-In

1. Visit `http://localhost:3000/authentication/sign-in`
2. Click "Sign in with Google"
3. You should be redirected to Google's login page
4. After signing in, you should be redirected back to your app

### 5.3 Verify Authentication

Check if you're authenticated by opening the browser console:

```javascript
// In browser console
import { fetchAuthSession } from 'aws-amplify/auth';
const session = await fetchAuthSession();
console.log(session);
```

You should see tokens in the response.

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Problem:** The redirect URI in Google doesn't match Cognito's callback URL.

**Solution:**
1. Check your Cognito domain in `amplify_outputs.json`
2. Make sure the redirect URI in Google Cloud Console exactly matches:
   ```
   https://YOUR_COGNITO_DOMAIN.auth.REGION.amazoncognito.com/oauth2/idpresponse
   ```

### Error: "Identity provider not found"

**Problem:** Google is not configured as an identity provider in Cognito.

**Solution:**
- Follow Step 4 carefully to add Google in the Cognito console
- Make sure you enabled Google in the App Client settings

### Error: "Invalid client credentials"

**Problem:** The Client ID or Secret is incorrect.

**Solution:**
1. Double-check your `.env` file has the correct values
2. Make sure there are no extra spaces or quotes
3. Restart the Amplify sandbox after changing `.env`

### Sandbox not picking up environment variables

**Solution:**
```bash
# Stop the sandbox
# Update .env file
# Start sandbox again
npx ampx sandbox
```

---

## Production Deployment

### For Production Apps:

1. **Add production redirect URIs** in Google Cloud Console:
   ```
   https://YOUR_COGNITO_DOMAIN.auth.REGION.amazoncognito.com/oauth2/idpresponse
   ```

2. **Set environment variables** in Amplify Console:
   - Go to Amplify Console
   - Select your app
   - Environment variables → Manage variables
   - Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

3. **Update OAuth consent screen** for production:
   - Change from "Testing" to "In production"
   - This removes the user limit

---

## Security Best Practices

1. ✅ **Never commit `.env` files** to Git
2. ✅ **Use different credentials** for dev/staging/prod environments
3. ✅ **Rotate secrets regularly** (every 90 days)
4. ✅ **Restrict OAuth scopes** to only what you need
5. ✅ **Monitor OAuth usage** in Google Cloud Console
6. ✅ **Use environment-specific redirect URIs**

---

## Next Steps

Now that Google OAuth is configured:

1. Test the sign-in flow thoroughly
2. Implement sign-out functionality (see `resources/handbook/frontend/auth-flows.tsx`)
3. Add user profile display
4. Consider adding email/password authentication as a backup
5. Review the security checklist in `resources/handbook/auth/SECURITY_CHECKLIST.md`

---

## Additional Resources

- [Amplify Auth Documentation](https://docs.amplify.aws/gen2/build-a-backend/auth/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Cognito Federated Identities](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation.html)
- [Pattern 2: Social Authentication](resources/handbook/auth/AUTH_PATTERNS.md#pattern-2-social-authentication)
