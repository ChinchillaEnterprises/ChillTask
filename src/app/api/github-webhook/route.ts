import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import crypto from 'crypto';

// Configuration from environment variables
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN!;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID!;
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET!;

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
    if (!signature || !verifyGitHubSignature(rawBody, signature, GITHUB_WEBHOOK_SECRET)) {
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

    // Initialize Slack client
    const slack = new WebClient(SLACK_BOT_TOKEN);

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
    const result = await slack.chat.postMessage({
      channel: SLACK_CHANNEL_ID,
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
