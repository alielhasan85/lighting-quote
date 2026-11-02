#!/usr/bin/env node
/**
 * Server action guard: one way in for every 'use server' export.
 *
 * Every export of a 'use server' file is a public HTTP endpoint: anyone can call it with any
 * arguments. So each one must be built by an action factory, which parses the input with zod, runs
 * the guard and returns errors as values (lib/actions/server/create-action.ts):
 *
 *   export const getThing = createWorkspaceAction({ name, permission, input }, handler);
 *
 * Checked per export, not per file: a file with guards on some exports can still have an open one.
 * An export passes only as `export const X = <factory>({ name: 'X', ... }, handler)` with the factory
 * imported from its module, so a local look-alike doesn't count, and `name` (it labels the logs)
 * matching the export. `export async function`, `export { … }`, re-exports and `export default`
 * fail. Type-only exports are skipped (erased at build).
 *
 *   npm run check:actions                 exits 1 on any export that skips the factory
 *   node scripts/check-actions.mjs --root <dir>   checks another tree (the tests use this)
 *
 * scripts/check-actions-public.json lists exports that must run with no session (sign-in, a
 * token-gated read), each with its reason. An entry that matches no raw export fails, so it can't
 * wave through a later export of that name.
 *
 * Known limit: it proves an export goes through a factory, not that the permission is the right one
 * or that the handler scopes its queries by workspace. Those stay review items. An inline 'use server'
 * closure inside a page isn't an export, so it isn't checked: keep those as thin wrappers around a
 * file-level action.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/* ─── Arguments ──────────────────────────────────────────────────────────── */

const args = process.argv.slice(2);
const rootArg = args.indexOf('--root');
if (rootArg >= 0 && !args[rootArg + 1]) {
  console.log('check-actions: --root needs a directory, e.g. --root ./some/repo');
  process.exit(1);
}
const ROOT = rootArg >= 0 ? resolve(args[rootArg + 1]) : fileURLToPath(new URL('..', import.meta.url));
const PUBLIC_FILE = join(ROOT, 'scripts/check-actions-public.json');

/* ─── Scope ──────────────────────────────────────────────────────────────── */

// The whole repo, so a 'use server' file in a new folder is still checked. Skipped, at the repo root only:
// dependencies, build output and every dot-folder (.git, .next). A folder of the same name deeper down
// (app/public/) is still checked.
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'public']);

// The factory module and its exports. A relative path to it doesn't count, so there is one spelling
// to search for.
const FACTORY_MODULE = '@/lib/actions/server/create-action';
const FACTORY_NAMES = new Set([
  'createWorkspaceAction',
  'createAdminAction',
  'createUserAction',
  'createPublicFormAction',
]);

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/** Every source file in the repo, repo-relative with forward slashes. */
function findFiles() {
  const out = [];
  const walk = (dir, atRoot) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const skipped = atRoot && (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.'));
        if (!skipped) walk(join(dir, entry.name), false);
      } else if (entry.isFile() && EXTENSIONS.has(extname(entry.name))) {
        out.push(relative(ROOT, join(dir, entry.name)).split(sep).join('/'));
      }
    }
  };
  walk(ROOT, true);
  return out.sort();
}

const SCRIPT_KIND = { '.tsx': ts.ScriptKind.TSX, '.jsx': ts.ScriptKind.JSX, '.ts': ts.ScriptKind.TS };

/** True when the file's directive prologue holds 'use server' (comments before it are fine). */
function isUseServerFile(sf) {
  for (const stmt of sf.statements) {
    if (!ts.isExpressionStatement(stmt) || !ts.isStringLiteral(stmt.expression)) return false;
    if (stmt.expression.text === 'use server') return true;
  }
  return false;
}

const hasModifier = (node, kind) =>
  ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === kind);

/** Local names bound to a real factory: imported (aliases included) from the factory module. */
function factoryLocals(sf) {
  const locals = new Set();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    if (stmt.moduleSpecifier.text !== FACTORY_MODULE) continue;
    const clause = stmt.importClause; // undefined for a side-effect import
    if (!clause || clause.isTypeOnly || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
    for (const el of clause.namedBindings.elements) {
      if (!el.isTypeOnly && FACTORY_NAMES.has((el.propertyName ?? el.name).text)) locals.add(el.name.text);
    }
  }
  return locals;
}

/** The `name` option of a factory call when it is a string literal (it labels the action's logs). */
function factoryNameOption(call) {
  const opts = call.arguments[0];
  if (!opts || !ts.isObjectLiteralExpression(opts)) return undefined;
  const prop = opts.properties.find((p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'name');
  return prop && ts.isStringLiteralLike(prop.initializer) ? prop.initializer.text : undefined;
}

/** Names a declaration binds, destructuring included. */
const boundNames = (name) =>
  ts.isIdentifier(name)
    ? [name.text]
    : name.elements.flatMap((el) => (ts.isOmittedExpression(el) ? [] : boundNames(el.name)));

/** Top-level names bound to a runtime value: variables, functions, classes, enums, namespaces and value imports. */
function localValues(sf) {
  const values = new Set();
  for (const stmt of sf.statements) {
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) for (const n of boundNames(decl.name)) values.add(n);
    } else if (
      (ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt) || ts.isEnumDeclaration(stmt) ||
        ts.isModuleDeclaration(stmt)) &&
      stmt.name
    ) {
      values.add(stmt.name.text);
    } else if (ts.isImportDeclaration(stmt) && stmt.importClause && !stmt.importClause.isTypeOnly) {
      const { name, namedBindings } = stmt.importClause;
      if (name) values.add(name.text);
      if (namedBindings && ts.isNamespaceImport(namedBindings)) values.add(namedBindings.name.text);
      else if (namedBindings) for (const el of namedBindings.elements) if (!el.isTypeOnly) values.add(el.name.text);
    }
  }
  return values;
}

/**
 * Every runtime export of a 'use server' file: name -> null when it goes through a factory,
 * otherwise why it doesn't.
 */
function fileExports(sf) {
  const factories = factoryLocals(sf);
  // A type and a value can share a name: an export list entry is type-only when no value holds it.
  const values = localValues(sf);
  const localTypes = new Set(
    sf.statements
      .filter((s) => ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s))
      .map((s) => s.name.text)
      .filter((name) => !values.has(name)),
  );
  const exports = new Map();
  const add = (name, reason) => {
    if (!exports.has(name)) exports.set(name, reason); // function overloads repeat a name
  };

  for (const stmt of sf.statements) {
    if (ts.isExportDeclaration(stmt)) {
      if (stmt.isTypeOnly) continue;
      const how = stmt.moduleSpecifier ? 're-export' : 'export list';
      if (!stmt.exportClause) add('*', how);
      else if (ts.isNamespaceExport(stmt.exportClause)) add(stmt.exportClause.name.text, how);
      else {
        for (const el of stmt.exportClause.elements) {
          const local = (el.propertyName ?? el.name).text;
          if (el.isTypeOnly || (!stmt.moduleSpecifier && localTypes.has(local))) continue;
          add(el.name.text, how);
        }
      }
      continue;
    }
    if (ts.isExportAssignment(stmt)) {
      add('default', 'default export');
      continue;
    }
    if (!hasModifier(stmt, ts.SyntaxKind.ExportKeyword)) continue;
    if (hasModifier(stmt, ts.SyntaxKind.DeclareKeyword)) continue; // ambient: erased
    if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) continue;
    if (hasModifier(stmt, ts.SyntaxKind.DefaultKeyword)) {
      add('default', 'default export');
      continue;
    }

    if (ts.isVariableStatement(stmt)) {
      const isConst = (stmt.declarationList.flags & ts.NodeFlags.BlockScoped) === ts.NodeFlags.Const;
      for (const decl of stmt.declarationList.declarations) {
        const init = decl.initializer;
        const viaFactory =
          init && ts.isCallExpression(init) && ts.isIdentifier(init.expression) && factories.has(init.expression.text);
        if (!ts.isIdentifier(decl.name)) add(decl.name.getText(sf), 'destructured export');
        else if (!isConst) add(decl.name.text, 'let/var, not const');
        else if (!viaFactory) add(decl.name.text, 'not an action factory call');
        else if (factoryNameOption(init) !== decl.name.text) {
          add(decl.name.text, `the factory's name option must be '${decl.name.text}' (it labels the logs)`);
        } else add(decl.name.text, null);
      }
    } else if (ts.isFunctionDeclaration(stmt)) {
      add(stmt.name?.text ?? 'default', 'function, not an action factory call');
    } else {
      add(stmt.name?.getText(sf) ?? 'default', 'not an action factory call');
    }
  }
  return exports;
}

/** file#name -> reason. A missing file means nothing is public. */
function readPublicList() {
  if (!existsSync(PUBLIC_FILE)) return {};
  const data = JSON.parse(readFileSync(PUBLIC_FILE, 'utf8'));
  const valid =
    data && typeof data === 'object' && !Array.isArray(data) &&
    Object.values(data).every((reason) => typeof reason === 'string' && reason.trim());
  if (!valid) {
    console.log(`check-actions: ${PUBLIC_FILE} must map each "file#export" to its reason.`);
    process.exit(1);
  }
  return data;
}

/* ─── Run ────────────────────────────────────────────────────────────────── */

// 1. Every runtime export of every 'use server' file.
let fileCount = 0;
let viaFactory = 0;
const raw = new Map(); // file#name -> reason
for (const file of findFiles()) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  if (!text.includes('use server')) continue;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, SCRIPT_KIND[extname(file)] ?? ts.ScriptKind.JS);
  if (!isUseServerFile(sf)) continue;
  fileCount++;
  for (const [name, reason] of fileExports(sf)) {
    if (reason === null) viaFactory++;
    else raw.set(`${file}#${name}`, reason);
  }
}

// 2. Split the raw exports: public by design, or a failure.
const publicList = readPublicList();
const open = [...raw].filter(([key]) => !(key in publicList));
const stalePublic = Object.keys(publicList).filter((key) => !raw.has(key));
const publicUsed = raw.size - open.length;

// 3. Report. ASCII only: Windows PowerShell 5.1 mangles UTF-8 symbols.
if (open.length) {
  console.log(`\ncheck-actions: ${open.length} export(s) skip the action factory:`);
  for (const [key, reason] of open) console.log(`  ${key}  - ${reason}`);
  console.log(
    `\nBuild each one with a factory imported from '${FACTORY_MODULE}' (a relative path to it\n` +
      "doesn't count). Must it run with no session (sign-in, a token-gated read)? Add it to\n" +
      'scripts/check-actions-public.json with the reason. Rules: .claude/rules/server-actions.md',
  );
}

if (stalePublic.length) {
  console.log(`\ncheck-actions: ${stalePublic.length} public entr(ies) match no raw export (renamed, migrated or deleted):`);
  for (const key of stalePublic) console.log(`  ${key}`);
  console.log('Delete them from scripts/check-actions-public.json.');
}

const summary =
  `${viaFactory + raw.size} export(s) in ${fileCount} 'use server' file(s): ` +
  `${viaFactory} through a factory, ${publicUsed} public by design`;

if (open.length || stalePublic.length) {
  console.log(`\ncheck-actions: FAIL - ${summary}.`);
  process.exitCode = 1;
} else {
  console.log(`check-actions: OK - ${summary}.`);
}
