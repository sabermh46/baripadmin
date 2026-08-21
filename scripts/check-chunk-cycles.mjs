#!/usr/bin/env node
/**
 * Fails the build if the emitted chunks import each other in a cycle.
 *
 * WHY THIS EXISTS
 * ---------------
 * A production build shipped a white screen: "Cannot read properties of undefined
 * (reading 'createContext')". The cause was a circular chunk dependency —
 *
 *     react-core --(Rollup's CJS interop helper)--> i18n
 *     i18n       --(React.createContext)---------->  react-core
 *
 * ES modules in a cycle have to pick an evaluation order, and i18n went first: react-i18next
 * called React.createContext() while react-core was still initialising, so React was
 * undefined and the app died before rendering anything.
 *
 * Nothing caught it. `vite build` exits 0 — a cycle is legal output, just fatal at runtime —
 * and dev never bundles, so there are no chunks to cycle. The only signal was loading the
 * built app in a browser, which is precisely the step a green build invites you to skip.
 *
 * Manual chunking is what makes this reachable: pinning packages to named chunks lets a
 * shared helper land in one chunk while a lower-level chunk still needs it. So this check
 * belongs to the build, not to a test suite.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ASSETS = join(process.cwd(), 'dist', 'assets');

// `import ... from "./name-hash.js"` and bare `import "./name-hash.js"`.
const IMPORT_RE = /(?:from|import)\s*["'](\.\/[^"']+\.js)["']/g;

let files;
try {
  files = readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
} catch {
  console.error(`✗ chunk-cycle check: ${ASSETS} not found — run vite build first.`);
  process.exit(1);
}

/** @type {Map<string, Set<string>>} */
const graph = new Map();

for (const file of files) {
  const source = readFileSync(join(ASSETS, file), 'utf8');
  const deps = new Set();

  for (const match of source.matchAll(IMPORT_RE)) {
    const dep = match[1].replace(/^\.\//, '');
    // Only static imports create an evaluation-order constraint. A dynamic import()
    // resolves later and can legitimately point back at an earlier chunk.
    if (dep !== file && files.includes(dep)) deps.add(dep);
  }

  graph.set(file, deps);
}

// Strip dynamic imports: re-scan and remove anything that only appears inside import(...).
for (const file of files) {
  const source = readFileSync(join(ASSETS, file), 'utf8');
  const dynamic = new Set(
    [...source.matchAll(/import\(\s*["'](\.\/[^"']+\.js)["']\s*\)/g)].map((m) =>
      m[1].replace(/^\.\//, '')
    )
  );
  const statik = new Set(
    [...source.matchAll(/(?:^|[;}\s])(?:import\s*[^(]|export\s+[^]*?from\s*)["'](\.\/[^"']+\.js)["']/g)].map(
      (m) => m[1].replace(/^\.\//, '')
    )
  );
  const deps = graph.get(file);
  for (const d of [...deps]) {
    if (dynamic.has(d) && !statik.has(d)) deps.delete(d);
  }
}

const short = (f) => f.replace(/-[A-Za-z0-9_-]{8,}\.js$/, '');

/** Depth-first search recording the first cycle found. */
const state = new Map();
const stack = [];
const cycles = [];

const visit = (node) => {
  state.set(node, 'open');
  stack.push(node);

  for (const dep of graph.get(node) ?? []) {
    if (state.get(dep) === 'open') {
      cycles.push([...stack.slice(stack.indexOf(dep)), dep]);
    } else if (!state.has(dep)) {
      visit(dep);
    }
  }

  stack.pop();
  state.set(node, 'done');
};

for (const file of files) if (!state.has(file)) visit(file);

if (cycles.length === 0) {
  console.log(`✓ chunk-cycle check: ${files.length} chunks, no circular imports.`);
  process.exit(0);
}

console.error('\n✗ chunk-cycle check FAILED — circular static imports between chunks.\n');
console.error('  ES modules in a cycle evaluate in an arbitrary order, so one chunk will run');
console.error('  while another is still uninitialised. This ships as a blank page at runtime,');
console.error('  not as a build error.\n');

for (const cycle of cycles.slice(0, 5)) {
  console.error('  ' + cycle.map(short).join('\n    -> '));
  console.error('');
}

console.error('  Fix: in vite.config.js manualChunks, pin the shared module both chunks need');
console.error('  into the lower-level chunk (see the commonjsHelpers / preload-helper pins).\n');

process.exit(1);
