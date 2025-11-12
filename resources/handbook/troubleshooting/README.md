# 🔧 Troubleshooting Guide

**Common issues and solutions for AWS Amplify Gen 2 deployments.**

---

## 📂 Quick Navigation

| Issue Category | Go To |
|----------------|-------|
| **Deployment errors on AWS Amplify** | [deployment/](#-deployment-issues) |
| **Authentication issues** | [../auth/troubleshooting/](../auth/troubleshooting/) |
| **Webhook debugging** | [../webhooks/troubleshooting.md](../webhooks/troubleshooting.md) |
| **Scheduled function issues** | [../functions/scheduledFunction/TROUBLESHOOTING.md](../functions/scheduledFunction/TROUBLESHOOTING.md) |

---

## 🚀 Deployment Issues

### [deployment/PARCEL_WATCHER_ERROR.md](./deployment/PARCEL_WATCHER_ERROR.md)

**Error:**
```
Error: No prebuild or local build of @parcel/watcher found.
Tried @parcel/watcher-linux-x64-glibc.
```

**Quick Fix:**
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install`
3. Change `npm ci` → `npm install` in `amplify.yml` (2 locations)
4. Commit and push

**Why it happens:** macOS-generated lockfile missing Linux binaries for AWS build servers.

**Full guide:** [PARCEL_WATCHER_ERROR.md](./deployment/PARCEL_WATCHER_ERROR.md)

---

## 🔐 Authentication Issues

See [auth/troubleshooting/](../auth/troubleshooting/) for:
- OAuth callback issues
- Google sign-in problems
- Hub event not firing
- Redirect URL behavior

---

## 🔗 Webhook Issues

See [webhooks/troubleshooting.md](../webhooks/troubleshooting.md) for:
- "Unauthorized" errors
- API key authentication failures
- Signature verification issues
- Next.js API route debugging

---

## ⏰ Scheduled Function Issues

See [functions/scheduledFunction/TROUBLESHOOTING.md](../functions/scheduledFunction/TROUBLESHOOTING.md) for:
- "Malformed environment variables" error
- Missing `resourceGroupName: 'data'`
- Lambda timeout issues
- DynamoDB access problems

---

## 🧭 General Debugging Strategy

### 1. Check CloudWatch Logs

```bash
# Use MCP amplify tools to fetch logs
# Lambda logs
amplify_get_lambda_logs(appId, functionName, timeRange: '15m')

# AppSync logs
amplify_get_appsync_logs(appId, timeRange: '15m')

# Cognito logs
amplify_get_cognito_logs(appId, timeRange: '15m')
```

### 2. Verify Build Configuration

Common issues:
- ✅ Check `amplify.yml` has correct build commands
- ✅ Verify environment variables are set in Amplify Console
- ✅ Ensure `amplify_outputs.json` is generated during build

### 3. Check Resource Permissions

Common permission issues:
- ❌ Lambda can't access DynamoDB → Missing `resourceGroupName: 'data'`
- ❌ Lambda can't access S3 → Missing `resourceGroupName: 'storage'`
- ❌ Lambda can't access secrets → Missing IAM policy

### 4. Validate Schema Authorization

Common auth issues:
- ❌ `allow.publicApiKey()` missing for webhook models
- ❌ `apiKeyAuthorizationMode` not configured in `defineData()`
- ❌ Wrong auth mode in client (`authMode: 'apiKey'` vs `'userPool'`)

---

## 📚 Related Documentation

- [AI-DEVELOPMENT-GUIDELINES.md](../AI-DEVELOPMENT-GUIDELINES.md) - Must-read rules
- [ENVIRONMENT_VARIABLES.md](../ENVIRONMENT_VARIABLES.md) - Env var patterns
- [BACKEND_ENV_CONFIG.md](../BACKEND_ENV_CONFIG.md) - Environment detection
- [Handbook README](../README.md) - Main navigation hub

---

## 🆘 Still Stuck?

1. **Search GitHub issues:** [aws-amplify/amplify-backend](https://github.com/aws-amplify/amplify-backend/issues)
2. **Check AWS docs:** [Amplify Gen 2 Troubleshooting](https://docs.amplify.aws/react/build-a-backend/troubleshooting/)
3. **Review this handbook:** Most common issues are documented here

---

**Last Updated:** 2025-10-16
