# Amplify Examples

This directory contains educational examples and reference implementations for AWS Amplify Gen 2.

## ⚠️ Important Note

**These are EXAMPLES ONLY** - they are not deployed with your application. They are here to help you learn Amplify patterns and best practices.

## Structure

### 🔐 `auth/` - Authentication Examples
- `basic-email-auth.ts` - Simple email/password authentication
- `multi-auth-methods.ts` - Social login, MFA, phone auth
- `enterprise-auth.ts` - Enterprise SSO, compliance, advanced security
- `passwordless-auth.ts` - Magic links, SMS codes, WebAuthn
- `b2b-multi-tenant.ts` - Multi-tenant SaaS authentication
- `triggers/` - Lambda trigger implementations

### 📊 `data/` - Data Schema Examples
- `simple-custom-operations.ts` - Basic custom queries and mutations (getUserStats example)
- `blog-schema.ts` - Complete blog platform with posts, profiles, comments
- `ecommerce-schema.ts` - Full e-commerce with products, orders, inventory

### ⚡ `functions/` - Lambda Function Examples
- `graphqlResolver/` - Custom GraphQL resolver with typed handlers
- `scheduledFunction/` - EventBridge scheduled functions (cron jobs)
- `webhookHandler/` - Secure webhook processing with signature verification
- `cognitoTrigger/` - User lifecycle management with Cognito triggers
- `userTriggered/` - User-initiated background operations

## Using These Examples

### For Data Schemas:
1. **Browse the examples** in `data/` to find patterns you need
2. **Copy only what you need** to your `amplify/data/resource.ts`
3. **Create Lambda functions** for any custom operations
4. **Update your backend.ts** to include the Lambda functions

### For Lambda Functions:
1. **Study the patterns** - Each example includes detailed comments
2. **Copy what you need** - Take the relevant code and adapt it
3. **Move to `amplify/functions/`** - Create your function in the proper location
4. **Update imports** - Adjust paths when moving code

## Why Separate Examples?

- **Faster builds** - Examples don't get processed during deployment
- **Cleaner structure** - Your actual functions aren't mixed with reference code
- **Better learning** - You can explore examples without affecting your app
- **No accidental deployment** - Examples won't consume AWS resources

## Next Steps

1. Browse the examples to understand Amplify patterns
2. Create your own functions in `amplify/functions/`
3. Use the examples as templates for your implementations
4. Remove any examples you don't need from your project