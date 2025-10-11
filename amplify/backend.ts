import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { getSlackChannels } from './functions/get-slack-channels/resource.js';
import { getGitHubRepos } from './functions/get-github-repos/resource.js';
import { getGitHubBranches } from './functions/get-github-branches/resource.js';
import { syncSlackHistory } from './functions/sync-slack-history/resource.js';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  getSlackChannels,
  getGitHubRepos,
  getGitHubBranches,
  syncSlackHistory,
});

// Grant Lambda functions permission to access Secrets Manager
const slackChannelsFunction = backend.getSlackChannels.resources.lambda;
const githubReposFunction = backend.getGitHubRepos.resources.lambda;
const githubBranchesFunction = backend.getGitHubBranches.resources.lambda;

slackChannelsFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ['secretsmanager:GetSecretValue'],
    resources: ['arn:aws:secretsmanager:us-east-1:*:secret:chinchilla-ai-academy/slack-*'],
  })
);

githubReposFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ['secretsmanager:GetSecretValue'],
    resources: ['arn:aws:secretsmanager:us-east-1:*:secret:github-token-*'],
  })
);

githubBranchesFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ['secretsmanager:GetSecretValue'],
    resources: ['arn:aws:secretsmanager:us-east-1:*:secret:github-token-*'],
  })
);

// Configure sync Slack history function
const syncSlackHistoryFunction = backend.syncSlackHistory.resources.lambda;

syncSlackHistoryFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ['secretsmanager:GetSecretValue'],
    resources: [
      'arn:aws:secretsmanager:us-east-1:*:secret:chinchilla-ai-academy/slack-*',
      'arn:aws:secretsmanager:us-east-1:*:secret:github-token-*',
    ],
  })
);

// DynamoDB permissions handled automatically via Amplify Data authorization + resourceGroupName: 'data'

// ==========================================
// NEXT.JS SSR PERMISSIONS
// ==========================================
// Note: Next.js API routes (/api/slack/events) need Secrets Manager access
// This is automatically granted via the Amplify Hosting service role
// The role (AmplifySSRLoggingRole or similar) is managed by Amplify Hosting
