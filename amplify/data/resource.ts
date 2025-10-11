import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { getSlackChannels } from '../functions/get-slack-channels/resource';
import { getGitHubRepos } from '../functions/get-github-repos/resource';
import { getGitHubBranches } from '../functions/get-github-branches/resource';
import { syncSlackHistory } from '../functions/sync-slack-history/resource';

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
      contextFolder: a.string().required(),
      isActive: a.boolean().required(),
      lastSync: a.string(),
      messageCount: a.integer(),
    })
    .authorization((allow) => [
      allow.authenticated(),
      allow.groups(['ADMINS'])
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
      rawEvent: a.json().required(),         // Full Slack event payload
      processed: a.boolean().default(false), // Whether sync has processed this
      ttl: a.integer().required(),           // Unix timestamp for DynamoDB TTL (30 min from creation)
    })
    .authorization((allow) => [
      allow.publicApiKey(),  // Allow public writes from webhook
      allow.authenticated().to(['read', 'update'])  // Allow sync function to read/update
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
    .authorization((allow) => [allow.authenticated()]),

  getGitHubRepos: a
    .query()
    .returns(a.ref('GitHubRepo').array())
    .handler(a.handler.function(getGitHubRepos))
    .authorization((allow) => [allow.authenticated()]),

  getGitHubBranches: a
    .query()
    .arguments({
      repoFullName: a.string().required(),
    })
    .returns(a.ref('GitHubBranch').array())
    .handler(a.handler.function(getGitHubBranches))
    .authorization((allow) => [allow.authenticated()]),

  // Custom Mutations - User-triggered actions
  syncSlackHistory: a
    .mutation()
    .arguments({ channelId: a.string().required() })
    .returns(a.json())
    .handler(a.handler.function(syncSlackHistory))
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
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
