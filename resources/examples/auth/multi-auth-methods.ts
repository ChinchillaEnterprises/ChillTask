import { defineAuth } from '@aws-amplify/backend';

/**
 * 🔐 Multiple Authentication Methods
 * 
 * This example shows how to support multiple sign-in options,
 * giving users flexibility in how they authenticate.
 * 
 * Features:
 * - Email/password authentication
 * - Phone number with SMS verification
 * - Username-based login
 * - Social providers (Google, Facebook, Amazon, Apple)
 * - Multi-factor authentication (MFA)
 */
export const auth = defineAuth({
  loginWith: {
    // Traditional methods
    email: true,
    phone: true,
    username: true,
    
    // Social providers (requires additional setup)
    externalProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        scopes: ['email', 'profile'],
      },
      facebook: {
        clientId: process.env.FACEBOOK_APP_ID!,
        clientSecret: process.env.FACEBOOK_APP_SECRET!,
        scopes: ['email', 'public_profile'],
      },
      loginWithAmazon: {
        clientId: process.env.AMAZON_CLIENT_ID!,
        clientSecret: process.env.AMAZON_CLIENT_SECRET!,
        scopes: ['profile'],
      },
      signInWithApple: {
        clientId: process.env.APPLE_CLIENT_ID!,
        teamId: process.env.APPLE_TEAM_ID!,
        keyId: process.env.APPLE_KEY_ID!,
        privateKey: process.env.APPLE_PRIVATE_KEY!,
      },
      // OIDC provider example
      oidc: [
        {
          name: 'MyCorporateSSO',
          clientId: process.env.OIDC_CLIENT_ID!,
          clientSecret: process.env.OIDC_CLIENT_SECRET!,
          issuerUrl: 'https://auth.company.com',
          scopes: ['openid', 'email', 'profile'],
        },
      ],
      // SAML provider example
      saml: {
        name: 'CompanySAML',
        metadata: {
          metadataContent: process.env.SAML_METADATA_URL!,
          metadataType: 'URL',
        },
      },
      
      // Configure callback URLs
      callbackUrls: [
        'http://localhost:3000/',
        'https://myapp.com/',
      ],
      logoutUrls: [
        'http://localhost:3000/',
        'https://myapp.com/',
      ],
    },
  },
  
  // Multi-factor authentication
  multifactor: {
    mode: 'OPTIONAL', // or 'REQUIRED' to force MFA
    sms: true,
    totp: true, // Time-based one-time password (authenticator apps)
  },
  
  // User attributes
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    phoneNumber: {
      required: false,
      mutable: true,
    },
    givenName: {
      required: false,
      mutable: true,
    },
    familyName: {
      required: false,
      mutable: true,
    },
    nickname: {
      required: false,
      mutable: true,
    },
    profilePicture: {
      required: false,
      mutable: true,
    },
    preferredUsername: {
      required: false,
      mutable: true,
    },
    // Custom attributes
    'custom:accountType': {
      dataType: 'String',
      mutable: true,
      maxLen: 256,
      minLen: 1,
    },
    'custom:marketingOptIn': {
      dataType: 'Boolean',
      mutable: true,
    },
  },
  
  // Advanced settings
  accountRecovery: 'EMAIL_AND_PHONE_WITHOUT_MFA',
  
  userPoolName: 'MyAppUserPool',
  
  // Email configuration
  senders: {
    email: {
      fromEmail: 'noreply@myapp.com',
      fromName: 'My App',
    },
  },
});

/**
 * 🚀 IMPLEMENTATION GUIDE:
 * 
 * 1. SOCIAL PROVIDER SETUP:
 *    - Register your app with each provider
 *    - Get client ID and secret
 *    - Set environment variables
 *    - Configure redirect URLs in provider console
 * 
 * 2. MFA SETUP:
 *    - Users can enable MFA in settings
 *    - Support both SMS and authenticator apps
 *    - Consider making it required for admin users
 * 
 * 3. CUSTOM ATTRIBUTES:
 *    - Prefix with 'custom:' 
 *    - Define data type and constraints
 *    - Access in Lambda triggers
 * 
 * 4. CLIENT-SIDE EXAMPLES:
 * 
 * ```typescript
 * // Sign in with social provider
 * import { signInWithRedirect } from 'aws-amplify/auth';
 * 
 * await signInWithRedirect({
 *   provider: 'Google'
 * });
 * 
 * // Sign up with phone
 * await signUp({
 *   username: '+1234567890',
 *   password: 'SecurePass123!',
 *   options: {
 *     userAttributes: {
 *       phone_number: '+1234567890',
 *       email: 'user@example.com',
 *       'custom:accountType': 'premium'
 *     }
 *   }
 * });
 * 
 * // Enable MFA
 * import { setUpTOTP, updateMFAPreference } from 'aws-amplify/auth';
 * 
 * const totpSetup = await setUpTOTP();
 * // Show QR code: totpSetup.getSetupUri('My App')
 * 
 * await updateMFAPreference({
 *   totp: 'PREFERRED',
 *   sms: 'ENABLED'
 * });
 * ```
 * 
 * 5. ENVIRONMENT VARIABLES:
 *    Set these in your deployment environment:
 *    - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *    - FACEBOOK_APP_ID, FACEBOOK_APP_SECRET
 *    - etc.
 */