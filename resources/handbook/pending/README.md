# Pending / Future Implementations

This folder contains documentation for features that are **researched but not yet implemented** in the template.

---

## What Goes Here?

- Features that require manual steps we haven't automated yet
- Features waiting on AWS/Amplify native support
- Complex implementations we've designed but haven't built
- Research findings for future enhancements

---

## Current Pending Features

### [COGNITO_CUSTOM_DOMAIN.md](./COGNITO_CUSTOM_DOMAIN.md)
**Status:** Research complete, awaiting Amplify Gen 2 native support

Custom auth domains using the pattern `auth.{client}.chinchilla-ai.com` instead of ugly default Cognito domains.

**Why pending:**
- Amplify Gen 2 doesn't support custom Cognito domains natively
- Requires CDK escape hatch + manual ACM certificate setup
- `amplify_outputs.json` doesn't update properly
- Too many manual steps to be practical for template

**Decision:** Focus on automating hosting domains first, leave auth domains as optional manual setup for production.

---

## How to Use This Folder

**For AI Assistants:**
- Reference these docs when users ask about pending features
- Explain what's possible vs what's automated
- Provide manual workarounds if needed

**For Developers:**
- Check here before implementing a feature (might already be researched)
- Move docs out of `pending/` once implemented
- Update main README when features graduate

---

## Contributing

When researching a new feature:
1. Create a markdown file in this folder
2. Include research findings, limitations, and why it's pending
3. Document manual workarounds if they exist
4. Link to relevant GitHub issues, AWS docs, Stack Overflow threads
5. Define "what would make this ready to implement"

---

## Moving Features Out of Pending

When a feature is ready:
1. Implement the feature in the template
2. Move documentation to appropriate handbook section
3. Update main README with new feature
4. Delete or archive the pending doc

---

**Remember:** Pending doesn't mean impossible - it means "not automated yet."
