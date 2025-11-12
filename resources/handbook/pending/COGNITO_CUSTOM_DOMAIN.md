# Cognito Custom Domain Setup (Future Implementation)

⚠️ **STATUS: PENDING** - This feature is not yet fully implemented in the template. This document captures research and planned implementation.

---

## Overview

This guide documents how to set up custom Cognito domains for multi-tenant client apps using the pattern:
- **Frontend:** `{client}.chinchilla-ai.com` (e.g., `sony.chinchilla-ai.com`)
- **Auth:** `auth.{client}.chinchilla-ai.com` (e.g., `auth.sony.chinchilla-ai.com`)

---

## Why Custom Cognito Domains?

**Default Cognito domain:**
```
https://5b3520e24b27ecc1f44d.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
```

**Custom domain:**
```
https://auth.sony.chinchilla-ai.com/oauth2/idpresponse
```

**Benefits:**
- Professional branding
- Client trust (no scary AWS subdomains)
- Consistent domain structure
- Easier to communicate redirect URIs to clients

---

## Prerequisites

1. **SSL Certificate in ACM** - **MUST be in us-east-1** (regardless of your user pool's region)
2. **Own the domain** - Must control DNS settings in Route 53
3. **User pool exists** - Already deployed via Amplify Gen 2
4. **OAuth providers configured** - Google, Facebook, etc.

---

## Current Limitations (Why This is Pending)

### 1. **Amplify Gen 2 Native Support: NOT AVAILABLE**

From [GitHub Issue #2350](https://github.com/aws-amplify/amplify-backend/issues/2350):
- `defineAuth()` does NOT support custom Cognito domains natively
- This is a tracked feature request
- No ETA from AWS team

### 2. **amplify_outputs.json Problem**

Even when manually configuring custom domain in Cognito Console:
- `amplify_outputs.json` STILL contains the default ugly domain
- Redeploying doesn't pick up the custom domain properly
- Frontend may use wrong redirect URLs

### 3. **Certificate Chicken-and-Egg**

- ACM certificate must exist BEFORE Cognito domain creation
- Certificate creation is async (5-30 min for DNS validation)
- Can't create cert and Cognito domain in same deployment

---

## Workaround: CDK Escape Hatch (Partially Works)

### Step 1: Create Client Config

```typescript
// amplify/client-config.ts
export const CLIENT_CONFIG = {
  clientName: 'sony', // ← Change this for each new project
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

### Step 2: Use CDK Escape Hatch in backend.ts

```typescript
// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { CfnUserPoolDomain } from 'aws-cdk-lib/aws-cognito';
import { CLIENT_CONFIG } from './client-config';

const backend = defineBackend({ auth });

// Add custom Cognito domain via CDK escape hatch
const userPool = backend.auth.resources.userPool;

// ⚠️ Certificate ARN must be manually obtained first
const certArn = 'arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID';

new CfnUserPoolDomain(userPool.stack, 'CustomDomain', {
  domain: CLIENT_CONFIG.authDomain, // auth.sony.chinchilla-ai.com
  userPoolId: userPool.userPoolId,
  customDomainConfig: {
    certificateArn: certArn
  }
});
```

### Step 3: Manual Pre-Deployment Steps

**Before deploying for a new client:**

1. **Request ACM certificate** (us-east-1):
   ```bash
   aws acm request-certificate \
     --domain-name "*.sony.chinchilla-ai.com" \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Validate certificate** (Route 53):
   - Add CNAME records for validation
   - Wait 5-30 minutes

3. **Copy certificate ARN:**
   ```bash
   aws acm list-certificates --region us-east-1
   ```

4. **Update backend.ts** with cert ARN

5. **Deploy:**
   ```bash
   npx ampx sandbox
   ```

6. **Get CloudFront distribution URL from Cognito Console**

7. **Add DNS record in Route 53:**
   ```
   auth.sony.chinchilla-ai.com  →  d111111abcdef8.cloudfront.net (CNAME)
   ```

8. **Wait up to 1 hour for propagation**

---

## The Manual Workflow (What We Currently Have to Do)

Since native support doesn't exist, here's the realistic workflow:

### Option A: Quick Demo (No Custom Domain)
```bash
# 1. Update client-config.ts: clientName: 'sony'
# 2. Deploy
npx ampx sandbox
# 3. Done - uses default Cognito domain
```

### Option B: Production Setup (With Custom Domain)
```bash
# 1. Request ACM cert (manual, 5-30 min wait)
# 2. Update client-config.ts: clientName: 'sony'
# 3. Update backend.ts with cert ARN
# 4. Deploy
npx ampx sandbox
# 5. Add DNS records in Route 53 (manual)
# 6. Wait up to 1 hour for propagation
```

---

## What COULD Be Automated (Future)

If/when Amplify Gen 2 adds native support, this is the ideal workflow:

```typescript
// amplify/auth/resource.ts (FUTURE - NOT CURRENTLY SUPPORTED)
import { defineAuth, secret } from '@aws-amplify/backend';
import { CLIENT_CONFIG } from '../client-config';

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET')
      },
      callbackUrls: [
        `https://${CLIENT_CONFIG.frontendDomain}/profile`,
        'http://localhost:3000/profile'
      ],
      logoutUrls: [
        `https://${CLIENT_CONFIG.frontendDomain}`,
        'http://localhost:3000'
      ]
    }
  },
  // 🚧 FUTURE FEATURE - NOT YET AVAILABLE
  customDomain: {
    domainName: CLIENT_CONFIG.authDomain,
    certificateArn: secret('ACM_CERTIFICATE_ARN') // or auto-request
  }
});
```

---

## Resources & References

### AWS Documentation
- [Using your own domain for managed login](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-add-custom-domain.html)
- [Configuring a user pool domain](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-assign-domain.html)

### GitHub Issues
- [Support for custom domain on Auth resource #2350](https://github.com/aws-amplify/amplify-backend/issues/2350)

### Stack Overflow
- [AWS Amplify Gen2 NextJS Google OAuth, Change userpool domain name to custom domain](https://stackoverflow.com/questions/79294301/aws-amplify-gen2-nextjs-google-oauth-change-userpool-domain-name-to-custom-doma)

### Key Constraints
- ACM certificate **MUST** be in us-east-1 (hard requirement)
- CloudFront distribution is created automatically by Cognito
- DNS propagation can take up to 1 hour for new domains
- Certificate validation takes 5-30 minutes via DNS

---

## Decision: Why This is Pending

After research, we've determined:

1. ✅ **Hosting domain** (frontend) - Easy to automate via AWS CLI
2. ❌ **Cognito domain** (auth) - Requires manual steps that can't be eliminated:
   - ACM certificate must be created first (async)
   - Certificate ARN must be manually copied
   - DNS records must be added after deployment
   - `amplify_outputs.json` doesn't update properly

**Current approach:**
- Focus on automating the **hosting domain** first (via MCP tool)
- Leave Cognito custom domains as **manual/optional** for production setup
- Revisit when Amplify Gen 2 adds native support OR when we have time to build a more complex automation pipeline

---

## Next Steps (When Ready to Implement)

1. **Wait for Amplify Gen 2 native support** - Monitor GitHub issue #2350
2. **Or build full automation pipeline:**
   - Script to request ACM cert
   - Wait for validation
   - Deploy with cert ARN
   - Add DNS records via Route 53 API
   - Update `amplify_outputs.json` manually (custom script)
3. **Or keep it manual** - Document the 6-step checklist and accept the manual work

---

## Related Documentation

- [GOOGLE_OAUTH_SETUP.md](../auth/GOOGLE_OAUTH_SETUP.md) - How to set up Google OAuth
- [ENVIRONMENT_VARIABLES.md](../ENVIRONMENT_VARIABLES.md) - How to use sandbox secrets
- [CLIENT_SIDE_SETUP.md](../auth/CLIENT_SIDE_SETUP.md) - Frontend auth configuration

---

**Last Updated:** 2025-11-01
**Status:** Research complete, implementation pending native Amplify Gen 2 support
