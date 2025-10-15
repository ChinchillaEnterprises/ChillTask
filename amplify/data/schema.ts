import { type ClientSchema, a } from '@aws-amplify/backend';
import { getSlackChannels } from '../functions/get-slack-channels/resource';
import { getGitHubRepos } from '../functions/get-github-repos/resource';
import { getGitHubBranches } from '../functions/get-github-branches/resource';
import { getWebhookHistory } from '../functions/get-webhook-history/resource';
import { syncSlackHistory } from '../functions/sync-slack-history/resource';
import { syncSlackToGitHub } from '../functions/sync-slack-to-github/resource';

// ChillTask Data Schema - Slack to GitHub Channel Mappings
export const schema = a.schema({
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
    ])
    .secondaryIndexes((index) => [
      index('slackChannelId').queryField('listMappingsBySlackChannel'),
    ]),

  // Temporary storage for raw Slack events (10 min TTL)
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
      ttl: a.integer().required(),           // Unix timestamp for DynamoDB TTL (10 min from creation)
    })
    .authorization((allow) => [
      allow.publicApiKey(),
    ])
    .secondaryIndexes((index) => [
      index('eventType').sortKeys(['timestamp']).queryField('listSlackEventsByEventType'),
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
    ])
    .secondaryIndexes((index) => [
      index('eventType').sortKeys(['timestamp']).queryField('listWebhookEventsByEventType'),
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

  WebhookEventSummary: a.customType({
    id: a.string().required(),
    requestId: a.string().required(),
    eventType: a.string().required(),
    repoName: a.string(),
    branch: a.string(),
    commitMessage: a.string(),
    pusher: a.string(),
    success: a.boolean().required(),
    errorMessage: a.string(),
    processingTimeMs: a.integer(),
    timestamp: a.string().required(),
  }),

  WebhookHistoryStats: a.customType({
    total: a.integer().required(),
    successRate: a.integer().required(),
    avgProcessingTime: a.integer().required(),
    lastWebhook: a.string().required(),
  }),

  WebhookHistoryResponse: a.customType({
    events: a.ref('WebhookEventSummary').array().required(),
    stats: a.ref('WebhookHistoryStats').required(),
    status: a.string().required(),
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

  getWebhookHistory: a
    .query()
    .returns(a.ref('WebhookHistoryResponse'))
    .handler(a.handler.function(getWebhookHistory))
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
  allow.resource(getWebhookHistory),  // GraphQL query for webhook history
  allow.resource(syncSlackHistory),
  allow.resource(syncSlackToGitHub),  // CRITICAL: Enables scheduled Lambda to access DynamoDB
]);

export type Schema = ClientSchema<typeof schema>;
