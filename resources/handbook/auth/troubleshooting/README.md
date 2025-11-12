# Authentication Troubleshooting Guides

**Deep-dive debugging guides for specific authentication issues.**

---

## 📚 Available Guides

### [CALLBACK_URL_BEHAVIOR.md](./CALLBACK_URL_BEHAVIOR.md)

**OAuth Callback URL Behavior and Cookie Conflicts**

**When to use:** Debugging OAuth redirects to wrong port/URL

**What's inside:**
- How Cognito callback URL selection actually works
- Cookie conflicts when running multiple Amplify apps on localhost
- Complete testing methodology with proof
- Solutions for running multiple apps simultaneously
- Best practices for callback URL configuration

**Key discovery:** Callback URL arrays are whitelists for validation, not selection lists. The Amplify SDK sends `redirect_uri` using `window.location.origin`, and Cognito validates it. OAuth redirects to wrong port are caused by cookie conflicts from multiple apps on the same domain, not Cognito configuration issues.

**Common symptoms:**
- OAuth redirects to port 3000 instead of 3003
- Multiple Amplify apps interfering with each other's auth
- Confusion about purpose of callback URL arrays

---

## 🔍 Common Issues Quick Reference

| Issue | Guide | Solution |
|-------|-------|----------|
| **OAuth redirects to wrong port** | CALLBACK_URL_BEHAVIOR.md | Cookie conflicts - stop other apps, clear cookies |
| **Callback URL arrays confusing** | CALLBACK_URL_BEHAVIOR.md | Arrays are whitelists for environments, not selection |
| **Multiple apps on localhost** | CALLBACK_URL_BEHAVIOR.md | Use different domains or one app at a time |

---

## 🎯 Future Troubleshooting Guides

As we encounter and solve more authentication issues, new guides will be added here:

- **COGNITO_ERRORS.md** - Common Cognito error messages and fixes
- **TOKEN_REFRESH_ISSUES.md** - Debugging token refresh failures
- **MFA_PROBLEMS.md** - Multi-factor authentication troubleshooting
- **SSO_DEBUGGING.md** - Enterprise SSO integration issues
- **SESSION_MANAGEMENT.md** - Session persistence and logout issues

---

## 🔗 Related Documentation

**Back to auth guides:**
- [auth/README.md](../README.md) - Main auth navigation hub
- [CLIENT_SIDE_SETUP.md](../CLIENT_SIDE_SETUP.md) - Client-side auth setup
- [SERVER_SIDE_SETUP.md](../SERVER_SIDE_SETUP.md) - Server-side auth setup
- [SECURITY_CHECKLIST.md](../SECURITY_CHECKLIST.md) - Security best practices

**Other troubleshooting:**
- [webhooks/troubleshooting.md](../../webhooks/troubleshooting.md) - Webhook debugging
- [functions/LAMBDA_DYNAMODB_ACCESS.md](../../functions/LAMBDA_DYNAMODB_ACCESS.md) - Lambda permission issues

---

## 💡 Contributing

Found a solution to an auth issue? Consider documenting it here:

1. Create a new `.md` file describing the problem and solution
2. Include testing methodology and proof
3. Add practical examples and code snippets
4. Update this README with a link
5. Update the main [auth/README.md](../README.md) if it's a common issue

---

**Remember:** Troubleshooting guides should be deep dives, not setup guides. Setup guides live in the parent auth/ folder.
