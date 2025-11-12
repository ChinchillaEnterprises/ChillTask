# 🚀 Quick Start Guide - Chill Amplify Template

**Complete step-by-step guide to get your development environment running with Google OAuth.**

This is the detailed version of the setup process. For a quick overview, see the [README](../../README.md).

---

## 📋 Prerequisites

Before you begin, make sure you have:

### Required Access
- ✅ **AWS Account** with access to:
  - AWS Secrets Manager (to retrieve shared credentials)
  - AWS Amplify (sandbox will create resources)
- ✅ **Google Cloud Console** access with `dev@chinchilla-ai.com`
  - Needed to add your Cognito domain to OAuth redirect URIs
  - Ask your team lead if you don't have access

### Required Software
- ✅ **Node.js 18+** installed
- ✅ **npm** (comes with Node.js)
- ✅ **Git** (to clone the repo)
- ✅ **AWS CLI** configured (optional but recommended)

### Knowledge Prerequisites
- Basic understanding of OAuth flows (helpful but not required)
- Basic command line usage
- Basic understanding of environment variables and secrets

---

## 🎯 Overview: What You'll Do

Here's the big picture before we dive into details:

1. **Clone the repo** and install dependencies
2. **Retrieve shared Google OAuth credentials** from AWS Secrets Manager
3. **Set sandbox secrets** using Amplify CLI (interactive)
4. **Deploy your sandbox** to create your personal AWS environment
5. **Update Google Cloud Console** with your Cognito domain
6. **Test the app** to verify OAuth is working

**Total time:** 15-20 minutes (including AWS deployment wait time)

---

## Step 1: Clone and Install

### 1.1 Clone the Repository

```bash
git clone https://github.com/your-org/chill-amplify-template.git
cd chill-amplify-template
```

### 1.2 Install Dependencies

```bash
npm install
```

**What this does:**
- Installs all Node.js packages
- Sets up Next.js, MUI, Amplify SDK, and other dependencies

**Expected output:**
```
added 1247 packages in 45s
```

✅ **Checkpoint:** You should see `node_modules/` folder created

---

## Step 2: Retrieve Shared Google OAuth Credentials

Your organization has already created Google OAuth credentials. You'll retrieve them from AWS Secrets Manager.

### 2.1 Access AWS Secrets Manager

**Option A: Via AWS Console (Easiest)**

1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **Secrets Manager** (search in top search bar)
3. Set your region to **us-east-1** (or your org's region)
4. Search for: `google-sso-development`
5. Click on the secret name
6. Click **"Retrieve secret value"**
7. You'll see:
   ```json
   {
     "GOOGLE_CLIENT_ID": "123456789-abc.apps.googleusercontent.com",
     "GOOGLE_CLIENT_SECRET": "GOCSPX-xyz123..."
   }
   ```
8. **Copy both values** - you'll need them in the next step

**Option B: Via AWS CLI (Advanced)**

```bash
aws secretsmanager get-secret-value \
  --secret-id google-sso-development \
  --region us-east-1 \
  --query SecretString \
  --output text | jq
```

### 2.2 What These Credentials Are

- **GOOGLE_CLIENT_ID**: Identifies your organization's app to Google
- **GOOGLE_CLIENT_SECRET**: Proves your app is authorized
- **Shared by team**: Everyone uses the same credentials for development
- **Already configured**: No need to create your own Google Cloud project

---

## Step 3: Set Sandbox Secrets

Now you'll configure your local Amplify sandbox with the Google OAuth credentials.

### 3.1 Set GOOGLE_CLIENT_ID

Run this command:

```bash
npx ampx sandbox secret set GOOGLE_CLIENT_ID
```

**What you'll see:**
```
? Enter secret value: █
```

**What to do:**
- Paste the `GOOGLE_CLIENT_ID` you copied from Secrets Manager
- Press Enter

**Expected output:**
```
✓ Secret set successfully
```

### 3.2 Set GOOGLE_CLIENT_SECRET

Run this command:

```bash
npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
```

**What you'll see:**
```
? Enter secret value: █
```

**What to do:**
- Paste the `GOOGLE_CLIENT_SECRET` you copied from Secrets Manager
- Press Enter

**Expected output:**
```
✓ Secret set successfully
```

### 🤖 AI Automation (Optional)

If using Claude Code with Amplify MCP tools, this entire process can be automated:
1. AI retrieves secrets from AWS Secrets Manager
2. AI sets sandbox secrets using `amplify_set_sandbox_secret`

No manual copying/pasting needed!

### ⚠️ Important Notes

- **Interactive prompts**: Manual setup requires interactive input (copy/paste from Step 2)
- **One-time setup**: Once set, secrets persist across sandbox sessions
- **Local to your machine**: Each developer sets their own sandbox secrets
- **Not in git**: Secrets are stored locally in AWS, never committed to repo

✅ **Checkpoint:** You should see success messages for both secrets

---

## Step 4: Deploy Your Sandbox

Now deploy your personal Amplify sandbox environment using the MCP dev-logger tool for better monitoring.

### 4.1 Start Sandbox with Dev Logger (Recommended)

If you're using Claude Code with MCP tools, use the dev-logger tool:

```typescript
// Claude Code can run this for you:
dev_start_sandbox()
```

**What this does:**
- Checks for any existing sandbox in this directory
- Kills old sandbox if found (prevents stuck processes)
- Starts fresh `npx ampx sandbox --stream-function-logs`
- Streams logs to `resources/sandbox/sandbox.log`
- Multi-project safe (only affects this directory)

**OR manually:**

```bash
npx ampx sandbox --stream-function-logs
```

**What happens:**
1. Amplify validates your secrets
2. Creates CloudFormation stack in AWS
3. Deploys Cognito User Pool (for authentication)
4. Deploys AppSync API (for GraphQL)
5. Deploys DynamoDB tables (for data)
6. Configures Google OAuth integration
7. Generates `amplify_outputs.json` file
8. Streams Lambda function logs in real-time

**Expected output:**
```
✓ Building Amplify backend...
✓ Deploying sandbox...
✓ Successfully deployed sandbox
[Sandbox] Watching for changes...
```

**How long?**
- **First time**: 2-3 minutes (creating all resources)
- **Subsequent deploys**: 30-60 seconds (updating existing resources)

**Benefits of dev-logger:**
- Real-time Lambda function logs (when `--stream-function-logs` is used)
- Multi-project safety (each project has isolated sandbox process)
- Easy log access with `dev_tail_sandbox_logs()`
- Clean process management with `dev_stop_sandbox()`

### 4.2 Verify amplify_outputs.json Created

Check that the file was generated:

```bash
ls -la amplify_outputs.json
```

**Expected output:**
```
-rw-r--r--  1 user  staff  1373 Oct 12 14:38 amplify_outputs.json
```

✅ **Checkpoint:** `amplify_outputs.json` exists in your project root

---

## Step 5: Get Your Cognito Domain

Your sandbox deployment created a unique Cognito domain. You need to find it.

### 5.1 Open amplify_outputs.json

```bash
cat amplify_outputs.json | grep -A 5 "oauth"
```

**You'll see something like:**
```json
"oauth": {
  "domain": "a1b2c3d4e5f6.auth.us-east-1.amazoncognito.com",
  "scope": ["email", "profile", "openid"],
  "redirectSignIn": ["http://localhost:3000"],
  "redirectSignOut": ["http://localhost:3000"],
  "responseType": "code"
}
```

### 5.2 Copy Your Cognito Domain

**Copy this value:**
```
a1b2c3d4e5f6.auth.us-east-1.amazoncognito.com
```

**Note:** Your domain will be different - each sandbox gets a unique domain.

✅ **Checkpoint:** You have your Cognito domain copied

---

## Step 6: Update Google Cloud Console

Now you need to tell Google about your Cognito domain so OAuth redirects work.

### 6.1 Log In to Google Cloud Console

1. Go to: https://console.cloud.google.com/
2. Sign in with: `dev@chinchilla-ai.com`
3. Make sure you're in the correct project

### 6.2 Navigate to Credentials

1. Click the hamburger menu (☰) in top-left
2. Go to: **APIs & Services** → **Credentials**
3. Find the **OAuth 2.0 Client ID** for your organization
4. Click on it to open the details

### 6.3 Add Your Redirect URI

1. Scroll to **Authorized redirect URIs** section
2. Click **"+ ADD URI"**
3. Paste this (replace with YOUR Cognito domain):
   ```
   https://[YOUR-COGNITO-DOMAIN].auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```

   **Example:**
   ```
   https://a1b2c3d4e5f6.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```

4. Click **"Save"** at the bottom

**Important:**
- Must be **HTTPS** (not HTTP)
- Must end with `/oauth2/idpresponse`
- Must match your Cognito domain exactly
- Region must match (e.g., `us-east-1`)

### 6.4 Why This Step Is Needed

- **Google security requirement**: Google only redirects to pre-approved URLs
- **Prevents attacks**: Stops malicious apps from hijacking OAuth flow
- **Per-developer setup**: Each developer's sandbox has a unique domain
- **One-time**: Once added, persists until you delete your sandbox

✅ **Checkpoint:** Your Cognito domain is added to Google Cloud Console

---

## Step 7: Start the Development Server

Now you're ready to run the app!

### 7.1 Start Next.js Dev Server

```bash
npm run dev
```

**Expected output:**
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Ready in 3.2s
```

### 7.2 Open the App

Visit: http://localhost:3000

**You should see:**
- Clean dashboard homepage
- Sidebar navigation with "Home" and "News"
- Top navbar with search, notifications, profile
- Professional MUI-styled interface

✅ **Checkpoint:** App loads without errors

---

## Step 8: Test Google OAuth

Now let's verify the complete OAuth flow works.

### 8.1 Navigate to Sign In

Click **"Sign In"** or go to: http://localhost:3000/authentication/sign-in

### 8.2 Click "Sign in with Google"

You should see the Google OAuth button. Click it.

**What happens:**
1. Browser redirects to Google authentication page
2. You're prompted to sign in with your Google account
3. Google asks for permission to share email/profile
4. After approval, redirects back to your app
5. You're automatically signed in!

### 8.3 Verify You're Signed In

**Check these indicators:**
- Top navbar shows your profile picture/initial
- You're redirected to the home dashboard
- Protected pages are now accessible

**In browser console:**
```javascript
// Check localStorage for tokens
Object.keys(localStorage).filter(k => k.includes('Cognito'))
```

**You should see:**
```
[
  "CognitoIdentityServiceProvider.xxxxx.LastAuthUser",
  "CognitoIdentityServiceProvider.xxxxx.idToken",
  "CognitoIdentityServiceProvider.xxxxx.accessToken",
  "CognitoIdentityServiceProvider.xxxxx.refreshToken"
]
```

✅ **Checkpoint:** Google OAuth is working!

---

## 🎉 Success! What's Next?

You're all set up! Here's what you can do now:

### Build Features
- Add new pages to the app
- Create components using MUI
- Build GraphQL queries and mutations
- Add Lambda functions

### Learn the Architecture
- Read: `resources/handbook/auth/HOW_AUTH_WORKS.md`
- Read: `resources/handbook/auth/AUTH_PATTERNS.md`
- Explore the hidden component arsenal

### Common Next Steps
1. **Add a new page**: See README for instructions
2. **Set up data models**: Use Amplify Data (GraphQL + DynamoDB)
3. **Add protected routes**: Use middleware or ProtectedRoute component
4. **Customize the theme**: Edit MUI theme in `src/theme.ts`

---

## 🐛 Troubleshooting

### Issue 1: "Secret 'GOOGLE_CLIENT_ID' not found"

**Symptom:** Sandbox fails with secret error

**Cause:** You didn't set sandbox secrets in Step 3

**Solution:**
```bash
npx ampx sandbox secret set GOOGLE_CLIENT_ID
npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
```

---

### Issue 2: OAuth Redirect URI Mismatch

**Symptom:** Google shows error: "redirect_uri_mismatch"

**Cause:** Your Cognito domain isn't added to Google Cloud Console

**Solution:**
1. Get your Cognito domain from `amplify_outputs.json`
2. Add it to Google Cloud Console (Step 6)
3. Make sure it's **exactly** this format:
   ```
   https://[domain].auth.[region].amazoncognito.com/oauth2/idpresponse
   ```

**Common mistakes:**
- ❌ Using HTTP instead of HTTPS
- ❌ Missing `/oauth2/idpresponse` at the end
- ❌ Typo in the domain
- ❌ Wrong region

---

### Issue 3: amplify_outputs.json Not Generated

**Symptom:** File doesn't exist after running sandbox

**Cause:** Sandbox deployment failed

**Solution:**
1. Check terminal output for errors
2. Look for CloudFormation errors
3. Verify AWS credentials are configured
4. Try deleting and redeploying:
   ```bash
   npx ampx sandbox delete
   npx ampx sandbox
   ```

---

### Issue 4: Can't Access AWS Secrets Manager

**Symptom:** "Access Denied" when trying to retrieve secrets

**Cause:** Your AWS IAM user doesn't have Secrets Manager permissions

**Solution:**
- Ask your team lead to grant you `secretsmanager:GetSecretValue` permission
- Or: They can send you the credentials directly (less secure)

---

### Issue 5: OAuth Works But UI Doesn't Update

**Symptom:** Sign in works, but button still shows "Sign In"

**Cause:** Hub events not configured properly (rare in this template)

**Debug:**
1. Open browser console
2. Check for Hub event logs: `[Auth] Hub Event: signInWithRedirect`
3. If missing, check `src/providers/AuthProvider.tsx` has:
   ```typescript
   import "aws-amplify/auth/enable-oauth-listener";
   ```

**Solution:** This should already be in the template. If missing, add it.

---

### Issue 6: Sandbox Won't Delete

**Symptom:** `npx ampx sandbox delete` hangs or fails

**Cause:** CloudFormation stack has dependencies

**Solution:**
```bash
# Force delete via AWS Console
# Go to CloudFormation → Find your stack → Delete (force)
```

---

### Issue 7: "Module not found: amplify_outputs.json"

**Symptom:** Import error when running app

**Cause:** Sandbox not deployed yet

**Solution:**
```bash
npx ampx sandbox
```

Make sure `amplify_outputs.json` exists in project root.

---

## 📊 Verification Checklist

Use this checklist to verify everything is working:

- [ ] `node_modules/` folder exists (npm install worked)
- [ ] Retrieved Google credentials from AWS Secrets Manager
- [ ] Set `GOOGLE_CLIENT_ID` sandbox secret
- [ ] Set `GOOGLE_CLIENT_SECRET` sandbox secret
- [ ] Ran `npx ampx sandbox` successfully
- [ ] `amplify_outputs.json` exists in project root
- [ ] Found Cognito domain in `amplify_outputs.json`
- [ ] Added Cognito domain to Google Cloud Console
- [ ] `npm run dev` starts without errors
- [ ] App loads at http://localhost:3000
- [ ] Can click "Sign in with Google"
- [ ] Redirects to Google authentication
- [ ] Successfully redirects back to app after auth
- [ ] UI updates to show authenticated state
- [ ] Tokens visible in localStorage (browser console)

**All checked?** 🎉 You're fully set up!

---

## 🚀 Production Deployment Notes

When you're ready to deploy to production:

### Secrets Must Be Set Differently

**For sandbox (what you just did):**
```bash
npx ampx sandbox secret set GOOGLE_CLIENT_ID
```

**For production (manual UI step):**
1. Go to AWS Amplify Console
2. Select your app
3. Go to: Environment variables & secrets
4. Manually add secrets:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

**Critical differences:**
- ❌ **Cannot use AWS CLI** for Amplify app secrets
- ❌ **Cannot use SSM Parameter Store**
- ✅ **Must use Amplify Console UI** (only way)

**Why?** Amplify encrypts and manages secrets differently in production than in sandbox.

### Production Cognito Domain

Your production deployment will have a **different** Cognito domain than your sandbox:
- **Sandbox domain**: `a1b2c3d4e5f6.auth.us-east-1.amazoncognito.com`
- **Production domain**: `z9y8x7w6v5u4.auth.us-east-1.amazoncognito.com`

You must add the production domain to Google Cloud Console too!

---

## 📚 Additional Resources

### In This Handbook
- [How Authentication Works](./auth/HOW_AUTH_WORKS.md) - Deep dive into OAuth flow
- [Auth Patterns](./auth/AUTH_PATTERNS.md) - Choose the right auth setup
- [Google OAuth Setup](./auth/GOOGLE_OAUTH_SETUP.md) - Detailed OAuth config
- [Authorization Explained](./functions/AUTHORIZATION_EXPLAINED.md) - Lambda permissions

### External Resources
- [Amplify Gen 2 Documentation](https://docs.amplify.aws/gen2/)
- [Cognito User Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Next.js App Router](https://nextjs.org/docs/app)

---

## 💬 Getting Help

**Stuck? Here's how to get help:**

1. **Check troubleshooting section above** - Most common issues covered
2. **Check browser console** - Look for error messages
3. **Check terminal output** - Sandbox deployment errors show here
4. **Check CloudFormation** - AWS Console → CloudFormation → Your stack
5. **Ask your team** - Share error messages and what you tried

**When asking for help, provide:**
- What step you're on
- Exact error message
- What you've tried
- Terminal output (if relevant)
- Browser console errors (if relevant)

---

## 🎯 Summary

You just completed:
- ✅ Cloned and installed the template
- ✅ Retrieved shared Google OAuth credentials
- ✅ Configured sandbox secrets
- ✅ Deployed your personal AWS sandbox
- ✅ Updated Google Cloud Console
- ✅ Tested the complete OAuth flow

**Time spent:** ~15-20 minutes

**What you have now:**
- Fully functional Next.js + Amplify app
- Working Google OAuth authentication
- Personal AWS sandbox environment
- Foundation to build amazing features

**Welcome to the Chill Amplify Template!** 🚀

Now go build something awesome! 🎉
