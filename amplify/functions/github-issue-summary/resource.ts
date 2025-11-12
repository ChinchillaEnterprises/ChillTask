import { defineFunction } from '@aws-amplify/backend';

export const githubIssueSummary = defineFunction({
  name: 'github-issue-summary',
  entry: './handler.ts',
  timeoutSeconds: 300, // 5 minutes
  memoryMB: 512,
  resourceGroupName: 'data', // CRITICAL: Grants DynamoDB access
  environment: {
    GITHUB_REPO_OWNER: 'ChinchillaEnterprises',
    GITHUB_REPO_NAME: 'transportation-insight',
    SLACK_CHANNEL_ID: 'C09JD94HRUN', // internal-beoniq
    // Secrets are fetched from AWS Secrets Manager at runtime, not env vars
  },
});
