import { defineData } from '@aws-amplify/backend';
import { schema, type Schema } from './schema';

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

// Re-export Schema type for backward compatibility
export type { Schema };
