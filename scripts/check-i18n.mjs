#!/usr/bin/env node
/**
 * en/bn parity + duplicate-key check for src/i18n.js.
 *
 * Every translation added this project has needed the same three questions answered by hand:
 * does the key already exist, is it in both languages, and did a rename touch only the English
 * half. The last one has actually shipped — a key renamed in `en` and not in `bn` leaves the
 * Bengali UI silently falling back to English for that string, which nothing complains about.
 *
 * i18n.js is parsed as text rather than imported, because importing it initialises i18next and
 * a duplicate key inside a JS object literal is not an error — the later one just wins, so the
 * duplicate becomes invisible the moment the module is evaluated. The text is exactly where
 * the duplicate is still visible.
 *
 * Usage: node scripts/check-i18n.mjs   (exit 1 on any problem)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src', 'i18n.js'), 'utf8');

/** Keys of one `<lang>: { translation: { ... } }` block, in file order, duplicates kept. */
const blockKeys = (lang) => {
  const open = src.indexOf(`  ${lang}: {`);
  if (open === -1) throw new Error(`no ${lang} block in src/i18n.js`);

  const start = src.indexOf('translation: {', open);
  // Walk braces from the opening one so a `{` inside a translated string cannot end the block
  // early — several strings contain `{{count}}`.
  let depth = 0;
  let i = src.indexOf('{', start);
  const from = i;
  for (; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
  }

  const body = src.slice(from, i);
  const keys = [];
  const line = /^\s*"([^"]+)"\s*:/gm;
  let m;
  while ((m = line.exec(body)) !== null) keys.push(m[1]);
  return keys;
};

const en = blockKeys('en');
const bn = blockKeys('bn');
const problems = [];

const dupes = (keys, lang) => {
  const seen = new Set();
  keys.forEach((k) => {
    if (seen.has(k)) problems.push(`duplicate key in ${lang}: "${k}"`);
    seen.add(k);
  });
};
dupes(en, 'en');
dupes(bn, 'bn');

const enSet = new Set(en);
const bnSet = new Set(bn);
en.filter((k) => !bnSet.has(k)).forEach((k) => problems.push(`missing from bn: "${k}"`));
bn.filter((k) => !enSet.has(k)).forEach((k) => problems.push(`missing from en: "${k}"`));

console.log(`i18n: ${enSet.size} en / ${bnSet.size} bn`);
if (problems.length) {
  problems.forEach((p) => console.error(`  ✗ ${p}`));
  console.error(`\n${problems.length} problem(s)`);
  process.exit(1);
}
console.log('i18n: en/bn in parity, no duplicates');
