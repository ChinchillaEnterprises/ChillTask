import { defineFunction } from '@aws-amplify/backend';

export const getGitHubRepos = defineFunction({
  name: 'get-github-repos',
  entry: './handler.ts',
  timeoutSeconds: 30,
  environment: {
    GITHUB_SECRET_NAME: 'github-token',
    GITHUB_ORG: 'ChinchillaEnterprises',
  },
});
