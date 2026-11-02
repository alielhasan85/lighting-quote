// auth.ts
/**
 * Auth.js v5: Google and email magic links, Prisma adapter, database sessions.
 * Reference: .docs/references/AUTH_REFERENCE.md
 *
 * Env: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_RESEND_KEY (Auth.js reads these by itself), EMAIL_FROM.
 */
import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';
import { cache } from 'react';
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

  providers: [
    Google,
    // No custom normalizeIdentifier: Auth.js's default lowercases and trims too, and also refuses a
    // missing email and cuts "a@x.com,b@evil.com" down to one address, so a link can't go to two inboxes.
    Resend({ from: process.env.EMAIL_FROM, maxAge: 15 * 60 }),
  ],

  callbacks: {
    // A suspended account can't sign in.
    signIn: ({ user }) => user.isActive !== false,

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

/** The session, read once per request however many guards ask for it. */
export const auth = cache(nextAuth.auth);
