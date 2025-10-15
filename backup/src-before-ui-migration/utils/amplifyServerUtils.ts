/**
 * Server-Side Amplify Configuration Utilities
 *
 * This file provides utilities for using Amplify in Next.js server contexts
 * (API routes, Server Components, Server Actions, Middleware).
 *
 * Uses the modern `createServerRunner()` pattern recommended by AWS Amplify Gen 2.
 *
 * Benefits:
 * - Proper request isolation
 * - Cookie handling for authentication
 * - Future-proof for adding auth
 * - Clean separation of concerns
 */

import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import config from '@/amplify_outputs.json';

export const { runWithAmplifyServerContext } = createServerRunner({
  config,
});
