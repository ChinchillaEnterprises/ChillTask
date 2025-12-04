import { defineBackend } from '@aws-amplify/backend';
// AUTH REMOVED - Authentication disabled for public access
// import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { getSlackChannels } from './functions/get-slack-channels/resource.js';
import { getGitHubRepos } from './functions/get-github-repos/resource.js';
import { getGitHubBranches } from './functions/get-github-branches/resource.js';
import { syncSlackHistory } from './functions/sync-slack-history/resource.js';
import { syncSlackToGitHub } from './functions/sync-slack-to-github/resource.js';
// DISABLED: GitHub issue summary scheduler
// import { githubIssueSummary } from './functions/github-issue-summary/resource.js';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Duration } from 'aws-cdk-lib';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  // auth, // REMOVED - No authentication required
  data,
  getSlackChannels,
  getGitHubRepos,
  getGitHubBranches,
  syncSlackHistory,
  syncSlackToGitHub,
  // githubIssueSummary, // DISABLED
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
    resources: [
      'arn:aws:secretsmanager:us-east-1:*:secret:github-token-*',
      'arn:aws:secretsmanager:us-east-1:*:secret:slack-bot-token-*',
    ],
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
// EVENTBRIDGE SCHEDULE: GitHub Issue Summary (DISABLED)
// ==========================================
// Runs every 4 hours during business hours: 9am, 1pm, 5pm, 9pm CST
// (which is 3pm, 7pm, 11pm, 3am UTC)
// const githubIssueSummaryFunction = backend.githubIssueSummary.resources.lambda;

// Grant Secrets Manager access
// githubIssueSummaryFunction.addToRolePolicy(
//   new PolicyStatement({
//     actions: ['secretsmanager:GetSecretValue'],
//     resources: [
//       'arn:aws:secretsmanager:us-east-1:*:secret:github-token-*',
//       'arn:aws:secretsmanager:us-east-1:*:secret:chinchilla-ai-academy/slack-*',
//     ],
//   })
// );

// DynamoDB permissions are handled via resourceGroupName: 'data' + allow.resource()

// Schedule for 9am CST (3pm UTC)
// const issueSummary9am = new Rule(
//   githubIssueSummaryFunction.stack,
//   'GitHubIssueSummary9am',
//   {
//     schedule: Schedule.cron({
//       minute: '0',
//       hour: '15', // 3pm UTC = 9am CST
//       weekDay: 'MON-FRI',
//     }),
//     description: 'GitHub Issue Summary at 9am CST (weekdays)',
//   }
// );
// issueSummary9am.addTarget(new LambdaFunction(githubIssueSummaryFunction));

// Schedule for 1pm CST (7pm UTC)
// const issueSummary1pm = new Rule(
//   githubIssueSummaryFunction.stack,
//   'GitHubIssueSummary1pm',
//   {
//     schedule: Schedule.cron({
//       minute: '0',
//       hour: '19', // 7pm UTC = 1pm CST
//       weekDay: 'MON-FRI',
//     }),
//     description: 'GitHub Issue Summary at 1pm CST (weekdays)',
//   }
// );
// issueSummary1pm.addTarget(new LambdaFunction(githubIssueSummaryFunction));

// Schedule for 5pm CST (11pm UTC)
// const issueSummary5pm = new Rule(
//   githubIssueSummaryFunction.stack,
//   'GitHubIssueSummary5pm',
//   {
//     schedule: Schedule.cron({
//       minute: '0',
//       hour: '23', // 11pm UTC = 5pm CST
//       weekDay: 'MON-FRI',
//     }),
//     description: 'GitHub Issue Summary at 5pm CST (weekdays)',
//   }
// );
// issueSummary5pm.addTarget(new LambdaFunction(githubIssueSummaryFunction));

// Schedule for 9pm CST (3am UTC next day)
// const issueSummary9pm = new Rule(
//   githubIssueSummaryFunction.stack,
//   'GitHubIssueSummary9pm',
//   {
//     schedule: Schedule.cron({
//       minute: '0',
//       hour: '3', // 3am UTC = 9pm CST previous day
//       weekDay: 'TUE-SAT', // Shifted to account for UTC day boundary
//     }),
//     description: 'GitHub Issue Summary at 9pm CST (weekdays)',
//   }
// );
// issueSummary9pm.addTarget(new LambdaFunction(githubIssueSummaryFunction));

// ==========================================
// NEXT.JS SSR PERMISSIONS
// ==========================================
// Note: Next.js API routes (/api/slack-webhook/events) need Secrets Manager access
// This is automatically granted via the Amplify Hosting service role
// The role (AmplifySSRLoggingRole or similar) is managed by Amplify Hosting
