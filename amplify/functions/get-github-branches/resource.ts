import { defineFunction } from '@aws-amplify/backend';

export const getGitHubBranches = defineFunction({
  name: 'get-github-branches',
  entry: './handler.ts',
  timeoutSeconds: 30,
  environment: {
    GITHUB_SECRET_NAME: 'github-token',
  },
});
