# GitHub Webhooks Example

**Coming soon: Complete working example of handling GitHub webhooks using Next.js API Routes + Amplify Data.**

---

## 🎯 What This Will Show

- ✅ GitHub webhook handler for repository events
- ✅ Signature verification with HMAC-SHA256
- ✅ Event storage in DynamoDB
- ✅ Support for multiple event types (push, PR, issues, etc.)
- ✅ Fast acknowledgment (< 3 seconds)

---

## 📋 Common GitHub Events

| Event Type | Description | Use Case |
|------------|-------------|----------|
| `push` | Code pushed to repository | Trigger CI/CD |
| `pull_request` | PR opened/updated/merged | Code review automation |
| `issues` | Issue created/updated/closed | Project management sync |
| `release` | New release published | Deployment automation |
| `star` | Repository starred | Analytics tracking |
| `watch` | Repository watched | User engagement tracking |
| `fork` | Repository forked | Distribution metrics |

**Full list:** https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads

---

## 🔐 GitHub Signature Verification

GitHub signs webhooks with HMAC-SHA256:

```typescript
import { createHmac } from 'crypto';

function verifyGitHubSignature(
  payload: string,
  signature: string,  // x-hub-signature-256 header
  secret: string
): boolean {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  return expectedSignature === signature;
}
```

**Key differences from Slack:**
- Header: `x-hub-signature-256` (not `x-slack-signature`)
- Format: `sha256=<hash>` (not `v0=<hash>`)
- No timestamp replay protection (relies on HTTPS + signature only)

---

## 📝 Recommended Schema

```typescript
GitHubEvent: a.model({
  eventId: a.string().required(),        // X-GitHub-Delivery header (unique ID)
  eventType: a.string().required(),      // push, pull_request, issues, etc.
  repository: a.string().required(),     // owner/repo-name
  action: a.string(),                    // opened, closed, created, etc.
  senderId: a.string(),                  // GitHub user ID who triggered event
  senderLogin: a.string(),               // GitHub username
  ref: a.string(),                       // Git ref (e.g., refs/heads/main)
  data: a.json().required(),             // Full event payload
  ttl: a.integer(),                      // Auto-delete after processing
  processedAt: a.datetime(),
  processingStatus: a.enum(['pending', 'processed', 'failed']),
})
.authorization((allow) => [
  allow.publicApiKey(),
])
```

---

## 💡 Key Differences from Slack/Stripe

**GitHub Specifics:**
1. **Event ID header** - `X-GitHub-Delivery` contains unique event ID
2. **Event type header** - `X-GitHub-Event` tells you the event type (before parsing body)
3. **Action property** - Many events have an `action` field (opened, closed, etc.)
4. **No retry mechanism** - GitHub doesn't automatically retry failed webhooks
5. **Ping event** - GitHub sends a `ping` event when you first create the webhook

**Handling ping event:**
```typescript
const eventType = request.headers.get('x-github-event');

if (eventType === 'ping') {
  console.log('GitHub webhook ping received');
  return Response.json({ pong: true });
}
```

---

## 🚀 Quick Start (When Available)

```bash
# Copy the files
cp route.ts your-app/app/api/github/webhook/route.ts
cp schema.ts your-app/amplify/data/resource.ts

# Add environment variable
echo "GITHUB_WEBHOOK_SECRET=your-secret" > .env.local

# Start sandbox
npx ampx sandbox

# Test locally with ngrok
ngrok http 3000
# Configure webhook in GitHub repo settings
```

---

## 🔧 GitHub Webhook Configuration

In your GitHub repository:

1. Go to **Settings** → **Webhooks** → **Add webhook**
2. **Payload URL**: `https://yourdomain.com/api/github/webhook`
3. **Content type**: `application/json`
4. **Secret**: Generate a random string (use as `GITHUB_WEBHOOK_SECRET`)
5. **Which events?**: Choose events you want (or "Send me everything")
6. **Active**: ✅ Checked
7. Click **Add webhook**

GitHub will send a `ping` event immediately to verify the endpoint works.

---

## 📊 Event Payload Examples

### Push Event

```json
{
  "ref": "refs/heads/main",
  "repository": {
    "name": "my-repo",
    "owner": { "login": "username" }
  },
  "pusher": { "name": "username" },
  "commits": [
    {
      "id": "abc123...",
      "message": "feat: Add new feature",
      "author": { "name": "User", "email": "user@example.com" }
    }
  ]
}
```

### Pull Request Event

```json
{
  "action": "opened",
  "pull_request": {
    "number": 42,
    "title": "Fix bug",
    "state": "open",
    "user": { "login": "username" },
    "head": { "ref": "feature-branch" },
    "base": { "ref": "main" }
  }
}
```

---

## 🎯 Common Use Cases

### 1. CI/CD Trigger

```typescript
if (eventType === 'push' && body.ref === 'refs/heads/main') {
  // Trigger deployment
  await dataClient.mutations.triggerDeployment({
    repository: body.repository.full_name,
    commit: body.after,
  });
}
```

### 2. Auto-labeling PRs

```typescript
if (eventType === 'pull_request' && body.action === 'opened') {
  // Analyze files changed and add labels
  const files = body.pull_request.changed_files;
  const labels = analyzeChangedFiles(files);

  await dataClient.mutations.labelPullRequest({
    prNumber: body.pull_request.number,
    labels,
  });
}
```

### 3. Issue Tracking Sync

```typescript
if (eventType === 'issues' && body.action === 'opened') {
  // Sync to external project management tool
  await dataClient.mutations.syncIssueToExternal({
    issueNumber: body.issue.number,
    title: body.issue.title,
    assignees: body.issue.assignees,
  });
}
```

---

## 📚 Resources

- **[GitHub Webhooks Guide](https://docs.github.com/en/developers/webhooks-and-events/webhooks)** - Official documentation
- **[Webhook Events](https://docs.github.com/en/developers/webhooks-and-events/webhooks/webhook-events-and-payloads)** - All event types
- **[Securing Webhooks](https://docs.github.com/en/developers/webhooks-and-events/webhooks/securing-your-webhooks)** - Security guide
- **[Testing Webhooks](https://docs.github.com/en/developers/webhooks-and-events/webhooks/testing-webhooks)** - Local testing

---

## 🔔 Status

**Status:** 📝 Documentation planned

**Coming soon!** Full implementation with:
- Complete route.ts implementation
- Schema definition
- Signature verification
- Event type handling
- Testing guide

**Want to help?** Contributions welcome! See the Slack example for the pattern to follow.

---

## 💡 In the Meantime

Use the **Slack events example** as a reference - the pattern is nearly identical:

1. Get event type from `x-github-event` header
2. Verify webhook signature with HMAC-SHA256
3. Handle `ping` event (GitHub's URL verification)
4. Store event in DynamoDB with TTL
5. Acknowledge fast (< 3 seconds)
6. Trigger async processing if needed

The core concepts are the same, just different headers and signature format!
