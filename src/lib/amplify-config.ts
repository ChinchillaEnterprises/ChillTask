'use client';

/**
 * Centralized Amplify Configuration
 *
 * This module provides a single point of configuration for AWS Amplify.
 * Following the latest Amplify Gen 2 best practices (2025).
 *
 * Usage: Import and call configureAmplify() once at the root layout level.
 */

import { Amplify, ResourcesConfig } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

let configured = false;

export function configureAmplify() {
  if (typeof window !== 'undefined' && !configured) {
    Amplify.configure(outputs as ResourcesConfig, {
      ssr: true,
    });
    configured = true;
    console.log('✅ Amplify configured');
  }
}
