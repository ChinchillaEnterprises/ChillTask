import { defineAuth } from '@aws-amplify/backend';
import { defineFunction } from '@aws-amplify/backend';

/**
 * 🏢 B2B Multi-Tenant Authentication
 * 
 * This example demonstrates authentication for B2B SaaS applications with:
 * - Multiple organizations/tenants
 * - User belongs to multiple organizations
 * - Organization-specific roles and permissions
 * - Invitation-based onboarding
 * - Custom domains per tenant
 * - Usage tracking and limits
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    username: true,
    
    // Enterprise SSO per tenant
    externalProviders: {
      oidc: [
        {
          name: 'TenantSSO',
          clientId: process.env.TENANT_SSO_CLIENT_ID!,
          clientSecret: process.env.TENANT_SSO_CLIENT_SECRET!,
          issuerUrl: 'dynamic', // Set dynamically based on tenant
          scopes: ['openid', 'email', 'profile'],
        },
      ],
      callbackUrls: [
        'https://*.myapp.com/auth/callback',
        'https://app.myapp.com/auth/callback',
        'http://localhost:3000/auth/callback',
      ],
      logoutUrls: [
        'https://*.myapp.com',
        'https://app.myapp.com',
        'http://localhost:3000',
      ],
    },
  },
  
  // Multi-factor for security
  multifactor: {
    mode: 'OPTIONAL',
    sms: true,
    totp: true,
  },
  
  // B2B user attributes
  userAttributes: {
    email: {
      required: true,
      mutable: false,
    },
    givenName: {
      required: true,
      mutable: true,
    },
    familyName: {
      required: true,
      mutable: true,
    },
    // Multi-tenant attributes
    'custom:tenantId': {
      dataType: 'String',
      mutable: true,
      maxLen: 256, // Comma-separated list of tenant IDs
    },
    'custom:primaryTenantId': {
      dataType: 'String',
      mutable: true,
      maxLen: 50,
    },
    'custom:tenantRoles': {
      dataType: 'String',
      mutable: true,
      maxLen: 1000, // JSON string of {tenantId: role} mappings
    },
    'custom:invitedBy': {
      dataType: 'String',
      mutable: false,
      maxLen: 100,
    },
    'custom:accountStatus': {
      dataType: 'String',
      mutable: true,
      maxLen: 50, // active, suspended, cancelled
    },
    'custom:billingTier': {
      dataType: 'String',
      mutable: true,
      maxLen: 50, // free, starter, pro, enterprise
    },
    'custom:apiQuota': {
      dataType: 'Number',
      mutable: true,
      minValue: 0,
      maxValue: 1000000,
    },
  },
  
  // Organization-based groups
  groups: [
    // Global roles
    {
      name: 'SuperAdmin',
      description: 'Platform administrators',
      precedence: 1,
    },
    // Tenant-specific roles (created dynamically)
    // Format: {tenantId}_Owner, {tenantId}_Admin, {tenantId}_Member
  ],
  
  // Lambda triggers for B2B logic
  triggers: {
    // Validate invitation before sign-up
    preSignUp: defineFunction({
      name: 'validateInvitation',
      entry: './triggers/b2b/pre-sign-up.ts',
      environment: {
        INVITATION_TABLE: process.env.INVITATION_TABLE!,
        TENANT_TABLE: process.env.TENANT_TABLE!,
      },
    }),
    
    // Set up tenant access after confirmation
    postConfirmation: defineFunction({
      name: 'setupTenantAccess',
      entry: './triggers/b2b/post-confirmation.ts',
      environment: {
        TENANT_TABLE: process.env.TENANT_TABLE!,
        USAGE_TABLE: process.env.USAGE_TABLE!,
        WELCOME_EMAIL_TEMPLATE: process.env.WELCOME_EMAIL_TEMPLATE!,
      },
    }),
    
    // Add tenant context to tokens
    preTokenGeneration: defineFunction({
      name: 'addTenantContext',
      entry: './triggers/b2b/pre-token-generation.ts',
      environment: {
        TENANT_TABLE: process.env.TENANT_TABLE!,
        PERMISSION_SERVICE_URL: process.env.PERMISSION_SERVICE_URL!,
      },
    }),
    
    // Custom tenant selection flow
    defineAuthChallenge: defineFunction({
      name: 'tenantSelection',
      entry: './triggers/b2b/define-auth-challenge.ts',
    }),
    
    createAuthChallenge: defineFunction({
      name: 'createTenantChallenge',
      entry: './triggers/b2b/create-auth-challenge.ts',
    }),
    
    verifyAuthChallengeResponse: defineFunction({
      name: 'verifyTenantSelection',
      entry: './triggers/b2b/verify-auth-challenge.ts',
    }),
  },
});

/**
 * 🔧 B2B IMPLEMENTATION PATTERNS:
 * 
 * 1. INVITATION FLOW:
 * ```typescript
 * // Pre-sign-up validation
 * export const handler = async (event) => {
 *   const email = event.request.userAttributes.email;
 *   const inviteCode = event.request.clientMetadata?.inviteCode;
 *   
 *   if (!inviteCode) {
 *     throw new Error('Invitation code required');
 *   }
 *   
 *   // Validate invitation
 *   const invitation = await getInvitation(inviteCode);
 *   
 *   if (!invitation || invitation.email !== email || invitation.used) {
 *     throw new Error('Invalid invitation');
 *   }
 *   
 *   // Auto-confirm user
 *   event.response.autoConfirmUser = true;
 *   event.response.autoVerifyEmail = true;
 *   
 *   return event;
 * };
 * ```
 * 
 * 2. MULTI-TENANT TOKEN:
 * ```typescript
 * // Pre-token generation
 * export const handler = async (event) => {
 *   const userId = event.request.userAttributes.sub;
 *   const requestedTenantId = event.request.clientMetadata?.tenantId;
 *   
 *   // Get user's tenant access
 *   const tenantIds = event.request.userAttributes['custom:tenantId']?.split(',') || [];
 *   const tenantRoles = JSON.parse(
 *     event.request.userAttributes['custom:tenantRoles'] || '{}'
 *   );
 *   
 *   // Validate access to requested tenant
 *   const currentTenantId = requestedTenantId || 
 *     event.request.userAttributes['custom:primaryTenantId'];
 *   
 *   if (!tenantIds.includes(currentTenantId)) {
 *     throw new Error('Access denied to tenant');
 *   }
 *   
 *   // Get tenant details
 *   const tenant = await getTenant(currentTenantId);
 *   
 *   // Add custom claims
 *   event.response.claimsOverrideDetails = {
 *     claimsToAddOrOverride: {
 *       'custom:tenantId': currentTenantId,
 *       'custom:tenantName': tenant.name,
 *       'custom:role': tenantRoles[currentTenantId] || 'member',
 *       'custom:permissions': await getPermissions(currentTenantId, userId),
 *       'custom:billingTier': tenant.billingTier,
 *       'custom:features': tenant.enabledFeatures,
 *     },
 *   };
 *   
 *   return event;
 * };
 * ```
 * 
 * 3. TENANT SWITCHING:
 * ```typescript
 * // Client-side tenant switching
 * import { fetchAuthSession, signIn } from 'aws-amplify/auth';
 * 
 * async function switchTenant(tenantId: string) {
 *   // Get current session
 *   const session = await fetchAuthSession();
 *   
 *   // Re-authenticate with tenant context
 *   await signIn({
 *     username: session.userSub,
 *     options: {
 *       authFlowType: 'CUSTOM_WITHOUT_SRP',
 *       clientMetadata: {
 *         tenantId,
 *       },
 *     },
 *   });
 * }
 * ```
 * 
 * 4. ORGANIZATION MANAGEMENT:
 * ```typescript
 * // Add user to organization
 * async function addUserToOrganization(
 *   userId: string,
 *   tenantId: string,
 *   role: string
 * ) {
 *   // Update user attributes
 *   const user = await getUser(userId);
 *   const tenantIds = user['custom:tenantId']?.split(',') || [];
 *   const tenantRoles = JSON.parse(user['custom:tenantRoles'] || '{}');
 *   
 *   tenantIds.push(tenantId);
 *   tenantRoles[tenantId] = role;
 *   
 *   await updateUserAttributes(userId, {
 *     'custom:tenantId': tenantIds.join(','),
 *     'custom:tenantRoles': JSON.stringify(tenantRoles),
 *   });
 *   
 *   // Add to tenant group
 *   await addUserToGroup(userId, `${tenantId}_${role}`);
 * }
 * ```
 * 
 * 5. USAGE TRACKING:
 * ```typescript
 * // Track API usage per tenant
 * async function trackUsage(tenantId: string, operation: string) {
 *   const usage = await getMonthlyUsage(tenantId);
 *   const tenant = await getTenant(tenantId);
 *   
 *   if (usage.apiCalls >= tenant.apiQuota) {
 *     throw new Error('API quota exceeded');
 *   }
 *   
 *   await incrementUsage(tenantId, operation);
 * }
 * ```
 * 
 * 6. CUSTOM DOMAIN ROUTING:
 * ```typescript
 * // Route based on subdomain
 * function getTenantFromDomain(hostname: string): string {
 *   const subdomain = hostname.split('.')[0];
 *   
 *   // Map subdomain to tenant
 *   return subdomainToTenantMap[subdomain] || 'default';
 * }
 * ```
 * 
 * 7. BILLING INTEGRATION:
 *    - Track usage per tenant
 *    - Enforce plan limits
 *    - Handle upgrades/downgrades
 *    - Suspend access for non-payment
 *    - Usage-based billing with Stripe
 */