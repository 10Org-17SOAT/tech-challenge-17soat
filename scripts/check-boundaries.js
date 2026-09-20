#!/usr/bin/env node
/**
 * Scans src/modules/**\/*.ts for imports that reach into another module's
 * domain/application/infrastructure layers, violating module boundaries.
 * Importing another module's *.module.ts or public/ (its published contract)
 * is allowed.
 *
 * Run it after touching anything under src/modules/ or src/shared/:
 *
 *   npm run check:boundaries
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MODULES_DIR = path.join(ROOT, 'src', 'modules');

/**
 * Contexts whose submodules are checked against each other, not just against
 * other contexts. `onboarding` and `service-management` are deliberately absent:
 * their submodules import each other's internals in ~50 places today, and
 * untangling that is its own piece of work. Add them here once that is done.
 */
const NESTED_CONTEXTS = new Set(['stock']);

/**
 * Violations that predate this check and are accepted for now, as
 * `<file> -> <import>`. Event handlers subscribe to other contexts' domain
 * events by importing the event class; the alternative is a shared events
 * package, which is a decision for another day.
 *
 * Nothing may be added here without agreement: the point of the list is that
 * it only ever shrinks.
 */
const GRANDFATHERED = new Set([
  'src/modules/service-management/service-orders/application/event-handlers/execution-completed.handler.ts -> ../../../../mechanic/domain/events/execution-completed.event',
  'src/modules/service-management/service-orders/application/event-handlers/execution-started.handler.ts -> ../../../../mechanic/domain/events/execution-started.event',
  'src/modules/service-management/service-orders/application/event-handlers/payment-received.handler.ts -> ../../../../payment/domain/events/payment-received.event',
]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (
      entry.isFile() &&
      /\.ts$/.test(entry.name) &&
      !/\.spec\.ts$/.test(entry.name)
    ) {
      files.push(full);
    }
  }
  return files;
}

/**
 * The module a path belongs to: normally the first segment under src/modules,
 * but `<context>/<submodule>` for the contexts listed above, so sibling
 * submodules are held to the same boundary as unrelated modules.
 */
function moduleNameOf(parts) {
  return NESTED_CONTEXTS.has(parts[0]) && parts.length > 1
    ? `${parts[0]}/${parts[1]}`
    : parts[0];
}

function getModuleName(filePath) {
  return moduleNameOf(path.relative(MODULES_DIR, filePath).split(path.sep));
}

function resolveImportModule(fromFile, importPath) {
  if (!importPath.startsWith('.')) return null;
  const resolved = path.resolve(path.dirname(fromFile), importPath);
  const rel = path.relative(MODULES_DIR, resolved);
  if (rel.startsWith('..')) return null;
  const parts = rel.split(path.sep);
  const moduleName = moduleNameOf(parts);
  return { moduleName, layer: parts[moduleName.split('/').length] };
}

const IMPORT_RE = /import\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;

const violations = [];
const seen = new Set();

for (const file of walk(MODULES_DIR)) {
  const ownerModule = getModuleName(file);
  const relFile = path.relative(ROOT, file);
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = IMPORT_RE.exec(content))) {
    const importPath = match[1];
    const target = resolveImportModule(file, importPath);
    if (!target) continue;
    if (target.moduleName === ownerModule) continue;

    const basename = path.basename(importPath);
    if (basename.endsWith('.module')) continue;

    if (!['domain', 'application', 'infrastructure'].includes(target.layer)) {
      continue;
    }

    const key = `${relFile} -> ${importPath}`;
    if (GRANDFATHERED.has(key)) {
      seen.add(key);
      continue;
    }

    violations.push({
      file: relFile,
      import: importPath,
      violatesModule: target.moduleName,
      layer: target.layer,
    });
  }
}

const stale = [...GRANDFATHERED].filter((key) => !seen.has(key));
if (stale.length > 0) {
  console.log(
    `ℹ️  ${stale.length} grandfathered violation(s) no longer exist — remove them from GRANDFATHERED:\n`,
  );
  for (const key of stale) console.log(`  ${key}`);
  console.log('');
}

if (violations.length > 0) {
  console.error('❌ Module boundary violations found:\n');
  for (const v of violations) {
    console.error(
      `  ${v.file}\n    imports "${v.import}" → reaches into modules/${v.violatesModule}/${v.layer}/*\n`,
    );
  }
  console.error(
    `${violations.length} violation(s). Modules must communicate via the target module's *.module.ts contract, its public/ query, HTTP, or events — never by importing another module's domain/application/infrastructure directly.`,
  );
  process.exit(1);
}

console.log(
  `✅ No module boundary violations found (${GRANDFATHERED.size} grandfathered).`,
);
