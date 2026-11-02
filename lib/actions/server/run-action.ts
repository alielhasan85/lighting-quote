// lib/actions/server/run-action.ts
/**
 * Server-action pipeline: the one way in for every 'use server' export.
 *
 * Pure on purpose: no zod and no Next.js imports, so Vitest runs it (run-action.test.ts). The real
 * guards are plugged in by create-action.ts, and `npm run check:actions` fails any export that
 * skips the factories.
 *
 * Order is the contract:
 *   1. parse      bad input → INVALID_INPUT, before any auth call or DB read
 *   2. authorize  the guard throws a known code, or returns the caller's context
 *   3. handler    returns ok(data) or fail(code)
 *   4. any throw becomes a value; only known codes, PAYWALL codes and an ActionError's UPPER_SNAKE
 *      code reach the client (toActionError)
 */

/* ─── Result shape ───────────────────────────────────────────────────────── */

/** What every action returns. Errors are codes the client maps to a translated message. */
export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export const ok = <T>(data: T): { success: true; data: T } => ({ success: true, data });

export const fail = (error: string): { success: false; error: string } => ({ success: false, error });

/** Codes the guards throw and the pipeline returns. Anything else becomes INTERNAL_ERROR. */
export const ACTION_ERROR = {
  INVALID_INPUT: 'INVALID_INPUT',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  DISABLED: 'DISABLED',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  FORBIDDEN_ADMIN_ONLY: 'FORBIDDEN_ADMIN_ONLY',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ActionErrorCode = (typeof ACTION_ERROR)[keyof typeof ACTION_ERROR];

const KNOWN_CODES = new Set<string>(Object.values(ACTION_ERROR));

// Tier and quota gates: `PAYWALL:TIER:reports`, `PAYWALL:QUOTA:seats=5`. No spaces, so a prose
// message can't pass as one.
const PAYWALL_CODE = /^PAYWALL:[\w.,=:-]+$/;

// A domain code: UPPER_SNAKE, no spaces or lowercase, so prose can't pass as one.
const DOMAIN_CODE = /^[A-Z][A-Z0-9_]*$/;

/**
 * A domain code a handler or a helper throws for the client (`new ActionError('QUOTE_ALREADY_SENT')`).
 * Only this class passes its code through: a plain `new Error('QUOTE_ALREADY_SENT')` still becomes
 * INTERNAL_ERROR, so no message reaches the client by accident. The code must be UPPER_SNAKE.
 */
export class ActionError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'ActionError';
    this.code = code;
  }
}

/**
 * The client-safe code for a thrown value: a known code, a PAYWALL code or an ActionError's
 * UPPER_SNAKE code passes through; anything else becomes INTERNAL_ERROR so a raw message (Prisma, a
 * stack, a secret) never reaches the client.
 */
export function toActionError(e: unknown): string {
  const message = e instanceof Error ? e.message : '';
  if (KNOWN_CODES.has(message) || PAYWALL_CODE.test(message)) return message;
  if (e instanceof ActionError && DOMAIN_CODE.test(message)) return message;
  return ACTION_ERROR.INTERNAL_ERROR;
}

/* ─── Pipeline ───────────────────────────────────────────────────────────── */

/** The part of a zod schema the pipeline uses. Any zod schema satisfies it as-is. */
export type InputParser<I> = {
  safeParse(raw: unknown): { success: true; data: I } | { success: false };
};

export type ActionSteps<I, C, T> = {
  parse: InputParser<I>;
  /** The guard. Throws a known code (UNAUTHENTICATED, FORBIDDEN, …) or returns the caller's context. */
  authorize: (input: I) => Promise<C>;
  handler: (input: I, ctx: C) => Promise<ActionResult<T>>;
  /** Re-throws framework control flow (Next's redirect and notFound) before a throw becomes a value. */
  rethrow?: (e: unknown) => void;
  /** Sees every error that became INTERNAL_ERROR: the only place its raw message goes (the log). */
  onError?: (e: unknown) => void;
};

/** Runs one action call through parse → authorize → handler. Never throws a guard code. */
export async function runAction<I, C, T>(raw: unknown, steps: ActionSteps<I, C, T>): Promise<ActionResult<T>> {
  try {
    const parsed = steps.parse.safeParse(raw);
    if (!parsed.success) return fail(ACTION_ERROR.INVALID_INPUT);

    const ctx = await steps.authorize(parsed.data);

    return await steps.handler(parsed.data, ctx);
  } catch (e) {
    steps.rethrow?.(e);
    const code = toActionError(e);
    if (code === ACTION_ERROR.INTERNAL_ERROR) steps.onError?.(e);
    return fail(code);
  }
}
