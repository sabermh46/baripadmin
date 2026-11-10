// Snapshot the landing page's CMS content into the build, so the page renders instantly
// from the bundle and only then asks the backend whether anything changed.
//
//   npm run snapshot:landing                       (the production API, from .env.production)
//   npm run snapshot:landing -- http://localhost:8080
//
// Runs before every `npm run build` (prebuild). It never fails a build: if the API cannot be
// reached, or answers in a shape this page does not expect (a backend older than the
// bilingual landing page answers without `locale`), the snapshot already in the repo is kept.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'src/pages/PublicHome/landingSnapshot.json');
const LOCALES = ['bn', 'en'];
const TIMEOUT_MS = 10_000;

const apiFromEnvFile = () => {
  try {
    const line = readFileSync(join(root, '.env.production'), 'utf8')
      .split(/\r?\n/).find((l) => l.startsWith('VITE_APP_API_URL='));
    return line?.slice('VITE_APP_API_URL='.length).trim().replace(/^["']|["']$/g, '');
  } catch {
    return undefined;
  }
};

const api = (process.argv[2] || process.env.LANDING_SNAPSHOT_API || apiFromEnvFile() || '').replace(/\/+$/, '');

const keep = (why) => {
  console.warn(`[snapshot-landing] kept the existing snapshot: ${why}`);
  process.exit(0);
};

if (!api) keep('no API URL (pass one, or set VITE_APP_API_URL in .env.production)');

const snapshot = { generatedAt: new Date().toISOString() };

for (const locale of LOCALES) {
  let body;
  try {
    const res = await fetch(`${api}/api/public/landing?locale=${locale}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) keep(`${api} answered ${res.status} for ${locale}`);
    body = await res.json();
  } catch (e) {
    keep(`${api} could not be read (${e.message})`);
  }

  const data = body?.data;
  if (body?.locale !== locale || !data || typeof data !== 'object' || !data.hero) {
    keep(`${api} is not serving the bilingual landing page yet (no "${locale}" content)`);
  }
  snapshot[locale] = data;
}

writeFileSync(OUT, `${JSON.stringify(snapshot, null, 1)}\n`);
console.log(`[snapshot-landing] wrote ${LOCALES.join(' + ')} from ${api}`);
