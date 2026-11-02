// instrumentation.ts
/**
 * Runs once when a server starts. A missing auth variable otherwise surfaces only when someone tries to sign in.
 * Production refuses to start; development warns, so work that doesn't touch sign-in can go on.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { missingAuthEnv } = await import('@/lib/auth/secrets');
    const missing = missingAuthEnv(process.env);
    if (missing.length === 0) return;

    const message = `Missing auth environment variables: ${missing.join(', ')}`;
    if (process.env.NODE_ENV === 'production') throw new Error(message);
    console.warn(`[auth] ${message}`);
  }
}
