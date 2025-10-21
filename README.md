# 📬 ChillTask
## Automated Slack-to-GitHub Context Archiving System

ChillTask automatically syncs Slack messages to your GitHub repositories, creating permanent, searchable archives of team communications organized by channel and date.

Built with **AWS Amplify Gen 2** and the **Chill Amplify Template** framework.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start Amplify sandbox (deploys backend to AWS)
npx ampx sandbox

# In a new terminal, start the dev server
npm run dev
```

Visit `http://localhost:3000` to see your app!

---

## 🎯 What It Does

ChillTask bridges the gap between ephemeral Slack conversations and permanent GitHub documentation. Every message in mapped Slack channels is automatically archived to your repository as timestamped markdown files.

### Key Features

- 🔄 **Automated Sync Pipeline** - Real-time webhook captures + scheduled Lambda sync
- 🗺️ **Channel Mapping** - Flexible routing between Slack channels and GitHub repos
- 📊 **Statistics Dashboard** - Track sync status and message counts
- 🔒 **Enterprise-Grade Security** - AWS Cognito authentication + API key authorization

---

## 📁 Project Structure

```
ChillTask/
├── amplify/
│   ├── data/resource.ts              # GraphQL schema & authorization
│   └── functions/
│       ├── sync-slack-to-github/     # Scheduled Lambda (every 5 min)
│       └── sync-slack-history/       # Manual backfill Lambda
├── src/
│   ├── app/
│   │   ├── channel-mappings/         # Mapping CRUD UI
│   │   ├── webhook-monitor/          # Webhook monitoring dashboard
│   │   └── api/
│   │       ├── slack-webhook/        # Receives Slack events
│   │       └── github-webhook/       # Receives GitHub events
│   └── components/Layout/            # Template-based UI components
├── context/communications/slack/     # Synced messages appear here
└── handbook/                         # Development documentation
```

---

## 🏗️ Built on Chill Amplify Template

This app uses the Chill Amplify Template framework for rapid development.

**Template Documentation:**
- 📖 **Development Guidelines:** `handbook/AI-DEVELOPMENT-GUIDELINES.md`
- 🔐 **Authentication Setup:** `handbook/auth/`
- 🔧 **Lambda Functions:** `handbook/functions/`
- 🌐 **Webhooks Guide:** `handbook/webhooks/`

**Critical Rules:**
- ✅ Use Amplify Gen 2 abstractions only
- ❌ No raw CDK imports
- ✅ MUI components for all UI
- ❌ No API Gateway (use GraphQL custom mutations or Next.js API routes)

---

## 📚 Documentation

Full documentation available in `/handbook`:
- Architecture overview
- Setup instructions
- Webhook implementation guides
- Lambda function patterns
- Troubleshooting guides

---

**Built with ❤️ by Chinchilla Enterprises** - Archiving team context, one message at a time.
