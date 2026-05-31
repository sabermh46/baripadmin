import { useState, useEffect } from 'react';
import { axiosInstance } from '../../store/api/baseApi';

/**
 * Fetches a protected upload URL via axiosInstance (adds Authorization header),
 * converts the response to a blob URL, and renders an <img>.
 * Cleans up the blob URL on unmount or src change.
 */
const ProtectedImage = ({ src, alt = '', className = '', fallback = null }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'error'

  useEffect(() => {
    if (!src) {
      setStatus('error');
      return;
    }

    let cancelled = false;
    let created = null;

    setStatus('loading');
    setBlobUrl(null);

    axiosInstance
      .get(src, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return;
        created = URL.createObjectURL(data);
        setBlobUrl(created);
        setStatus('ok');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
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
