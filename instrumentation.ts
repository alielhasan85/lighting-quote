// instrumentation.ts
/**
 * Runs once when a server starts. A missing auth variable otherwise surfaces only when someone tries to sign in.
 * Production refuses to start without what sign-in needs; development warns, so work that doesn't touch sign-in can
 * go on. The cleanup's secret only ever warns: without it the nightly job is refused, and nothing else is affected.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { missingAuthEnv, missingCleanupEnv } = await import('@/lib/auth/secrets');

    const cleanup = missingCleanupEnv(process.env);
    if (cleanup.length > 0) console.warn(`[auth] The nightly cleanup will be refused. Missing: ${cleanup.join(', ')}`);

    const missing = missingAuthEnv(process.env);
    if (missing.length === 0) return;

    const message = `Missing auth environment variables: ${missing.join(', ')}`;
    if (process.env.NODE_ENV === 'production') throw new Error(message);
    console.warn(`[auth] ${message}`);
  }
}
