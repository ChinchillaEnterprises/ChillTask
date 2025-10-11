import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { getSlackChannels } from './functions/get-slack-channels/resource.js';
import { getGitHubRepos } from './functions/get-github-repos/resource.js';
import { getGitHubBranches } from './functions/get-github-branches/resource.js';
import { syncSlackHistory } from './functions/sync-slack-history/resource.js';
import { syncSlackToGitHub } from './functions/sync-slack-to-github/resource.js';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Duration } from 'aws-cdk-lib';

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
  syncSlackToGitHub,
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

// Configure sync-slack-to-github scheduled function
const syncSlackToGitHubFunction = backend.syncSlackToGitHub.resources.lambda;

syncSlackToGitHubFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ['secretsmanager:GetSecretValue'],
    resources: ['arn:aws:secretsmanager:us-east-1:*:secret:github-token-*'],
  })
);

// ==========================================
// EVENTBRIDGE SCHEDULE: Sync Slack to GitHub
// ==========================================
// Runs every 5 minutes to process unprocessed Slack messages
const syncSchedule = new Rule(syncSlackToGitHubFunction.stack, 'SyncSlackToGitHubSchedule', {
  schedule: Schedule.rate(Duration.minutes(5)),
  description: 'Sync unprocessed Slack messages to GitHub every 5 minutes',
});

syncSchedule.addTarget(new LambdaFunction(syncSlackToGitHubFunction));

// ==========================================
// NEXT.JS SSR PERMISSIONS
// ==========================================
// Note: Next.js API routes (/api/slack-webhook/events) need Secrets Manager access
// This is automatically granted via the Amplify Hosting service role
// The role (AmplifySSRLoggingRole or similar) is managed by Amplify Hosting
