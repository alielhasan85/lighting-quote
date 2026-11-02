// app/api/cron/auth-cleanup/route.ts
/**
 * Deletes expired sign-in rows every night (vercel.json). Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 * Reading request.headers first also stops the build from prerendering this route, so it never runs at build time.
 */
import { isCronAuthorized } from '@/lib/auth/secrets';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const now = new Date();
  const [sessions, tokens, rateLimits] = await Promise.all([
    prisma.session.deleteMany({ where: { expires: { lt: now } } }),
    prisma.verificationToken.deleteMany({ where: { expires: { lt: now } } }),
    prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }),
  ]);

  return Response.json({ sessions: sessions.count, tokens: tokens.count, rateLimits: rateLimits.count });
}
