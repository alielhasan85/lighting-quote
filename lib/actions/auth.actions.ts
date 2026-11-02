// lib/actions/auth.actions.ts
'use server';
/**
 * Starting a sign-in. Public by design: nobody has a session yet. The magic-link rate limit lives in the signIn
 * callback in auth.ts, so it also covers a direct POST to Auth.js.
 *
 * Success is the redirect signIn() throws. It isn't an AuthError, so it passes through to the factory, which re-throws
 * it to Next.
 */
import { AuthError } from 'next-auth';
import { z } from 'zod';
import { signIn } from '@/auth';
import { createPublicFormAction } from '@/lib/actions/server/create-action';
import { ActionError } from '@/lib/actions/server/run-action';
import { safeCallbackUrl } from '@/lib/auth/callback-url';

const callbackUrl = z.string().max(2048).optional();

export const signInWithEmail = createPublicFormAction(
  { name: 'signInWithEmail', input: z.object({ email: z.email().max(254), callbackUrl }) },
  async ({ email, callbackUrl }) => {
    try {
      return await signIn('resend', { email, redirectTo: safeCallbackUrl(callbackUrl) });
    } catch (e) {
      // AccessDenied: the signIn callback refused a suspended account.
      if (e instanceof AuthError) throw new ActionError(e.type === 'AccessDenied' ? 'ACCESS_DENIED' : 'SIGN_IN_FAILED');
      throw e;
    }
  },
);

export const signInWithGoogle = createPublicFormAction(
  { name: 'signInWithGoogle', input: z.object({ callbackUrl }) },
  async ({ callbackUrl }) => {
    try {
      return await signIn('google', { redirectTo: safeCallbackUrl(callbackUrl) });
    } catch (e) {
      if (e instanceof AuthError) throw new ActionError('SIGN_IN_FAILED');
      throw e;
    }
  },
);
