'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';

interface ProtectedClientComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requiredRole?: string;
}

/**
 * Client-side component wrapper for additional protection
 * This is Layer 3 - client-side UX fallback
 * The real security is in middleware (Layer 1) and server components (Layer 2)
 */
export function ProtectedClientComponent({ 
  children, 
  fallback = <div>Loading...</div>,
  requiredRole 
}: ProtectedClientComponentProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // This shouldn't happen if middleware is working
        // But provides client-side fallback
        router.push('/authentication/sign-in');
      } else if (requiredRole) {
        // Check role if specified
        // This is a simplified example - implement based on your needs
        const userRoles = user?.attributes?.['custom:roles'] || [];
        setAuthorized(userRoles.includes(requiredRole));
      } else {
        setAuthorized(true);
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRole, router]);

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  if (requiredRole && !authorized) {
    return (
      <div className="unauthorized-message">
        <h2>Unauthorized</h2>
        <p>You don't have permission to access this content.</p>
        <p>Required role: {requiredRole}</p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook for using protected data fetching on the client
 */
export function useProtectedFetch() {
  const { isAuthenticated } = useAuth();
  
  const protectedFetch = async (url: string, options?: RequestInit) => {
    if (!isAuthenticated) {
      throw new Error('Not authenticated');
    }
    
    // The auth token is automatically included via cookies when using SSR mode
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include cookies
    });
    
    if (response.status === 401) {
      // Token might be expired, trigger re-auth
      window.location.href = '/authentication/sign-in';
      throw new Error('Authentication expired');
    }
    
    return response;
  };
  
  return { protectedFetch };
}