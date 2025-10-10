import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { getSlackChannels } from './functions/get-slack-channels/resource.js';
import { getGitHubRepos } from './functions/get-github-repos/resource.js';
import { getGitHubBranches } from './functions/get-github-branches/resource.js';
import { slackWebhook } from './functions/slack-webhook/resource.js';
import { syncSlackHistory } from './functions/sync-slack-history/resource.js';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Duration } from 'aws-cdk-lib';
import { Alarm, ComparisonOperator, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { SqsDestination } from 'aws-cdk-lib/aws-lambda-destinations';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  getSlackChannels,
  getGitHubRepos,
  getGitHubBranches,
  slackWebhook,
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
// DEAD LETTER QUEUE (DLQ) CONFIGURATION
// ==========================================

// Create DLQ for failed Lambda invocations
const slackWebhookDLQ = new Queue(backend.stack, 'SlackWebhookDLQ', {
  queueName: 'slack-webhook-dlq',
  retentionPeriod: Duration.days(14), // Keep failed events for 14 days
});

// Set the DLQ on the Lambda function directly
// This captures unhandled exceptions and async failures
slackWebhookFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ['sqs:SendMessage'],
    resources: [slackWebhookDLQ.queueArn],
  })
);

// Configure the Lambda function to use the DLQ for async failures
// Note: For API Gateway sync invocations, errors are returned to caller
// DLQ captures retries from internal Lambda async retry mechanisms

// ==========================================
// CLOUDWATCH ALARMS FOR MONITORING
// ==========================================

// Alarm 1: Lambda Errors
const errorAlarm = new Alarm(backend.stack, 'SlackWebhookErrorAlarm', {
  alarmName: 'slack-webhook-errors',
  alarmDescription: 'Alerts when Slack webhook function has errors',
  metric: slackWebhookFunction.metricErrors({
    statistic: 'Sum',
    period: Duration.minutes(5),
  }),
  threshold: 5, // Alert if more than 5 errors in 5 minutes
  evaluationPeriods: 1,
  comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
  treatMissingData: TreatMissingData.NOT_BREACHING,
});

// Alarm 2: Lambda Throttles
const throttleAlarm = new Alarm(backend.stack, 'SlackWebhookThrottleAlarm', {
  alarmName: 'slack-webhook-throttles',
  alarmDescription: 'Alerts when Slack webhook function is throttled',
  metric: slackWebhookFunction.metricThrottles({
    statistic: 'Sum',
    period: Duration.minutes(5),
  }),
  threshold: 3, // Alert if throttled 3+ times in 5 minutes
  evaluationPeriods: 1,
  comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
  treatMissingData: TreatMissingData.NOT_BREACHING,
});

// Alarm 3: High Invocation Count (potential abuse/spam)
const highInvocationAlarm = new Alarm(backend.stack, 'SlackWebhookHighInvocationAlarm', {
  alarmName: 'slack-webhook-high-invocations',
  alarmDescription: 'Alerts when Slack webhook has unusually high invocation count',
  metric: slackWebhookFunction.metricInvocations({
    statistic: 'Sum',
    period: Duration.minutes(5),
  }),
  threshold: 100, // Alert if more than 100 invocations in 5 minutes
  evaluationPeriods: 2, // Must breach 2 consecutive periods
  comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
  treatMissingData: TreatMissingData.NOT_BREACHING,
});

// Alarm 4: Long Execution Time (performance degradation)
const durationAlarm = new Alarm(backend.stack, 'SlackWebhookDurationAlarm', {
  alarmName: 'slack-webhook-long-duration',
  alarmDescription: 'Alerts when Slack webhook execution time is too long',
  metric: slackWebhookFunction.metricDuration({
    statistic: 'Average',
    period: Duration.minutes(5),
  }),
  threshold: 20000, // Alert if average duration > 20 seconds
  evaluationPeriods: 2,
  comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
  treatMissingData: TreatMissingData.NOT_BREACHING,
});

// Alarm 5: DLQ Message Count (failed events accumulating)
const dlqAlarm = new Alarm(backend.stack, 'SlackWebhookDLQAlarm', {
  alarmName: 'slack-webhook-dlq-messages',
  alarmDescription: 'Alerts when failed events accumulate in DLQ',
  metric: slackWebhookDLQ.metricApproximateNumberOfMessagesVisible({
    statistic: 'Maximum',
    period: Duration.minutes(5),
  }),
  threshold: 1, // Alert immediately when any message enters DLQ
  evaluationPeriods: 1,
  comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
  treatMissingData: TreatMissingData.NOT_BREACHING,
});

// ==========================================
// HTTP API CONFIGURATION
// ==========================================

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
    slackWebhookDLQUrl: slackWebhookDLQ.queueUrl,
    slackWebhookDLQArn: slackWebhookDLQ.queueArn,
  },
});
