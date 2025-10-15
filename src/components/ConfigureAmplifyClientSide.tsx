"use client";

import { Amplify } from 'aws-amplify';
import outputs from '@root/amplify_outputs.json';

/**
 * Configure Amplify for Client-Side Usage
 *
 * This component configures Amplify when the app loads in the browser.
 * It should be rendered early in your component tree (in layout.tsx).
 *
 * IMPORTANT: This is for CLIENT-SIDE only!
 * For server-side (middleware, API routes), use amplify-server-utils.ts
 *
 * @see resources/handbook/auth/new/CLIENT_VS_SERVER_AUTH.md
 */

console.log('[Amplify Config] Configuring Amplify client-side');
console.log('[Amplify Config] Current URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');

// Configure Amplify with SSR support
Amplify.configure(outputs, {
  ssr: true, // Enable SSR mode for Next.js
});

console.log('[Amplify Config] Amplify configured successfully');

export default function ConfigureAmplifyClientSide() {
  // This component just runs the configuration on import
  // No UI needed
  return null;
}
