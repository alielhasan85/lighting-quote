// lib/actions/server/run-action.test.ts
// The server-action pipeline. Every action runs through it, so its order is the contract: input is
// parsed before any auth call or DB read, guard throws come back as values, and an unknown error
// never leaks its message.

import { describe, expect, it, vi } from 'vitest';
import { ACTION_ERROR, ActionError, ok, runAction, toActionError, type ActionSteps } from './run-action';

type Input = { workspaceId: string };
type Ctx = { userId: string };

// A stand-in for a zod schema: runAction only needs `safeParse`.
const workspaceInput = {
  safeParse(raw: unknown): { success: true; data: Input } | { success: false } {
    const workspaceId = (raw as Partial<Input> | null)?.workspaceId;
    return typeof workspaceId === 'string' && workspaceId ? { success: true, data: { workspaceId } } : { success: false };
  },
};

/** Pipeline steps with spies; override any of them per test. */
function steps(overrides: Partial<ActionSteps<Input, Ctx, string>> = {}) {
  return {
    parse: workspaceInput,
    authorize: vi.fn(async (): Promise<Ctx> => ({ userId: 'user-1' })),
    handler: vi.fn(async (input: Input, ctx: Ctx) => ok(`${ctx.userId}@${input.workspaceId}`)),
    onError: vi.fn(),
    ...overrides,
  };
}

const throwing = (message: string) => async (): Promise<never> => {
  throw new Error(message);
};

describe('runAction', () => {
  it('runs the handler with the parsed input and the guard context', async () => {
    const s = steps();
    await expect(runAction({ workspaceId: 'w1', extra: 'dropped' }, s)).resolves.toEqual({
      success: true,
      data: 'user-1@w1',
    });
    expect(s.authorize).toHaveBeenCalledWith({ workspaceId: 'w1' });
  });

  it('returns INVALID_INPUT before any auth call or handler', async () => {
    const s = steps();
    for (const raw of [undefined, null, {}, { workspaceId: '' }, { workspaceId: 42 }]) {
      await expect(runAction(raw, s)).resolves.toEqual({ success: false, error: ACTION_ERROR.INVALID_INPUT });
    }
    expect(s.authorize).not.toHaveBeenCalled();
    expect(s.handler).not.toHaveBeenCalled();
  });

  it('returns guard throws as values and never runs the handler', async () => {
    for (const code of ['UNAUTHENTICATED', 'DISABLED', 'NOT_FOUND', 'FORBIDDEN', 'FORBIDDEN_ADMIN_ONLY']) {
      const s = steps({ authorize: throwing(code) });
      await expect(runAction({ workspaceId: 'w1' }, s)).resolves.toEqual({ success: false, error: code });
      expect(s.handler).not.toHaveBeenCalled();
      expect(s.onError).not.toHaveBeenCalled();
    }
  });

  it('returns PAYWALL codes thrown by the handler as values', async () => {
    for (const code of ['PAYWALL:TIER:reports', 'PAYWALL:EXPIRED', 'PAYWALL:QUOTA:seats=5,used=5']) {
      const s = steps({ handler: throwing(code) });
      await expect(runAction({ workspaceId: 'w1' }, s)).resolves.toEqual({ success: false, error: code });
    }
  });

  // A helper's own code reaches the client only when it is thrown as an ActionError: a plain Error
  // with the same message is still hidden.
  it('returns a domain code thrown as an ActionError by the handler or the guard', async () => {
    const domain = (code: string) => async (): Promise<never> => {
      throw new ActionError(code);
    };
    for (const s of [steps({ handler: domain('ALREADY_SENT') }), steps({ authorize: domain('ALREADY_SENT') })]) {
      await expect(runAction({ workspaceId: 'w1' }, s)).resolves.toEqual({ success: false, error: 'ALREADY_SENT' });
      expect(s.onError).not.toHaveBeenCalled();
    }
  });

  it('hides a domain code thrown as a plain Error', async () => {
    const s = steps({ handler: throwing('ALREADY_SENT') });
    await expect(runAction({ workspaceId: 'w1' }, s)).resolves.toEqual({
      success: false,
      error: ACTION_ERROR.INTERNAL_ERROR,
    });
    expect(s.onError).toHaveBeenCalled();
  });

  it('hides an ActionError carrying prose, and hands it to onError', async () => {
    const prose = new ActionError('3 items left');
    const s = steps({
      handler: async () => {
        throw prose;
      },
    });
    await expect(runAction({ workspaceId: 'w1' }, s)).resolves.toEqual({
      success: false,
      error: ACTION_ERROR.INTERNAL_ERROR,
    });
    expect(s.onError).toHaveBeenCalledWith(prose);
  });

  it('returns INTERNAL_ERROR with no raw message, and hands the error to onError', async () => {
    const boom = new Error('connect ECONNREFUSED 10.0.0.5:5432 password=hunter2');
    const s = steps({
      handler: async () => {
        throw boom;
      },
    });
    const result = await runAction({ workspaceId: 'w1' }, s);
    expect(result).toEqual({ success: false, error: ACTION_ERROR.INTERNAL_ERROR });
    expect(JSON.stringify(result)).not.toContain('hunter2');
    expect(s.onError).toHaveBeenCalledWith(boom);
  });

  it('turns a throwing parser into INTERNAL_ERROR', async () => {
    const s = steps({
      parse: {
        safeParse: () => {
          throw new Error('async refinement in safeParse');
        },
      },
    });
    await expect(runAction({ workspaceId: 'w1' }, s)).resolves.toEqual({
      success: false,
      error: ACTION_ERROR.INTERNAL_ERROR,
    });
    expect(s.authorize).not.toHaveBeenCalled();
  });

  it("lets the rethrow hook pass framework control flow through (Next's redirect)", async () => {
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/login;307;' });
    const rethrow = vi.fn((e: unknown) => {
      if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e;
    });
    const s = steps({
      handler: async () => {
        throw redirect;
      },
      rethrow,
    });
    await expect(runAction({ workspaceId: 'w1' }, s)).rejects.toBe(redirect);
    expect(s.onError).not.toHaveBeenCalled();
  });
});

describe('toActionError', () => {
  it('passes known codes and maps everything else to INTERNAL_ERROR', () => {
    expect(toActionError(new Error('FORBIDDEN'))).toBe('FORBIDDEN');
    expect(toActionError(new Error('some prose'))).toBe('INTERNAL_ERROR');
    expect(toActionError('a string')).toBe('INTERNAL_ERROR');
    expect(toActionError(undefined)).toBe('INTERNAL_ERROR');
  });
});
