import { useState, useEffect } from 'react';
import { axiosInstance } from '../../store/api/baseApi';

// Module-level cache: src URL → Promise<blobUrl | null>
// Deduplicates fetches when the same protected URL is rendered by multiple
// component instances simultaneously (e.g. desktop + mobile SideNav).
const _blobCache = new Map();

/**
 * An avatar can be either of two very different things, and the component is handed both.
 *
 *  - `/uploads/avatars/x.jpg` — a file on our own API, which now requires a bearer token,
 *    and which must be resolved against the API origin rather than the app's.
 *  - `https://lh3.googleusercontent.com/...` — a Google profile picture from OAuth sign-in.
 *
 * Fetching the second through axios would attach our Authorization header to a cross-origin
 * request Google never allows, so it fails CORS and the user sees a broken avatar. An
 * absolute URL is therefore rendered directly, which is also simply cheaper.
 */
const isExternal = (src) => /^https?:\/\//i.test(src || '');

const ProtectedImage = ({ src, alt = '', className = '', fallback = null }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'error'
  // Which src the browser failed to load, rather than a bare boolean, so the flag can
  // never carry over to the next src without needing an effect to clear it.
  const [failedSrc, setFailedSrc] = useState(null);

  useEffect(() => {
    // Nothing to fetch for a missing src, and nothing we are allowed to fetch for an
    // external one — both are handled in render.
    if (!src || isExternal(src)) return undefined;

    let cancelled = false;
    setStatus('loading');
    setBlobUrl(null);

    if (!_blobCache.has(src)) {
      _blobCache.set(src,
        axiosInstance
          .get(src, { responseType: 'blob' })
          .then(({ data }) => URL.createObjectURL(data))
          .catch(() => null)
      );
    }

    _blobCache.get(src).then(url => {
      if (cancelled) return;
      if (url) { setBlobUrl(url); setStatus('ok'); }
      else setStatus('error');
    });

    return () => { cancelled = true; };
  }, [src]);

  const renderFallback = () => fallback ?? (
    <div className={`bg-gray-100 flex items-center justify-center rounded ${className}`}>
      <span className="text-xs text-gray-400">Image unavailable</span>
    </div>
  );

  if (!src) return renderFallback();

  if (isExternal(src)) {
    // A Google picture that 404s or is blocked should fall back like any other failure,
    // rather than leaving a broken-image icon in the layout.
    if (failedSrc === src) return renderFallback();

    return <img src={src} alt={alt} className={className} onError={() => setFailedSrc(src)} />;
  }

  if (status === 'loading') {
    return <div className={`bg-gray-100 animate-pulse rounded ${className}`} />;
  }

  if (status === 'error' || !blobUrl) return renderFallback();

  return <img src={blobUrl} alt={alt} className={className} />;
};

/**
 * Fetches a protected file and triggers a browser download.
 * Usage: await downloadProtectedFile(url, 'nid_front.png')
 */
export async function downloadProtectedFile(url, filename = 'download') {
  const { data } = await axiosInstance.get(url, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

export default ProtectedImage;
