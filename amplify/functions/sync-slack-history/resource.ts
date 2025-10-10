import { defineFunction } from '@aws-amplify/backend';

export const syncSlackHistory = defineFunction({
  name: 'sync-slack-history',
  entry: './handler.ts',
  timeoutSeconds: 300, // 5 minutes for batch processing
  resourceGroupName: 'data', // Critical: Gives Lambda access to Amplify Data client
  environment: {
    SLACK_SECRET_NAME: 'chinchilla-ai-academy/slack',
    GITHUB_SECRET_NAME: 'github-token',
  },
});
