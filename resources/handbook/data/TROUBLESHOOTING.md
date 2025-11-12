# GraphQL Schema & Data Troubleshooting Guide

Common errors, gotchas, and solutions when working with Amplify Gen 2 Data (GraphQL + DynamoDB).

---

## Table of Contents

1. [GraphQL Schema Naming Conflicts](#graphql-schema-naming-conflicts)
2. [Authorization Errors](#authorization-errors)
3. [Model Relationship Issues](#model-relationship-issues)

---

## GraphQL Schema Naming Conflicts

### Error: `Object type extension 'Mutation' cannot redeclare field deleteCompany`

**What happened:**
```
[ERROR] [BackendBuildError] Unable to deploy due to CDK Assembly Error
  ∟ Caused by: [AmplifyDataConstructInitializationError] Failed to instantiate data construct
    ∟ Caused by: [Error] Object type extension 'Mutation' cannot redeclare field deleteCompany
```

**Root cause:**

Amplify Gen 2 **reserves conventional CRUD mutation names** based on your model names, even if you don't grant those permissions in authorization rules.

When you have a model named `Company`, Amplify reserves these GraphQL mutation names:
- `createCompany`
- `updateCompany`
- `deleteCompany`
- `getCompany`
- `listCompanies`

**These names are reserved at the GraphQL schema level**, regardless of whether you actually allow these operations in your authorization rules.

### Example That Causes Conflict

```typescript
// amplify/data/auth/company.ts
export const Company = a
  .model({
    name: a.string().required(),
    customerCode: a.string().required(),
  })
  .authorization((allow) => [
    allow.group('SUPER_ADMIN').to(['create', 'update', 'read']), // ❌ No 'delete' permission
  ]);

// amplify/data/operations/admin-operations.ts
export const deleteCompany = a  // ❌ CONFLICT! This name is reserved
  .mutation()
  .arguments({ companyId: a.id().required() })
  .handler(a.handler.function(companyDeletion));
```

**Why it fails:**
Even though you removed `delete` from the authorization rules, the `deleteCompany` mutation name is still reserved by the GraphQL schema builder to maintain schema stability.

### Solution: Use Non-Conventional Names for Custom Mutations

When you need custom logic beyond basic CRUD, **use different naming patterns** that don't conflict with Amplify's conventions:

```typescript
// ✅ CORRECT: Use different name
export const removeCompany = a  // ✅ 'remove' doesn't conflict
  .mutation()
  .arguments({ companyId: a.id().required() })
  .returns(a.ref('CompanyDeletionResponse'))
  .authorization((allow) => [allow.group('SUPER_ADMIN')])
  .handler(a.handler.function(companyDeletion));

// Frontend usage
await client.mutations.removeCompany({ companyId });
```

### Alternative Naming Patterns

For operations that go beyond basic CRUD, use these naming patterns:

| Reserved (Avoid) | Alternative (Use Instead) |
|------------------|---------------------------|
| `deleteCompany` | `removeCompany`, `archiveCompany`, `destroyCompany` |
| `createUser` | `registerUser`, `onboardUser`, `enrollUser` |
| `updateProfile` | `modifyProfile`, `editProfile`, `changeProfile` |

### When You Can Use Reserved Names

You **can** use the auto-generated mutations if they meet your needs:

```typescript
// This is fine - using auto-generated deleteCompany
export const Company = a
  .model({ /* ... */ })
  .authorization((allow) => [
    allow.group('SUPER_ADMIN').to(['create', 'update', 'delete', 'read']),
  ]);

// Frontend: Auto-generated mutation works
await client.models.Company.delete({ id: companyId });
```

**When to use custom mutations instead:**
- You need additional logic (Cognito group deletion, safety checks, etc.)
- You need to delete related records in other tables
- You need to trigger webhooks or external API calls
- You need complex authorization logic beyond model-level rules

### Summary

✅ **DO:**
- Use non-conventional names for custom mutations (`removeCompany`, `archiveUser`)
- Use auto-generated CRUD if they meet your needs
- Read error messages carefully - they tell you which name is conflicting

❌ **DON'T:**
- Try to override reserved mutation names (`deleteCompany`, `createUser`)
- Assume removing authorization permissions removes the name reservation
- Fight the framework - work with Amplify's naming conventions

---

## Authorization Errors

_Coming soon: Common authorization-related errors and solutions_

---

## Model Relationship Issues

_Coming soon: hasMany/belongsTo relationship troubleshooting_

---

## Contributing

Found a new error or solution? Add it to this guide following the same format:
1. Error message (exact text)
2. Root cause (what's actually happening)
3. Example that causes it
4. Solution with code examples
5. When to use each approach
