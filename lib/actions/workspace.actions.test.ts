// lib/actions/workspace.actions.test.ts
// createWorkspace with the real factory and pipeline, and the database stubbed. It proves the lock runs first, not how
// Postgres behaves under a real double submit.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCaller, type Caller } from '@/lib/auth/caller';
import { createWorkspace } from './workspace.actions';

const { tx, transaction } = vi.hoisted(() => ({
  tx: {
    user: { update: vi.fn() },
    membership: { count: vi.fn() },
    workspace: { create: vi.fn() },
  },
  transaction: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: vi.fn(), notFound: vi.fn(), unstable_rethrow: vi.fn() }));
vi.mock('@/lib/auth/caller', () => ({ getCaller: vi.fn(), getWorkspaceRole: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { $transaction: transaction } }));

const signedIn: Caller = { userId: 'u1', isActive: true, isPlatformAdmin: false };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCaller).mockResolvedValue(signedIn);
  transaction.mockImplementation((run: (client: typeof tx) => unknown) => run(tx));
  tx.membership.count.mockResolvedValue(0);
  tx.workspace.create.mockResolvedValue({ id: 'w1' });
});

const expectNoDatabaseCall = () => {
  expect(transaction).not.toHaveBeenCalled();
};

describe('createWorkspace', () => {
  it('creates the workspace and an OWNER membership for the caller', async () => {
    await expect(createWorkspace({ name: 'Test Lighting Co' })).resolves.toEqual({
      success: true,
      data: { id: 'w1' },
    });
    expect(tx.workspace.create).toHaveBeenCalledWith({
      data: { name: 'Test Lighting Co', memberships: { create: { userId: 'u1', role: 'OWNER' } } },
      select: { id: true },
    });
  });

  it('trims the name', async () => {
    await createWorkspace({ name: '  Test Lighting Co  ' });
    expect(tx.workspace.create.mock.calls[0][0].data.name).toBe('Test Lighting Co');
  });

  it.each([
    ['blank', ''],
    ['whitespace only', '   '],
    ['81 characters', 'x'.repeat(81)],
  ])('refuses a name that is %s before any database call', async (_label, name) => {
    await expect(createWorkspace({ name })).resolves.toEqual({ success: false, error: 'INVALID_INPUT' });
    expectNoDatabaseCall();
  });

  it('accepts 80 characters', async () => {
    await expect(createWorkspace({ name: 'x'.repeat(80) })).resolves.toMatchObject({ success: true });
  });

  it('refuses nobody before any database call', async () => {
    vi.mocked(getCaller).mockResolvedValueOnce(null);
    await expect(createWorkspace({ name: 'Test' })).resolves.toEqual({ success: false, error: 'UNAUTHENTICATED' });
    expectNoDatabaseCall();
  });

  it('refuses a suspended account before any database call', async () => {
    vi.mocked(getCaller).mockResolvedValueOnce({ ...signedIn, isActive: false });
    await expect(createWorkspace({ name: 'Test' })).resolves.toEqual({ success: false, error: 'DISABLED' });
    expectNoDatabaseCall();
  });

  it('refuses an account with any membership, and writes no workspace', async () => {
    tx.membership.count.mockResolvedValueOnce(1);
    await expect(createWorkspace({ name: 'Test' })).resolves.toEqual({ success: false, error: 'WORKSPACE_EXISTS' });
    expect(tx.membership.count).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(tx.workspace.create).not.toHaveBeenCalled();
  });

  // Counting first would let two submits both see zero.
  it("locks the caller's row before it counts their memberships", async () => {
    await createWorkspace({ name: 'Test' });
    expect(tx.user.update.mock.calls[0][0].where).toEqual({ id: 'u1' });
    expect(tx.user.update.mock.invocationCallOrder[0]).toBeLessThan(tx.membership.count.mock.invocationCallOrder[0]);
    expect(tx.membership.count.mock.invocationCallOrder[0]).toBeLessThan(tx.workspace.create.mock.invocationCallOrder[0]);
  });

  it('ignores a role and a userId sent by the client', async () => {
    await createWorkspace({ name: 'Test', role: 'ADMIN', userId: 'someone-else' } as { name: string });
    expect(tx.user.update.mock.calls[0][0].where).toEqual({ id: 'u1' });
    expect(tx.workspace.create.mock.calls[0][0].data.memberships.create).toEqual({ userId: 'u1', role: 'OWNER' });
  });

  it('hides a database error behind INTERNAL_ERROR', async () => {
    const log = vi.spyOn(console, 'error').mockImplementationOnce(() => {});
    transaction.mockRejectedValueOnce(new Error('connect ECONNREFUSED password=hunter2'));
    await expect(createWorkspace({ name: 'Test' })).resolves.toEqual({ success: false, error: 'INTERNAL_ERROR' });
    expect(log).toHaveBeenCalled();
  });
});
