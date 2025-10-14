'use client';

/**
 * Centralized Amplify Data Client
 *
 * Provides pre-configured Amplify Data clients for use throughout the application.
 * Following the latest Amplify Gen 2 best practices (2025).
 *
 * Usage:
 *   import { client } from '@/lib/amplify-client';
 *   const { data } = await client.models.ChannelMapping.list();
 */

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/schema';

// Default client with API Key auth (for public access)
// This matches your current authorization setup (allow.publicApiKey())
export const client = generateClient<Schema>({
  authMode: 'apiKey',
});

// Authenticated client (for future use when/if auth is re-enabled)
export const authenticatedClient = generateClient<Schema>({
  authMode: 'userPool',
});

// IAM client (for server-side Lambda function access)
export const iamClient = generateClient<Schema>({
  authMode: 'iam',
});
