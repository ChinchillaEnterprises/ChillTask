# Amplify Auth Examples

**Complete authentication patterns and security best practices for AWS Amplify Gen 2.**

---

## 📚 Documentation Structure

This folder contains **3 comprehensive guides** that consolidate all authentication knowledge:

### 1. **[AUTH_PATTERNS.md](./AUTH_PATTERNS.md)** - Choose Your Auth Strategy
   **Start here.** Covers 5 complete authentication patterns with copy-paste code:
   - Pattern 1: Basic Email Auth (simple MVP)
   - Pattern 2: Social Authentication (consumer apps)
   - Pattern 3: B2B Multi-Tenant (SaaS platforms) ⭐ **Most common**
   - Pattern 4: Enterprise SSO (corporate tools)
   - Pattern 5: Passwordless Auth (modern UX)

   **Includes:**
   - Decision tree to pick the right pattern
   - Complete `amplify/auth/resource.ts` configurations
   - Client-side implementation examples
   - Environment setup instructions
   - When to use each pattern

### 2. **[TRIGGERS_GUIDE.md](./TRIGGERS_GUIDE.md)** - Lambda Trigger Implementations
   **Use this for advanced customization.** Production-ready Lambda triggers:
   - Pre Sign-up (domain validation, invitation codes)
   - Post Confirmation (create profiles, welcome emails)
   - Pre Token Generation (add custom claims, permissions)
   - Passwordless Auth Flow (magic links, OTP)

   **Includes:**
   - Complete trigger implementations
   - When to use each trigger type
   - Best practices and common gotchas
   - Client-side integration code

### 3. **[SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)** - Avoid Common Mistakes
   **Read this before deploying.** Critical security considerations:
   - The One-Shot Schema Problem (you can't delete custom attributes!)
   - Required attributes break SSO
   - Immutable attributes break SSO updates
   - Privilege escalation prevention
   - Cognito vs DynamoDB decision matrix
   - Pre-production checklist

   **Includes:**
   - What NOT to do (with examples)
   - Security vulnerabilities to avoid
   - Common configuration mistakes
   - How to fix mistakes (if possible)

---

## 🚀 Quick Start

### For AI Assistants
1. Read `AUTH_PATTERNS.md` to understand which pattern fits the use case
2. Copy the relevant configuration
3. Check `SECURITY_CHECKLIST.md` for common mistakes
4. If implementing triggers, reference `TRIGGERS_GUIDE.md`

### For Humans
1. **Choose your pattern** in `AUTH_PATTERNS.md` (see decision tree)
2. **Copy the configuration** to `amplify/auth/resource.ts`
3. **Review security checklist** in `SECURITY_CHECKLIST.md`
4. **Add triggers if needed** using `TRIGGERS_GUIDE.md`

---

## 🎯 Most Common Use Case: B2B Multi-Tenant SaaS

If you're building a B2B SaaS platform, go straight to **Pattern 3** in `AUTH_PATTERNS.md`.

This pattern includes:
- ✅ Multi-tenant data isolation via `custom:companyId`
- ✅ SSO integration (Okta, Google Workspace, Microsoft Entra)
- ✅ Role-based permissions (`custom:role`)
- ✅ Correct mutability settings (prevents SSO breakage)
- ✅ Minimal custom attributes (only 4 - you can never delete them!)

**This is the production-tested schema used by real B2B SaaS apps.**

---

## ⚠️ Critical: The One-Shot Decision

**Before you deploy, understand this:**

Custom attributes are **PERMANENT**. You can NEVER:
- Delete a custom attribute
- Change `required` from true to false
- Change `mutable` from false to true

**This is your one chance to get it right.**

Read `SECURITY_CHECKLIST.md` → "The One-Shot Schema Problem" section before creating custom attributes.

---

## 📊 What's Different About This Approach?

**Old approach (what most templates do):**
- Multiple `.ts` example files
- Fragments of code to copy
- No context on when/why to use patterns
- Easy to mix incompatible configurations
- Hard to search for specific information

**New approach (this template):**
- 3 comprehensive markdown guides
- Complete patterns with narrative explanation
- Decision trees show when to use what
- Production-tested configurations
- Easy to search, read linearly, or jump to sections

**Result:** AI assistants and humans both get the full context, not just code snippets.

---

## 🧠 Philosophy: Education Over Code

These guides teach **concepts**, not just syntax.

You'll understand:
- **Why** certain attributes should be mutable vs immutable
- **Why** required attributes break SSO
- **Why** you should use DynamoDB instead of custom attributes for analytics
- **Why** JWT token size matters
- **Why** privilege escalation is a risk

**Understanding the "why" prevents mistakes.**

---

## 📋 File Structure

```
resources/handbook/auth/
├── README.md                    ← You are here
├── AUTH_PATTERNS.md             ← 5 complete auth patterns
├── TRIGGERS_GUIDE.md            ← Lambda trigger implementations
└── SECURITY_CHECKLIST.md        ← Common mistakes & security
```

**That's it. Just 3 comprehensive guides.**

No scattered `.ts` files. No hunting for the right example. Everything you need in one place.

---

## 🎓 Learning Path

**If you're new to Amplify Auth:**
1. Read `AUTH_PATTERNS.md` → Pattern 1 (Basic Email Auth)
2. Implement it
3. Read `SECURITY_CHECKLIST.md` to understand common mistakes

**If you're building a B2B SaaS:**
1. Read `AUTH_PATTERNS.md` → Pattern 3 (B2B Multi-Tenant)
2. Read `SECURITY_CHECKLIST.md` → "The One-Shot Schema Problem"
3. Copy the configuration and customize

**If you need advanced customization:**
1. Pick your pattern from `AUTH_PATTERNS.md`
2. Add triggers from `TRIGGERS_GUIDE.md`
3. Verify against `SECURITY_CHECKLIST.md`

---

## 💡 Pro Tips

### For AI Assistants
- Always read `AUTH_PATTERNS.md` first to understand the patterns
- Reference `SECURITY_CHECKLIST.md` before suggesting custom attributes
- If a user asks about triggers, point them to `TRIGGERS_GUIDE.md`
- Don't make up auth configurations - use the tested patterns

### For Humans
- The decision tree in `AUTH_PATTERNS.md` will save you hours
- The security checklist prevents costly mistakes
- Custom attributes are permanent - choose carefully
- When in doubt, use fewer custom attributes (you can't delete them)

---

## 🔗 Related Documentation

- **[Amplify Official Docs](https://docs.amplify.aws/gen2/build-a-backend/auth/)** - AWS reference documentation
- **[Cognito Best Practices](https://docs.aws.amazon.com/cognito/latest/developerguide/best-practices.html)** - AWS security guidelines
- **[OAuth 2.0 Spec](https://oauth.net/2/)** - OAuth protocol documentation
- **[OpenID Connect](https://openid.net/connect/)** - OIDC specification

---

## ❓ FAQ

**Q: Why no TypeScript example files?**
A: TypeScript files look like "copy this whole file," which leads to mixing incompatible patterns. Markdown guides with inline code examples provide better context.

**Q: Can I add more custom attributes later?**
A: Yes, you can add more (up to 50 total), but you can NEVER delete them. Start minimal.

**Q: Can I change an attribute from required to optional later?**
A: No. All required/mutable settings are permanent.

**Q: What if I made a mistake?**
A: See `SECURITY_CHECKLIST.md` → "What to Do If You Made a Mistake" section.

**Q: Which pattern should I use?**
A: See the decision tree in `AUTH_PATTERNS.md`.

---

## 🚦 Next Steps

1. **Read** `AUTH_PATTERNS.md` and choose your pattern
2. **Review** `SECURITY_CHECKLIST.md` before deploying
3. **Implement** your auth configuration in `amplify/auth/resource.ts`
4. **Test** thoroughly in sandbox mode
5. **Deploy** with confidence

Good luck! 🚀
