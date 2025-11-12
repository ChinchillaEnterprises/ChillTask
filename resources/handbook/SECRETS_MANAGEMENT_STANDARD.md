# 🔐 Secrets Management Standard for Amplify Gen 2 Apps

**THE OFFICIAL STANDARD for managing secrets in all BEONIQ Amplify Gen 2 applications.**

> **RULE:** This is the ONE and ONLY way we manage secrets across all repos. No exceptions.

---

## 🎯 Core Principles

### **1. ONE Secret Per Repo**
- ✅ Single unified secret in AWS Secrets Manager
- ✅ All environments nested inside (sandbox, dev, main, uat, etc.)
- ❌ NO multiple secrets per environment
- ❌ NO environment variables in Amplify Console

### **2. ONE Methodology Everywhere**
- ✅ `instrumentation.ts` handles secret fetching for ALL environments
- ✅ Works in local development AND CI/CD
- ✅ TypeScript-based (no bash parsing in YAML)
- ❌ NO duplicate logic in multiple places
- ❌ NO bash scripts for secret management

### **3. NO .env Files (With One Exception)**
- ❌ NO `.env.local` files required for normal development
- ❌ NO `setup-secrets.sh` or similar bash scripts
- ✅ `.env.local` OPTIONAL for developers who prefer manual config
- ✅ Automatic secret fetching is the default

---

## 📁 Unified Secret Structure

### Required Secret Name Pattern

```
{repo-name}-secrets
```

**Examples:**
- `transportation-insights-secrets`
- `project-management-secrets`
- `customer-portal-secrets`

### Required JSON Structure

```json
{
  "sandbox": {
    "service_name": {
      "credential_1": "value",
      "credential_2": "value"
    }
  },
  "dev": {
    "service_name": {
      "credential_1": "value",
      "credential_2": "value"
    }
  },
  "main": {
    "service_name": {
      "credential_1": "value",
      "credential_2": "value"
    }
  }
}
```

### Real-World Example

```json
{
  "sandbox": {
    "databricks": {
      "server_hostname": "adb-1234567890.azuredatabricks.net",
      "oauth_url": "https://adb-1234567890.azuredatabricks.net/oidc",
      "client_id": "sandbox-client-id",
      "client_secret": "sandbox-client-secret",
      "endpoint_name": "sandbox-endpoint"
    },
    "stripe": {
      "public_key": "pk_test_...",
      "secret_key": "sk_test_...",
      "webhook_secret": "whsec_..."
    }
  },
  "dev": {
    "databricks": {
      "server_hostname": "adb-1234567890.azuredatabricks.net",
      "oauth_url": "https://adb-1234567890.azuredatabricks.net/oidc",
      "client_id": "dev-client-id",
      "client_secret": "dev-client-secret",
      "endpoint_name": "dev-endpoint"
    },
    "stripe": {
      "public_key": "pk_test_...",
      "secret_key": "sk_test_...",
      "webhook_secret": "whsec_..."
    }
  },
  "main": {
    "databricks": {
      "server_hostname": "adb-1234567890.azuredatabricks.net",
      "oauth_url": "https://adb-1234567890.azuredatabricks.net/oidc",
      "client_id": "prod-client-id",
      "client_secret": "prod-client-secret",
      "endpoint_name": "prod-endpoint"
    },
    "stripe": {
      "public_key": "pk_live_...",
      "secret_key": "sk_live_...",
      "webhook_secret": "whsec_..."
    }
  }
}
```

---

## 🛠️ Implementation Steps

### Step 1: Create Unified Secret in AWS Secrets Manager

```bash
# Create the secret JSON file
cat > /tmp/repo-secrets.json << 'EOF'
{
  "sandbox": {
    "service": {
      "key": "value"
    }
  },
  "dev": {
    "service": {
      "key": "value"
    }
  },
  "main": {
    "service": {
      "key": "value"
    }
  }
}
EOF

# Create the secret in AWS Secrets Manager
aws secretsmanager create-secret \
  --profile beoniq \
  --region us-east-1 \
  --name {repo-name}-secrets \
  --description "Unified secrets for {RepoName} - all environments" \
  --secret-string file:///tmp/repo-secrets.json

# Clean up
rm /tmp/repo-secrets.json
```

---

### Step 2: Create `instrumentation.ts` (Location Depends on Project Structure)

**⚠️ IMPORTANT - File Location:**
- **If project has `src` folder** → `src/instrumentation.ts`
- **If NO `src` folder** → `instrumentation.ts` (project root)

This is a Next.js convention. Transportation Insights uses `src` folder, so the file is at `src/instrumentation.ts`.

```typescript
/**
 * Next.js Instrumentation - Runs on Server Startup (Local AND CI/CD)
 *
 * Unified secrets management for all environments:
 * - Handles both local development AND CI/CD builds
 * - Fetches from ONE unified secret: {repo-name}-secrets
 * - Auto-detects environment (sandbox, dev, main)
 * - Respects .env.local if developer prefers manual config
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Check if developer has .env.local - respect their choice
    if (process.env.SERVICE_CREDENTIAL) {
      console.log('✅ [INSTRUMENTATION] Using existing env vars (.env.local detected)');
      return;
    }

    // Determine environment based on AWS_BRANCH
    const ENV_KEY = process.env.AWS_BRANCH || 'sandbox';
    const IS_CI = !!process.env.AWS_BRANCH;

    console.log(`🔑 [INSTRUMENTATION] Fetching secrets for environment: ${ENV_KEY}`);
    console.log(`   Running in: ${IS_CI ? 'CI/CD (Amplify)' : 'Local Development'}`);

    try {
      const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');

      const secretsManager = new SecretsManagerClient({
        region: 'us-east-1',
        // CI/CD: Uses Amplify service role
        // Local: Uses credentials from ~/.aws/credentials
      });

      const SECRET_NAME = '{repo-name}-secrets';
      console.log(`📦 [INSTRUMENTATION] Fetching unified secret: ${SECRET_NAME}`);

      const response = await secretsManager.send(
        new GetSecretValueCommand({
          SecretId: SECRET_NAME,
        })
      );

      if (!response.SecretString) {
        throw new Error('Secret value is empty');
      }

      const allSecrets = JSON.parse(response.SecretString);

      // Extract environment-specific config
      const serviceConfig = allSecrets[ENV_KEY]?.service_name;

      if (!serviceConfig) {
        throw new Error(`No service config found for environment: ${ENV_KEY}`);
      }

      // Set environment variables programmatically
      process.env.SERVICE_CREDENTIAL_1 = serviceConfig.credential_1;
      process.env.SERVICE_CREDENTIAL_2 = serviceConfig.credential_2;
      // ... set all your service credentials

      console.log('✅ [INSTRUMENTATION] Secrets loaded successfully');
      console.log(`   - Environment: ${ENV_KEY}`);

    } catch (error) {
      console.error('❌ [INSTRUMENTATION] Failed to fetch secrets from Secrets Manager:');
      console.error(error);
      console.error('');
      console.error('💡 To fix this:');
      console.error('   1. Ensure AWS CLI is configured: aws configure --profile beoniq');
      console.error('   2. Verify you have secretsmanager:GetSecretValue permission');
      console.error('   3. Or create a .env.local file with credentials');
      console.error('');
      throw error;
    }
  }
}
```

---

### Step 3: Update `next.config.js` (Next.js 15+ Only)

**⚠️ NOTE:** Next.js 15+ enables instrumentation by default. No config changes needed!

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Instrumentation is enabled by default in Next.js 15+
  // instrumentation.ts will automatically run on server startup
};

module.exports = nextConfig;
```

**For Next.js 14 and earlier**, you need to enable the experimental flag:

```javascript
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
};
```

---

### Step 4: Update `amplify.yml`

```yaml
frontend:
  phases:
    build:
      commands:
        # Capture NEXT_PUBLIC_* and AMPLIFY_* variables
        - env | grep -E '^NEXT_PUBLIC_' >> .env.production || true
        - env | grep -E '^AMPLIFY_' >> .env.production || true

        # 🔑 SECRETS MANAGEMENT
        # All secret fetching is now handled by instrumentation.ts (Next.js startup hook)
        # This eliminates bash parsing in YAML - cleaner, more maintainable
        # The instrumentation hook runs automatically during build and fetches from:
        # - Unified secret: {repo-name}-secrets
        # - Auto-detects environment based on $AWS_BRANCH (sandbox, dev, main)
        # - Sets process.env.* programmatically
        # No additional commands needed here - Next.js handles it!

        # Generate amplify_outputs.json
        - npx ampx generate outputs --branch $AWS_BRANCH --app-id $AWS_APP_ID

        # Build Next.js app
        - npm run build
```

---

### Step 5: Configure Amplify Service Role IAM Permissions

```bash
# Get the Amplify service role name
aws amplify get-app --profile beoniq --region us-east-1 --app-id {APP_ID} \
  --query 'app.iamServiceRoleArn' --output text

# Create inline policy for Secrets Manager access
cat > /tmp/amplify-secrets-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:{ACCOUNT_ID}:secret:{repo-name}-secrets-*"
      ]
    }
  ]
}
EOF

# Attach policy to Amplify service role
aws iam put-role-policy \
  --profile beoniq \
  --role-name {AmplifyServiceRoleName} \
  --policy-name AmplifySecretsManagerReadAccess \
  --policy-document file:///tmp/amplify-secrets-policy.json

# Clean up
rm /tmp/amplify-secrets-policy.json
```

---

### Step 6: Install AWS SDK Dependency

```bash
npm install @aws-sdk/client-secrets-manager
```

---

## 🚀 Usage

### Local Development

```bash
# Just start the dev server - secrets auto-fetch!
npm run dev
```

**What happens:**
1. Next.js starts
2. `instrumentation.ts` runs automatically
3. Detects no `$AWS_BRANCH` → uses sandbox environment
4. Fetches from `{repo-name}-secrets`
5. Extracts `.sandbox.service_name` config
6. Sets `process.env.*` variables
7. Your Next.js API routes work seamlessly!

### CI/CD (Amplify)

```bash
# Push code to GitHub
git push origin dev
```

**What happens:**
1. Amplify detects push
2. Starts build with `$AWS_BRANCH=dev`
3. Next.js build runs
4. `instrumentation.ts` runs automatically
5. Detects `$AWS_BRANCH=dev` → uses dev environment
6. Fetches from `{repo-name}-secrets`
7. Extracts `.dev.service_name` config
8. Sets `process.env.*` variables
9. Build completes and deploys!

---

## 🏗️ Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS Secrets Manager                     │
│                                                             │
│    {repo-name}-secrets (ONE unified secret)                │
│    ├── sandbox { service: {...} }                          │
│    ├── dev     { service: {...} }                          │
│    └── main    { service: {...} }                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            ↓ (fetched by instrumentation.ts)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│               instrumentation.ts (TypeScript)               │
│                                                             │
│  1. Check for .env.local (respect developer override)      │
│  2. Auto-detect environment via $AWS_BRANCH                │
│  3. Fetch unified secret from AWS Secrets Manager          │
│  4. Extract environment-specific config                    │
│  5. Set process.env.* programmatically                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            ↓ (works in BOTH environments)
                            ↓
┌────────────────────┬────────────────────────────────────────┐
│  Local Development │           CI/CD (Amplify)             │
│                    │                                        │
│  - Uses ~/.aws/    │  - Uses Amplify service role          │
│    credentials     │  - $AWS_BRANCH = dev/main             │
│  - No $AWS_BRANCH  │  - Runs during build                  │
│  - Uses 'sandbox'  │  - Sets production env vars           │
└────────────────────┴────────────────────────────────────────┘
                            ↓
                            ↓ (available everywhere)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Routes & Pages                     │
│                                                             │
│  // Just use process.env.* - it works everywhere!          │
│  const credential = process.env.SERVICE_CREDENTIAL;        │
│                                                             │
│  // Same code, all environments - no conditionals needed!  │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Benefits

### **Single Source of Truth**
- ✅ Only maintain secrets in ONE place (AWS Secrets Manager)
- ✅ No Amplify Console environment variables needed
- ✅ No .env files to manage

### **Automatic Environment Detection**
- ✅ Works in sandbox, dev, main automatically
- ✅ No manual configuration per environment
- ✅ Add new environments without code changes

### **Clean & Maintainable**
- ✅ TypeScript-based (type-safe, autocomplete)
- ✅ No bash parsing in YAML
- ✅ One methodology for all environments
- ✅ Easy to test and debug

### **Secure by Default**
- ✅ Secrets encrypted at rest (AWS Secrets Manager)
- ✅ Least-privilege IAM permissions
- ✅ No secrets in code or version control
- ✅ Audit trail via CloudTrail

### **Developer Friendly**
- ✅ Zero setup for local development
- ✅ Optional .env.local override for custom configs
- ✅ Clear error messages
- ✅ Works exactly the same locally and in production

---

## ❌ What NOT to Do

### ❌ DON'T Create Multiple Secrets

**WRONG:**
```
repo-databricks-sandbox
repo-databricks-dev
repo-databricks-main
```

**CORRECT:**
```
repo-secrets
  ├── sandbox.databricks
  ├── dev.databricks
  └── main.databricks
```

### ❌ DON'T Use Amplify Console Environment Variables

**WRONG:**
- Manually adding DATABRICKS_* in Amplify Console
- Maintaining secrets in two places

**CORRECT:**
- ONE secret in AWS Secrets Manager
- instrumentation.ts fetches automatically

### ❌ DON'T Parse Secrets in amplify.yml

**WRONG:**
```yaml
- SECRET_JSON=$(aws secretsmanager get-secret-value ...)
- export DATABRICKS_HOST=$(echo $SECRET_JSON | jq ...)
```

**CORRECT:**
```yaml
# Just a comment - instrumentation.ts handles it!
```

### ❌ DON'T Require .env Files

**WRONG:**
```bash
bash scripts/setup-secrets.sh  # Manual step
```

**CORRECT:**
```bash
npm run dev  # Automatic!
```

---

## 🔍 Troubleshooting

### Error: "Secrets Manager can't find the specified secret"

**Cause:** Secret doesn't exist or wrong name

**Fix:**
```bash
# List secrets
aws secretsmanager list-secrets --profile beoniq --region us-east-1

# Create if missing
aws secretsmanager create-secret \
  --profile beoniq \
  --region us-east-1 \
  --name {repo-name}-secrets \
  --secret-string '{...}'
```

### Error: "AccessDeniedException"

**Cause:** Missing IAM permissions

**Fix:**
```bash
# Check Amplify service role permissions
aws iam get-role-policy \
  --profile beoniq \
  --role-name {AmplifyServiceRole} \
  --policy-name AmplifySecretsManagerReadAccess

# Add if missing (see Step 5 above)
```

### Error: "No config found for environment"

**Cause:** Secret JSON structure missing environment key

**Fix:**
```bash
# Update secret to include all environments
aws secretsmanager put-secret-value \
  --profile beoniq \
  --region us-east-1 \
  --secret-id {repo-name}-secrets \
  --secret-string '{
    "sandbox": {...},
    "dev": {...},
    "main": {...}
  }'
```

---

## 📋 Migration Checklist

Moving from old approach to this standard:

- [ ] Create unified secret in AWS Secrets Manager
- [ ] Structure JSON with sandbox/dev/main environments
- [ ] Create `instrumentation.ts` in project root
- [ ] Create/update `next.config.js` with instrumentationHook
- [ ] Update `amplify.yml` to remove bash secret parsing
- [ ] Install `@aws-sdk/client-secrets-manager`
- [ ] Configure Amplify service role IAM permissions
- [ ] Delete `.env.local` files (or keep for override)
- [ ] Delete `scripts/setup-secrets.sh` (if exists)
- [ ] Remove Amplify Console environment variables
- [ ] Test locally: `npm run dev`
- [ ] Test in CI/CD: Push to dev branch
- [ ] Update team documentation
- [ ] Delete old secrets in Secrets Manager

---

## 📚 Related Documentation

- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - Lambda function environment variables
- [BACKEND_ENV_CONFIG.md](./BACKEND_ENV_CONFIG.md) - Backend environment awareness
- [functions/scheduledFunction/ENVIRONMENT_VARIABLES.md](./functions/scheduledFunction/ENVIRONMENT_VARIABLES.md) - Scheduled function env vars

---

## 🎓 When to Use This vs Lambda `secret()`

### Use This Standard (instrumentation.ts) For:
- ✅ **Next.js API routes** - Server-side API endpoints
- ✅ **Next.js server components** - SSR/SSG components
- ✅ **Any code that runs during Next.js build/runtime**
- ✅ **Multi-service configurations** - Databricks + Stripe + etc.

### Use Lambda `secret()` For:
- ✅ **Lambda functions only** - Scheduled functions, GraphQL resolvers
- ✅ **Single service per function** - Function only needs one credential
- ✅ **AWS Systems Manager Parameter Store** - Amplify native secret management

**Both approaches are valid and complementary!**

---

## ⚖️ THE RULE

**This is THE standard for all BEONIQ Amplify Gen 2 applications.**

- 📜 **ONE secret per repo** - No exceptions
- 📜 **ONE methodology** - instrumentation.ts everywhere
- 📜 **NO .env files required** - Automatic secret fetching is default
- 📜 **NO bash parsing in YAML** - TypeScript handles everything
- 📜 **NO Amplify Console env vars** - Single source of truth in Secrets Manager

**Any deviation from this standard must be documented and approved.**

---

---

## 🚨 CRITICAL UPDATE: SSR Compute Roles (Amplify Hosting)

### The instrumentation.ts Limitation in Amplify SSR

**DISCOVERY:** The instrumentation.ts approach **DOES NOT WORK** for Next.js apps deployed to AWS Amplify Hosting with Server-Side Rendering.

**Why It Fails:**
```
❌ instrumentation.ts runs during server startup
❌ AWS Compute Role credentials NOT available yet
❌ AWS SDK fails with: "Could not load credentials from any providers"
```

**Where Credentials ARE Available:**
```
✅ Next.js API routes (app/api/*/route.ts)
✅ AWS Compute Role credentials injected before request handling
✅ STS test confirmed: arn:aws:sts::123456789:assumed-role/app-ssr-compute-role/...
```

### Solution: Runtime Secrets in API Routes

For **Amplify-hosted Next.js SSR apps**, use runtime secrets fetching in API routes instead of instrumentation.ts.

#### Step 1: Create IAM Compute Role

```bash
# 1. Create trust policy
cat > /tmp/amplify-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "amplify.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
EOF

# 2. Create IAM role
aws iam create-role \
  --profile beoniq \
  --role-name {app-name}-ssr-compute-role \
  --assume-role-policy-document file:///tmp/amplify-trust-policy.json \
  --description "SSR Compute role for {AppName} - allows runtime access to Secrets Manager"

# 3. Create permissions policy (Secrets Manager read-only)
cat > /tmp/secrets-manager-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["secretsmanager:GetSecretValue"],
    "Resource": ["arn:aws:secretsmanager:us-east-1:{ACCOUNT_ID}:secret:{repo-name}-secrets-*"]
  }]
}
EOF

# 4. Attach inline policy to role
aws iam put-role-policy \
  --profile beoniq \
  --role-name {app-name}-ssr-compute-role \
  --policy-name SecretsManagerReadAccess \
  --policy-document file:///tmp/secrets-manager-policy.json

# Clean up
rm /tmp/amplify-trust-policy.json /tmp/secrets-manager-policy.json
```

#### Step 2: Attach Compute Role to Amplify App

```bash
# Attach to dev branch
aws amplify update-branch \
  --app-id {APP_ID} \
  --branch-name dev \
  --compute-role-arn arn:aws:iam::{ACCOUNT_ID}:role/{app-name}-ssr-compute-role \
  --profile beoniq \
  --region us-east-1

# Attach to main branch
aws amplify update-branch \
  --app-id {APP_ID} \
  --branch-name main \
  --compute-role-arn arn:aws:iam::{ACCOUNT_ID}:role/{app-name}-ssr-compute-role \
  --profile beoniq \
  --region us-east-1
```

#### Step 3: Create Runtime Secrets Module

```typescript
// src/lib/secrets.ts
/**
 * Runtime Secrets Management for Next.js API Routes
 *
 * IMPORTANT: Only works in API route handlers, NOT in middleware or instrumentation
 * (AWS Compute Role credentials only available in API routes)
 *
 * Cost: $0.05 per 10,000 calls (negligible for most apps)
 */

interface DatabricksConfig {
  server_hostname: string;
  oauth_url: string;
  client_id: string;
  client_secret: string;
  endpoint_name: string;
}

export async function getSecrets(): Promise<DatabricksConfig> {
  const ENV_KEY = process.env.AWS_BRANCH || 'sandbox';

  console.log('🔑 [SECRETS] Fetching from Secrets Manager...');
  console.log('   Environment:', ENV_KEY);

  try {
    const { SecretsManagerClient, GetSecretValueCommand } =
      await import('@aws-sdk/client-secrets-manager');

    const secretsManager = new SecretsManagerClient({ region: 'us-east-1' });
    const SECRET_NAME = '{repo-name}-secrets';

    const response = await secretsManager.send(
      new GetSecretValueCommand({ SecretId: SECRET_NAME })
    );

    if (!response.SecretString) {
      throw new Error('Secret value is empty');
    }

    const allSecrets = JSON.parse(response.SecretString);
    const databricksConfig = allSecrets[ENV_KEY]?.databricks;

    if (!databricksConfig) {
      throw new Error(`No databricks config found for environment: ${ENV_KEY}`);
    }

    // Set environment variables for backward compatibility
    process.env.DATABRICKS_SERVER_HOSTNAME = databricksConfig.server_hostname;
    process.env.DATABRICKS_OAUTH_URL = databricksConfig.oauth_url;
    process.env.DATABRICKS_CLIENT_ID = databricksConfig.client_id;
    process.env.DATABRICKS_CLIENT_SECRET = databricksConfig.client_secret;
    process.env.DATABRICKS_ENDPOINT_NAME = databricksConfig.endpoint_name;

    console.log('✅ [SECRETS] Secrets fetched and set');
    return databricksConfig;

  } catch (error) {
    console.error('❌ [SECRETS] Failed to fetch secrets');
    console.error('   Environment:', ENV_KEY);
    console.error('   Error:', error);
    throw error;
  }
}
```

#### Step 4: Use in API Routes

```typescript
// src/app/api/your-endpoint/route.ts
import { NextRequest } from 'next/server';
import { getSecrets } from '@/lib/secrets';

export async function POST(request: NextRequest) {
  try {
    // Fetch secrets at runtime (uses IAM Compute Role credentials)
    const secrets = await getSecrets();

    // Use secrets
    const token = await getDatabricksToken(secrets);
    const response = await callDatabricks(secrets.endpoint_name, token);

    return Response.json({ data: response });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

#### Step 5: Clean Up instrumentation.ts

```typescript
// src/instrumentation.ts (minimal)
/**
 * Next.js Instrumentation - Server Startup Hook
 *
 * Note: This runs TOO EARLY for AWS Compute Role credentials to be available.
 * Secrets are now fetched on-demand via src/lib/secrets.ts instead.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🚀 [INSTRUMENTATION] Next.js server starting...');
    console.log('   Environment:', process.env.AWS_BRANCH || 'sandbox');
  }
}
```

### Cost Analysis

**Secrets Manager Pricing:**
- $0.05 per 10,000 API calls
- $0.40 per secret per month (storage)

**Example Costs:**
- 10,000 API requests/month = **$0.05/month** (5 cents)
- 100,000 API requests/month = **$0.50/month** (50 cents)
- 1,000,000 API requests/month = **$5.00/month**

**Conclusion:** Cost is negligible. No caching needed.

### Benefits of Runtime Secrets

1. **Hot-Swappable Secrets**
   - Change Databricks endpoint → Immediately available
   - No rebuild or redeploy needed
   - Update AWS secret → Next request uses new value

2. **Better Security**
   - Secrets never baked into build artifacts
   - Temporary AWS credentials (not long-lived keys)
   - Least-privilege IAM permissions

3. **Simpler Architecture**
   - No caching complexity
   - No cache invalidation problems
   - Always-fresh secrets

4. **Environment Flexibility**
   - Switch between dev/prod endpoints dynamically
   - Test different configurations without deployment

### When to Use Each Approach

#### Use Runtime Secrets (API Routes) When:
- ✅ **Deployed to AWS Amplify Hosting** with SSR
- ✅ **Need hot-swappable secrets** (change without rebuild)
- ✅ **Using Next.js API routes** for backend logic
- ✅ **Cost is negligible** (low to medium traffic)

#### Use instrumentation.ts When:
- ✅ **Self-hosted Next.js** (not Amplify Hosting)
- ✅ **Server has IAM role** at startup (EC2, ECS, etc.)
- ✅ **Secrets rarely change** (rebuild acceptable)
- ✅ **Extremely high traffic** (minimize Secrets Manager calls)

### Testing Credentials in API Routes

Create a test endpoint to verify IAM Compute Role is working:

```typescript
// src/app/api/test-credentials/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { STSClient, GetCallerIdentityCommand } =
      await import('@aws-sdk/client-sts');

    const sts = new STSClient({ region: 'us-east-1' });
    const identity = await sts.send(new GetCallerIdentityCommand({}));

    return NextResponse.json({
      success: true,
      account: identity.Account,
      arn: identity.Arn, // Should show compute role ARN
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
```

Visit `/api/test-credentials` - should return:
```json
{
  "success": true,
  "account": "123456789012",
  "arn": "arn:aws:sts::123456789012:assumed-role/app-ssr-compute-role/..."
}
```

If successful, IAM Compute Role is working correctly! ✅

### Architecture: SSR Compute Roles

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS Secrets Manager                     │
│    {repo-name}-secrets (ONE unified secret)                │
│    ├── sandbox { service: {...} }                          │
│    ├── dev     { service: {...} }                          │
│    └── main    { service: {...} }                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            ↓ (fetched at runtime)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│         Next.js API Route Handler (Request Time)            │
│                                                             │
│  1. Request arrives at API route                           │
│  2. IAM Compute Role provides temporary credentials        │
│  3. getSecrets() fetches from Secrets Manager              │
│  4. Secrets used for request                               │
│  5. Response returned                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            ↓ (credentials provided by)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              IAM SSR Compute Role                           │
│                                                             │
│  Trust Policy: amplify.amazonaws.com can assume            │
│  Permissions: secretsmanager:GetSecretValue                │
│  Resource: {repo-name}-secrets only                        │
│                                                             │
│  Provides: Temporary AWS credentials to API routes         │
└─────────────────────────────────────────────────────────────┘
```

---

**Last Updated:** November 2025
**Status:** ✅ Official Standard - Apply to ALL repos
**SSR Update:** ✅ Critical - Use runtime secrets for Amplify Hosting
