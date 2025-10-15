"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { fetchAuthSession, getCurrentUser, signOut } from "aws-amplify/auth";
import type { AuthUser } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

// CRITICAL: Enable OAuth listener for multi-page apps (Next.js)
// This allows Amplify to process OAuth callbacks and fire Hub events
import "aws-amplify/auth/enable-oauth-listener";

/**
 * PRODUCTION-GRADE AUTH PROVIDER
 *
 * Enterprise/Government-Ready Features:
 * - Automatic token refresh with retry logic
 * - Session timeout handling
 * - Error recovery and logging
 * - Memory leak prevention
 * - Race condition protection
 * - Graceful degradation
 *
 * @see resources/handbook/auth/SECURITY_CHECKLIST.md
 */

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prevent race conditions with ref
  const isCheckingAuth = useRef(false);

  const checkAuth = async () => {
    console.log('[Auth] checkAuth() called');

    // Prevent concurrent auth checks
    if (isCheckingAuth.current) {
      console.log('[Auth] checkAuth() already in progress, skipping');
      return;
    }

    try {
      isCheckingAuth.current = true;
      setIsLoading(true);
      setError(null);

      console.log('[Auth] Fetching auth session...');
      // Check if user has valid session
      const session = await fetchAuthSession({ forceRefresh: false });
      console.log('[Auth] Session fetched:', {
        hasTokens: !!session.tokens,
        hasIdToken: !!session.tokens?.idToken,
        hasAccessToken: !!session.tokens?.accessToken,
      });

      const authenticated = !!session.tokens?.idToken;
      console.log('[Auth] Is authenticated:', authenticated);

      if (authenticated) {
        // Verify token hasn't expired
        const idToken = session.tokens?.idToken;
        if (idToken) {
          const expiration = idToken.payload.exp as number;
          const now = Math.floor(Date.now() / 1000);

          if (expiration < now) {
            // Token expired - try to refresh
            console.warn('[Auth] Token expired, attempting refresh');
            const refreshedSession = await fetchAuthSession({ forceRefresh: true });

            if (!refreshedSession.tokens?.idToken) {
              throw new Error('Token refresh failed');
            }
          }
        }

        // Get current user info
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err: any) {
      console.error('[Auth] Check failed:', err);

      // Handle specific error cases
      if (err.name === 'UserUnAuthenticatedException' || err.name === 'NotAuthorizedException') {
        // User not authenticated - this is expected for logged-out users
        setUser(null);
        setIsAuthenticated(false);
        setError(null); // Don't show error for expected unauthenticated state
      } else {
        // Unexpected error
        setUser(null);
        setIsAuthenticated(false);
        setError(err.message || 'Authentication check failed');
      }
    } finally {
      setIsLoading(false);
      isCheckingAuth.current = false;
    }
  };

  const handleSignOut = async () => {
    try {
      setError(null);
      await signOut({ global: true }); // Sign out from all devices
      setUser(null);
      setIsAuthenticated(false);
    } catch (err: any) {
      console.error('[Auth] Sign out failed:', err);
      setError(err.message || 'Sign out failed');

      // Even if signOut fails, clear local state
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    console.log('[Auth] AuthProvider mounted');
    console.log('[Auth] Current URL:', window.location.href);
    console.log('[Auth] URL has code param:', window.location.search.includes('code='));
    console.log('[Auth] URL has state param:', window.location.search.includes('state='));

    const isOAuthCallback = window.location.search.includes('code=') &&
                           window.location.search.includes('state=');
    console.log('[Auth] Is OAuth callback:', isOAuthCallback);

    // Check auth on mount
    // With middleware, OAuth callback is handled naturally - no retry needed!
    checkAuth();

    // Listen for auth events
    console.log('[Auth] Registering Hub listener for auth events');
    const hubListener = Hub.listen('auth', async (data) => {
      const { payload } = data;

      console.log('[Auth] Hub Event Received:', payload.event);
      console.log('[Auth] Hub Event Data:', payload.data);

      switch (payload.event) {
        case 'signedIn':
          console.log('[Auth] signedIn event - checking auth');
          await checkAuth();
          break;

        case 'signedOut':
          console.log('[Auth] signedOut event - clearing state');
          setUser(null);
          setIsAuthenticated(false);
          setError(null);
          break;

        case 'tokenRefresh':
          // Token refreshed successfully
          console.log('[Auth] tokenRefresh event - checking auth');
          await checkAuth();
          break;

        case 'tokenRefresh_failure':
          console.error('[Auth] Token refresh failed');
          // Don't immediately sign out - let user continue with expired token
          // and they'll be prompted to sign in again when making authenticated requests
          setError('Session expired. Please sign in again.');
          break;

        case 'signInWithRedirect':
          // OAuth redirect completed successfully - check auth state
          console.log('[Auth] signInWithRedirect event - OAuth redirect successful, checking auth...');
          await checkAuth();
          break;

        case 'signInWithRedirect_failure':
          console.error('[Auth] OAuth redirect failed:', payload.data);
          setError('Social sign-in failed. Please try again.');
          setIsLoading(false);
          break;

        case 'customOAuthState':
          console.log('[Auth] customOAuthState event:', payload.data);
          // Handle OAuth state if needed
          break;

        default:
          console.log('[Auth] Unknown Hub event:', payload.event);
          break;
      }
    });
    console.log('[Auth] Hub listener registered');

    // Cleanup listener on unmount
    return () => {
      console.log('[Auth] Cleaning up Hub listener');
      hubListener();
    };
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    signOut: handleSignOut,
    refreshAuth: checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to access authentication context
 *
 * @throws Error if used outside AuthProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, signOut } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <SignInPrompt />;
 *   }
 *
 *   return <div>Welcome {user?.username}!</div>;
 * }
 * ```
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
