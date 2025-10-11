import { NextRequest, NextResponse } from 'next/server';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from '@/../../amplify_outputs.json';
import type { Schema } from '@/../../amplify/data/resource';

// Configure Amplify for API routes
Amplify.configure(outputs, { ssr: true });

// ==========================================
// CONSTANTS & CONFIGURATION
// ==========================================
const TTL_MINUTES = 10;

// ==========================================
// TYPE DEFINITIONS
// ==========================================
interface SlackFile {
  id: string;
  name: string;
  mimetype: string;
  filetype: string;
  size: number;
  url_private: string;
  url_private_download: string;
}

interface SlackEvent {
  type: string;
  event?: {
    type: string;
    channel: string;
    user: string;
    text: string;
    ts: string;
    thread_ts?: string;
    files?: SlackFile[];
  };
  challenge?: string;
}


// ==========================================
// MAIN HANDLER - Phase 1: Just write to DynamoDB and return 200
// ==========================================
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  console.log('[Slack Webhook] Request received');

  try {
    // Parse request body
    const body: SlackEvent = await request.json();

    console.log('[Slack Webhook] Event type:', body.type);

    // Handle Slack URL verification challenge
    if (body.type === 'url_verification') {
      console.log('[Slack Webhook] Handling URL verification challenge');
      return NextResponse.json({ challenge: body.challenge });
    }

    // Handle message events - just save to DynamoDB
    if (body.type === 'event_callback' && body.event?.type === 'message') {
      const event = body.event;

      console.log('[Slack Webhook] Saving message to DynamoDB', {
        channel: event.channel,
        user: event.user,
      });

      // Calculate TTL (30 minutes from now in Unix seconds)
      const ttl = Math.floor(Date.now() / 1000) + (TTL_MINUTES * 60);

      // Create Amplify Data client with API key auth (public access)
      const client = generateClient<Schema>({
        authMode: 'apiKey',
      });

      // Save event to DynamoDB with file attachments
      const result = await client.models.SlackEvent.create({
        eventType: event.type,
        channelId: event.channel,
        userId: event.user,
        messageText: event.text,
        timestamp: event.ts,
        threadTs: event.thread_ts,
        files: event.files ? JSON.stringify(event.files) : undefined,
        // rawEvent: JSON.parse(JSON.stringify(body)),  // TODO: Fix AppSync JSON type
        processed: false,
        ttl: ttl,
      });

      const duration = Date.now() - startTime;
      console.log('[Slack Webhook] Event saved successfully', {
        durationMs: duration,
        resultId: result.data?.id,
        errors: result.errors
      });

      // Return 200 immediately (within Slack's 3-second timeout)
      return NextResponse.json({ ok: true });
    }

    // Ignore other event types
    console.log('[Slack Webhook] Ignoring non-message event:', body.type);
    return NextResponse.json({ ok: true });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[Slack Webhook] Error:', error.message, { durationMs: duration });

    // Return 200 to prevent Slack retries for now
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

