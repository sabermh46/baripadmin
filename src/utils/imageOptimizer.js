import { optimizeImageCore, PRESETS } from './imageOptimizerCore';

export { PRESETS };

/**
 * Public entry point: hand it a File, get a smaller File back.
 *
 * Prefers a Web Worker and falls back to the main thread when one cannot be created —
 * which is not hypothetical: a strict Content-Security-Policy, a browser with workers
 * disabled, or an embedded webview will all refuse. The fallback runs the identical core,
 * so behaviour is the same and only responsiveness differs.
 *
 * One worker is shared across all calls and kept alive between uploads. Spawning one per
 * file costs a module fetch and instantiation each time, which on a slow phone is a
 * meaningful fraction of the work itself.
 */

let worker = null;
let workerBroken = false;
let nextId = 1;
const pending = new Map();

function getWorker() {
  if (workerBroken) return null;
  if (worker) return worker;

  try {
    // `new URL(..., import.meta.url)` is the form Vite understands: it bundles the worker as
    // its own chunk and rewrites the path. A string path would resolve at runtime against
    // the wrong origin once built.
    worker = new Worker(new URL('./imageOptimizer.worker.js', import.meta.url), { type: 'module' });

    worker.onmessage = (event) => {
      const { id, type, progress, result, error } = event.data || {};
      const entry = pending.get(id);
      if (!entry) return;

      if (type === 'progress') { entry.onProgress?.(progress); return; }

      pending.delete(id);
      if (type === 'done') entry.resolve(result);
      else entry.reject(new Error(error || 'OPTIMIZE_FAILED'));
    };

    // A worker that dies takes every in-flight job with it. Reject them rather than leaving
    // the UI on a spinner that never resolves, and stop trying to use it.
    worker.onerror = () => {
      workerBroken = true;
      for (const [, entry] of pending) entry.reject(new Error('WORKER_FAILED'));
      pending.clear();
      try { worker.terminate(); } catch { /* already gone */ }
      worker = null;
    };

    return worker;
  } catch {
    workerBroken = true;
    return null;
  }
}

/**
 * @param {File}   file
 * @param {string} preset  key of PRESETS — 'avatar' | 'document' | 'landing'
 * @param {object} [options]
 * @param {(n:number)=>void} [options.onProgress]  0..1
 * @returns {Promise<{file: File, originalBytes: number, bytes: number, width: number,
 *                    height: number, format: string, skipped: boolean, savedPct: number}>}
 */
export async function optimizeImage(file, preset = 'document', { onProgress } = {}) {
  const opts = PRESETS[preset] || PRESETS.document;

  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('NOT_AN_IMAGE');
  }

  // SVG is markup, not a raster. Canvas would rasterise it at whatever size we picked and
  // throw away its scalability — and an SVG can carry script, which is its own reason not to
  // wave it through as a "picture".
  if (file.type === 'image/svg+xml') {
    throw new Error('SVG_NOT_SUPPORTED');
  }

  const w = getWorker();

  const raw = w
    ? await new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject, onProgress });
        w.postMessage({ id, file, opts });
      }).catch(async (err) => {
        // A worker failure is not a reason to refuse the upload — retry inline once.
        if (err.message === 'WORKER_FAILED') {
          return optimizeImageCore(file, opts, onProgress);
        }
        throw err;
      })
    : await optimizeImageCore(file, opts, onProgress);

  return {
    ...raw,
    file: toFile(raw.blob, file.name, raw.format),
    savedPct: raw.originalBytes > 0
      ? Math.max(0, Math.round((1 - raw.bytes / raw.originalBytes) * 100))
      : 0,
  };
}

/**
 * Give the blob a filename whose extension matches what is actually inside it.
 *
 * The server validates with `mimes:` and Laravel checks the real MIME type, but the stored
 * filename ends up in URLs and download prompts — "nid-front.jpg" containing WebP is the
 * kind of thing that is fine until something downstream trusts the extension.
 */
function toFile(blob, originalName, format) {
  if (blob instanceof File && blob.type === format) return blob;

  const ext = format === 'image/webp' ? 'webp' : format === 'image/png' ? 'png' : 'jpg';
  const base = (originalName || 'image').replace(/\.[^./\\]+$/, '') || 'image';

  return new File([blob], `${base}.${ext}`, {
    type: format,
    lastModified: Date.now(),
  });
}

/** Human-readable byte count for the UI. */
export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Maps the core's error codes onto something worth showing a person. */
export function optimizeErrorMessage(error) {
  switch (error?.message) {
    case 'NOT_AN_IMAGE':
      return 'That file is not an image.';
    case 'SVG_NOT_SUPPORTED':
      return 'SVG files are not supported here. Please upload a photo (JPG, PNG or WebP).';
    case 'UNSUPPORTED_FORMAT':
      return 'This browser cannot read that image format. If it came from an iPhone, try setting Camera > Formats to "Most Compatible", or take a screenshot of it first.';
    case 'TOO_LARGE':
      return 'Even after optimising, this image is over the 5 MB limit. Please crop it or use a lower-resolution photo.';
    case 'ENCODE_FAILED':
      return 'The image could not be processed. Please try a different file.';
    default:
      return 'Could not process that image. Please try another one.';
  }
}
