# TypeScript Path Aliases Reference

**Quick Reference:** How to import from different parts of your Amplify Gen 2 + Next.js project.

---

## The Problem

TypeScript path aliases make imports cleaner, but using the wrong alias causes build failures:

```typescript
// ❌ WRONG - Tries to import from src/amplify/ (doesn't exist)
import type { Schema } from '@/amplify/data/resource';

// Error: Cannot find module '@/amplify/data/resource'
```

---

## Project Path Mappings

Your `tsconfig.json` defines two path aliases:

| Alias | Maps To | Use For |
|-------|---------|---------|
| `@/*` | `./src/*` | Frontend code (components, hooks, pages) |
| `@root/*` | `./*` | Project root (amplify backend, config files) |

---

## Importing from Amplify Backend

**Always use `@root/` for Amplify imports:**

```typescript
// ✅ CORRECT - Imports from project root
import type { Schema } from '@root/amplify/data/resource';
import { generateClient } from 'aws-amplify/data';

const client = generateClient<Schema>();
```

**Why?**
- Amplify backend lives at project root (`amplify/`)
- `@/` points to `src/` folder only
- The `amplify/` folder is excluded from TypeScript compilation

---

## Import Pattern Reference

### Backend Schema Type

```typescript
// ✅ Always use @root
import type { Schema } from '@root/amplify/data/resource';
```

**Used in:**
- React hooks (`useInsights.ts`, `useKPIProgress.ts`)
- Page components (`ask-data/page.tsx`, `reports/page.tsx`)
- Admin pages (`admin/companies/page.tsx`)
- Anywhere you need `generateClient<Schema>()`

### Frontend Components

```typescript
// ✅ Use @/ for src/ folder
import { useAuth } from '@/providers/AuthProvider';
import { KPICard } from '@/components/KPICard';
import { formatCurrency } from '@/utils/formatting';
```

### Amplify Config (Generated)

```typescript
// ✅ Use @root for generated config
import outputs from '@root/amplify_outputs.json';
```

---

## Common Patterns

### Page Component Imports

```typescript
'use client';

// Frontend imports - use @/
import { useAuth } from '@/providers/AuthProvider';
import { KPICard } from '@/components/KPICard';

// Backend type imports - use @root
import type { Schema } from '@root/amplify/data/resource';
import { generateClient } from 'aws-amplify/data';

const client = generateClient<Schema>();
```

### Custom Hook Imports

```typescript
// hooks/useInsights.ts

// Backend type - use @root
import type { Schema } from '@root/amplify/data/resource';
import { generateClient } from 'aws-amplify/data';

const client = generateClient<Schema>();
```

### Server Component / Middleware

```typescript
// For server-side Amplify config
import outputs from '@root/amplify_outputs.json';
import { cookies } from 'next/headers';
```

---

## Decision Tree

```
Need to import something?
│
├─ Is it from the amplify/ folder?
│  └─ ✅ Use @root/amplify/...
│
├─ Is it from src/ folder? (components, hooks, utils, providers)
│  └─ ✅ Use @/...
│
└─ Is it amplify_outputs.json?
   └─ ✅ Use @root/amplify_outputs.json
```

---

## Troubleshooting

### Error: "Cannot find module '@/amplify/data/resource'"

**Cause:** Using `@/` instead of `@root/` for Amplify imports

**Fix:**
```typescript
// Change this:
import type { Schema } from '@/amplify/data/resource';

// To this:
import type { Schema } from '@root/amplify/data/resource';
```

### Error: Module not found after import changes

**Cause:** TypeScript cache is stale

**Fix:**
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

---

## Why This Matters

**The `amplify/` folder is excluded from TypeScript compilation** (see `tsconfig.json`):

```json
{
  "exclude": ["amplify/**/*"]
}
```

**This means:**
- Amplify backend code isn't compiled by Next.js TypeScript
- Types come from generated files (via `npx ampx sandbox`)
- You must use the correct path to access generated types
- Using `@/amplify/...` won't work because TypeScript looks in `src/amplify/`

---

## Quick Reference Card

**Copy this into your component:**

```typescript
// ✅ AMPLIFY BACKEND IMPORTS - Use @root
import type { Schema } from '@root/amplify/data/resource';
import outputs from '@root/amplify_outputs.json';

// ✅ FRONTEND IMPORTS - Use @/
import { ComponentName } from '@/components/ComponentName';
import { useCustomHook } from '@/hooks/useCustomHook';
import { utilFunction } from '@/utils/utilFunction';
import { useAuth } from '@/providers/AuthProvider';
```

---

## See Also

- [Frontend README](./README.md) - Frontend patterns overview
- [AI-DEVELOPMENT-GUIDELINES.md](../AI-DEVELOPMENT-GUIDELINES.md) - Core development rules
- [data/GROUP_AUTHORIZATION.md](../data/GROUP_AUTHORIZATION.md) - Using Schema types for authorization

---

**Remember:** When importing from Amplify backend, always use `@root/`. When importing from `src/`, use `@/`.
