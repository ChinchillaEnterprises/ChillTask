import { defineAuth } from '@aws-amplify/backend';

/**
 * 📧 Basic Email Authentication
 * 
 * This is the simplest auth configuration - email and password only.
 * Perfect for getting started quickly.
 * 
 * Features:
 * - Email/password sign up and sign in
 * - Email verification required
 * - Password reset via email
 * - Basic password requirements
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  
  // Optional: Customize password requirements
  passwordPolicy: {
    minimumLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialCharacters: true,
  },
  
  // Optional: Customize account recovery
  accountRecovery: 'EMAIL_ONLY',
  
  // Optional: Customize user attributes
  userAttributes: {
    email: {
      required: true,
      mutable: true, // Users can change their email
    },
  },
});

/**
 * 💡 USAGE TIPS:
 * 
 * 1. This is the default configuration in the template
 * 2. Users must verify their email before signing in
 * 3. Passwords must meet all requirements
 * 4. Users can reset passwords via email
 * 
 * CLIENT-SIDE CODE:
 * ```typescript
 * import { signUp, signIn, signOut, confirmSignUp } from 'aws-amplify/auth';
 * 
 * // Sign up
 * await signUp({
 *   username: "user@example.com",
 *   password: "MySecurePassword123!",
 *   options: {
 *     userAttributes: {
 *       email: "user@example.com"
 *     }
 *   }
 * });
 * 
 * // Confirm sign up with code from email
 * await confirmSignUp({
 *   username: "user@example.com",
 *   confirmationCode: "123456"
 * });
 * 
 * // Sign in
 * await signIn({
 *   username: "user@example.com",
 *   password: "MySecurePassword123!"
 * });
 * ```
 */