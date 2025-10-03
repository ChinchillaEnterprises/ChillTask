import type { PreSignUpTriggerHandler } from 'aws-lambda';

/**
 * 🛡️ Pre-Signup Validation Trigger
 * 
 * This trigger runs before a user is created in Cognito.
 * Use it to:
 * - Validate email domains
 * - Check invitation codes
 * - Verify employee IDs
 * - Auto-confirm specific users
 * - Prevent unwanted registrations
 */
export const handler: PreSignUpTriggerHandler = async (event) => {
  console.log('Pre-signup trigger:', JSON.stringify(event, null, 2));

  const { email, phone_number } = event.request.userAttributes;

  // Example 1: Domain restriction
  if (email) {
    const domain = email.split('@')[1];
    const allowedDomains = process.env.ALLOWED_DOMAINS?.split(',') || [];
    
    if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
      throw new Error(`Registration is restricted to ${allowedDomains.join(', ')} email addresses`);
    }
  }

  // Example 2: Invitation code validation
  const inviteCode = event.request.clientMetadata?.inviteCode;
  if (process.env.REQUIRE_INVITE === 'true' && !inviteCode) {
    throw new Error('An invitation code is required to register');
  }

  // Example 3: Auto-confirm internal users
  const internalDomains = ['company.com', 'internal.company.com'];
  if (email && internalDomains.includes(email.split('@')[1])) {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
    event.response.autoVerifyPhone = true;
  }

  // Example 4: Custom attribute validation
  const employeeId = event.request.userAttributes['custom:employeeId'];
  if (employeeId) {
    // Validate against external system
    const isValid = await validateEmployeeId(employeeId);
    if (!isValid) {
      throw new Error('Invalid employee ID');
    }
  }

  // Example 5: Rate limiting
  const registrationCount = await getRecentRegistrations(event.request.clientMetadata?.ipAddress);
  if (registrationCount > 5) {
    throw new Error('Too many registration attempts. Please try again later.');
  }

  return event;
};

// Helper functions
async function validateEmployeeId(employeeId: string): Promise<boolean> {
  // In real implementation, check against HR system
  // For demo, just check format
  return /^EMP\d{6}$/.test(employeeId);
}

async function getRecentRegistrations(ipAddress?: string): Promise<number> {
  // In real implementation, check DynamoDB or Redis
  // For demo, return 0
  return 0;
}

/**
 * 💡 BEST PRACTICES:
 * 
 * 1. ALWAYS return the event object
 * 2. Throw errors to reject registration
 * 3. Use event.response to modify behavior
 * 4. Log everything for debugging
 * 5. Keep logic fast (< 5 seconds)
 * 
 * AVAILABLE RESPONSE FIELDS:
 * - autoConfirmUser: Skip email/phone verification
 * - autoVerifyEmail: Mark email as verified
 * - autoVerifyPhone: Mark phone as verified
 * 
 * CLIENT METADATA:
 * Pass custom data from client:
 * ```typescript
 * await signUp({
 *   username: email,
 *   password: password,
 *   options: {
 *     userAttributes: { email },
 *     clientMetadata: {
 *       inviteCode: 'ABC123',
 *       source: 'marketing-campaign'
 *     }
 *   }
 * });
 * ```
 */