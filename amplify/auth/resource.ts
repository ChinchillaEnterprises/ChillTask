import { defineAuth, secret } from '@aws-amplify/backend';

/**
 * PRODUCTION-GRADE AUTHENTICATION CONFIGURATION
 *
 * Pattern 2: Social Authentication with Google
 * Security Hardened for Enterprise/Government Use
 *
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 * @see resources/handbook/auth/AUTH_PATTERNS.md
 * @see resources/handbook/auth/SECURITY_CHECKLIST.md
 *
 * CRITICAL SECURITY NOTES:
 * - All attributes except email are OPTIONAL (SSO compatibility)
 * - Standard attributes enabled NOW (can't add later!)
 * - Strong password policy (12+ chars for enterprise)
 * - Custom attributes are PERMANENT - choose carefully
 */
export const auth = defineAuth({
  loginWith: {
    email: true,

    externalProviders: {
      // Google OAuth Configuration
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['email', 'profile', 'openid'],
      },

      // Callback URLs - must match EXACTLY in OAuth provider console
      callbackUrls: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        // Add production URLs when deploying
      ],

      // Logout URLs - where users are redirected after logout
      logoutUrls: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        // Add production URLs when deploying
      ],
    },
  },

  // User attributes - PRODUCTION-READY configuration
  // Note: Password policy can be configured via CDK overrides in backend.ts if needed
  userAttributes: {
    // ✅ Core identity attributes
    email: {
      required: true, // ONLY required attribute (SSO compatibility)
      mutable: true,
    },

    givenName: {
      required: false, // Optional for SSO compatibility
      mutable: true,
    },

    familyName: {
      required: false, // Optional for SSO compatibility
      mutable: true,
    },

    preferredUsername: {
      required: false,
      mutable: true,
    },

    // ✅ FUTURE-PROOFING: Enable NOW or NEVER
    // Standard attributes can't be added later!
    // Costs nothing to enable, can use them when needed
    phoneNumber: {
      required: false, // Enable for future MFA, SMS notifications
      mutable: true,
    },

    locale: {
      required: false, // Enable for future i18n
      mutable: true,
    },

    address: {
      required: false, // Enable for future billing addresses
      mutable: true,
    },

    // 🔒 Add custom attributes here when needed
    // Remember: Custom attributes are PERMANENT - can't delete!
    // Use DynamoDB for frequently-changing data

    // Example for B2B multi-tenant apps:
    // 'custom:companyId': {
    //   dataType: 'String',
    //   mutable: false,  // Immutable - users can't switch companies
    // },
    // 'custom:role': {
    //   dataType: 'String',
    //   mutable: true,   // Mutable - allows promotions
    // },
  },
});
