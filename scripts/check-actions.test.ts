// scripts/check-actions.test.ts
// scripts/check-actions.mjs: every export of a 'use server' file is a public endpoint, so each one
// must be built by an action factory or be public by design. Each test writes a small repo to a temp
// dir and runs the script on it.

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = fileURLToPath(new URL('./check-actions.mjs', import.meta.url));
const PUBLIC_LIST = 'scripts/check-actions-public.json';
const ACTION_FILE = 'lib/actions/thing.actions.ts';

// Each run spawns node and loads TypeScript (0.5-1s).
const SLOW = { timeout: 20_000 };

const FACTORY_IMPORT = "import { createWorkspaceAction } from '@/lib/actions/server/create-action';";
const RAW = "'use server';\nexport async function leak(workspaceId: string) {\n  return workspaceId;\n}\n";
const SAFE = [
  "'use server';",
  FACTORY_IMPORT,
  "export const safe = createWorkspaceAction({ name: 'safe', permission: 'DATA_READ', input }, async () => ok(1));",
  '',
].join('\n');

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

/** A throwaway repo holding `files` (repo-relative path -> content). */
function makeRepo(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'check-actions-'));
  roots.push(root);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

function run(root: string) {
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

describe('check-actions: exports', SLOW, () => {
  it('fails a raw export async function and names file#export', () => {
    const { code, out } = run(makeRepo({ [ACTION_FILE]: RAW }));
    expect(code).toBe(1);
    expect(out).toContain(`${ACTION_FILE}#leak`);
  });

  it('passes an export built by createWorkspaceAction', () => {
    const { code, out } = run(makeRepo({ [ACTION_FILE]: SAFE }));
    expect(out).toContain('OK');
    expect(code).toBe(0);
  });

  it('passes the other factories, aliased imports included', () => {
    const root = makeRepo({
      [ACTION_FILE]: [
        "'use server';",
        "import { createAdminAction, createUserAction as userAction } from '@/lib/actions/server/create-action';",
        'export const a = createAdminAction({ name: "a", input }, async () => ok(1));',
        'export const b = userAction({ name: "b", input }, async () => ok(1));',
      ].join('\n'),
    });
    expect(run(root).code).toBe(0);
  });

  it('fails a look-alike factory that is declared locally', () => {
    const root = makeRepo({
      [ACTION_FILE]: [
        "'use server';",
        'const createWorkspaceAction = (_o: unknown, h: unknown) => h;',
        "export const fake = createWorkspaceAction({ name: 'fake' }, async () => 1);",
      ].join('\n'),
    });
    const { code, out } = run(root);
    expect(code).toBe(1);
    expect(out).toContain(`${ACTION_FILE}#fake`);
  });

  it('fails a factory imported from anywhere but create-action', () => {
    const root = makeRepo({
      [ACTION_FILE]: [
        "'use server';",
        "import { createWorkspaceAction } from './my-factory';",
        "export const fake = createWorkspaceAction({ name: 'fake' }, async () => 1);",
      ].join('\n'),
    });
    const { code, out } = run(root);
    expect(code).toBe(1);
    expect(out).toContain(`${ACTION_FILE}#fake`);
  });

  it("fails a factory export whose `name` doesn't match the export (it labels the logs)", () => {
    const { code, out } = run(makeRepo({ [ACTION_FILE]: SAFE.replace("name: 'safe'", "name: 'other'") }));
    expect(code).toBe(1);
    expect(out).toContain(`${ACTION_FILE}#safe`);
  });

  it('fails export lists, re-exports, default exports and let', () => {
    const root = makeRepo({
      [ACTION_FILE]: [
        "'use server';",
        FACTORY_IMPORT,
        'const inner = createWorkspaceAction({}, async () => 1);',
        'export { inner as listed };',
        "export { other } from './other';",
        "export * from './everything';",
        'export default async function () {}',
        'export let mutable = createWorkspaceAction({}, async () => 1);',
      ].join('\n'),
    });
    const { code, out } = run(root);
    expect(code).toBe(1);
    for (const name of ['listed', 'other', '*', 'default', 'mutable']) expect(out).toContain(`${ACTION_FILE}#${name}`);
  });

  it('skips type-only exports', () => {
    const root = makeRepo({
      [ACTION_FILE]: [
        "'use server';",
        'export type Result = { ok: boolean };',
        'export interface Params { workspaceId: string }',
        'type Local = string;',
        'export { type Local as Alias };',
        "export type { Other } from './other';",
      ].join('\n'),
    });
    expect(run(root).code).toBe(0);
  });

  // TypeScript lets a type and a value share a name, so the type must not hide the value.
  it('fails an export list naming a value that shares its name with a local type', () => {
    const root = makeRepo({
      [ACTION_FILE]: [
        "'use server';",
        'type leak = string;',
        'const leak = async (id: string) => id;',
        'export { leak };',
      ].join('\n'),
    });
    const { code, out } = run(root);
    expect(code).toBe(1);
    expect(out).toContain(`${ACTION_FILE}#leak`);
  });

  it("finds 'use server' after a header comment, and ignores files without it", () => {
    const root = makeRepo({
      [ACTION_FILE]: `// header\n/** doc */\n${RAW}`,
      'lib/queries/thing.queries.ts': 'export async function read() {}\n',
      'app/page.tsx': "export default async function Page() {\n  'use server';\n}\n",
    });
    const { code, out } = run(root);
    expect(code).toBe(1);
    expect(out).toContain(`${ACTION_FILE}#leak`);
    expect(out).not.toContain('thing.queries.ts');
    expect(out).not.toContain('page.tsx');
  });

  it('finds an action file in any folder, a new one included', () => {
    for (const folder of ['app/x', 'components/z', 'features/quotes', 'server/y']) {
      const { code, out } = run(makeRepo({ [`${folder}/thing.ts`]: RAW }));
      expect(code).toBe(1);
      expect(out).toContain(`${folder}/thing.ts#leak`);
    }
  });

  it('skips dependencies, build output and dot-folders', () => {
    const root = makeRepo({
      'node_modules/pkg/thing.ts': RAW,
      '.next/server/thing.js': RAW,
      '.playbook/template/thing.ts': RAW,
    });
    expect(run(root).code).toBe(0);
  });

  it('checks a folder below the root that shares a skipped name', () => {
    for (const folder of ['app/public/[token]', 'lib/actions/build', 'lib/.drafts']) {
      const { code, out } = run(makeRepo({ [`${folder}/thing.ts`]: RAW }));
      expect(code).toBe(1);
      expect(out).toContain(`${folder}/thing.ts#leak`);
    }
  });
});

describe('check-actions: public by design', SLOW, () => {
  const AUTH_FILE = 'lib/actions/auth.actions.ts';
  const raw = (...names: string[]) =>
    `'use server';\n${names.map((n) => `export async function ${n}() {}`).join('\n')}\n`;

  it('passes a raw export on the public list', () => {
    const root = makeRepo({
      [AUTH_FILE]: raw('sendMagicLink'),
      [PUBLIC_LIST]: JSON.stringify({ [`${AUTH_FILE}#sendMagicLink`]: 'sign-in: runs before there is a session' }),
    });
    expect(run(root).code).toBe(0);
  });

  it('fails an entry that matches no raw export, so the name is not left open', () => {
    const root = makeRepo({
      [AUTH_FILE]: raw('other'),
      [PUBLIC_LIST]: JSON.stringify({ [`${AUTH_FILE}#gone`]: 'sign-in' }),
    });
    const { code, out } = run(root);
    expect(code).toBe(1);
    expect(out).toContain(`${AUTH_FILE}#gone`);
  });

  it('refuses an entry with no reason', () => {
    const root = makeRepo({
      [AUTH_FILE]: raw('sendMagicLink'),
      [PUBLIC_LIST]: JSON.stringify({ [`${AUTH_FILE}#sendMagicLink`]: ' ' }),
    });
    expect(run(root).code).toBe(1);
  });
});
