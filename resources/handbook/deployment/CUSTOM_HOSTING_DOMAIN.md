# Custom Hosting Domain Setup

**How to configure custom subdomains for Amplify Hosting using the multi-tenant pattern.**

---

## Overview

Every client app uses a custom subdomain under `chinchilla-ai.com`:
- **Pattern:** `{client}.chinchilla-ai.com`
- **Examples:**
  - `sony.chinchilla-ai.com`
  - `apple.chinchilla-ai.com`
  - `nike.chinchilla-ai.com`

This guide shows how to **automate** subdomain setup instead of manually clicking through the AWS Console.

---

## Prerequisites

1. **Domain registered in Route 53:** `chinchilla-ai.com`
2. **Amplify app deployed** (via `npx ampx sandbox` or production pipeline)
3. **App ID available** (get from Amplify Console or CLI)

---

## The Multi-Tenant Pattern

### Standard Naming Convention

For each client project:

| Resource | Domain |
|----------|--------|
| **Frontend (Amplify Hosting)** | `{client}.chinchilla-ai.com` |
| **Auth (Cognito)** | `auth.{client}.chinchilla-ai.com` ⚠️ See [pending/COGNITO_CUSTOM_DOMAIN.md](../pending/COGNITO_CUSTOM_DOMAIN.md) |

**Example for client "Sony":**
- Frontend: `sony.chinchilla-ai.com`
- Auth: `auth.sony.chinchilla-ai.com` (future implementation)

---

## Method 1: Using AWS CLI (Recommended)

### Step 1: Get Your App ID

After deploying your Amplify app:

```bash
# List all Amplify apps
aws amplify list-apps

# Or get just the app ID
APP_ID=$(aws amplify list-apps --query 'apps[0].appId' --output text)
echo $APP_ID
```

### Step 2: Create Domain Association

```bash
aws amplify create-domain-association \
  --app-id $APP_ID \
  --domain-name sony.chinchilla-ai.com \
  --sub-domain-settings prefix=,branchName=main \
  --enable-auto-sub-domain
```

**Parameters explained:**
- `--app-id`: Your Amplify app ID (from Step 1)
- `--domain-name`: The custom domain (e.g., `sony.chinchilla-ai.com`)
- `--sub-domain-settings prefix=,branchName=main`: Maps the root domain to the `main` branch
- `--enable-auto-sub-domain`: Automatically creates subdomains for new branches (optional)

### Step 3: Wait for DNS Propagation

The command returns immediately, but DNS propagation takes time:
- **Typical:** 5-15 minutes
- **Maximum:** 48 hours (rare)

Check status:
```bash
aws amplify get-domain-association \
  --app-id $APP_ID \
  --domain-name sony.chinchilla-ai.com
```

---

## Method 2: Using MCP Tool (Automated)

⚠️ **Coming Soon** - An MCP tool will be added to automate this process.

**Planned usage:**
```typescript
// AI assistant calls this tool
mcp__amplify__amplify_create_domain_association({
  appId: 'xyz123',
  domainName: 'sony.chinchilla-ai.com',
  branchName: 'main'
})
```

**Benefits:**
- No need to manually run CLI commands
- AI can handle the entire setup workflow
- Integrates with other Amplify MCP tools

---

## Method 3: Manual (AWS Console)

If you prefer the GUI:

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Select your app
3. Click "Domain management" in left sidebar
4. Click "Add domain"
5. Enter: `sony.chinchilla-ai.com`
6. Configure branch: `main` → `sony.chinchilla-ai.com` (root)
7. Click "Save"

**Downside:** Must repeat for every client manually.

---

## Complete Client Setup Workflow

When starting a new client project:

### 1. Update Client Name

```typescript
// amplify/client-config.ts (create this file)
export const CLIENT_CONFIG = {
  clientName: 'sony', // ← Change this
  baseDomain: 'chinchilla-ai.com',

  // Auto-generated
  get frontendDomain() {
    return `${this.clientName}.${this.baseDomain}`;
  },
  get authDomain() {
    return `auth.${this.clientName}.${this.baseDomain}`;
  }
};
```

### 2. Deploy to Amplify

```bash
# For sandbox
npx ampx sandbox

# For production (push to main branch)
git push origin main
```

### 3. Get App ID

```bash
APP_ID=$(aws amplify list-apps --query 'apps[0].appId' --output text)
```

### 4. Configure Custom Domain

```bash
aws amplify create-domain-association \
  --app-id $APP_ID \
  --domain-name sony.chinchilla-ai.com \
  --sub-domain-settings prefix=,branchName=main
```

### 5. Verify Setup

Visit: `https://sony.chinchilla-ai.com`

---

## Automation Script

Save this as `scripts/setup-client-domain.sh`:

```bash
#!/bin/bash

# Usage: ./scripts/setup-client-domain.sh sony

CLIENT_NAME=$1

if [ -z "$CLIENT_NAME" ]; then
  echo "Usage: $0 <client-name>"
  echo "Example: $0 sony"
  exit 1
fi

# Get app ID
APP_ID=$(aws amplify list-apps --query 'apps[0].appId' --output text)

if [ -z "$APP_ID" ]; then
  echo "Error: No Amplify app found. Deploy your app first."
  exit 1
fi

# Create domain association
echo "Setting up domain: ${CLIENT_NAME}.chinchilla-ai.com"

aws amplify create-domain-association \
  --app-id $APP_ID \
  --domain-name ${CLIENT_NAME}.chinchilla-ai.com \
  --sub-domain-settings prefix=,branchName=main

echo "✅ Domain association created!"
echo "🕐 Waiting for DNS propagation (5-15 minutes)..."
echo "🔗 Your app will be available at: https://${CLIENT_NAME}.chinchilla-ai.com"
```

**Usage:**
```bash
chmod +x scripts/setup-client-domain.sh
./scripts/setup-client-domain.sh sony
```

---

## Troubleshooting

### Error: "Domain already exists"

**Problem:** The domain is already associated with this or another app.

**Solution:**
```bash
# Remove existing association
aws amplify delete-domain-association \
  --app-id $APP_ID \
  --domain-name sony.chinchilla-ai.com

# Try again
aws amplify create-domain-association ...
```

### Error: "Domain not found in Route 53"

**Problem:** The domain isn't registered in your AWS account.

**Solution:** Ensure `chinchilla-ai.com` is registered in Route 53 in the same AWS account.

### Domain not resolving after 1 hour

**Problem:** DNS propagation is slow or failed.

**Solution:**
1. Check domain status:
   ```bash
   aws amplify get-domain-association \
     --app-id $APP_ID \
     --domain-name sony.chinchilla-ai.com
   ```
2. Look for `"domainStatus": "AVAILABLE"` or error messages
3. Verify Route 53 hosted zone is correct

---

## Advanced: Multi-Branch Subdomains

If you want branch-specific subdomains (e.g., `dev.sony.chinchilla-ai.com` for dev branch):

```bash
aws amplify create-domain-association \
  --app-id $APP_ID \
  --domain-name sony.chinchilla-ai.com \
  --sub-domain-settings \
    prefix=,branchName=main \
    prefix=dev,branchName=dev \
    prefix=staging,branchName=staging \
  --enable-auto-sub-domain
```

**Result:**
- `sony.chinchilla-ai.com` → main branch
- `dev.sony.chinchilla-ai.com` → dev branch
- `staging.sony.chinchilla-ai.com` → staging branch

---

## Cost Considerations

- **Amplify Hosting custom domains:** Free (no extra charge)
- **Route 53 hosted zone:** $0.50/month per zone
- **SSL certificates:** Free (Amplify-managed via ACM)

**For multi-tenant setup:**
- You only pay for ONE hosted zone (`chinchilla-ai.com`)
- All client subdomains use the same zone (no additional cost)

---

## Security Best Practices

1. ✅ **Use HTTPS only** - Amplify enforces this automatically
2. ✅ **Enable auto-subdomain carefully** - Only if you want branches to auto-create URLs
3. ✅ **Document client domains** - Keep a list of which client uses which subdomain
4. ✅ **Use consistent naming** - Lowercase, no special characters (e.g., `sony`, not `Sony!`)

---

## Related Documentation

- [pending/COGNITO_CUSTOM_DOMAIN.md](../pending/COGNITO_CUSTOM_DOMAIN.md) - Custom auth domains (future)
- [auth/GOOGLE_OAUTH_SETUP.md](../auth/GOOGLE_OAUTH_SETUP.md) - OAuth redirect URI configuration
- [QUICK_START.md](../QUICK_START.md) - Getting started with the template

---

## Next Steps

After setting up the hosting domain:

1. Update OAuth redirect URIs in Google Cloud Console:
   - From: `http://localhost:3000/profile`
   - To: `https://sony.chinchilla-ai.com/profile`

2. Test the domain:
   ```bash
   curl -I https://sony.chinchilla-ai.com
   ```

3. (Optional) Set up custom Cognito domain - see [pending/COGNITO_CUSTOM_DOMAIN.md](../pending/COGNITO_CUSTOM_DOMAIN.md)

---

**Last Updated:** 2025-11-01
**Status:** Fully automated via AWS CLI, MCP tool coming soon
