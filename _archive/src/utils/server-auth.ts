import { cookies } from 'next/headers';
import { getCurrentUser, fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth/server';
import { runWithAmplifyServerContext } from './amplify-server-config';

export interface ServerUser {
  userId: string;
  email?: string;
  name?: string;
  attributes?: Record<string, any>;
}

/**
 * Get the current authenticated user on the server side
 * Returns null if not authenticated
 */
export async function getServerUser(): Promise<ServerUser | null> {
  try {
    const user = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec: any) => {
        try {
          const currentUser = await getCurrentUser(contextSpec);
          const attributes = await fetchUserAttributes(contextSpec);
          
          return {
            userId: currentUser.userId,
            email: attributes.email,
            name: attributes.name || attributes.given_name || attributes.email?.split('@')[0],
            attributes
          };
        } catch (error) {
          console.error('Failed to get user:', error);
          return null;
        }
      },
    });
    
    return user;
  } catch (error) {
    console.error('Server auth check failed:', error);
    return null;
  }
}

/**
 * Check if the current request has a valid auth session
 * Returns true if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const authenticated = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec: any) => {
        try {
          const session = await fetchAuthSession(contextSpec);
          return !!(session?.tokens?.accessToken);
        } catch (error) {
          return false;
        }
      },
    });
    
    return authenticated;
  } catch (error) {
    console.error('Session check failed:', error);
    return false;
  }
}

/**
 * Get auth session details including tokens
 * Useful for API calls that need auth headers
 */
export async function getAuthSession() {
  try {
    const session = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec: any) => {
        try {
          return await fetchAuthSession(contextSpec);
        } catch (error) {
          console.error('Failed to fetch session:', error);
          return null;
        }
      },
    });
    
    return session;
  } catch (error) {
    console.error('Session fetch failed:', error);
    return null;
  }
}

/**
 * Check if user has specific role or permission
 * This is a placeholder - implement based on your Cognito groups/attributes
 */
export async function hasRole(role: string): Promise<boolean> {
  try {
    const user = await getServerUser();
    if (!user) return false;
    
    // Check Cognito groups or custom attributes
    // Example: user.attributes?.['custom:role'] === role
    // Or check Cognito groups from the token
    const session = await getAuthSession();
    const groups = session?.tokens?.accessToken?.payload?.['cognito:groups'] as string[] | undefined;
    
    return groups?.includes(role) || false;
  } catch (error) {
    console.error('Role check failed:', error);
    return false;
  }
}