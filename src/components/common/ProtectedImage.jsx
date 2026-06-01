import { useState, useEffect } from 'react';
import { axiosInstance } from '../../store/api/baseApi';

// Module-level cache: src URL → Promise<blobUrl | null>
// Deduplicates fetches when the same protected URL is rendered by multiple
// component instances simultaneously (e.g. desktop + mobile SideNav).
const _blobCache = new Map();

const ProtectedImage = ({ src, alt = '', className = '', fallback = null }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'error'

  useEffect(() => {
    if (!src) {
      setStatus('error');
      return;
    }

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

  if (status === 'loading') {
    return <div className={`bg-gray-100 animate-pulse rounded ${className}`} />;
  }

  if (status === 'error' || !blobUrl) {
    return fallback ?? (
      <div className={`bg-gray-100 flex items-center justify-center rounded ${className}`}>
        <span className="text-xs text-gray-400">Image unavailable</span>
      </div>
    );
  }

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
