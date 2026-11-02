// lib/auth/caller.test.ts
// Which membership `/` lands on. The database is stubbed, so this proves what the query asks for, not how Postgres sorts.

import { describe, expect, it, vi } from 'vitest';
import { getLandingMembership } from './caller';

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/db', () => ({ prisma: { membership: { findFirst } } }));

describe('getLandingMembership', () => {
  // Oldest first alone would send a member with a suspended and an active row to /forbidden.
  it("reads the caller's own membership, active first, then oldest", async () => {
    findFirst.mockResolvedValueOnce({ workspaceId: 'w1', isActive: true });
    await expect(getLandingMembership('u1')).resolves.toEqual({ workspaceId: 'w1', isActive: true });
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
      select: { workspaceId: true, isActive: true },
    });
  });
});
