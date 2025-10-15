import { defineFunction } from '@aws-amplify/backend';

export const getWebhookHistory = defineFunction({
  name: 'get-webhook-history',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data', // CRITICAL: Enables Lambda to access Amplify Data client
});
