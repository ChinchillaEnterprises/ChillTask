import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import crypto from 'crypto';

// Configuration from environment variables
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN!;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID!;
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET!;

/**
 * Structured logger for webhook processing
 */
const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    }));
  },

  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      timestamp: new Date().toISOString(),
      message,
      ...meta
    }));
  },

  error: (message: string, error?: any, meta?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      ...meta
    }));
  }
};

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
 *
 * Last tested: 2025-10-11 16:37 CST
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomBytes(8).toString('hex');

  logger.info('=== GitHub Webhook Request Started ===', {
    requestId,
    timestamp: new Date().toISOString()
  });

  try {
    // STEP 1: Log incoming webhook request
    logger.info('[Step 1/6] Receiving webhook request', {
      requestId,
      url: request.url,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      contentType: request.headers.get('content-type'),
      origin: request.headers.get('origin'),
      host: request.headers.get('host')
    });

    // STEP 2: Get the raw body as text for signature verification
    const rawBody = await request.text();

    // Get GitHub headers
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const deliveryId = request.headers.get('x-github-delivery');

    logger.info('[Step 2/6] GitHub webhook headers extracted', {
      requestId,
      event,
      deliveryId,
      hasSignature: !!signature,
      bodyLength: rawBody.length
    });

    // STEP 3: Verify webhook signature
    if (!signature) {
      logger.error('[Step 3/6] Missing webhook signature - rejecting request', undefined, {
        requestId,
        deliveryId
      });
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    const isValidSignature = verifyGitHubSignature(rawBody, signature, GITHUB_WEBHOOK_SECRET);

    if (!isValidSignature) {
      logger.error('[Step 3/6] Invalid webhook signature - possible security threat', undefined, {
        requestId,
        deliveryId,
        signaturePreview: signature.substring(0, 20) + '...',
        bodyHashPreview: crypto.createHash('sha256').update(rawBody).digest('hex').substring(0, 10)
      });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    logger.info('[Step 3/6] Webhook signature verified successfully', { requestId, deliveryId });

    // STEP 4: Parse the payload and validate event type
    const payload = JSON.parse(rawBody);

    logger.info('[Step 4/6] Payload parsed, validating event type', {
      requestId,
      deliveryId,
      event
    });

    // Only handle push events
    if (event !== 'push') {
      logger.warn('[Step 4/6] Unsupported event type received - ignoring', {
        requestId,
        deliveryId,
        event,
        supportedEvents: ['push']
      });
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

    logger.info('[Step 4/6] Processing GitHub push event', {
      requestId,
      deliveryId,
      repoName,
      branch,
      pusher,
      commitCount: commits.length,
      compareUrl
    });

    // Log commit details
    if (commits.length > 0) {
      logger.info('Commit details', {
        requestId,
        commits: commits.map((c: any) => ({
          sha: c.id.substring(0, 7),
          author: c.author.name,
          message: c.message.split('\n')[0],
          added: c.added?.length || 0,
          modified: c.modified?.length || 0,
          removed: c.removed?.length || 0
        }))
      });
    }

    // STEP 5: Format message and send notification to Slack
    const message = `🔔 *New push to \`${repoName}\`*\nBranch: \`${branch}\` | By: *${pusher}*`;

    logger.info('[Step 5/6] Sending notification to Slack', {
      requestId,
      deliveryId,
      channel: SLACK_CHANNEL_ID,
      messageLength: message.length
    });

    // Send message to Slack
    const slackStartTime = Date.now();
    const result = await slack.chat.postMessage({
      channel: SLACK_CHANNEL_ID,
      text: message,
      mrkdwn: true,
    });
    const slackDuration = Date.now() - slackStartTime;

    logger.info('[Step 5/6] Slack notification sent successfully', {
      requestId,
      deliveryId,
      slackMessageId: result.ts,
      slackChannel: result.channel,
      slackDurationMs: slackDuration
    });

    // STEP 6: Return success response
    const totalDuration = Date.now() - startTime;

    logger.info('[Step 6/6] Webhook processed successfully - returning response', {
      requestId,
      deliveryId,
      totalDurationMs: totalDuration,
      slackDurationMs: slackDuration,
      processingDurationMs: totalDuration - slackDuration
    });

    logger.info('=== GitHub Webhook Request Completed ===', {
      requestId,
      success: true,
      totalDurationMs: totalDuration
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      requestId,
      slackMessageId: result.ts,
      processingTimeMs: totalDuration
    });

  } catch (error) {
    const totalDuration = Date.now() - startTime;

    logger.error('Error processing webhook', error, {
      requestId,
      totalDurationMs: totalDuration,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      SLACK_CHANNEL_ID_CONFIGURED: !!SLACK_CHANNEL_ID,
      SLACK_BOT_TOKEN_CONFIGURED: !!SLACK_BOT_TOKEN,
      GITHUB_WEBHOOK_SECRET_CONFIGURED: !!GITHUB_WEBHOOK_SECRET
    });

    logger.error('=== GitHub Webhook Request Failed ===', error, {
      requestId,
      totalDurationMs: totalDuration
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        requestId,
        details: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: totalDuration
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
  const configStatus = {
    slackBotToken: !!SLACK_BOT_TOKEN,
    slackChannelId: !!SLACK_CHANNEL_ID,
    githubWebhookSecret: !!GITHUB_WEBHOOK_SECRET
  };

  const allConfigured = Object.values(configStatus).every(v => v === true);

  logger.info('Health check endpoint called', {
    configStatus,
    allConfigured,
    timestamp: new Date().toISOString()
  });

  return NextResponse.json({
    status: allConfigured ? 'ok' : 'degraded',
    message: 'GitHub webhook endpoint is active',
    configuration: configStatus,
    timestamp: new Date().toISOString()
  });
}
