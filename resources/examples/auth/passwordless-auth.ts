import { defineAuth } from '@aws-amplify/backend';
import { defineFunction } from '@aws-amplify/backend';
import { Duration } from 'aws-cdk-lib';

/**
 * 🔑 Passwordless Authentication
 * 
 * Modern authentication without passwords using:
 * - Magic links via email
 * - SMS one-time codes
 * - WebAuthn (biometrics, security keys)
 * - Custom authentication flows
 * 
 * Benefits:
 * - Better user experience
 * - No password fatigue
 * - Reduced support tickets
 * - Enhanced security
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    phone: true,
  },
  
  // Disable password requirements since we're passwordless
  passwordPolicy: {
    minimumLength: 8, // Still needed but won't be used
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
    // Track authentication methods
    'custom:authMethods': {
      dataType: 'String',
      mutable: true,
      maxLen: 256,
    },
    'custom:lastAuthMethod': {
      dataType: 'String',
      mutable: true,
      maxLen: 50,
    },
    'custom:webAuthnEnabled': {
      dataType: 'Boolean',
      mutable: true,
    },
  },
  
  // Custom auth flow triggers
  triggers: {
    // Define custom auth challenge flow
    defineAuthChallenge: defineFunction({
      name: 'defineAuthChallenge',
      entry: './triggers/passwordless/define-auth-challenge.ts',
      runtime: 'nodejs20.x',
      timeout: Duration.seconds(10),
    }),
    
    // Create auth challenge (send magic link or OTP)
    createAuthChallenge: defineFunction({
      name: 'createAuthChallenge',
      entry: './triggers/passwordless/create-auth-challenge.ts',
      environment: {
        APP_URL: process.env.APP_URL || 'http://localhost:3000',
        SENDER_EMAIL: 'auth@myapp.com',
        MAGIC_LINK_SECRET: process.env.MAGIC_LINK_SECRET!,
        TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID!,
        TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN!,
        TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER!,
      },
      timeout: Duration.seconds(30),
    }),
    
    // Verify auth challenge response
    verifyAuthChallengeResponse: defineFunction({
      name: 'verifyAuthChallenge',
      entry: './triggers/passwordless/verify-auth-challenge.ts',
      environment: {
        MAGIC_LINK_SECRET: process.env.MAGIC_LINK_SECRET!,
        OTP_EXPIRY_MINUTES: '5',
      },
      timeout: Duration.seconds(10),
    }),
    
    // Pre sign-up to auto-confirm users
    preSignUp: defineFunction({
      name: 'preSignUpAutoConfirm',
      entry: './triggers/passwordless/pre-sign-up.ts',
    }),
  },
});

/**
 * 📝 TRIGGER IMPLEMENTATIONS:
 * 
 * 1. DEFINE AUTH CHALLENGE:
 * ```typescript
 * // triggers/passwordless/define-auth-challenge.ts
 * export const handler = async (event) => {
 *   // First attempt - create challenge
 *   if (event.request.session.length === 0) {
 *     event.response.issueTokens = false;
 *     event.response.failAuthentication = false;
 *     event.response.challengeName = 'CUSTOM_CHALLENGE';
 *   } 
 *   // Verify challenge response
 *   else if (
 *     event.request.session.length === 1 &&
 *     event.request.session[0].challengeName === 'CUSTOM_CHALLENGE' &&
 *     event.request.session[0].challengeResult === true
 *   ) {
 *     event.response.issueTokens = true;
 *     event.response.failAuthentication = false;
 *   } 
 *   // Fail after 3 attempts
 *   else {
 *     event.response.issueTokens = false;
 *     event.response.failAuthentication = true;
 *   }
 *   
 *   return event;
 * };
 * ```
 * 
 * 2. CREATE AUTH CHALLENGE:
 * ```typescript
 * // triggers/passwordless/create-auth-challenge.ts
 * import { createHmac, randomBytes } from 'crypto';
 * import { SES } from '@aws-sdk/client-ses';
 * import twilio from 'twilio';
 * 
 * export const handler = async (event) => {
 *   const { email, phone_number } = event.request.userAttributes;
 *   
 *   if (event.request.challengeName === 'CUSTOM_CHALLENGE') {
 *     // Generate secure code
 *     const code = randomBytes(3).toString('hex').toUpperCase();
 *     const expires = Date.now() + 5 * 60 * 1000; // 5 minutes
 *     
 *     // Store in event for verification
 *     event.response.publicChallengeParameters = {
 *       email: email || phone_number,
 *     };
 *     
 *     event.response.privateChallengeParameters = {
 *       code,
 *       expires: expires.toString(),
 *     };
 *     
 *     // Send via email or SMS
 *     if (email) {
 *       await sendMagicLink(email, code);
 *     } else if (phone_number) {
 *       await sendSMSCode(phone_number, code);
 *     }
 *   }
 *   
 *   return event;
 * };
 * ```
 * 
 * 3. VERIFY AUTH CHALLENGE:
 * ```typescript
 * // triggers/passwordless/verify-auth-challenge.ts
 * export const handler = async (event) => {
 *   const expectedCode = event.request.privateChallengeParameters.code;
 *   const expires = parseInt(event.request.privateChallengeParameters.expires);
 *   const userCode = event.request.challengeAnswer;
 *   
 *   // Check if code matches and hasn't expired
 *   if (userCode === expectedCode && Date.now() < expires) {
 *     event.response.answerCorrect = true;
 *   } else {
 *     event.response.answerCorrect = false;
 *   }
 *   
 *   return event;
 * };
 * ```
 * 
 * 4. CLIENT-SIDE IMPLEMENTATION:
 * ```typescript
 * import { signIn, signUp } from 'aws-amplify/auth';
 * 
 * // Sign up or sign in (passwordless)
 * async function signInPasswordless(email: string) {
 *   try {
 *     // Try to sign in
 *     const result = await signIn({
 *       username: email,
 *       options: {
 *         authFlowType: 'CUSTOM_WITHOUT_SRP',
 *       },
 *     });
 *     
 *     if (result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE') {
 *       // User exists, challenge sent
 *       return { success: true, message: 'Check your email for the magic link' };
 *     }
 *   } catch (error) {
 *     if (error.name === 'UserNotFoundException') {
 *       // User doesn't exist, create account
 *       await signUp({
 *         username: email,
 *         password: generateRandomPassword(), // Required but not used
 *         options: {
 *           userAttributes: { email },
 *         },
 *       });
 *       
 *       // Now sign in
 *       await signIn({
 *         username: email,
 *         options: {
 *           authFlowType: 'CUSTOM_WITHOUT_SRP',
 *         },
 *       });
 *       
 *       return { success: true, message: 'Check your email for the magic link' };
 *     }
 *   }
 * }
 * 
 * // Verify code from email/SMS
 * async function verifyCode(username: string, code: string) {
 *   const result = await confirmSignIn({
 *     challengeResponse: code,
 *   });
 *   
 *   if (result.isSignedIn) {
 *     return { success: true };
 *   }
 * }
 * 
 * // Handle magic link click
 * async function handleMagicLink(token: string) {
 *   // Decode token to get username and code
 *   const { username, code } = decodeToken(token);
 *   
 *   // Sign in first
 *   await signIn({
 *     username,
 *     options: {
 *       authFlowType: 'CUSTOM_WITHOUT_SRP',
 *     },
 *   });
 *   
 *   // Then verify with code
 *   await confirmSignIn({
 *     challengeResponse: code,
 *   });
 * }
 * ```
 * 
 * 5. WEBAUTHN INTEGRATION:
 *    - Use custom attributes to store credential IDs
 *    - Implement in custom auth challenge
 *    - Support platform authenticators (Touch ID, Face ID)
 *    - Support security keys (YubiKey, etc.)
 * 
 * 6. SECURITY CONSIDERATIONS:
 *    - Rate limit auth attempts
 *    - Use secure random codes
 *    - Short expiration times
 *    - One-time use codes
 *    - Secure magic link generation
 *    - HTTPS only for magic links
 */