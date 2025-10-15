import type { Schema } from '../../data/resource';

/**
 * GraphQL Query Handler: getWebhookHistory
 *
 * Fetches recent webhook events and calculates statistics
 * for the webhook monitoring dashboard.
 *
 * Returns:
 * - events: Array of recent WebhookEvent records
 * - stats: Calculated statistics (total, success rate, avg processing time, last webhook)
 * - status: System status ('online')
 */
export const handler: Schema['getWebhookHistory']['functionHandler'] = async (event, context) => {
  // Import required modules
  const { Amplify } = await import('aws-amplify');
  const { generateClient } = await import('aws-amplify/data');
  const { getAmplifyDataClientConfig } = await import('@aws-amplify/backend/function/runtime');

  // Get Amplify config from environment
  const env = process.env as any;
  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

  Amplify.configure(resourceConfig, libraryOptions);

  const dataClient = generateClient<Schema>({
    authMode: 'identityPool',
  });

  try {
    // Fetch recent webhook events (limit 20)
    const { data: events, errors } = await dataClient.models.WebhookEvent.list({
      limit: 20,
    });

    if (errors && errors.length > 0) {
      console.error('Error fetching webhook events:', errors);
      throw new Error('Failed to fetch webhook history');
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

    // Return response matching WebhookHistoryResponse type
    return {
      events: sortedEvents, // Return as array, GraphQL will handle serialization
      stats: {
        total: totalEvents,
        successRate,
        avgProcessingTime,
        lastWebhook: lastWebhookText,
      },
      status: 'online',
    };

  } catch (error) {
    console.error('Error in getWebhookHistory handler:', error);

    // Return error response
    return {
      events: [], // Return empty array, GraphQL will handle serialization
      stats: {
        total: 0,
        successRate: 0,
        avgProcessingTime: 0,
        lastWebhook: 'Error',
      },
      status: 'error',
    };
  }
};
