import { createServerRunner } from '@aws-amplify/adapter-nextjs';

// Load amplify_outputs.json - required for production
let amplifyConfig: any = null;

try {
  // @ts-ignore - This file must exist after deployment
  amplifyConfig = require('../../amplify_outputs.json');
} catch (err) {
  console.error('ERROR: amplify_outputs.json not found. Run "npx ampx sandbox" to generate it.');
  throw new Error('Amplify configuration required. Please run "npx ampx sandbox" to set up authentication.');
}

// Create server runner with Amplify config
export const { runWithAmplifyServerContext } = createServerRunner({ config: amplifyConfig });