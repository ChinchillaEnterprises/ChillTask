/**
 * Slack Event Data Schema
 *
 * Copy this model definition to your amplify/data/resource.ts file.
 *
 * This schema defines the SlackEvent model for storing Slack webhook events
 * in DynamoDB with API key authorization and automatic TTL cleanup.
 */

import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * Example schema showing SlackEvent model
 *
 * Add this to your existing schema in amplify/data/resource.ts
 */
const schema = a.schema({
  /**
   * SlackEvent Model
   *
   * Stores webhook events from Slack Event Subscriptions API.
   *
   * Features:
   * - API key authorization (allow.publicApiKey) for webhook access
   * - TTL field for automatic record deletion
   * - Full event payload stored as JSON
   * - Status field for processing tracking
   */
  SlackEvent: a
    .model({
      // ============================================================
      // Core Fields
      // ============================================================

      /**
       * Unique event ID from Slack
       * Example: "Ev1234567890"
       * Used to prevent duplicate processing
       */
      eventId: a.string().required(),

      /**
       * Type of Slack event
       * Examples: "message", "app_mention", "reaction_added"
       * Full list: https://api.slack.com/events
       */
      eventType: a.string().required(),

      // ============================================================
      // Event Context
      // ============================================================

      /**
       * Slack channel ID where event occurred
       * Example: "C1234567890"
       * Null for events not tied to a channel
       */
      channelId: a.string(),

      /**
       * Slack user ID who triggered the event
       * Example: "U1234567890"
       * Null for bot events or system events
       */
      userId: a.string(),

      /**
       * Message text content
       * Only populated for message events
       */
      text: a.string(),

      /**
       * Slack team/workspace ID
       * Example: "T1234567890"
       */
      teamId: a.string(),

      /**
       * Slack event timestamp
       * Format: Unix timestamp as string
       * Example: "1234567890.123456"
       */
      timestamp: a.string(),

      // ============================================================
      // Data Storage
      // ============================================================

      /**
       * Full event payload as JSON string
       * Contains all data from Slack webhook
       * Use safeStringify() helper to populate
       *
       * Example structure:
       * {
       *   "token": "...",
       *   "team_id": "T1234567890",
       *   "event": {
       *     "type": "message",
       *     "user": "U1234567890",
       *     "text": "Hello world",
       *     "channel": "C1234567890",
       *     "ts": "1234567890.123456"
       *   }
       * }
       */
      data: a.json().required(),

      // ============================================================
      // Lifecycle Management
      // ============================================================

      /**
       * Time To Live (TTL) - Unix timestamp
       * DynamoDB will automatically delete records after this time
       *
       * Use calculateTTL() helper:
       *   ttl: calculateTTL(10)  // Delete after 10 minutes
       *
       * Recommended values:
       * - 10 minutes: Real-time processing, immediate discard
       * - 1 hour: Short-term buffering
       * - 24 hours: Debugging and audit trail
       * - 7 days: Analytics aggregation
       *
       * Why this matters:
       * - Prevents unbounded database growth
       * - Reduces storage costs
       * - Automatic cleanup without Lambda triggers
       */
      ttl: a.integer(),

      /**
       * Timestamp when event was received and stored
       * ISO 8601 format: "2024-01-01T12:00:00.000Z"
       */
      processedAt: a.datetime(),

      /**
       * Processing status for async workflows
       * - pending: Event stored, awaiting processing
       * - processed: Successfully processed by Lambda
       * - failed: Processing failed, needs investigation
       *
       * Use with buffer pattern for slow processing:
       * 1. Webhook stores with status='pending'
       * 2. Mutation processes and updates to 'processed'/'failed'
       */
      status: a.enum(['pending', 'processed', 'failed']),

      // ============================================================
      // Optional: Add your custom fields here
      // ============================================================

      /**
       * Example: Extract mentions from message text
       * mentions: a.string(),  // Comma-separated user IDs
       */

      /**
       * Example: Add sentiment analysis result
       * sentiment: a.enum(['positive', 'neutral', 'negative']),
       */

      /**
       * Example: Link to processed result
       * resultUrl: a.url(),
       */
    })
    /**
     * CRITICAL: Authorization Configuration
     *
     * allow.publicApiKey() enables the webhook API route to create records
     * using the API key from amplify_outputs.json.
     *
     * This is the ONLY authorization mode that works for webhooks from
     * external services (Slack, Stripe, GitHub, etc.).
     *
     * ⚠️ DO NOT USE:
     * - allow.authenticated() - Requires Cognito user session
     * - allow.owner() - Requires Cognito user identity
     * - allow.groups() - Requires Cognito group membership
     *
     * Security considerations:
     * - API key is stored in amplify_outputs.json (gitignored)
     * - Only accessible from backend (Next.js API routes)
     * - Combined with webhook signature verification
     * - TTL limits exposure window
     */
    .authorization((allow) => [
      allow.publicApiKey(), // ← Required for webhook access
    ]),

  // ============================================================
  // Optional: Add related models
  // ============================================================

  /**
   * Example: Store processed results separately
   *
   * SlackEventResult: a.model({
   *   eventId: a.string().required(),
   *   result: a.json(),
   *   processedBy: a.string(), // Lambda function name
   * })
   * .authorization((allow) => [
   *   allow.publicApiKey(),
   * ]),
   */
});

/**
 * Export schema type for TypeScript
 */
export type Schema = ClientSchema<typeof schema>;

/**
 * Define Data resource with API key authorization enabled
 *
 * CRITICAL CONFIGURATION:
 * - defaultAuthorizationMode: 'identityPool' for frontend users
 * - apiKeyAuthorizationMode: Enables API key for webhooks
 * - expiresInDays: 30 = API key rotates every 30 days (automatic)
 */
export const data = defineData({
  schema,
  authorizationModes: {
    // Default mode for frontend (authenticated users)
    defaultAuthorizationMode: 'identityPool',

    // CRITICAL: Enable API key mode for webhooks
    // Without this, allow.publicApiKey() won't work!
    apiKeyAuthorizationMode: {
      expiresInDays: 30, // Amplify auto-rotates before expiration
    },
  },
});

/**
 * ============================================================
 * USAGE EXAMPLE
 * ============================================================
 *
 * In your Next.js API route (app/api/slack/events/route.ts):
 *
 * import { dataClient, calculateTTL, safeStringify } from '@/lib/amplify-data-client';
 *
 * export async function POST(request: Request) {
 *   const body = await request.json();
 *
 *   // Store event with 10-minute TTL
 *   await dataClient.models.SlackEvent.create({
 *     eventId: body.event_id,
 *     eventType: body.event.type,
 *     channelId: body.event.channel,
 *     userId: body.event.user,
 *     text: body.event.text,
 *     teamId: body.team_id,
 *     timestamp: body.event.ts,
 *     data: safeStringify(body),
 *     ttl: calculateTTL(10),
 *     processedAt: new Date().toISOString(),
 *     status: 'pending',
 *   });
 *
 *   return Response.json({ ok: true });
 * }
 *
 * ============================================================
 * QUERYING EXAMPLES
 * ============================================================
 *
 * // List all pending events
 * const { data: pending } = await dataClient.models.SlackEvent.list({
 *   filter: { status: { eq: 'pending' } }
 * });
 *
 * // Get events from specific channel
 * const { data: channelEvents } = await dataClient.models.SlackEvent.list({
 *   filter: { channelId: { eq: 'C1234567890' } }
 * });
 *
 * // Get events by type
 * const { data: messages } = await dataClient.models.SlackEvent.list({
 *   filter: { eventType: { eq: 'message' } }
 * });
 *
 * ============================================================
 * PRODUCTION CONSIDERATIONS
 * ============================================================
 *
 * 1. TTL Strategy:
 *    - Development: 1 hour (debugging)
 *    - Staging: 24 hours (testing)
 *    - Production: 10 minutes (cost optimization)
 *
 * 2. Data Privacy:
 *    - Webhook events may contain PII (user messages)
 *    - Use TTL to limit retention
 *    - Consider encryption for sensitive data
 *
 * 3. Volume Planning:
 *    - Slack can send 1000s of events per day
 *    - Without TTL: ~30GB/month at 1000 events/day
 *    - With 10-min TTL: ~1MB steady state
 *
 * 4. Monitoring:
 *    - CloudWatch metrics for record creation rate
 *    - DynamoDB capacity monitoring
 *    - Failed webhook tracking
 */
