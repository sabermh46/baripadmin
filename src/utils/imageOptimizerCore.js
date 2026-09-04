/**
 * Re-encode an image on the user's own machine, smaller.
 *
 * Written against the platform's built-in codecs rather than a library. Everything needed
 * here — createImageBitmap, OffscreenCanvas, convertToBlob — already ships in every browser
 * this app supports, and a decoder library would add a megabyte of WASM to save a few
 * hundred kilobytes per upload.
 *
 * This module is deliberately DOM-free in its hot path so the exact same code runs inside a
 * Web Worker and on the main thread. Only the canvas construction differs, and that is
 * feature-detected rather than branched on "am I in a worker".
 *
 * ── Three things this fixes beyond file size ─────────────────────────────────
 *
 * 1. EXIF is destroyed, not carried. Re-encoding through a canvas keeps only pixels, so GPS
 *    coordinates, camera serial numbers and timestamps never reach the server. That matters
 *    most for the NID front/back photos, which are taken at home, on a phone, with location
 *    services on — the app was uploading the tenant's home coordinates alongside their
 *    national ID.
 *
 * 2. Orientation is baked in. A phone photo is usually stored landscape with an EXIF flag
 *    saying "rotate 90°". Strip the metadata naively and the picture ends up sideways;
 *    `imageOrientation: 'from-image'` applies the rotation to the pixels first.
 *
 * 3. The original wins when it is already better. Re-encoding a small, already-optimised
 *    JPEG usually makes it BIGGER. If that happens the untouched file is returned.
 */

/** Longest edge, encoder quality ladder, and the size we aim to land under. */
export const PRESETS = {
  // Square-cropped in the UI and rendered at 40–128px. 512 covers retina at every size it
  // is shown, and nothing larger is ever visible.
  avatar: {
    maxEdge: 512,
    qualities: [0.86, 0.78, 0.7, 0.62],
    targetBytes: 160 * 1024,
    label: 'profile picture',
  },

  // An identity document has to stay READABLE — a name and a number have to survive. So the
  // long edge stays generous and the quality ladder starts and stops higher than the
  // avatar's; shaving another 40KB is not worth an unreadable NID number.
  document: {
    maxEdge: 1800,
    qualities: [0.9, 0.84, 0.78, 0.72],
    targetBytes: 700 * 1024,
    label: 'document',
  },

  // Marketing images on the public landing page. Wide, and quality matters more than bytes.
  landing: {
    maxEdge: 2000,
    qualities: [0.88, 0.82, 0.75],
    targetBytes: 800 * 1024,
    label: 'image',
  },
};

const MIN_SHRINK_RATIO = 0.95; // keep the original unless we beat it by at least 5%

// Laravel validates these uploads with `max:5120` (kilobytes) on all three endpoints. Known
// here so a file that cannot pass is rejected on the device, with a sentence explaining why,
// rather than travelling all the way to the server to come back as a validation error.
const SERVER_MAX_BYTES = 5120 * 1024;

/** OffscreenCanvas in a worker, a DOM canvas on the main thread. */
function makeCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
  }
  throw new Error('No canvas implementation available');
}

function encode(canvas, type, quality) {
  if (canvas.convertToBlob) {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed'))),
      type,
      quality,
    );
  });
}

/**
 * Fit inside a square of `maxEdge` without ever enlarging.
 *
 * Upscaling a small image would cost bytes and add nothing — the pixels to fill it do not
 * exist.
 */
function fit(width, height, maxEdge) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height, scaled: false };
  const ratio = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
    scaled: true,
  };
}

/**
 * @param {File|Blob} file
 * @param {object}    opts   { maxEdge, qualities, targetBytes }
 * @param {Function} [onProgress] called with 0..1
 */
export async function optimizeImageCore(file, opts, onProgress = () => {}) {
  const { maxEdge, qualities, targetBytes } = opts;
  const originalBytes = file.size;

  onProgress(0.05);

  let bitmap;
  try {
    // 'from-image' applies the EXIF rotation to the pixels. Without it, stripping metadata
    // (which re-encoding does) would leave a sideways photo with no flag left to fix it.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Almost always an unsupported codec — HEIC from an iPhone is the common one, since
    // only Safari can decode it. Worth naming, because "upload failed" sends someone
    // hunting for a network problem.
    throw new Error('UNSUPPORTED_FORMAT');
  }

  onProgress(0.3);

  // Captured before close(): a closed ImageBitmap reports 0x0, and the "kept the original"
  // branch below still needs the source dimensions to report.
  const srcW = bitmap.width;
  const srcH = bitmap.height;

  const { width, height } = fit(srcW, srcH, maxEdge);

  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  onProgress(0.45);

  // Walk the quality ladder and stop at the first rung that fits the budget. A ladder rather
  // than a binary search: at most four encodes, predictable timing, and the visual steps
  // between rungs are ones a person can actually see.
  let best = null;
  let format = 'image/webp';

  for (let i = 0; i < qualities.length; i++) {
    // Sequential by design: each rung is only tried if the previous one came out too big.
    const blob = await encode(canvas, 'image/webp', qualities[i]);

    // Safari below 16.4 ignores the requested type and hands back a PNG, which is usually
    // LARGER than the JPEG we started with. Trust the output, not the request.
    if (blob.type !== 'image/webp') {
      format = 'image/jpeg';
      break;
    }

    best = blob;
    onProgress(0.45 + (0.5 * (i + 1)) / qualities.length);
    if (blob.size <= targetBytes) break;
  }

  if (format === 'image/jpeg') {
    for (let i = 0; i < qualities.length; i++) {
      // Same ladder, different codec.
      const blob = await encode(canvas, 'image/jpeg', qualities[i]);
      best = blob;
      onProgress(0.45 + (0.5 * (i + 1)) / qualities.length);
      if (blob.size <= targetBytes) break;
    }
  }

  onProgress(1);

  if (!best) throw new Error('ENCODE_FAILED');

  // Re-encoding an already-small file routinely inflates it. When that happens the original
  // is the better upload, so hand it straight back rather than shipping our worse version —
  // but only if the server would actually accept it. Handing back a 7MB original because our
  // 6.9MB encode was not "5% better" would just move the failure to the upload.
  if (best.size >= originalBytes * MIN_SHRINK_RATIO && originalBytes <= SERVER_MAX_BYTES) {
    return {
      blob: file,
      width: srcW,
      height: srcH,
      originalBytes,
      bytes: originalBytes,
      format: file.type || 'image/jpeg',
      skipped: true,
    };
  }

  // Nothing on the quality ladder got under the server's limit. Only reachable with a very
  // large, very detailed source; saying so is more use than a 422 from the API.
  if (best.size > SERVER_MAX_BYTES) {
    throw new Error('TOO_LARGE');
  }

  return {
    blob: best,
    width,
    height,
    originalBytes,
    bytes: best.size,
    format,
    skipped: false,
  };
}
