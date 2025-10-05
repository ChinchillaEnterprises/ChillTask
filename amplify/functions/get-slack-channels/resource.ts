import { defineFunction } from '@aws-amplify/backend';

export const getSlackChannels = defineFunction({
  name: 'get-slack-channels',
  entry: './handler.ts',
  timeoutSeconds: 30,
  environment: {
    SLACK_SECRET_NAME: 'chinchilla-ai-academy/slack',
  },
});
