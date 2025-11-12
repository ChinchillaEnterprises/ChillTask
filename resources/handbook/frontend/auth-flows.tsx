"use client";

import { 
  signUp, 
  signIn, 
  signOut,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  fetchAuthSession,
  getCurrentUser,
  fetchUserAttributes,
  updateUserAttributes,
  updatePassword,
  deleteUser,
  signInWithRedirect,
  setUpTOTP,
  confirmSignIn,
  updateMFAPreference,
  verifyTOTPSetup
} from 'aws-amplify/auth';

/**
 * 🔐 Amplify Auth Client-Side Examples
 * 
 * This file contains comprehensive examples of authentication flows
 * for AWS Amplify Gen 2, including error handling and best practices.
 */

// =============================================================================
// SIGN UP FLOWS
// =============================================================================

/**
 * Basic Email Sign Up
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string
) {
  try {
    const { isSignUpComplete, userId, nextStep } = await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          given_name: firstName,
          family_name: lastName,
        },
        // Optional: Auto sign in after confirmation
        autoSignIn: true,
      },
    });

    console.log('Sign up successful:', { userId, nextStep });

    // Check what's needed next
    switch (nextStep.signUpStep) {
      case 'CONFIRM_SIGN_UP':
        // Need to confirm email
        return {
          success: true,
          needsConfirmation: true,
          message: 'Check your email for confirmation code',
        };
      
      case 'DONE':
        // Auto-confirmed (e.g., by admin)
        return {
          success: true,
          needsConfirmation: false,
          message: 'Account created successfully',
        };
      
      default:
        return {
          success: false,
          message: 'Unexpected sign up step',
        };
    }
  } catch (error: any) {
    console.error('Sign up error:', error);
    
    // Handle specific errors
    if (error.name === 'UsernameExistsException') {
      return {
        success: false,
        message: 'An account with this email already exists',
      };
    }
    
    if (error.name === 'InvalidPasswordException') {
      return {
        success: false,
        message: 'Password does not meet requirements',
      };
    }
    
    return {
      success: false,
      message: error.message || 'Sign up failed',
    };
  }
}

/**
 * Confirm Sign Up with Code
 */
export async function confirmSignUpCode(username: string, code: string) {
  try {
    const { isSignUpComplete, nextStep } = await confirmSignUp({
      username,
      confirmationCode: code,
    });

    if (isSignUpComplete) {
      return {
        success: true,
        message: 'Email confirmed successfully',
      };
    }

    return {
      success: false,
      message: 'Confirmation incomplete',
      nextStep,
    };
  } catch (error: any) {
    console.error('Confirmation error:', error);
    
    if (error.name === 'CodeMismatchException') {
      return {
        success: false,
        message: 'Invalid confirmation code',
      };
    }
    
    if (error.name === 'ExpiredCodeException') {
      return {
        success: false,
        message: 'Confirmation code has expired',
      };
    }
    
    return {
      success: false,
      message: error.message || 'Confirmation failed',
    };
  }
}

/**
 * Resend Confirmation Code
 */
export async function resendConfirmationCode(username: string) {
  try {
    const { destination, deliveryMedium } = await resendSignUpCode({
      username,
    });

    return {
      success: true,
      message: `Code sent to ${destination} via ${deliveryMedium}`,
    };
  } catch (error: any) {
    console.error('Resend code error:', error);
    
    return {
      success: false,
      message: error.message || 'Failed to resend code',
    };
  }
}

// =============================================================================
// SIGN IN FLOWS
// =============================================================================

/**
 * Basic Sign In
 */
export async function signInWithPassword(username: string, password: string) {
  try {
    const { isSignedIn, nextStep } = await signIn({
      username,
      password,
    });

    // Handle different sign-in steps
    switch (nextStep.signInStep) {
      case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
        return {
          success: false,
          needsMFA: true,
          mfaType: 'TOTP',
          message: 'Enter authenticator app code',
        };
      
      case 'CONFIRM_SIGN_IN_WITH_SMS_CODE':
        return {
          success: false,
          needsMFA: true,
          mfaType: 'SMS',
          message: 'Enter SMS code',
        };
      
      case 'CONTINUE_SIGN_IN_WITH_MFA_SELECTION':
        return {
          success: false,
          needsMFA: true,
          mfaType: 'SELECT',
          message: 'Select MFA method',
          allowedMFATypes: nextStep.allowedMFATypes,
        };
      
      case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
        return {
          success: false,
          needsNewPassword: true,
          message: 'New password required',
        };
      
      case 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE':
        return {
          success: false,
          needsCustomChallenge: true,
          message: 'Complete custom challenge',
        };
      
      case 'DONE':
        return {
          success: true,
          isSignedIn,
          message: 'Sign in successful',
        };
      
      default:
        return {
          success: false,
          message: 'Unknown sign in step',
        };
    }
  } catch (error: any) {
    console.error('Sign in error:', error);
    
    if (error.name === 'UserNotFoundException') {
      return {
        success: false,
        message: 'User not found',
      };
    }
    
    if (error.name === 'NotAuthorizedException') {
      return {
        success: false,
        message: 'Incorrect username or password',
      };
    }
    
    if (error.name === 'UserNotConfirmedException') {
      return {
        success: false,
        needsConfirmation: true,
        message: 'Please confirm your email first',
      };
    }
    
    return {
      success: false,
      message: error.message || 'Sign in failed',
    };
  }
}

/**
 * Complete MFA Challenge
 */
export async function completeMFAChallenge(code: string, mfaType?: 'TOTP' | 'SMS') {
  try {
    const { isSignedIn, nextStep } = await confirmSignIn({
      challengeResponse: code,
      options: mfaType ? { mfaType } : undefined,
    });

    if (isSignedIn) {
      return {
        success: true,
        message: 'MFA verification successful',
      };
    }

    return {
      success: false,
      message: 'MFA verification incomplete',
      nextStep,
    };
  } catch (error: any) {
    console.error('MFA error:', error);
    
    if (error.name === 'CodeMismatchException') {
      return {
        success: false,
        message: 'Invalid MFA code',
      };
    }
    
    return {
      success: false,
      message: error.message || 'MFA verification failed',
    };
  }
}

/**
 * Social Sign In
 */
export async function signInWithSocial(provider: 'Google' | 'Facebook' | 'Apple' | 'Amazon') {
  try {
    await signInWithRedirect({
      provider,
      options: {
        preferPrivateSession: true, // Use private browser session
      },
    });
    
    // This will redirect to provider
    return {
      success: true,
      message: `Redirecting to ${provider}...`,
    };
  } catch (error: any) {
    console.error('Social sign in error:', error);
    
    return {
      success: false,
      message: error.message || 'Social sign in failed',
    };
  }
}

/**
 * Sign Out
 */
export async function signOutUser(global: boolean = false) {
  try {
    await signOut({
      global, // Sign out from all devices
    });
    
    return {
      success: true,
      message: 'Signed out successfully',
    };
  } catch (error: any) {
    console.error('Sign out error:', error);
    
    return {
      success: false,
      message: error.message || 'Sign out failed',
    };
  }
}

// =============================================================================
// PASSWORD MANAGEMENT
// =============================================================================

/**
 * Initiate Password Reset
 */
export async function initiatePasswordReset(username: string) {
  try {
    const { nextStep } = await resetPassword({
      username,
    });

    const { deliveryMedium, destination } = nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE'
      ? nextStep.codeDeliveryDetails
      : { deliveryMedium: 'UNKNOWN', destination: 'unknown' };

    return {
      success: true,
      message: `Reset code sent to ${destination} via ${deliveryMedium}`,
    };
  } catch (error: any) {
    console.error('Password reset error:', error);
    
    if (error.name === 'UserNotFoundException') {
      // Don't reveal user doesn't exist for security
      return {
        success: true,
        message: 'If an account exists, a reset code has been sent',
      };
    }
    
    return {
      success: false,
      message: error.message || 'Password reset failed',
    };
  }
}

/**
 * Confirm Password Reset
 */
export async function confirmPasswordReset(
  username: string,
  code: string,
  newPassword: string
) {
  try {
    await confirmResetPassword({
      username,
      confirmationCode: code,
      newPassword,
    });

    return {
      success: true,
      message: 'Password reset successfully',
    };
  } catch (error: any) {
    console.error('Password reset confirmation error:', error);
    
    if (error.name === 'CodeMismatchException') {
      return {
        success: false,
        message: 'Invalid reset code',
      };
    }
    
    if (error.name === 'InvalidPasswordException') {
      return {
        success: false,
        message: 'New password does not meet requirements',
      };
    }
    
    return {
      success: false,
      message: error.message || 'Password reset failed',
    };
  }
}

/**
 * Change Password (while signed in)
 */
export async function changePassword(oldPassword: string, newPassword: string) {
  try {
    await updatePassword({
      oldPassword,
      newPassword,
    });

    return {
      success: true,
      message: 'Password changed successfully',
    };
  } catch (error: any) {
    console.error('Password change error:', error);
    
    if (error.name === 'NotAuthorizedException') {
      return {
        success: false,
        message: 'Current password is incorrect',
      };
    }
    
    if (error.name === 'InvalidPasswordException') {
      return {
        success: false,
        message: 'New password does not meet requirements',
      };
    }
    
    return {
      success: false,
      message: error.message || 'Password change failed',
    };
  }
}

// =============================================================================
// USER MANAGEMENT
// =============================================================================

/**
 * Get Current User
 */
export async function getCurrentUserInfo() {
  try {
    const user = await getCurrentUser();
    const attributes = await fetchUserAttributes();
    const session = await fetchAuthSession();

    return {
      success: true,
      user: {
        userId: user.userId,
        username: user.username,
        signInDetails: user.signInDetails,
      },
      attributes,
      session: {
        isValid: session.tokens?.idToken ? true : false,
        userSub: session.userSub,
      },
    };
  } catch (error: any) {
    console.error('Get user error:', error);
    
    return {
      success: false,
      message: 'User not authenticated',
    };
  }
}

/**
 * Update User Attributes
 */
export async function updateUserProfile(attributes: Record<string, string>) {
  try {
    const result = await updateUserAttributes({
      userAttributes: attributes,
    });

    // Check which attributes need verification
    const needsVerification = Object.entries(result).filter(
      ([_, status]) => status.nextStep?.updateAttributeStep === 'CONFIRM_ATTRIBUTE_WITH_CODE'
    );

    return {
      success: true,
      message: 'Profile updated',
      needsVerification: needsVerification.map(([attr]) => attr),
    };
  } catch (error: any) {
    console.error('Update profile error:', error);
    
    return {
      success: false,
      message: error.message || 'Profile update failed',
    };
  }
}

/**
 * Delete User Account
 */
export async function deleteUserAccount() {
  try {
    await deleteUser();
    
    return {
      success: true,
      message: 'Account deleted successfully',
    };
  } catch (error: any) {
    console.error('Delete account error:', error);
    
    return {
      success: false,
      message: error.message || 'Account deletion failed',
    };
  }
}

// =============================================================================
// MULTI-FACTOR AUTHENTICATION
// =============================================================================

/**
 * Set Up TOTP (Authenticator App)
 */
export async function setupAuthenticatorApp() {
  try {
    const totpSetup = await setUpTOTP();
    const code = totpSetup.sharedSecret;
    const uri = totpSetup.getSetupUri('MyApp');

    return {
      success: true,
      sharedSecret: code,
      qrCodeUri: uri.toString(),
    };
  } catch (error: any) {
    console.error('TOTP setup error:', error);
    
    return {
      success: false,
      message: error.message || 'TOTP setup failed',
    };
  }
}

/**
 * Verify and Enable TOTP
 */
export async function verifyAndEnableTOTP(code: string) {
  try {
    await verifyTOTPSetup({
      code,
    });

    // Enable TOTP as preferred MFA
    await updateMFAPreference({
      totp: 'PREFERRED',
      sms: 'ENABLED',
    });

    return {
      success: true,
      message: 'Authenticator app enabled',
    };
  } catch (error: any) {
    console.error('TOTP verification error:', error);
    
    if (error.name === 'CodeMismatchException') {
      return {
        success: false,
        message: 'Invalid verification code',
      };
    }
    
    return {
      success: false,
      message: error.message || 'TOTP verification failed',
    };
  }
}

/**
 * Update MFA Preferences
 */
export async function updateMFASettings(
  totpPreference: 'PREFERRED' | 'ENABLED' | 'DISABLED',
  smsPreference: 'PREFERRED' | 'ENABLED' | 'DISABLED'
) {
  try {
    await updateMFAPreference({
      totp: totpPreference,
      sms: smsPreference,
    });

    return {
      success: true,
      message: 'MFA preferences updated',
    };
  } catch (error: any) {
    console.error('MFA update error:', error);
    
    return {
      success: false,
      message: error.message || 'MFA update failed',
    };
  }
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Check Auth Status
 */
export async function checkAuthStatus() {
  try {
    const session = await fetchAuthSession();
    
    return {
      isAuthenticated: !!session.tokens?.idToken,
      tokens: session.tokens ? {
        hasIdToken: !!session.tokens.idToken,
        hasAccessToken: !!session.tokens.accessToken,
        idTokenExpiration: session.tokens.idToken?.payload.exp,
      } : null,
      credentials: session.credentials ? {
        hasCredentials: true,
        expiration: session.credentials.expiration,
      } : null,
    };
  } catch (error: any) {
    console.error('Auth check error:', error);
    
    return {
      isAuthenticated: false,
      error: error.message,
    };
  }
}

/**
 * Refresh Session
 */
export async function refreshAuthSession() {
  try {
    const session = await fetchAuthSession({
      forceRefresh: true,
    });

    return {
      success: true,
      isValid: !!session.tokens?.idToken,
      message: 'Session refreshed',
    };
  } catch (error: any) {
    console.error('Session refresh error:', error);
    
    return {
      success: false,
      message: error.message || 'Session refresh failed',
    };
  }
}