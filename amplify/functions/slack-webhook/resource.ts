import { defineFunction } from '@aws-amplify/backend';

export const slackWebhook = defineFunction({
  name: 'slack-webhook',
  entry: './handler.ts',
  timeoutSeconds: 60,
  environment: {
    SLACK_SECRET_NAME: 'chinchilla-ai-academy/slack',
    GITHUB_SECRET_NAME: 'github-token',
  },
});
