import { defineAuth } from '@aws-amplify/backend';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';

/**
 * 🏢 Enterprise Authentication Configuration
 * 
 * This example demonstrates enterprise-grade authentication with:
 * - User groups and roles
 * - Advanced security features
 * - Custom authentication flows
 * - Compliance and auditing
 * - Advanced password policies
 * - User migration support
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    username: true,
    
    // Enterprise SSO
    externalProviders: {
      oidc: [
        {
          name: 'CorporateAD',
          clientId: process.env.AD_CLIENT_ID!,
          clientSecret: process.env.AD_CLIENT_SECRET!,
          issuerUrl: 'https://login.microsoftonline.com/tenant-id/v2.0',
          scopes: ['openid', 'email', 'profile', 'User.Read'],
          attributeMapping: {
            email: 'email',
            preferredUsername: 'upn',
            givenName: 'given_name',
            familyName: 'family_name',
            'custom:department': 'department',
            'custom:employeeId': 'employee_id',
          },
        },
      ],
      saml: {
        name: 'CorporateSAML',
        metadata: {
          metadataContent: process.env.SAML_METADATA!,
          metadataType: 'FILE',
        },
      },
      callbackUrls: ['https://app.company.com/auth/callback'],
      logoutUrls: ['https://app.company.com/auth/logout'],
    },
  },
  
  // Strict password policy
  passwordPolicy: {
    minimumLength: 12,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialCharacters: true,
    // Custom password validation in Lambda trigger
  },
  
  // Required MFA for all users
  multifactor: {
    mode: 'REQUIRED',
    sms: true,
    totp: true,
  },
  
  // Enterprise user attributes
  userAttributes: {
    email: {
      required: true,
      mutable: false, // Email cannot be changed
    },
    phoneNumber: {
      required: true,
      mutable: true,
    },
    givenName: {
      required: true,
      mutable: true,
    },
    familyName: {
      required: true,
      mutable: true,
    },
    // Enterprise custom attributes
    'custom:employeeId': {
      dataType: 'String',
      mutable: false,
      maxLen: 50,
    },
    'custom:department': {
      dataType: 'String',
      mutable: true,
      maxLen: 100,
    },
    'custom:manager': {
      dataType: 'String',
      mutable: true,
      maxLen: 100,
    },
    'custom:costCenter': {
      dataType: 'String',
      mutable: true,
      maxLen: 50,
    },
    'custom:securityClearance': {
      dataType: 'String',
      mutable: false,
      maxLen: 50,
    },
    'custom:dataClassification': {
      dataType: 'String',
      mutable: false,
      maxLen: 50,
    },
  },
  
  // User groups for role-based access
  groups: [
    {
      name: 'Admins',
      description: 'Full system administrators',
      precedence: 1,
    },
    {
      name: 'Managers',
      description: 'Department managers with elevated permissions',
      precedence: 10,
    },
    {
      name: 'Employees',
      description: 'Regular employees',
      precedence: 100,
    },
    {
      name: 'ReadOnly',
      description: 'Read-only access for auditors',
      precedence: 200,
    },
    {
      name: 'ExternalPartners',
      description: 'External partners with limited access',
      precedence: 300,
    },
  ],
  
  // Advanced security
  advancedSecurityMode: 'ENFORCED',
  
  // Account recovery
  accountRecovery: 'EMAIL_AND_PHONE_WITH_MFA',
  
  // Device tracking
  deviceTracking: {
    challengeRequiredOnNewDevice: true,
    deviceOnlyRememberedOnUserPrompt: false,
  },
  
  // Email configuration
  senders: {
    email: {
      fromEmail: 'security@company.com',
      fromName: 'Company Security',
    },
  },
  
  // Session configuration
  userPoolName: 'EnterpriseUserPool',
  
  // Lambda triggers for enterprise logic
  triggers: {
    // Validate user registration
    preSignUp: defineFunction({
      name: 'preSignUpValidation',
      entry: './triggers/pre-sign-up.ts',
      environment: {
        ALLOWED_DOMAINS: 'company.com,subsidiary.com',
        EMPLOYEE_API_URL: process.env.EMPLOYEE_API_URL!,
      },
    }),
    
    // Post-confirmation setup
    postConfirmation: defineFunction({
      name: 'postConfirmationSetup',
      entry: './triggers/post-confirmation.ts',
      environment: {
        DEFAULT_GROUP: 'Employees',
        ONBOARDING_QUEUE_URL: process.env.ONBOARDING_QUEUE_URL!,
      },
    }),
    
    // Custom authentication challenge
    defineAuthChallenge: defineFunction({
      name: 'defineAuthChallenge',
      entry: './triggers/define-auth-challenge.ts',
    }),
    
    createAuthChallenge: defineFunction({
      name: 'createAuthChallenge',
      entry: './triggers/create-auth-challenge.ts',
    }),
    
    verifyAuthChallengeResponse: defineFunction({
      name: 'verifyAuthChallenge',
      entry: './triggers/verify-auth-challenge.ts',
    }),
    
    // Pre-token generation for custom claims
    preTokenGeneration: defineFunction({
      name: 'preTokenGeneration',
      entry: './triggers/pre-token-generation.ts',
      environment: {
        PERMISSIONS_API_URL: process.env.PERMISSIONS_API_URL!,
      },
    }),
    
    // User migration from legacy system
    userMigration: defineFunction({
      name: 'userMigration',
      entry: './triggers/user-migration.ts',
      environment: {
        LEGACY_AUTH_URL: process.env.LEGACY_AUTH_URL!,
        LEGACY_API_KEY: process.env.LEGACY_API_KEY!,
      },
      timeout: Duration.seconds(30),
    }),
    
    // Custom email sender
    customEmailSender: defineFunction({
      name: 'customEmailSender',
      entry: './triggers/custom-email-sender.ts',
      environment: {
        EMAIL_TEMPLATE_BUCKET: process.env.EMAIL_TEMPLATE_BUCKET!,
        COMPANY_BRANDING_URL: process.env.COMPANY_BRANDING_URL!,
      },
    }),
  },
});

/**
 * 🔧 ENTERPRISE IMPLEMENTATION GUIDE:
 * 
 * 1. USER GROUPS AND PERMISSIONS:
 *    ```typescript
 *    // In your post-confirmation trigger
 *    await adminAddUserToGroup({
 *      UserPoolId: userPoolId,
 *      Username: event.userName,
 *      GroupName: 'Employees'
 *    });
 *    
 *    // Check group membership
 *    const groups = session.tokens?.idToken?.payload['cognito:groups'] || [];
 *    const isAdmin = groups.includes('Admins');
 *    ```
 * 
 * 2. CUSTOM AUTHENTICATION FLOW:
 *    - Use for step-up authentication
 *    - Implement hardware token support
 *    - Add biometric authentication
 * 
 * 3. PRE-SIGNUP VALIDATION:
 *    ```typescript
 *    // In pre-sign-up trigger
 *    const email = event.request.userAttributes.email;
 *    const domain = email.split('@')[1];
 *    
 *    if (!ALLOWED_DOMAINS.includes(domain)) {
 *      throw new Error('Registration restricted to company emails');
 *    }
 *    
 *    // Verify employee ID
 *    const employeeId = event.request.userAttributes['custom:employeeId'];
 *    const isValid = await verifyEmployeeId(employeeId);
 *    
 *    if (!isValid) {
 *      throw new Error('Invalid employee ID');
 *    }
 *    ```
 * 
 * 4. TOKEN CUSTOMIZATION:
 *    ```typescript
 *    // In pre-token generation trigger
 *    event.response.claimsOverrideDetails = {
 *      claimsToAddOrOverride: {
 *        department: event.request.userAttributes['custom:department'],
 *        permissions: await getUserPermissions(event.userName),
 *        dataAccess: getDataAccessLevel(event.request.userAttributes),
 *      }
 *    };
 *    ```
 * 
 * 5. USER MIGRATION:
 *    ```typescript
 *    // In user migration trigger
 *    if (event.triggerSource === 'UserMigration_Authentication') {
 *      const user = await authenticateAgainstLegacySystem(
 *        event.userName,
 *        event.request.password
 *      );
 *      
 *      if (user) {
 *        event.response.userAttributes = user.attributes;
 *        event.response.finalUserStatus = 'CONFIRMED';
 *        event.response.messageAction = 'SUPPRESS';
 *      }
 *    }
 *    ```
 * 
 * 6. COMPLIANCE AND AUDITING:
 *    - Enable CloudTrail for all auth events
 *    - Set up CloudWatch alarms for suspicious activity
 *    - Implement session recording for privileged users
 *    - Regular access reviews and certification
 * 
 * 7. SECURITY BEST PRACTICES:
 *    - Rotate API keys and secrets regularly
 *    - Implement IP allowlisting for admin users
 *    - Use AWS WAF for additional protection
 *    - Enable account takeover protection
 *    - Implement anomaly detection
 */