import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { getSlackChannels } from './functions/get-slack-channels/resource.js';
import { getGitHubRepos } from './functions/get-github-repos/resource.js';
// import { getGitHubBranches } from './functions/get-github-branches/resource.js';
import { slackWebhook } from './functions/slack-webhook/resource.js';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  getSlackChannels,
  getGitHubRepos,
  // getGitHubBranches,
  slackWebhook,
});

// Grant Lambda functions permission to access Secrets Manager
const slackChannelsFunction = backend.getSlackChannels.resources.lambda;
const githubReposFunction = backend.getGitHubRepos.resources.lambda;
// const githubBranchesFunction = backend.getGitHubBranches.resources.lambda;

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

// githubBranchesFunction.addToRolePolicy(
//   new PolicyStatement({
//     actions: ['secretsmanager:GetSecretValue'],
//     resources: ['arn:aws:secretsmanager:us-east-1:*:secret:github-token-*'],
//   })
// );

// Configure Slack webhook function
const slackWebhookFunction = backend.slackWebhook.resources.lambda;

slackWebhookFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ['secretsmanager:GetSecretValue'],
    resources: [
      'arn:aws:secretsmanager:us-east-1:*:secret:chinchilla-ai-academy/slack-*',
      'arn:aws:secretsmanager:us-east-1:*:secret:github-token-*',
    ],
  })
);

// DynamoDB permissions handled automatically via Amplify Data authorization + resourceGroupName: 'data'

// Create public HTTP API for Slack events
const httpApi = new HttpApi(backend.stack, 'SlackWebhookApi', {
  apiName: 'slack-webhook-api',
  description: 'Public endpoint for Slack event subscriptions',
});

const slackIntegration = new HttpLambdaIntegration(
  'SlackWebhookIntegration',
  slackWebhookFunction
);

httpApi.addRoutes({
  path: '/slack/events',
  methods: [HttpMethod.POST],
  integration: slackIntegration,
});

backend.addOutput({
  custom: {
    slackWebhookUrl: httpApi.url + 'slack/events',
  },
});
