"use client";

import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

/**
 * Configure Amplify with the generated outputs
 *
 * This should be imported and called at the root of your application
 * (typically in app/layout.tsx or a provider component)
 *
 * @see resources/handbook/frontend/README.md
 */
export function configureAmplify() {
  Amplify.configure(outputs, {
    ssr: true, // Enable SSR support for Next.js
  });
}

// Auto-configure on import (useful for client components)
if (typeof window !== 'undefined') {
  configureAmplify();
}
