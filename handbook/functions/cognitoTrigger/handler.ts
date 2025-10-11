import { 
  PostConfirmationTriggerHandler, 
  PreSignUpTriggerHandler,
  PostAuthenticationTriggerHandler,
  PreAuthenticationTriggerHandler,
  PreTokenGenerationTriggerHandler
} from 'aws-lambda';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../data/resource';

/**
 * Educational Example: Comprehensive Cognito Trigger Handler
 * 
 * This function demonstrates how to handle multiple Cognito trigger types:
 * 
 * TRIGGER TYPES:
 * - PostConfirmation: After user confirms email/phone (welcome flows)
 * - PreSignUp: Before user registration (validation, auto-confirm)
 * - PostAuthentication: After successful login (analytics, last login)
 * - PreAuthentication: Before login attempt (custom validation)
 * - PreTokenGeneration: Before JWT token creation (add custom claims)
 * 
 * COMMON PATTERNS:
 * 1. Check event.triggerSource to determine trigger type
 * 2. Extract user attributes from event.request.userAttributes
 * 3. Perform business logic (database operations, external API calls)
 * 4. Handle errors gracefully (usually return event, don't throw)
 * 5. Always return the event object to complete the Cognito flow
 * 
 * EDUCATIONAL FOCUS:
 * - User lifecycle management (onboarding, profile setup)
 * - Welcome email automation
 * - Role assignment and permissions
 * - Analytics and tracking
 * - Custom validation and business rules
 */

// Main handler that routes to specific trigger handlers based on trigger source
export const handler = async (event: any) => {
  console.log('=== Cognito Trigger Handler Started ===');
  console.log('Trigger Source:', event.triggerSource);
  console.log('User Pool ID:', event.userPoolId);
  console.log('Username:', event.userName);
  console.log('Region:', event.region);
  
  try {
    // Route to appropriate handler based on trigger source
    switch (event.triggerSource) {
      case 'PostConfirmation_ConfirmSignUp':
      case 'PostConfirmation_ConfirmForgotPassword':
        return await handlePostConfirmation(event);
        
      case 'PreSignUp_SignUp':
      case 'PreSignUp_AdminCreateUser':
        return await handlePreSignUp(event);
        
      case 'PostAuthentication_Authentication':
        return await handlePostAuthentication(event);
        
      case 'PreAuthentication_Authentication':
        return await handlePreAuthentication(event);
        
      case 'TokenGeneration_HostedAuth':
      case 'TokenGeneration_Authentication':
      case 'TokenGeneration_NewPasswordChallenge':
      case 'TokenGeneration_AuthenticateDevice':
        return await handleTokenGeneration(event);
        
      default:
        console.log('⚠️ Unhandled trigger source:', event.triggerSource);
        return event;
    }
    
  } catch (error: any) {
    console.error('=== COGNITO TRIGGER ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Username:', event.userName);
    console.error('Trigger source:', event.triggerSource);
    
    // Generally return event to avoid blocking user flows
    // Only throw if you specifically want to block the operation
    console.log('⚠️ Returning event to allow operation despite error');
    return event;
  }
};

/**
 * POST CONFIRMATION TRIGGER
 * 
 * Executes after:
 * - User confirms email during signup (PostConfirmation_ConfirmSignUp)
 * - User confirms new password after forgot password (PostConfirmation_ConfirmForgotPassword)
 * 
 * Common use cases:
 * - Create user profile in database
 * - Send welcome email
 * - Set up user preferences
 * - Initialize user data
 * - Add to mailing lists
 * - Track registration analytics
 */
async function handlePostConfirmation(event: any) {
  console.log('=== POST CONFIRMATION HANDLER ===');
  
  // Extract user information from the Cognito event
  const { userAttributes } = event.request;
  const email = userAttributes.email;
  const firstName = userAttributes.given_name || '';
  const lastName = userAttributes.family_name || '';
  const phoneNumber = userAttributes.phone_number || '';
  
  console.log('Processing user:', {
    email,
    firstName,
    lastName,
    triggerSource: event.triggerSource
  });
  
  // Validate required fields
  if (!email) {
    console.error('❌ No email found in user attributes');
    console.error('Available attributes:', Object.keys(userAttributes));
    return event; // Allow confirmation to complete
  }

  // Handle different post-confirmation scenarios
  if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
    console.log('✅ New user signup confirmation - setting up user profile');
    
    await setupUserProfile({
      userId: event.userName,
      email,
      firstName,
      lastName,
      phoneNumber,
      isNewUser: true
    });
    
    await sendWelcomeEmail({
      email,
      firstName,
      userId: event.userName
    });
    
  } else if (event.triggerSource === 'PostConfirmation_ConfirmForgotPassword') {
    console.log('✅ Password reset confirmation - updating user activity');
    
    await updateUserActivity({
      userId: event.userName,
      activityType: 'password_reset',
      timestamp: new Date().toISOString()
    });
  }

  console.log('=== Post Confirmation Completed Successfully ===');
  return event;
}

/**
 * PRE SIGN-UP TRIGGER
 * 
 * Executes before:
 * - User registration (PreSignUp_SignUp)
 * - Admin creates user (PreSignUp_AdminCreateUser)
 * 
 * Common use cases:
 * - Custom validation (email domain, invite codes)
 * - Auto-confirm users (skip email verification)
 * - Add custom attributes
 * - Block registration based on business rules
 * - Modify user attributes before creation
 */
async function handlePreSignUp(event: any) {
  console.log('=== PRE SIGN-UP HANDLER ===');
  
  const { userAttributes, validationData } = event.request;
  const email = userAttributes.email;
  
  console.log('Pre-signup validation for:', email);
  
  // Example: Validate email domain for business accounts
  const allowedDomains = ['company.com', 'partner.com'];
  const emailDomain = email?.split('@')[1];
  
  if (emailDomain && allowedDomains.includes(emailDomain)) {
    console.log('✅ Business email detected - auto-confirming user');
    
    // Auto-confirm business users (skip email verification)
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
    
    // Add custom attributes for business users
    event.response.userAttributes = {
      ...userAttributes,
      'custom:account_type': 'business',
      'custom:verified_domain': emailDomain
    };
  }
  
  // Example: Check for invite codes in validation data
  const inviteCode = validationData?.invite_code;
  if (inviteCode) {
    const isValidInvite = await validateInviteCode(inviteCode);
    if (!isValidInvite) {
      console.error('❌ Invalid invite code:', inviteCode);
      throw new Error('Invalid invitation code. Please contact support.');
    }
    
    console.log('✅ Valid invite code - proceeding with signup');
  }
  
  console.log('=== Pre Sign-up Validation Completed ===');
  return event;
}

/**
 * POST AUTHENTICATION TRIGGER
 * 
 * Executes after:
 * - Successful user login (PostAuthentication_Authentication)
 * 
 * Common use cases:
 * - Update last login timestamp
 * - Track login analytics
 * - Update user session data
 * - Sync user data from external systems
 * - Log security events
 */
async function handlePostAuthentication(event: any) {
  console.log('=== POST AUTHENTICATION HANDLER ===');
  
  const { userAttributes } = event.request;
  const userId = event.userName;
  const email = userAttributes.email;
  
  console.log('User logged in:', { userId, email });
  
  // Update last login timestamp
  await updateUserActivity({
    userId,
    activityType: 'login',
    timestamp: new Date().toISOString(),
    ipAddress: event.request.userContextData?.ipAddress
  });
  
  // Track login analytics
  await trackLoginEvent({
    userId,
    email,
    loginTime: new Date().toISOString(),
    userAgent: event.request.userContextData?.encodedData
  });
  
  console.log('=== Post Authentication Completed ===');
  return event;
}

/**
 * PRE AUTHENTICATION TRIGGER
 * 
 * Executes before:
 * - User login attempt (PreAuthentication_Authentication)
 * 
 * Common use cases:
 * - Custom authentication logic
 * - Block users based on business rules
 * - Validate additional conditions
 * - Log authentication attempts
 * - Rate limiting
 */
async function handlePreAuthentication(event: any) {
  console.log('=== PRE AUTHENTICATION HANDLER ===');
  
  const { userAttributes } = event.request;
  const userId = event.userName;
  const email = userAttributes.email;
  
  console.log('Authentication attempt for:', { userId, email });
  
  // Example: Block users with suspended accounts
  const userStatus = await getUserStatus(userId);
  if (userStatus === 'suspended') {
    console.error('❌ Blocked login for suspended user:', userId);
    throw new Error('Your account has been suspended. Please contact support.');
  }
  
  // Example: Enforce business hours for certain user types
  const accountType = userAttributes['custom:account_type'];
  if (accountType === 'restricted') {
    const currentHour = new Date().getHours();
    if (currentHour < 9 || currentHour > 17) {
      console.error('❌ Login outside business hours for restricted user');
      throw new Error('Access is restricted to business hours (9 AM - 5 PM).');
    }
  }
  
  console.log('✅ Pre-authentication checks passed');
  return event;
}

/**
 * TOKEN GENERATION TRIGGER
 * 
 * Executes before:
 * - JWT token creation during various flows
 * 
 * Common use cases:
 * - Add custom claims to JWT tokens
 * - Modify token expiration
 * - Add user roles and permissions
 * - Include custom user data in tokens
 */
async function handleTokenGeneration(event: any) {
  console.log('=== TOKEN GENERATION HANDLER ===');
  
  const { userAttributes } = event.request;
  const userId = event.userName;
  
  console.log('Generating token for user:', userId);
  
  // Add custom claims to the token
  event.response.claimsOverrideDetails = {
    claimsToAddOrOverride: {
      // Add user role from custom attributes
      'custom:role': userAttributes['custom:role'] || 'user',
      
      // Add account type
      'custom:account_type': userAttributes['custom:account_type'] || 'standard',
      
      // Add permissions based on user role
      'custom:permissions': await getUserPermissions(userId),
      
      // Add custom user data
      'custom:display_name': `${userAttributes.given_name} ${userAttributes.family_name}`.trim(),
      
      // Add tenant/organization info if applicable
      'custom:organization': await getUserOrganization(userId)
    },
    
    // Optional: Remove sensitive claims
    claimsToSuppress: ['email_verified', 'phone_number_verified']
  };
  
  console.log('✅ Custom claims added to token');
  return event;
}

// =============================================================================
// EDUCATIONAL HELPER FUNCTIONS
// =============================================================================
// These demonstrate common patterns for user lifecycle management.
// Replace with your actual implementations.

/**
 * Creates or updates user profile in database
 */
async function setupUserProfile(userData: {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  isNewUser: boolean;
}) {
  console.log('📝 Setting up user profile:', userData.userId);
  
  try {
    // Create GraphQL client with IAM authorization
    const client = generateClient<Schema>({ authMode: 'iam' });
    
    if (userData.isNewUser) {
      // Create new user profile
      const userProfile = await client.models.UserProfile.create({
        id: userData.userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        accountType: 'standard',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      });
      
      console.log('✅ User profile created:', userProfile.data?.id);
      
      // Initialize user preferences
      await client.models.UserPreferences.create({
        userId: userData.userId,
        emailNotifications: true,
        pushNotifications: true,
        theme: 'light',
        language: 'en'
      });
      
      console.log('✅ User preferences initialized');
      
    } else {
      // Update existing user (for password reset scenarios)
      await client.models.UserProfile.update({
        id: userData.userId,
        lastPasswordResetAt: new Date().toISOString()
      });
      
      console.log('✅ User profile updated after password reset');
    }
    
  } catch (error: any) {
    console.error('❌ Error setting up user profile:', error.message);
    // Don't throw - allow user confirmation to succeed
  }
}

/**
 * Sends welcome email to new users
 */
async function sendWelcomeEmail(userData: {
  email: string;
  firstName: string;
  userId: string;
}) {
  console.log('📧 Sending welcome email to:', userData.email);
  
  try {
    // Example: Use AWS SES, SendGrid, or other email service
    const emailData = {
      to: [userData.email],
      subject: `Welcome ${userData.firstName}! Get started with your account`,
      templateName: 'welcome-email',
      templateData: {
        firstName: userData.firstName,
        userId: userData.userId,
        onboardingUrl: `${process.env.APP_URL}/onboarding`,
        supportEmail: 'support@yourapp.com'
      }
    };
    
    // Replace with your email service implementation
    // await emailService.sendTemplateEmail(emailData);
    
    console.log('✅ Welcome email queued for delivery');
    
  } catch (error: any) {
    console.error('❌ Error sending welcome email:', error.message);
    // Don't throw - email failure shouldn't block user confirmation
  }
}

/**
 * Updates user activity log
 */
async function updateUserActivity(activityData: {
  userId: string;
  activityType: 'login' | 'password_reset' | 'signup';
  timestamp: string;
  ipAddress?: string;
}) {
  console.log('📊 Logging user activity:', activityData.activityType);
  
  try {
    const client = generateClient<Schema>({ authMode: 'iam' });
    
    // Log activity in user activity table
    await client.models.UserActivity.create({
      userId: activityData.userId,
      activityType: activityData.activityType,
      timestamp: activityData.timestamp,
      ipAddress: activityData.ipAddress || 'unknown',
      userAgent: 'Cognito Trigger'
    });
    
    // Update user's last activity timestamp
    await client.models.UserProfile.update({
      id: activityData.userId,
      lastActivityAt: activityData.timestamp
    });
    
    console.log('✅ User activity logged');
    
  } catch (error: any) {
    console.error('❌ Error logging user activity:', error.message);
  }
}

/**
 * Validates invite codes for restricted signup
 */
async function validateInviteCode(inviteCode: string): Promise<boolean> {
  console.log('🔍 Validating invite code:', inviteCode);
  
  try {
    const client = generateClient<Schema>({ authMode: 'iam' });
    
    // Check if invite code exists and is not used
    const invite = await client.models.InviteCode.get({ code: inviteCode });
    
    if (!invite.data) {
      console.log('❌ Invite code not found');
      return false;
    }
    
    if (invite.data.isUsed) {
      console.log('❌ Invite code already used');
      return false;
    }
    
    if (new Date(invite.data.expiresAt) < new Date()) {
      console.log('❌ Invite code expired');
      return false;
    }
    
    // Mark invite as used
    await client.models.InviteCode.update({
      code: inviteCode,
      isUsed: true,
      usedAt: new Date().toISOString()
    });
    
    console.log('✅ Invite code validated and marked as used');
    return true;
    
  } catch (error: any) {
    console.error('❌ Error validating invite code:', error.message);
    return false;
  }
}

/**
 * Gets user status for authentication checks
 */
async function getUserStatus(userId: string): Promise<string> {
  try {
    const client = generateClient<Schema>({ authMode: 'iam' });
    
    const user = await client.models.UserProfile.get({ id: userId });
    return user.data?.status || 'active';
    
  } catch (error: any) {
    console.error('❌ Error getting user status:', error.message);
    return 'active'; // Default to active if unable to check
  }
}

/**
 * Gets user permissions for token claims
 */
async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const client = generateClient<Schema>({ authMode: 'iam' });
    
    // Get user's role and associated permissions
    const user = await client.models.UserProfile.get({ id: userId });
    const userRole = user.data?.role || 'user';
    
    // Map roles to permissions (customize for your app)
    const rolePermissions: Record<string, string[]> = {
      'admin': ['read', 'write', 'delete', 'manage_users'],
      'manager': ['read', 'write', 'manage_team'],
      'user': ['read', 'write'],
      'guest': ['read']
    };
    
    return rolePermissions[userRole] || ['read'];
    
  } catch (error: any) {
    console.error('❌ Error getting user permissions:', error.message);
    return ['read']; // Default minimal permissions
  }
}

/**
 * Gets user's organization for token claims
 */
async function getUserOrganization(userId: string): Promise<string> {
  try {
    const client = generateClient<Schema>({ authMode: 'iam' });
    
    const user = await client.models.UserProfile.get({ id: userId });
    return user.data?.organizationId || 'default';
    
  } catch (error: any) {
    console.error('❌ Error getting user organization:', error.message);
    return 'default';
  }
}

/**
 * Tracks login events for analytics
 */
async function trackLoginEvent(eventData: {
  userId: string;
  email: string;
  loginTime: string;
  userAgent?: string;
}) {
  console.log('📈 Tracking login event for:', eventData.userId);
  
  try {
    // Example: Send to analytics service (Mixpanel, Amplitude, etc.)
    // await analytics.track('user_login', {
    //   userId: eventData.userId,
    //   email: eventData.email,
    //   timestamp: eventData.loginTime,
    //   userAgent: eventData.userAgent
    // });
    
    console.log('✅ Login event tracked');
    
  } catch (error: any) {
    console.error('❌ Error tracking login event:', error.message);
  }
}

// =============================================================================
// EDUCATIONAL NOTES
// =============================================================================

/**
 * COGNITO TRIGGER TYPES AND USE CASES:
 * 
 * 1. PRE SIGN-UP (PreSignUp_SignUp)
 *    - Validate email domains, invite codes
 *    - Auto-confirm trusted users
 *    - Add default custom attributes
 *    - Block registration based on business rules
 * 
 * 2. POST CONFIRMATION (PostConfirmation_ConfirmSignUp)
 *    - Create user profile in database
 *    - Send welcome emails
 *    - Initialize user preferences
 *    - Add to mailing lists
 *    - Track registration analytics
 * 
 * 3. PRE AUTHENTICATION (PreAuthentication_Authentication)
 *    - Validate additional login conditions
 *    - Block suspended users
 *    - Enforce business hours
 *    - Rate limiting
 * 
 * 4. POST AUTHENTICATION (PostAuthentication_Authentication)
 *    - Update last login timestamp
 *    - Track login analytics
 *    - Sync external user data
 *    - Log security events
 * 
 * 5. TOKEN GENERATION (TokenGeneration_*)
 *    - Add custom claims (roles, permissions)
 *    - Include user metadata in tokens
 *    - Organization/tenant information
 *    - Feature flags
 * 
 * IMPORTANT PATTERNS:
 * 
 * - Always return the event object (required by Cognito)
 * - Use try/catch and generally don't throw errors (blocks user flows)
 * - Check event.triggerSource to handle different scenarios
 * - Extract user attributes from event.request.userAttributes
 * - Use IAM authentication for AppSync/database operations
 * - Log extensively for debugging and monitoring
 * 
 * USER ATTRIBUTES AVAILABLE:
 * 
 * Standard attributes:
 * - email, email_verified
 * - given_name, family_name, name
 * - phone_number, phone_number_verified
 * - birthdate, gender, locale, zoneinfo
 * - address, website, picture
 * 
 * Custom attributes (prefixed with 'custom:'):
 * - custom:role, custom:organization
 * - custom:account_type, custom:permissions
 * - custom:onboarding_completed
 * 
 * ERROR HANDLING STRATEGIES:
 * 
 * 1. Allow Continuation (Recommended):
 *    - Log error, return event
 *    - User flow continues despite function failure
 *    - Good for non-critical operations
 * 
 * 2. Block Operation (Use Sparingly):
 *    - Log error, throw exception
 *    - User flow is blocked
 *    - Only for critical validation failures
 * 
 * PERFORMANCE CONSIDERATIONS:
 * 
 * - Cognito triggers have 30-second timeout limit
 * - Optimize database queries and external API calls
 * - Consider async processing for heavy operations
 * - Use appropriate Lambda memory allocation
 * - Monitor CloudWatch logs and metrics
 */