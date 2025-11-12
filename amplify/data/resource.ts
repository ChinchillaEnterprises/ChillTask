import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { getSlackChannels } from '../functions/get-slack-channels/resource';
import { getGitHubRepos } from '../functions/get-github-repos/resource';
import { getGitHubBranches } from '../functions/get-github-branches/resource';
import { syncSlackHistory } from '../functions/sync-slack-history/resource';
import { syncSlackToGitHub } from '../functions/sync-slack-to-github/resource';
import { githubIssueSummary } from '../functions/github-issue-summary/resource';

// ChillTask Data Schema - Slack to GitHub Channel Mappings
const schema = a.schema({
  // Data Models
  ChannelMapping: a
    .model({
      slackChannel: a.string().required(),
      slackChannelId: a.string().required(),
      githubRepo: a.string().required(),
      githubUrl: a.string().required(),
      githubBranch: a.string().required(),
      githubOwner: a.string(),  // GitHub owner (org or user)
      contextFolder: a.string().required(),
      isActive: a.boolean().required(),
      lastSync: a.string(),
      messageCount: a.integer(),
    })
    .authorization((allow) => [
      allow.publicApiKey(),
    ]),

  // Temporary storage for raw Slack events (30 min TTL)
  SlackEvent: a
    .model({
      eventType: a.string().required(),      // 'message', 'url_verification', etc.
      channelId: a.string(),                 // Slack channel ID
      userId: a.string(),                    // Slack user ID
      messageText: a.string(),               // Message content
      timestamp: a.string(),                 // Slack event timestamp
      threadTs: a.string(),                  // Thread timestamp if reply
      files: a.json(),                       // File attachments array from Slack
      rawEvent: a.json(),                    // Full Slack event payload (optional for now)
      processed: a.boolean().default(false), // Whether sync has processed this
      ttl: a.integer().required(),           // Unix timestamp for DynamoDB TTL (30 min from creation)
    })
    .authorization((allow) => [
      allow.publicApiKey(),
    ]),

  // GitHub webhook event history
  WebhookEvent: a
    .model({
      requestId: a.string().required(),      // Unique request ID from webhook handler
      deliveryId: a.string(),                // GitHub delivery ID
      eventType: a.string().required(),      // 'push', 'pull_request', etc.
      repoName: a.string(),                  // Repository full name
      branch: a.string(),                    // Branch name
      commitSha: a.string(),                 // Commit SHA
      commitMessage: a.string(),             // Commit message
      pusher: a.string(),                    // GitHub username
      success: a.boolean().required(),       // Whether webhook processed successfully
      errorMessage: a.string(),              // Error message if failed
      processingTimeMs: a.integer(),         // Total processing time
      slackMessageId: a.string(),            // Slack message timestamp if sent
      timestamp: a.string().required(),      // ISO timestamp
      ttl: a.integer().required(),           // Unix timestamp for DynamoDB TTL (7 days)
    })
    .authorization((allow) => [
      allow.publicApiKey(),
    ]),

  // GitHub Issue Snapshots - For 6-hour summary reports
  GitHubIssueSnapshot: a
    .model({
      timestamp: a.datetime().required(),    // When snapshot was taken
      repoName: a.string().required(),       // "ChinchillaEnterprises/ChillTask"
      repoOwner: a.string().required(),      // "ChinchillaEnterprises"

      // Issue counts by label
      readyForTestingCount: a.integer().default(0),
      inProgressCount: a.integer().default(0),
      blockedCount: a.integer().default(0),
      backlogCount: a.integer().default(0),
      totalCount: a.integer().required(),

      // Detailed issue lists (stored as JSON arrays of {number, title, url, labels})
      readyForTesting: a.json(),
      inProgress: a.json(),
      blocked: a.json(),
      backlog: a.json(),

      // TTL for auto-cleanup (keep for 30 days)
      ttl: a.integer(),
    })
    .authorization((allow) => [
      allow.publicApiKey(),
    ]),

  // Custom Types for API responses
  SlackChannel: a.customType({
    id: a.string().required(),
    name: a.string().required(),
    isPrivate: a.boolean().required(),
  }),

  GitHubRepo: a.customType({
    id: a.string().required(),
    name: a.string().required(),
    fullName: a.string().required(),
    isPrivate: a.boolean().required(),
  }),

  GitHubBranch: a.customType({
    name: a.string().required(),
    commitSha: a.string().required(),
    isProtected: a.boolean().required(),
  }),

  // Custom Queries - Fetch dropdown data on-demand
  getSlackChannels: a
    .query()
    .returns(a.ref('SlackChannel').array())
    .handler(a.handler.function(getSlackChannels))
    .authorization((allow) => [allow.publicApiKey()]),

  getGitHubRepos: a
    .query()
    .returns(a.ref('GitHubRepo').array())
    .handler(a.handler.function(getGitHubRepos))
    .authorization((allow) => [allow.publicApiKey()]),

  getGitHubBranches: a
    .query()
    .arguments({
      repoFullName: a.string().required(),
    })
    .returns(a.ref('GitHubBranch').array())
    .handler(a.handler.function(getGitHubBranches))
    .authorization((allow) => [allow.publicApiKey()]),

  // Custom Mutations - User-triggered actions
  syncSlackHistory: a
    .mutation()
    .arguments({ channelId: a.string().required() })
    .returns(a.json())
    .handler(a.handler.function(syncSlackHistory))
    .authorization((allow) => [allow.publicApiKey()]),
}).authorization((allow) => [
  // Schema-level authorization: Required for Lambda functions to access Amplify Data
  // This injects AMPLIFY_DATA_GRAPHQL_ENDPOINT environment variable into the Lambda
  allow.resource(syncSlackHistory),
  allow.resource(syncSlackToGitHub),  // CRITICAL: Enables scheduled Lambda to access DynamoDB
  allow.resource(githubIssueSummary), // GitHub issue summary Lambda
]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/*== FRONTEND USAGE ========================================================
Generate the Amplify Data client in your frontend components:

"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

// Fetch Slack channels for dropdown (on-demand, no DB storage)
const { data: slackChannels } = await client.queries.getSlackChannels();
// Returns: [{ id: "C123", name: "general", isPrivate: false }, ...]

// Fetch GitHub repos for dropdown (on-demand, no DB storage)
const { data: githubRepos } = await client.queries.getGitHubRepos();
// Returns: [{ id: "123", name: "ChillTask", fullName: "ChinchillaEnterprises/ChillTask", isPrivate: false }, ...]

// List all channel mappings
const { data: mappings } = await client.models.ChannelMapping.list();

// Create a new mapping
await client.models.ChannelMapping.create({
  slackChannel: "Internal-Geico",
  slackChannelId: "C001",
  githubRepo: "Geico-client",
  githubUrl: "github.com/ChinchillaEnterprises/Geico-client",
  githubBranch: "main",
  contextFolder: "/context/",
  isActive: true
});
=========================================================================*/
