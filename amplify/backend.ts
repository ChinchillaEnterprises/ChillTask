import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { getSlackChannels } from './functions/get-slack-channels/resource.js';
import { getGitHubRepos } from './functions/get-github-repos/resource.js';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  getSlackChannels,
  getGitHubRepos,
});

// Grant Lambda functions permission to access Secrets Manager
const slackChannelsFunction = backend.getSlackChannels.resources.lambda;
const githubReposFunction = backend.getGitHubRepos.resources.lambda;

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
