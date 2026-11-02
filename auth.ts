// auth.ts
/**
 * Auth.js v5: Google and email magic links, Prisma adapter, database sessions.
 * Reference: .docs/references/AUTH_REFERENCE.md
 *
 * Env: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_RESEND_KEY (Auth.js reads these by itself), EMAIL_FROM.
 * instrumentation.ts reports any that are missing when the server starts.
 */
import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';
import { headers } from 'next/headers';
import { connection } from 'next/server';
import { cache } from 'react';
import { LOGIN_PATH } from '@/lib/auth/callback-url';
import { clientIp, limitMagicLink } from '@/lib/auth/rate-limit';
import { prisma } from '@/lib/db';

const isProd = process.env.NODE_ENV === 'production';

const nextAuth = NextAuth({
  adapter: PrismaAdapter(prisma),

  // Database sessions: deleting a Session row signs that device out at once.
  session: { strategy: 'database', maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },

  // __Host- in production: only this exact host can set the cookie. It must not carry a domain attribute.
  cookies: {
    sessionToken: {
      name: isProd ? '__Host-session-token' : 'session-token',
      options: { path: '/', httpOnly: true, sameSite: 'lax', secure: isProd },
    },
  },

  pages: { signIn: LOGIN_PATH, error: LOGIN_PATH, verifyRequest: `${LOGIN_PATH}/check-email` },

  providers: [
    Google,
    // No custom normalizeIdentifier: Auth.js's default lowercases and trims too, and also refuses a
    // missing email and cuts "a@x.com,b@evil.com" down to one address, so a link can't go to two inboxes.
    Resend({ from: process.env.EMAIL_FROM, maxAge: 15 * 60 }),
  ],

  callbacks: {
    async signIn({ user, email }) {
      // A suspended account can't sign in.
      if (user.isActive === false) return false;

      // Limited here, not in the server action, so a direct POST to /api/auth/signin/resend is limited too.
      if (email?.verificationRequest && user.email) {
        const allowed = await limitMagicLink(user.email, clientIp(await headers()));
        if (!allowed) return `${LOGIN_PATH}?error=RateLimited`;
      }
      return true;
    },

    // Runs on every auth() call, with the User row read fresh from the database.
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role === 'ADMIN' ? 'ADMIN' : 'USER';
      session.user.isActive = user.isActive !== false;
      return session;
    },
  },
});

export const { handlers, signIn, signOut } = nextAuth;

/**
 * The session, read once per request however many guards ask for it. connection() first: Auth.js makes a random value
 * on each read, which Next refuses while prerendering, and a session belongs to a real request anyway.
 */
export const auth = cache(async () => {
  await connection();
  return nextAuth.auth();
});
