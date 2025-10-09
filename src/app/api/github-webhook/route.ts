import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import crypto from 'crypto';

// Initialize AWS Secrets Manager client
const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Get Slack token from AWS Secrets Manager
 */
async function getSlackToken(): Promise<string> {
  try {
    const command = new GetSecretValueCommand({
      SecretId: 'Chinchilla-AI-Slack', // Adjust this name if needed
    });

    const response = await secretsClient.send(command);

    if (response.SecretString) {
      const secret = JSON.parse(response.SecretString);
      return secret.token || secret.slack_token || secret.SLACK_TOKEN;
    }

    throw new Error('Slack token not found in secret');
  } catch (error) {
    console.error('Error fetching Slack token:', error);
    throw error;
  }
}

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

/**
 * Format commit message for Slack
 */
function formatCommitMessage(commit: any, repoName: string, branch: string): string {
  const author = commit.author.name;
  const message = commit.message.split('\n')[0]; // First line only
  const url = commit.url;
  const sha = commit.id.substring(0, 7); // Short SHA

  return `\`${sha}\` ${message} - ${author}`;
}

/**
 * GitHub Webhook Handler
 * POST /api/github-webhook
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body as text for signature verification
    const rawBody = await request.text();

    // Get GitHub headers
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');

    // Verify webhook signature
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('GITHUB_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    if (!signature || !verifyGitHubSignature(rawBody, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the payload
    const payload = JSON.parse(rawBody);

    // Only handle push events
    if (event !== 'push') {
      return NextResponse.json({
        message: 'Event type not supported',
        event
      });
    }

    // Get Slack token from Secrets Manager
    const slackToken = await getSlackToken();

    // Initialize Slack client
    const slack = new WebClient(slackToken);

    // Extract commit information
    const repoName = payload.repository.full_name;
    const branch = payload.ref.replace('refs/heads/', '');
    const pusher = payload.pusher.name;
    const commits = payload.commits || [];
    const compareUrl = payload.compare;

    // Format message for Slack
    let message = `🔔 *New push to \`${repoName}\`* on branch \`${branch}\`\n`;
    message += `👤 Pushed by: *${pusher}*\n\n`;

    if (commits.length > 0) {
      message += `📝 *${commits.length} commit${commits.length > 1 ? 's' : ''}:*\n`;
      commits.forEach((commit: any) => {
        message += `• ${formatCommitMessage(commit, repoName, branch)}\n`;
      });
      message += `\n<${compareUrl}|View changes>`;
    } else {
      message += `No commits in this push.`;
    }

    // Send message to Slack
    // TODO: Configure the channel ID or get it from environment
    const channelId = process.env.SLACK_CHANNEL_ID || 'general';

    const result = await slack.chat.postMessage({
      channel: channelId,
      text: message,
      mrkdwn: true,
    });

    console.log('Message sent to Slack:', result.ts);

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      slackMessageId: result.ts,
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 * GET /api/github-webhook
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'GitHub webhook endpoint is active'
  });
}
