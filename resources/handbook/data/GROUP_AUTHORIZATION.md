# Group-Based Authorization & Row-Level Filtering

**How to implement multi-tenant data isolation using Cognito groups and dynamic group authorization in Amplify Gen 2.**

---

## Table of Contents

1. [Overview](#overview)
2. [The Three Types of Group Authorization](#the-three-types-of-group-authorization)
3. [How Row-Level Filtering Actually Works](#how-row-level-filtering-actually-works)
4. [Multi-Tenant SaaS Pattern](#multi-tenant-saas-pattern)
5. [Implementation Guide](#implementation-guide)
6. [Limitations & Considerations](#limitations--considerations)
7. [Common Pitfalls](#common-pitfalls)

---

## Overview

**Problem**: In a multi-tenant SaaS application, Company A must NEVER see Company B's data.

**Solution**: Use **dynamic group authorization** with `allow.groupsDefinedIn('groups')` to store authorization metadata directly on each record.

**Key Insight**: Each DynamoDB record contains a `groups` array field specifying which Cognito groups can access it. AppSync automatically filters query results based on the user's group membership.

---

## The Three Types of Group Authorization

### 1. Static Groups - `allow.groups(['Admin', 'Leadership'])`

**Definition**: Hardcoded groups that apply to ALL records of a model.

```typescript
const schema = a.schema({
  Salary: a.model({
    wage: a.float(),
    currency: a.string(),
  })
  .authorization(allow => [
    allow.groups(['Admin', 'Leadership'])
  ]),
});
```

**DynamoDB Storage**: No `groups` field stored on records.

**Access Logic**:
- Every Salary record follows the same rule
- Only users in `Admin` or `Leadership` groups can access ANY record
- Groups are hardcoded in the schema

**When to Use**:
- Models where ALL records have identical access rules
- Admin-only data, global settings, system configurations

**Multi-Tenant Use Case**: ❌ **Does NOT work** - all companies would see all data

---

### 2. Dynamic Group (Singular) - `allow.groupDefinedIn('group')`

**Definition**: Each record stores ONE group name that can access it.

```typescript
const schema = a.schema({
  Post: a.model({
    title: a.string(),
    group: a.string(),  // ← Single group name
  })
  .authorization(allow => [
    allow.groupDefinedIn('group')
  ]),
});
```

**DynamoDB Structure**:
```
┌────┬───────────┬─────────────────┐
│ id │ title     │ group (string)  │
├────┼───────────┼─────────────────┤
│ 1  │ Report A1 │ COMPANY_A_ADMIN │
│ 2  │ Report B1 │ COMPANY_B_USER  │
└────┴───────────┴─────────────────┘
```

**Access Logic**:
- Record 1 → ONLY users in `COMPANY_A_ADMIN` can access (not COMPANY_A_USER)
- Record 2 → ONLY users in `COMPANY_B_USER` can access (not COMPANY_B_ADMIN)
- **One group per record**

**When to Use**:
- Each record should be accessible by exactly ONE group
- Fine-grained per-group isolation

**Multi-Tenant Use Case**: ⚠️ **Partially works** - but limits flexibility (only ONE role per company sees each record)

---

### 3. Dynamic Groups (Plural) - `allow.groupsDefinedIn('groups')` ✅

**Definition**: Each record stores MULTIPLE group names that can access it.

```typescript
const schema = a.schema({
  TransportationInsight: a.model({
    title: a.string(),
    content: a.string(),
    groups: a.string().array(),  // ← Array of group names
  })
  .authorization(allow => [
    allow.groupsDefinedIn('groups')
  ]),
});
```

**DynamoDB Structure**:
```
┌────┬───────────┬──────────────────────────────────────────────┐
│ id │ title     │ groups (array)                               │
├────┼───────────┼──────────────────────────────────────────────┤
│ 1  │ Report A1 │ ["COMPANY_A_ADMIN", "COMPANY_A_USER",        │
│    │           │  "COMPANY_A_READER", "SUPER_ADMIN"]          │
├────┼───────────┼──────────────────────────────────────────────┤
│ 2  │ Report B1 │ ["COMPANY_B_ADMIN", "COMPANY_B_USER",        │
│    │           │  "COMPANY_B_READER", "SUPER_ADMIN"]          │
└────┴───────────┴──────────────────────────────────────────────┘
```

**Access Logic**:
- Record 1 → Users in `COMPANY_A_ADMIN` OR `COMPANY_A_USER` OR `COMPANY_A_READER` can access
- Record 2 → Users in `COMPANY_B_ADMIN` OR `COMPANY_B_USER` OR `COMPANY_B_READER` can access
- Abel in `SUPER_ADMIN` → Can access ALL records
- **Multiple groups per record (OR logic)**

**When to Use**:
- ✅ Multi-tenant SaaS with multiple roles per tenant
- ✅ Each company has admins, users, readers who should all see the same data
- ✅ Super admin needs access to everything

**Multi-Tenant Use Case**: ✅ **PERFECT** - This is what you want!

---

## How Row-Level Filtering Actually Works

### The Common Misconception

❌ **WRONG**: "Amplify adds DynamoDB filter expressions that query only authorized rows"

✅ **CORRECT**: "AppSync uses VTL (Velocity Template Language) to filter results AFTER fetching from DynamoDB"

### The Actual Flow

```
User Query (client.models.TransportationInsight.list())
    ↓
AppSync GraphQL API
    ↓
DynamoDB Scan/Query Operation
    ↓ (fetches items - potentially ALL items up to 1MB or pagination limit)
    ↓
VTL Response Template (runs on AppSync)
    ↓
For each item returned from DynamoDB:
  - Get user's Cognito groups from JWT: ["COMPANY_A_USER"]
  - Get item's groups field: ["COMPANY_A_ADMIN", "COMPANY_A_USER", "COMPANY_A_READER"]
  - Check: Does any user group match any item group?
    - YES → Include in response
    - NO → Exclude from response
    ↓
Filtered Response returned to user
```

### What This Means

**Key Points**:
1. **DynamoDB doesn't know about authorization** - it returns data blindly based on the query
2. **Filtering happens in AppSync** - VTL template loops through results and checks group membership
3. **Not true database-level filtering** - DynamoDB scans more data than necessary
4. **But functionally correct** - Users only see authorized data, never unauthorized data

**Performance Implications**:
- Less efficient than native DynamoDB filtering
- Scans more read capacity units than ideal
- But for most use cases (< 1000 items per query), this is acceptable

### The 1000 Item Limit

**Critical Discovery**: VTL for-loops have a hard AWS limit of **1000 iterations**.

**What This Means**:
- If a DynamoDB scan returns 10,000 items, the VTL template can only check the first 1000
- Queries returning > 1000 items may fail or return incomplete results
- Pagination helps, but each page is still limited to 1000 items

**Solution for Large Datasets**:
- Use pagination (limit queries to < 1000 items per page)
- Consider partition key strategies (separate data by tenant at storage level)
- For production scale (> 1000 items), investigate custom resolvers with DynamoDB filter expressions

**For MVP**: Acceptable if queries typically return < 1000 items.

---

## Multi-Tenant SaaS Pattern

### The Compound Groups Pattern

**Pattern**: `{COMPANY_CODE}_{ROLE}`

**Example**:
```
Cognito Groups:
- SUPER_ADMIN              ← BeonIQ staff
- ACME_ADMIN               ← Acme Logistics admins
- ACME_USER                ← Acme regular users
- ACME_READER              ← Acme read-only users
- BETA_ADMIN               ← Beta Corp admins
- BETA_USER                ← Beta regular users
- BETA_READER              ← Beta read-only users
```

### Schema Setup

```typescript
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  TransportationInsight: a.model({
    title: a.string().required(),
    content: a.string(),
    kpiValue: a.float(),
    companyId: a.id().required(),  // Still store for reference/queries
    createdAt: a.datetime(),
    groups: a.string().array(),    // ✅ Authorization field
  })
  .authorization(allow => [
    allow.groupsDefinedIn('groups'),  // ✅ Dynamic groups
    allow.group('SUPER_ADMIN'),       // ✅ God mode
  ]),

  Company: a.model({
    name: a.string().required(),
    customerCode: a.string().required(),  // "ACME", "BETA"
    groups: a.string().array(),
  })
  .authorization(allow => [
    allow.groupsDefinedIn('groups'),
    allow.group('SUPER_ADMIN'),
  ]),

  User: a.model({
    cognitoUserId: a.string().required(),
    email: a.string().required(),
    companyId: a.id().required(),
    role: a.enum(['admin', 'user', 'reader']),
    groups: a.string().array(),
  })
  .authorization(allow => [
    allow.owner(),  // Users can update their own profile
    allow.groupsDefinedIn('groups'),
    allow.group('SUPER_ADMIN'),
  ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
```

### How It Achieves Tenant Isolation

**Scenario**: 100 rows in TransportationInsight table
- Rows 1-50: `groups: ["ACME_ADMIN", "ACME_USER", "ACME_READER"]`
- Rows 51-100: `groups: ["BETA_ADMIN", "BETA_USER", "BETA_READER"]`

**When Sarah (COMPANY_A_USER) queries**:
1. Sarah's JWT contains: `cognito:groups: ["COMPANY_A_USER"]`
2. Query executes: `client.models.TransportationInsight.list()`
3. DynamoDB returns all 100 rows
4. VTL template loops through each row:
   - Row 1: `groups` contains "COMPANY_A_USER" → ✅ Include
   - Row 2: `groups` contains "COMPANY_A_USER" → ✅ Include
   - ...
   - Row 51: `groups` does NOT contain "COMPANY_A_USER" → ❌ Exclude
   - Row 52: `groups` does NOT contain "COMPANY_A_USER" → ❌ Exclude
5. Sarah receives rows 1-50 ONLY

**When Bob (COMPANY_B_ADMIN) queries**:
- Same process, but Bob's group is `COMPANY_B_ADMIN`
- Bob receives rows 51-100 ONLY
- Bob NEVER sees rows 1-50

**When Abel (SUPER_ADMIN) queries**:
- Abel's group is `SUPER_ADMIN`
- All rows contain "SUPER_ADMIN" in their `groups` array
- Abel receives ALL 100 rows

**Result**: Perfect tenant isolation with zero custom filtering code!

---

## Implementation Guide

### Step 1: Define Schema with Dynamic Groups

```typescript
// amplify/data/resource.ts
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Insight: a.model({
    title: a.string().required(),
    content: a.string(),
    groups: a.string().array(),  // ✅ Add this field
  })
  .authorization(allow => [
    allow.groupsDefinedIn('groups'),
    allow.group('SUPER_ADMIN'),
  ]),
});
```

### Step 2: Create Helper Function

```typescript
// src/utils/authHelper.ts
import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Get the groups array to assign to a new record.
 * Includes all roles for the user's company + SUPER_ADMIN.
 */
export async function getUserCompanyGroups(): Promise<string[]> {
  const session = await fetchAuthSession();
  const userGroups = session.tokens?.accessToken.payload['cognito:groups'] as string[] || [];

  // Find the user's company group (e.g., "ACME_USER")
  const companyGroup = userGroups.find(g => g !== 'SUPER_ADMIN');

  if (!companyGroup) {
    // User is super admin only
    return ['SUPER_ADMIN'];
  }

  // Extract company code (e.g., "ACME" from "ACME_USER")
  const companyCode = companyGroup.split('_')[0];

  // Return all roles for this company
  return [
    `${companyCode}_ADMIN`,
    `${companyCode}_USER`,
    `${companyCode}_READER`,
    'SUPER_ADMIN'
  ];
}
```

### Step 3: Create Data with Groups

```typescript
// src/components/CreateInsight.tsx
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { getUserCompanyGroups } from '@/utils/authHelper';

const client = generateClient<Schema>();

async function createInsight(title: string, content: string) {
  // Get groups for this user's company
  const groups = await getUserCompanyGroups();

  // Create record with groups array
  const { data, errors } = await client.models.Insight.create({
    title,
    content,
    groups,  // ✅ Automatically scoped to user's company
  }, {
    authMode: 'userPool'
  });

  if (errors) {
    console.error('Error creating insight:', errors);
    return null;
  }

  return data;
}
```

### Step 4: Query Data (Automatic Filtering)

```typescript
// src/app/dashboard/page.tsx
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

async function fetchInsights() {
  // No filter needed - Amplify handles it!
  const { data, errors } = await client.models.Insight.list({
    authMode: 'userPool'
  });

  if (errors) {
    console.error('Error fetching insights:', errors);
    return [];
  }

  // data contains ONLY records where user's group is in the groups array
  return data;
}
```

### Step 5: Create Cognito Groups

**One-Time Setup for Each Company**:

```bash
# In AWS Cognito Console or via AWS CLI:

# Create groups for Company A
aws cognito-idp create-group \
  --group-name ACME_ADMIN \
  --user-pool-id us-east-1_XXXXXX \
  --description "Acme Logistics Administrators"

aws cognito-idp create-group \
  --group-name ACME_USER \
  --user-pool-id us-east-1_XXXXXX \
  --description "Acme Logistics Users"

aws cognito-idp create-group \
  --group-name ACME_READER \
  --user-pool-id us-east-1_XXXXXX \
  --description "Acme Logistics Read-Only Users"

# Repeat for each company...
```

**Or via Amplify Auth Triggers** (automated):

```typescript
// amplify/auth/post-confirmation/handler.ts
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';

export const handler = async (event) => {
  const client = new CognitoIdentityProviderClient();

  const companyId = event.request.userAttributes['custom:companyId'];
  const role = event.request.userAttributes['custom:role'];

  // Construct group name
  const groupName = `${companyId.toUpperCase()}_${role.toUpperCase()}`;

  // Add user to group
  await client.send(new AdminAddUserToGroupCommand({
    UserPoolId: event.userPoolId,
    Username: event.userName,
    GroupName: groupName
  }));

  return event;
};
```

---

## Limitations & Considerations

### Performance

**Read Capacity**:
- DynamoDB scans more items than necessary (not filtered at DB level)
- Higher read capacity units consumed
- For most apps (< 10,000 items per table): negligible impact
- For large-scale (> 100,000 items): consider partition key strategies

**VTL Processing**:
- Filtering happens in AppSync (additional latency)
- Typically < 100ms for reasonable result sets
- Noticeable only for very large queries

### Scale Limits

**The 1000 Item Limit**:
- VTL for-loops max out at 1000 iterations
- Queries returning > 1000 items may fail or return incomplete results
- **Mitigation**: Use pagination, limit query scopes

**Cognito Group Limits**:
- Max 500 groups per User Pool
- Max 100 groups per user
- For large multi-tenant apps (> 500 companies): may need alternative architecture

### Storage Cost

**Additional Field**:
- Each record stores a `groups` array (typically 3-5 group names)
- Small storage overhead (< 100 bytes per record)
- Negligible cost impact for most applications

### Subscription Limitations

From AWS documentation:

**If you authorize based on a single group** (`allow.groupDefinedIn('group')`):
- Subscriptions only supported if user is part of **5 or fewer** user groups

**If you authorize via an array of groups** (`allow.groupsDefinedIn('groups')`):
- Subscriptions only supported if user is part of **20 or fewer** groups
- You can only authorize **20 or fewer** user groups per record

**For most apps**: These limits are acceptable (users rarely belong to > 20 groups).

---

## Common Pitfalls

### 1. Forgetting to Add Groups When Creating Records

❌ **Wrong**:
```typescript
await client.models.Insight.create({
  title: "My Insight",
  content: "Some content",
  // Missing groups array!
});
```

**Result**: Record created with empty `groups` array → NO ONE can access it (not even creator!)

✅ **Correct**:
```typescript
const groups = await getUserCompanyGroups();
await client.models.Insight.create({
  title: "My Insight",
  content: "Some content",
  groups,  // ✅ Always include groups
});
```

---

### 2. Hardcoding Group Names

❌ **Wrong**:
```typescript
await client.models.Insight.create({
  title: "My Insight",
  groups: ["ACME_ADMIN", "ACME_USER", "SUPER_ADMIN"]  // ❌ Hardcoded
});
```

**Problem**: Breaks when user from different company tries to create data.

✅ **Correct**:
```typescript
const groups = await getUserCompanyGroups();  // ✅ Dynamic
await client.models.Insight.create({
  title: "My Insight",
  groups
});
```

---

### 3. Not Including SUPER_ADMIN in Groups

❌ **Wrong**:
```typescript
const groups = [`${companyCode}_ADMIN`, `${companyCode}_USER`];
// Missing SUPER_ADMIN!
```

**Result**: Super admins can't access the record for debugging/support.

✅ **Correct**:
```typescript
const groups = [
  `${companyCode}_ADMIN`,
  `${companyCode}_USER`,
  `${companyCode}_READER`,
  'SUPER_ADMIN'  // ✅ Always include for support access
];
```

---

### 4. Mixing Authorization Strategies

❌ **Wrong**:
```typescript
.authorization(allow => [
  allow.groups(['ADMIN']),        // Static groups
  allow.groupsDefinedIn('groups') // Dynamic groups
])
```

**Problem**: Confusing, hard to reason about. Pick one strategy per model.

✅ **Correct**:
```typescript
// Option 1: Only dynamic groups
.authorization(allow => [
  allow.groupsDefinedIn('groups'),
  allow.group('SUPER_ADMIN')  // Exception for god mode
])

// OR Option 2: Only static groups (for non-tenant data)
.authorization(allow => [
  allow.groups(['ADMIN', 'MODERATOR'])
])
```

---

### 5. Forgetting to Deploy Schema Changes

**After adding `groups` field**:

```bash
# REQUIRED: Re-deploy backend
npx ampx sandbox
```

**Without this**: Field doesn't exist in DynamoDB, queries will fail.

---

### 6. Not Handling Empty Groups Array

❌ **Wrong**:
```typescript
const groups = await getUserCompanyGroups();
// What if groups is empty or null?

await client.models.Insight.create({ groups });
```

**Result**: Record created with no authorization → no one can access it.

✅ **Correct**:
```typescript
const groups = await getUserCompanyGroups();

if (!groups || groups.length === 0) {
  throw new Error('User has no groups assigned - cannot create record');
}

await client.models.Insight.create({ groups });
```

---

## Summary

**What We Learned**:

1. ✅ **Dynamic Groups** (`allow.groupsDefinedIn('groups')`) is the best solution for multi-tenant SaaS
2. ✅ **Filtering happens in AppSync VTL**, not at DynamoDB level (still secure, slightly less efficient)
3. ✅ **Compound groups pattern** (`COMPANY_A_ADMIN`, `COMPANY_A_USER`) achieves perfect tenant isolation
4. ✅ **1000 item VTL limit** exists but is acceptable for most MVP use cases
5. ✅ **Always include groups array** when creating records
6. ✅ **Always include SUPER_ADMIN** for support/debugging access

**When to Use This Pattern**:
- Multi-tenant B2B SaaS applications
- Each tenant has multiple user roles (admin, user, reader)
- Need row-level data isolation between tenants
- Query volumes < 1000 items per request

**When NOT to Use**:
- Single-tenant applications (use `allow.owner()` or `allow.authenticated()`)
- Queries regularly return > 1000 items (consider partition key strategies)
- Need database-level filtering for performance (consider custom resolvers)

**Related Documentation**:
- [Multi-Tenant Authorization Architecture](../../../MULTI_TENANT_AUTHORIZATION.md)
- [Super Admin Impersonation Requirements](../../../resources/requirements/SUPER_ADMIN_IMPERSONATION.md)
- [Auth Patterns - B2B Multi-Tenant](../auth/AUTH_PATTERNS.md)

---

*Last Updated: 2025-10-16*
