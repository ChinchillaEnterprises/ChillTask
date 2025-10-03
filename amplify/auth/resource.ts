import { defineAuth, secret } from '@aws-amplify/backend';
// Template functions removed - not needed for ChillTask
// import { authUsers } from '../functions/auth-users/resource';
// import { authGroups } from '../functions/auth-groups/resource';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['email', 'profile', 'openid'],
        attributeMapping: {
          email: 'email',
          givenName: 'given_name',
          familyName: 'family_name',
          profilePicture: 'picture',
        },
      },
      // Okta configuration commented out - missing secrets
      // oidc: [
      //   {
      //     name: 'Okta',
      //     clientId: secret('OKTA_CLIENT_ID'),
      //     clientSecret: secret('OKTA_CLIENT_SECRET'),
      //     issuerUrl: 'https://trial-7156045.okta.com/oauth2/default',
      //     scopes: ['openid', 'email', 'profile'],
      //     attributeMapping: {
      //       email: 'email',
      //       givenName: 'given_name',
      //       familyName: 'family_name',
      //       profilePicture: 'picture',
      //       preferredUsername: 'preferred_username',
      //     },
      //   },
      // ],
      callbackUrls: [
        'http://localhost:3000/auth/callback',
        'http://localhost:3000/',
        'http://localhost:3000/authentication/sign-in',
        'http://localhost:3000/dashboard/ecommerce',
        // Production domain URLs
        'https://www.template.chinchilla-ai.com/auth/callback',
        'https://www.template.chinchilla-ai.com/',
        'https://www.template.chinchilla-ai.com/authentication/sign-in',
        'https://www.template.chinchilla-ai.com/dashboard/ecommerce',
      ],
      logoutUrls: [
        'http://localhost:3000/authentication/sign-in',
        // Production domain URL
        'https://www.template.chinchilla-ai.com/authentication/sign-in',
      ],
    },
  },
  userAttributes: {
    email: {
      required: true,
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
    profilePicture: {
      required: false,
      mutable: true,
    },
  },
  groups: ['ADMINS'],
  // Template function access removed - not needed for ChillTask
  // access: (allow) => [
  //   allow.resource(authUsers).to([...]),
  //   allow.resource(authGroups).to([...]),
  // ],
});