# 📬 ChillTask
## Automated Slack-to-GitHub Context Archiving System

ChillTask automatically syncs Slack messages to your GitHub repositories, creating permanent, searchable archives of team communications organized by channel and date.

---

## 🎯 What It Does

ChillTask bridges the gap between ephemeral Slack conversations and permanent GitHub documentation. Every message in mapped Slack channels is automatically archived to your repository as timestamped markdown files.

**Example Output:**
```markdown
# 2025-10-11 - engineering

### 14:23 - @john
Fixed the authentication bug in production

### 14:25 - @sarah
Great! Can you document the fix in the README?

### 14:27 - @john
Done - see commit 5e4a20b
```

---

## ✨ Key Features

### 🔄 Automated Sync Pipeline
- **Real-time webhook** captures Slack messages instantly
- **Scheduled Lambda** syncs to GitHub every 5 minutes
- **Smart batching** groups messages by day and channel
- **Automatic commits** with descriptive messages

### 🗺️ Channel Mapping
- Map any Slack channel to any GitHub repository
- Flexible routing: multiple channels → one repo, or one channel → multiple repos
- Track sync status and message counts per mapping
- Easy activation/deactivation of mappings

### 📊 Statistics Dashboard
- Last sync timestamp for each channel
- Total messages archived per mapping
- Real-time status updates
- Visual indicators for active/inactive mappings

### 🔒 Enterprise-Grade Security
- AWS Cognito authentication
- API key and IAM authorization modes
- Secrets Manager for token storage
- Row-level security on all data

---

## 🏗️ Architecture

```
┌─────────────┐
│   Slack     │
│  Workspace  │
└──────┬──────┘
       │ Webhook
       ▼
┌─────────────────────┐
│  Next.js API Route  │
│  /slack-webhook     │
└──────┬──────────────┘
       │ Saves to
       ▼
┌─────────────────────┐       ┌──────────────┐
│  DynamoDB           │◄──────│   Lambda     │
│  SlackEvent Table   │       │  (Scheduled) │
└─────────────────────┘       └──────┬───────┘
                                     │ Syncs to
                                     ▼
                              ┌──────────────┐
                              │   GitHub     │
                              │  Repository  │
                              └──────────────┘
```

### Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- Material-UI v7
- AWS Amplify UI Components
- TypeScript

**Backend:**
- AWS Amplify Gen 2
- DynamoDB (data storage)
- Lambda (scheduled sync)
- EventBridge (scheduler)
- Secrets Manager (token storage)
- AppSync (GraphQL API)

**Integrations:**
- Slack Events API
- GitHub REST API v3
- Cognito User Pools

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- AWS Account with Amplify CLI configured
- Slack workspace with admin access
- GitHub personal access token

### Installation

```bash
# Clone the repository
git clone https://github.com/ChinchillaEnterprises/ChillTask.git
cd ChillTask

# Install dependencies
npm install

# Start Amplify sandbox (deploys backend to AWS)
npx ampx sandbox

# In a new terminal, start the dev server
npm run dev
```

Visit `http://localhost:3000` to see the app.

### Configuration

#### 1. Slack Webhook Setup

1. Go to [Slack API](https://api.slack.com/apps)
2. Create a new app → "From scratch"
3. Under "Event Subscriptions", enable events
4. Add your ngrok URL: `https://your-ngrok-url.ngrok.io/api/slack-webhook/events`
5. Subscribe to bot events: `message.channels`
6. Install app to workspace and note the Bot Token

#### 2. GitHub Token Setup

```bash
# Store GitHub token in AWS Secrets Manager
aws secretsmanager create-secret \
  --name github-token \
  --secret-string '{"token":"ghp_your_token_here"}' \
  --region us-east-1
```

Your token needs `repo` scope for private repos, or `public_repo` for public repos only.

#### 3. Create a Channel Mapping

1. Sign in to ChillTask
2. Navigate to "Channel Mappings"
3. Click "Create New Mapping"
4. Fill in:
   - **Slack Channel:** Select from dropdown
   - **GitHub Repository:** Select from dropdown
   - **Context Folder:** Where messages are saved (e.g., `context/communications/slack`)

Done! Messages will start syncing every 5 minutes.

---

## 📁 Project Structure

```
ChillTask/
├── amplify/
│   ├── data/
│   │   └── resource.ts              # GraphQL schema & authorization
│   └── functions/
│       ├── sync-slack-to-github/    # Scheduled Lambda (every 5 min)
│       ├── sync-slack-history/      # Manual backfill Lambda
│       ├── get-slack-channels/      # Fetch Slack channels
│       ├── get-github-repos/        # Fetch GitHub repos
│       └── get-github-branches/     # Fetch repo branches
├── src/
│   ├── app/
│   │   ├── channel-mappings/        # Mapping CRUD UI
│   │   ├── api/
│   │   │   ├── slack-webhook/       # Receives Slack events
│   │   │   └── github-webhook/      # Receives GitHub events
│   │   └── authentication/          # Sign in/up pages
│   ├── components/
│   │   ├── Layout/                  # Sidebar, navbar, footer
│   │   └── Authentication/          # Auth forms
│   └── providers/
│       └── AuthProvider.tsx         # Amplify auth configuration
├── context/
│   └── communications/
│       └── slack/                   # Synced messages appear here
│           └── {channel}/
│               └── YYYY-MM-DD.md    # Daily message logs
└── amplify_outputs.json             # Auto-generated Amplify config
```

---

## 🔧 How It Works

### Message Flow

1. **User sends message in Slack**
   - Slack fires webhook to `/api/slack-webhook/events`

2. **Webhook saves to DynamoDB**
   ```typescript
   SlackEvent {
     eventType: "message",
     channelId: "C0928ADBKA6",
     userId: "U072PCVTS00",
     messageText: "Hello world",
     timestamp: "1697040000.123456",
     processed: false,  // ← Lambda will process this
     ttl: 1697043600    // Auto-delete after 10 minutes
   }
   ```

3. **Lambda runs every 5 minutes**
   - Queries all `processed: false` messages
   - Groups by channel → looks up mappings
   - For each message:
     - Fetches existing markdown file from GitHub (if exists)
     - Appends new message with timestamp
     - Commits to GitHub
     - Marks message as `processed: true`
     - Updates mapping stats

4. **GitHub file created/updated**
   ```markdown
   # 2025-10-11 - engineering

   ### 14:23 - @john
   Hello world
   ```

### Data Models

**ChannelMapping**
```typescript
{
  id: string
  slackChannel: string        // "engineering"
  slackChannelId: string      // "C0928ADBKA6"
  githubRepo: string          // "my-project"
  githubUrl: string           // Full GitHub URL
  githubBranch: string        // "main"
  githubOwner: string         // "ChinchillaEnterprises"
  contextFolder: string       // "context/communications/slack"
  isActive: boolean
  lastSync: string            // ISO timestamp
  messageCount: number        // Total messages synced
}
```

**SlackEvent** (temporary storage, 10-min TTL)
```typescript
{
  id: string
  eventType: string           // "message"
  channelId: string
  userId: string
  messageText: string
  timestamp: string           // Slack timestamp
  threadTs: string            // Thread parent (if reply)
  processed: boolean
  ttl: number                 // Unix timestamp for auto-deletion
}
```

---

## 📚 Usage Examples

### Create a Channel Mapping

```typescript
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

await client.models.ChannelMapping.create({
  slackChannel: "engineering",
  slackChannelId: "C0928ADBKA6",
  githubRepo: "my-project",
  githubUrl: "https://github.com/ChinchillaEnterprises/my-project",
  githubBranch: "main",
  githubOwner: "ChinchillaEnterprises",
  contextFolder: "context/communications/slack",
  isActive: true,
});
```

### Query Slack Channels

```typescript
const { data: channels } = await client.queries.getSlackChannels();
// Returns: [{ id: "C123", name: "engineering", isPrivate: false }, ...]
```

### Trigger Manual Sync

```typescript
const { data: result } = await client.mutations.syncSlackHistory({
  channelId: "C0928ADBKA6"
});
// Backfills all messages from Slack history
```

---

## 🔐 Security & Permissions

### Amplify Authorization Modes

ChillTask uses multiple authorization strategies:

**Public API Key** (for webhooks)
- Slack webhook endpoint
- GitHub webhook endpoint
- Channel/repo query endpoints

**Cognito User Pools** (for authenticated users)
- Channel mapping CRUD
- Manual sync triggers
- Statistics dashboard

**IAM** (for Lambda functions)
- Scheduled sync Lambda
- DynamoDB access
- Secrets Manager access

### Required AWS Permissions

The Amplify-generated service role needs:
- `dynamodb:Query`, `dynamodb:PutItem`, `dynamodb:UpdateItem`
- `secretsmanager:GetSecretValue`
- `lambda:InvokeFunction`

### GitHub Token Permissions

Minimum required scopes:
- `repo` (for private repositories)
- `public_repo` (for public repositories)

---

## 🛠️ Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

### Deploying to Amplify Hosting

```bash
# Deploy backend
npx ampx pipeline-deploy --branch main --app-id <your-app-id>

# Deploy frontend (via Amplify Console)
git push origin main
```

---

## 🐛 Troubleshooting

### Messages not syncing

1. **Check Lambda logs:**
   ```bash
   npx ampx sandbox
   # Look for sync-slack-to-github logs
   ```

2. **Verify GitHub token:**
   ```bash
   aws secretsmanager get-secret-value --secret-id github-token --region us-east-1
   ```

3. **Check channel mapping:**
   - Ensure `isActive: true`
   - Verify `slackChannelId` matches Slack's internal ID
   - Confirm `githubOwner` is set

### Webhook not receiving events

1. **Verify Slack app configuration:**
   - Event Subscriptions enabled
   - Request URL verified (green checkmark)
   - Bot token installed to workspace

2. **Check ngrok:**
   ```bash
   ngrok http 3001
   # Copy HTTPS URL to Slack Event Subscriptions
   ```

3. **Check API route logs:**
   - Look for `[Slack Webhook] Request received` in terminal
   - Errors should show `resultId: undefined, errors: [...]`

### GitHub API 401 Unauthorized

The token in Secrets Manager must have structure:
```json
{"token": "ghp_..."}
```

NOT:
```json
{"GITHUB_TOKEN": "ghp_..."}
```

Update with:
```bash
aws secretsmanager update-secret \
  --secret-id github-token \
  --secret-string '{"token":"ghp_your_token"}' \
  --region us-east-1
```

---

## 📊 Monitoring & Observability

### CloudWatch Logs

Lambda execution logs include:
- `📊 Found X unprocessed messages`
- `✅ Synced to GitHub`
- `✅ Updated mapping: +X messages (total: Y)`
- `⏱️ Total time: Xms`

### DynamoDB Metrics

Monitor:
- `SlackEvent` table size (should stay small with TTL)
- `ChannelMapping` read/write capacity
- Throttled requests

### GitHub Commit History

Each sync creates commits with messages like:
- `Create daily log for engineering on 2025-10-11`
- `Add message from @john at 14:23`

---

## 🚀 Roadmap

- [ ] Thread support (preserve reply threading)
- [ ] Emoji reactions in markdown
- [ ] File attachments (images, PDFs)
- [ ] Search interface for archived messages
- [ ] Analytics dashboard (messages per day/channel)
- [ ] Multiple Slack workspaces
- [ ] Configurable sync frequency
- [ ] Email notifications for sync failures

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [AWS Amplify Gen 2](https://docs.amplify.aws/)
- UI powered by [Material-UI](https://mui.com/)
- Slack integration via [Slack Events API](https://api.slack.com/events-api)
- GitHub sync via [GitHub REST API](https://docs.github.com/en/rest)

---

**Built with ❤️ by [Chinchilla Enterprises](https://github.com/ChinchillaEnterprises)**

*Archiving team context, one message at a time.*
