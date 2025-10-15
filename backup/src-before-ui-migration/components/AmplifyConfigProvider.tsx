'use client';

/**
 * Amplify Configuration Provider Component
 *
 * This component ensures Amplify is configured once on the client side.
 * Must be used in the root layout to configure Amplify for the entire app.
 */

import { useEffect } from 'react';
import { configureAmplify } from '@/lib/amplify-config';

export default function AmplifyConfigProvider() {
  useEffect(() => {
    configureAmplify();
  }, []);

  return null;
}
