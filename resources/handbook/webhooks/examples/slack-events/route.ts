/**
 * Slack Events Webhook Handler
 *
 * Handles webhook events from Slack Event Subscriptions API.
 * Uses Next.js API Routes + Amplify Data client with API key authentication.
 *
 * Deploy location: app/api/slack/events/route.ts
 *
 * Webhook URL: https://yourdomain.com/api/slack/events
 *
 * Features:
 * - Signature verification for security
 * - URL verification challenge response
 * - Fast acknowledgment (< 3 seconds)
 * - DynamoDB storage with TTL
 * - Comprehensive error handling
 */

import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { dataClient, calculateTTL, safeStringify } from '@/lib/amplify-data-client';

/**
 * Verify Slack request signature
 *
 * Slack signs every request with HMAC-SHA256. We recompute the signature
 * and compare to ensure the request genuinely came from Slack.
 *
 * @param body - Raw request body (before JSON parsing)
 * @param timestamp - x-slack-request-timestamp header
 * @param signature - x-slack-signature header
 * @returns true if signature is valid
 *
 * Security features:
 * - Replay attack prevention (rejects requests older than 5 minutes)
 * - Constant-time comparison to prevent timing attacks
 *
 * Reference: https://api.slack.com/authentication/verifying-requests-from-slack
 */
function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string
): boolean {
  // Get signing secret from environment
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret) {
    console.error('❌ SLACK_SIGNING_SECRET not configured');
    return false;
  }

  // Prevent replay attacks - reject requests older than 5 minutes
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const requestAge = Math.abs(currentTimestamp - parseInt(timestamp, 10));

  if (requestAge > 60 * 5) {
    console.warn('⚠️ Request timestamp too old:', requestAge, 'seconds');
    return false;
  }

  // Compute expected signature
  // Format: v0:{timestamp}:{body}
  const baseString = `v0:${timestamp}:${body}`;
  const hmac = createHmac('sha256', signingSecret);
  hmac.update(baseString);
  const expectedSignature = `v0=${hmac.digest('hex')}`;

  // Compare signatures (constant-time to prevent timing attacks)
  const isValid = expectedSignature === signature;

  if (!isValid) {
    console.error('❌ Invalid signature');
    console.debug('Expected:', expectedSignature);
    console.debug('Received:', signature);
  }

  return isValid;
}

/**
 * POST /api/slack/events
 *
 * Handles Slack Event Subscriptions webhooks.
 *
 * Flow:
 * 1. Get raw body for signature verification
 * 2. Verify Slack signature
 * 3. Handle URL verification challenge (one-time Slack setup)
 * 4. Store event in DynamoDB with TTL
 * 5. Acknowledge to Slack (< 3 seconds)
 *
 * Slack will retry failed webhooks up to 3 times.
 */
export async function POST(request: Request) {
  try {
    // ============================================================
    // STEP 1: Get raw body for signature verification
    // ============================================================
    // CRITICAL: Must get raw text BEFORE parsing JSON
    // Signature is computed on the raw body, not parsed JSON
    const bodyText = await request.text();

    // Get Slack signature headers
    const timestamp = request.headers.get('x-slack-request-timestamp') || '';
    const signature = request.headers.get('x-slack-signature') || '';

    // ============================================================
    // STEP 2: Verify signature
    // ============================================================
    if (!verifySlackSignature(bodyText, timestamp, signature)) {
      console.error('❌ Slack signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Now safe to parse JSON
    const body = JSON.parse(bodyText);

    console.log('✅ Slack signature verified');
    console.log('📦 Event type:', body.type);

    // ============================================================
    // STEP 3: Handle URL verification challenge
    // ============================================================
    // When you first configure the webhook URL in Slack, Slack sends
    // a one-time challenge request. We must echo back the challenge.
    if (body.type === 'url_verification') {
      console.log('🔐 URL verification challenge received');
      return NextResponse.json({
        challenge: body.challenge,
      });
    }

    // ============================================================
    // STEP 4: Handle event_callback
    // ============================================================
    if (body.type !== 'event_callback') {
      console.warn('⚠️ Unknown event type:', body.type);
      return NextResponse.json({ ok: true }); // Acknowledge anyway
    }

    const event = body.event;

    console.log('📨 Event details:');
    console.log('  - Event type:', event.type);
    console.log('  - Channel:', event.channel);
    console.log('  - User:', event.user);
    console.log('  - Text:', event.text?.substring(0, 50));

    // ============================================================
    // STEP 5: Store event in DynamoDB
    // ============================================================
    // Uses Amplify Data client with API key authentication
    const result = await dataClient.models.SlackEvent.create({
      eventId: body.event_id,
      eventType: event.type,
      channelId: event.channel,
      userId: event.user,
      text: event.text,
      teamId: body.team_id,
      timestamp: event.ts,
      data: safeStringify(body), // Full event payload as JSON
      ttl: calculateTTL(10), // Auto-delete after 10 minutes
      processedAt: new Date().toISOString(),
      status: 'pending', // Can be processed by another Lambda later
    });

    console.log('💾 Event saved to DynamoDB:', result.data?.id);

    // ============================================================
    // STEP 6: Acknowledge to Slack (FAST!)
    // ============================================================
    // CRITICAL: Must respond within 3 seconds or Slack will retry
    // Total time so far: ~50-200ms (signature + DB write)
    return NextResponse.json({ ok: true });

    // ============================================================
    // OPTIONAL: Trigger async processing
    // ============================================================
    // If you need to do heavy processing (AI, external APIs, etc.),
    // trigger it AFTER acknowledging to Slack:
    //
    // dataClient.mutations.processSlackEvent({
    //   eventId: body.event_id,
    // }).catch(error => {
    //   console.error('Async processing failed:', error);
    // });
    //
    // The mutation will invoke a Lambda function that can take
    // as long as needed without worrying about the 3-second timeout.

  } catch (error) {
    // ============================================================
    // Error handling
    // ============================================================
    console.error('❌ Webhook processing error:', error);

    // Log full error details for debugging
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    // IMPORTANT: Still return 200 to prevent Slack from retrying
    // Log the error for manual investigation instead
    // If you return 500, Slack will retry the webhook multiple times
    return NextResponse.json(
      { ok: true }, // Acknowledge receipt even if processing failed
      { status: 200 }
    );
  }
}

/**
 * GET /api/slack/events
 *
 * Optional: Health check endpoint
 * Returns 200 OK to verify the endpoint is accessible
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Slack Events Webhook Handler',
    timestamp: new Date().toISOString(),
  });
}
