import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import { cookies } from 'next/headers';
import { getCurrentUser } from 'aws-amplify/auth/server';
import outputs from '@root/amplify_outputs.json';

/**
 * Server context for Amplify APIs
 *
 * Use this in:
 * - middleware.ts (route protection)
 * - Server Components (fetch data with auth)
 * - API Routes (verify user identity)
 *
 * @see resources/handbook/auth/new/CLIENT_VS_SERVER_AUTH.md
 */
export const { runWithAmplifyServerContext } = createServerRunner({
  config: outputs,
});

/**
 * Helper: Get authenticated user on server
 *
 * Returns user object or null if not authenticated
 *
 * @example
 * ```typescript
 * const user = await getAuthenticatedUser();
 * if (!user) {
 *   redirect('/authentication/sign-in');
 * }
 * ```
 */
export async function getAuthenticatedUser() {
  try {
    const currentUser = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: (contextSpec) => getCurrentUser(contextSpec),
    });
    return currentUser;
  } catch (error) {
    console.log('[Server Auth] User not authenticated:', error);
    return null;
  }
}
