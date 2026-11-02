// lib/workspace/landing.ts
// The one rule for where `/` sends someone. Pure, so each case is proven by a test.
// Reference: .docs/references/APP_SHELL_REFERENCE.md
import { FORBIDDEN_PATH, LOGIN_PATH } from '@/lib/auth/callback-url';

export const WELCOME_PATH = '/welcome';

export function landingPath(
  caller: { isActive: boolean } | null,
  membership: { workspaceId: string; isActive: boolean } | null,
): string {
  if (!caller) return LOGIN_PATH;
  if (!caller.isActive) return FORBIDDEN_PATH;
  if (!membership) return WELCOME_PATH;
  // Not /welcome: a member suspended from their workspace can't make a new one to get back in.
  if (!membership.isActive) return FORBIDDEN_PATH;
  return `/w/${membership.workspaceId}`;
}
