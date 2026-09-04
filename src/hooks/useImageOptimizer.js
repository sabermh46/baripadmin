import { useCallback, useEffect, useRef, useState } from 'react';
import { optimizeImage, optimizeErrorMessage } from '../utils/imageOptimizer';

/**
 * React wrapper around optimizeImage: status, progress and the object URL for a preview.
 *
 * The preview URL is the fiddly part. createObjectURL pins the whole blob in memory until
 * it is revoked, so a form where someone re-picks an NID photo four times would hold four
 * full-size images for the life of the page. This revokes the previous URL on every
 * replacement and again on unmount.
 *
 * `runId` guards against a slow first pick resolving AFTER a fast second one and overwriting
 * it — the user would see the image they had already replaced.
 */
export default function useImageOptimizer(preset = 'document') {
  const [status, setStatus] = useState('idle'); // idle | working | done | error
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const urlRef = useRef(null);
  const runRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const releaseUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    runRef.current += 1; // invalidate anything still in flight
    releaseUrl();
    setStatus('idle');
    setProgress(0);
    setResult(null);
    setError(null);
  }, [releaseUrl]);

  const optimize = useCallback(async (file) => {
    const runId = ++runRef.current;

    setStatus('working');
    setProgress(0);
    setError(null);

    try {
      const out = await optimizeImage(file, preset, {
        onProgress: (p) => {
          if (mountedRef.current && runRef.current === runId) setProgress(p);
        },
      });

      // A later pick already won, or the component went away. Drop this result on the floor.
      if (!mountedRef.current || runRef.current !== runId) return null;

      releaseUrl();
      urlRef.current = URL.createObjectURL(out.file);

      const payload = { ...out, previewUrl: urlRef.current };
      setResult(payload);
      setStatus('done');
      setProgress(1);
      return payload;
    } catch (err) {
      if (!mountedRef.current || runRef.current !== runId) return null;
      setError(optimizeErrorMessage(err));
      setStatus('error');
      return null;
    }
  }, [preset, releaseUrl]);

  return { optimize, reset, status, progress, result, error };
}
