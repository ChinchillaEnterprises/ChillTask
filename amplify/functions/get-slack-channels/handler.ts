import type { Schema } from '../../data/resource';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

export const handler: Schema['getSlackChannels']['functionHandler'] = async (event) => {
  try {
    // Fetch Slack bot token from Secrets Manager
    const secretResponse = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: process.env.SLACK_SECRET_NAME,
      })
    );

    const secrets = JSON.parse(secretResponse.SecretString || '{}');
    const botToken = secrets.SLACK_BOT_TOKEN || secrets.bot_token;

    if (!botToken) {
      throw new Error('Slack bot token not found in secrets');
    }

    // Call Slack API to get list of channels
    const response = await fetch('https://slack.com/api/conversations.list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Slack API failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }

    // Transform channels to simple format for dropdown
    const channels = data.channels.map((channel: any) => ({
      id: channel.id,
      name: channel.name,
      isPrivate: channel.is_private,
    }));

    return channels;
  } catch (error: any) {
    console.error('Error fetching Slack channels:', error);
    throw new Error(`Failed to fetch Slack channels: ${error.message}`);
  }
};
