// lib/auth/authz.test.ts
// The guards, with the auth provider stubbed out. These are the rules a role depends on, so they are
// proven here and never by clicking around as each role.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  requirePlatformAdmin,
  requireSignedIn,
  requireWorkspacePermission,
  requireWorkspacePermissionPage,
} from './authz';
import { getCaller, getWorkspaceRole, type Caller } from './caller';
import { ROLE_PERMISSIONS, ROLES, isRole, rolesForPermission, roleHasPermission } from './permissions';

vi.mock('server-only', () => ({}));
vi.mock('./caller', () => ({ getCaller: vi.fn(), getWorkspaceRole: vi.fn() }));
// Next's redirect throws to stop the page, so these do too.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND_PAGE');
  }),
}));

const member: Caller = { userId: 'u1', isActive: true, isPlatformAdmin: false };

beforeEach(() => {
  vi.mocked(getCaller).mockResolvedValue(member);
  vi.mocked(getWorkspaceRole).mockResolvedValue('SALES');
});

describe('requireSignedIn', () => {
  it('refuses nobody, and a suspended account', async () => {
    vi.mocked(getCaller).mockResolvedValueOnce(null);
    await expect(requireSignedIn()).rejects.toThrow('UNAUTHENTICATED');
    vi.mocked(getCaller).mockResolvedValueOnce({ ...member, isActive: false });
    await expect(requireSignedIn()).rejects.toThrow('DISABLED');
  });
});

describe('requirePlatformAdmin', () => {
  it('refuses a customer and lets product staff through', async () => {
    await expect(requirePlatformAdmin()).rejects.toThrow('FORBIDDEN_ADMIN_ONLY');
    vi.mocked(getCaller).mockResolvedValueOnce({ ...member, isPlatformAdmin: true });
    await expect(requirePlatformAdmin()).resolves.toMatchObject({ userId: 'u1' });
  });
});

describe('requireWorkspacePermission', () => {
  it('returns the caller when their role holds the permission', async () => {
    await expect(requireWorkspacePermission('w1', 'DATA_WRITE')).resolves.toEqual({ userId: 'u1', role: 'SALES' });
    expect(getWorkspaceRole).toHaveBeenCalledWith('w1', 'u1');
  });

  it('refuses before reading the workspace when nobody is signed in', async () => {
    vi.mocked(getCaller).mockResolvedValueOnce(null);
    await expect(requireWorkspacePermission('w1', 'DATA_READ')).rejects.toThrow('UNAUTHENTICATED');
    expect(getWorkspaceRole).not.toHaveBeenCalled();
  });

  it('refuses a user who is not a member of this workspace', async () => {
    vi.mocked(getWorkspaceRole).mockResolvedValueOnce(null);
    await expect(requireWorkspacePermission('w2', 'DATA_READ')).rejects.toThrow('FORBIDDEN');
  });

  // The classic bug: a membership check passes in review and lets a sales user change prices.
  it('refuses a member whose role lacks the permission', async () => {
    vi.mocked(getWorkspaceRole).mockResolvedValueOnce('SALES');
    await expect(requireWorkspacePermission('w1', 'SETTINGS_WRITE')).rejects.toThrow('FORBIDDEN');
  });
});

describe('requireWorkspacePermissionPage', () => {
  it('returns the caller when their role holds the permission', async () => {
    await expect(requireWorkspacePermissionPage('w1', 'DATA_READ')).resolves.toEqual({ userId: 'u1', role: 'SALES' });
  });

  it('sends nobody to sign-in, and back to the workspace afterwards', async () => {
    vi.mocked(getCaller).mockResolvedValueOnce(null);
    await expect(requireWorkspacePermissionPage('w1', 'DATA_READ')).rejects.toThrow(
      'REDIRECT:/login?callbackUrl=%2Fw%2Fw1',
    );
  });

  it('sends a non-member to /forbidden', async () => {
    vi.mocked(getWorkspaceRole).mockResolvedValueOnce(null);
    await expect(requireWorkspacePermissionPage('w1', 'DATA_READ')).rejects.toThrow('REDIRECT:/forbidden');
  });

  it('sends a suspended account to /forbidden', async () => {
    vi.mocked(getCaller).mockResolvedValueOnce({ ...member, isActive: false });
    await expect(requireWorkspacePermissionPage('w1', 'DATA_READ')).rejects.toThrow('REDIRECT:/forbidden');
  });

  it('lets an unexpected error reach the error page', async () => {
    vi.mocked(getWorkspaceRole).mockRejectedValueOnce(new Error('db down'));
    await expect(requireWorkspacePermissionPage('w1', 'DATA_READ')).rejects.toThrow('db down');
  });
});

describe('the permission matrix', () => {
  it('keeps settings and members with OWNER only', () => {
    expect(rolesForPermission('SETTINGS_WRITE')).toEqual(['OWNER']);
    expect(rolesForPermission('MEMBERS_MANAGE')).toEqual(['OWNER']);
  });

  it('gives every permission to at least one role, so none locks out everyone', () => {
    const all = new Set(ROLES.flatMap((role) => ROLE_PERMISSIONS[role]));
    for (const permission of all) expect(rolesForPermission(permission).length).toBeGreaterThan(0);
  });

  it('holds nothing for a role not resolved yet', () => {
    expect(roleHasPermission(null, 'DATA_READ')).toBe(false);
  });

  it('refuses an unknown role string', () => {
    expect(isRole('SALES')).toBe(true);
    // Product staff, not a workspace role
    expect(isRole('ADMIN')).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});
