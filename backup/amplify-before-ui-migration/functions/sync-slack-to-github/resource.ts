import { defineFunction } from '@aws-amplify/backend';

/**
 * Scheduled Lambda: Sync Slack Messages to GitHub
 *
 * Runs every 5 minutes to process unprocessed Slack messages from DynamoDB
 * and sync them to GitHub repositories based on channel mappings.
 *
 * Flow:
 * 1. Query SlackEvent table WHERE processed = false
 * 2. Look up ChannelMapping for each message
 * 3. Create/update files in GitHub repo
 * 4. Mark messages as processed = true
 * 5. Messages auto-delete after 10-minute TTL
 */

export const syncSlackToGitHub = defineFunction({
  name: 'sync-slack-to-github',
  entry: './handler.ts',

  // CRITICAL: Grants IAM permissions to access DynamoDB tables
  resourceGroupName: 'data',

  // Timeout: Allow up to 5 minutes for processing batch of messages
  timeoutSeconds: 300,

  // Memory: 1GB for GitHub API operations and data processing
  memoryMB: 1024,

  environment: {
    ENV: process.env.ENV || 'dev',
    REGION: process.env.AWS_REGION || 'us-east-1',
    LOG_LEVEL: process.env.LOG_LEVEL || 'INFO',
  },
});
