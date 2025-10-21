import { NextRequest, NextResponse } from 'next/server';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/data';
import { cookies } from 'next/headers';
import type { Schema } from '@root/amplify/data/resource';
import outputs from '../../../../amplify_outputs.json';

/**
 * Webhook History API
 * GET /api/webhook-history
 *
 * Returns recent webhook events for the monitoring dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const client = generateServerClientUsingCookies<Schema>({
      config: outputs,
      cookies,
    });

    // Fetch recent webhook events (sorted by timestamp descending)
    const { data: events, errors } = await client.models.WebhookEvent.list({
      limit: 20,
    });

    if (errors) {
      console.error('Error fetching webhook events:', errors);
      return NextResponse.json(
        { error: 'Failed to fetch webhook history' },
        { status: 500 }
      );
    }

    // Sort by timestamp descending (most recent first)
    const sortedEvents = (events || []).sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Calculate statistics
    const totalEvents = sortedEvents.length;
    const successfulEvents = sortedEvents.filter(e => e.success).length;
    const successRate = totalEvents > 0 ? Math.round((successfulEvents / totalEvents) * 100) : 0;
    const avgProcessingTime = totalEvents > 0
      ? Math.round(sortedEvents.reduce((sum, e) => sum + (e.processingTimeMs || 0), 0) / totalEvents)
      : 0;

    const lastWebhook = sortedEvents[0]?.timestamp
      ? new Date(sortedEvents[0].timestamp)
      : null;

    const now = new Date();
    let lastWebhookText = 'Never';
    if (lastWebhook) {
      const diffMs = now.getTime() - lastWebhook.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);

      if (diffMins < 1) {
        lastWebhookText = 'Just now';
      } else if (diffMins < 60) {
        lastWebhookText = `${diffMins}m ago`;
      } else if (diffHours < 24) {
        lastWebhookText = `${diffHours}h ago`;
      } else {
        lastWebhookText = `${Math.floor(diffHours / 24)}d ago`;
      }
    }

    return NextResponse.json({
      events: sortedEvents,
      stats: {
        total: totalEvents,
        successRate,
        avgProcessingTime,
        lastWebhook: lastWebhookText,
      },
      status: 'online',
    });

  } catch (error) {
    console.error('Error in webhook history API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
