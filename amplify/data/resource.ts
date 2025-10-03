import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

// ChillTask Data Schema - Slack to GitHub Channel Mappings
const schema = a.schema({
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
    .authorization((allow) => [allow.authenticated(), allow.groups(['ADMINS'])]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool'
  },
});

/*== FRONTEND USAGE ========================================================
Generate the Amplify Data client in your frontend components:

"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

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
