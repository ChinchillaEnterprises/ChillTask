/**
 * Shared Amplify Data Client for Webhook Handlers
 *
 * This file provides a pre-configured Amplify Data client with API key authentication
 * for use in Next.js API routes handling webhooks from external services.
 *
 * Usage:
 *   import { dataClient, calculateTTL, safeStringify } from '@/lib/amplify-data-client';
 *
 * Copy this file to: lib/amplify-data-client.ts in your project
 */

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from '@/amplify_outputs.json';
import type { Schema } from '@/amplify/data/resource';

/**
 * Configure Amplify with outputs from amplify_outputs.json
 *
 * CRITICAL: ssr: true is required for Next.js API routes (server-side)
 * Without this, the client won't work in Lambda functions
 */
Amplify.configure(outputs, {
  ssr: true, // Server-side rendering mode for Next.js API routes
});

/**
 * Create Data client with API key authentication
 *
 * This client uses the API key from amplify_outputs.json to authenticate
 * requests to AppSync GraphQL API. It can only access models with
 * allow.publicApiKey() authorization.
 *
 * Auth mode: 'apiKey' tells the client to include the x-api-key header
 * in all GraphQL requests.
 */
export const dataClient = generateClient<Schema>({
  authMode: 'apiKey',
});

/**
 * Calculate TTL (Time To Live) timestamp for DynamoDB
 *
 * DynamoDB TTL expects a Unix timestamp (seconds since epoch). This helper
 * calculates a future timestamp for auto-deletion of records.
 *
 * @param minutesFromNow - How many minutes until the record should be deleted
 * @returns Unix timestamp for DynamoDB TTL field
 *
 * @example
 * // Delete after 10 minutes
 * const ttl = calculateTTL(10);
 *
 * await dataClient.models.WebhookEvent.create({
 *   eventId: 'evt_123',
 *   data: webhookData,
 *   ttl, // Will be auto-deleted by DynamoDB
 * });
 */
export function calculateTTL(minutesFromNow: number): number {
  // Current time in seconds (DynamoDB uses seconds, not milliseconds)
  const nowInSeconds = Math.floor(Date.now() / 1000);

  // Convert minutes to seconds
  const secondsToAdd = minutesFromNow * 60;

  // Return future timestamp
  return nowInSeconds + secondsToAdd;
}

/**
 * Safely stringify JSON with error handling
 *
 * Webhook data can sometimes have circular references or non-serializable
 * values. This helper catches those errors and returns a safe fallback.
 *
 * @param obj - Object to stringify
 * @returns JSON string or error object
 *
 * @example
 * const data = safeStringify(webhookBody);
 *
 * await dataClient.models.WebhookEvent.create({
 *   eventId: 'evt_123',
 *   data, // Safe JSON string
 * });
 */
export function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.error('JSON stringify error:', error);

    // Return error object as JSON instead
    return JSON.stringify({
      error: 'Failed to stringify object',
      errorMessage: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Parse JSON safely with error handling
 *
 * Opposite of safeStringify - attempts to parse JSON and returns null on error.
 *
 * @param jsonString - JSON string to parse
 * @returns Parsed object or null if parsing fails
 *
 * @example
 * const event = await dataClient.models.WebhookEvent.get({ id: 'evt_123' });
 * const parsedData = safeParse(event.data?.data);
 *
 * if (parsedData) {
 *   console.log('Event type:', parsedData.type);
 * }
 */
export function safeParse<T = any>(jsonString: string | null | undefined): T | null {
  if (!jsonString) return null;

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('JSON parse error:', error);
    return null;
  }
}

/**
 * Format error for logging
 *
 * Extracts useful information from Error objects for CloudWatch logs.
 *
 * @param error - Error to format
 * @returns Formatted error object
 *
 * @example
 * try {
 *   await dataClient.models.WebhookEvent.create({...});
 * } catch (error) {
 *   console.error('Creation failed:', formatError(error));
 * }
 */
export function formatError(error: unknown): Record<string, any> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    error: String(error),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Batch create records with error handling
 *
 * Creates multiple records and reports which succeeded/failed.
 *
 * @param items - Array of items to create
 * @param modelName - Name of the model to create
 * @returns Object with successful and failed counts
 *
 * @example
 * const events = [
 *   { eventId: 'evt_1', data: {...} },
 *   { eventId: 'evt_2', data: {...} },
 * ];
 *
 * const result = await batchCreate(events, 'WebhookEvent');
 * console.log(`${result.successful} succeeded, ${result.failed} failed`);
 */
export async function batchCreate<T extends keyof Schema>(
  items: any[],
  modelName: T
): Promise<{ successful: number; failed: number; errors: any[] }> {
  const results = await Promise.allSettled(
    items.map(item => (dataClient.models[modelName] as any).create(item))
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  const errors = results
    .filter(r => r.status === 'rejected')
    .map(r => (r as PromiseRejectedResult).reason);

  return { successful, failed, errors };
}
