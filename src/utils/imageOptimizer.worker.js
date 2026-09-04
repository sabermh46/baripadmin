/**
 * Runs the re-encode off the main thread.
 *
 * A 12-megapixel phone photo takes a noticeable moment to decode, scale and encode four
 * times over. On the main thread that is a frozen page: the spinner stops spinning, the
 * cancel button stops responding, and on a mid-range Android it looks like a crash. All of
 * that work belongs here instead.
 *
 * The module is a thin shell on purpose — the logic lives in imageOptimizerCore so the
 * main-thread fallback path runs exactly the same code rather than a second implementation
 * that quietly drifts.
 */
import { optimizeImageCore } from './imageOptimizerCore';

self.onmessage = async (event) => {
  const { id, file, opts } = event.data || {};

  try {
    const result = await optimizeImageCore(file, opts, (progress) => {
      self.postMessage({ id, type: 'progress', progress });
    });

    self.postMessage({ id, type: 'done', result });
  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      // Only the message crosses the boundary: Error objects are not structured-cloneable
      // in every browser, and a failed postMessage here would hang the caller's promise
      // forever instead of rejecting it.
      error: error?.message || String(error),
    });
  }
};
