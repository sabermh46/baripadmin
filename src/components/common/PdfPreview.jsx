import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, ExternalLink, FileText, Loader2 } from 'lucide-react';

/**
 * Show a generated PDF inside the app.
 *
 * WHY THIS IS NOT JUST AN <iframe>
 * --------------------------------
 * It used to be. On desktop that works, because Chrome, Firefox, Edge and Safari all ship a
 * built-in PDF viewer. Chrome on Android does not have one at all: an <iframe> pointed at a
 * PDF is treated as a download, so the admin saw a grey box with an "Open" button and a
 * base64 blob of filename instead of the receipt. Nothing was wrong with the PDF - the
 * browser simply had nothing to render it with.
 *
 * So the browser is asked first. `navigator.pdfViewerEnabled` is the standard answer to
 * "can you display a PDF inline"; where it says no, pdf.js is loaded on demand and the real
 * pages are painted into canvases. That is the actual document being sent, not a
 * reconstruction of it in HTML, which is the whole point of a preview someone approves.
 *
 * pdf.js is ~350 kB, so it is imported lazily and only on the browsers that need it -
 * desktop keeps the zero-cost native viewer.
 *
 * @param {string} base64      raw base64, no `data:` prefix
 * @param {string} [fileName]  used for the download
 * @param {string} [title]
 */
const PdfPreview = ({ base64, fileName = 'document.pdf', title, className = '' }) => {
  const { t } = useTranslation();

  // Blob URL, not a data: URI. A data: URI of a megabyte-scale PDF is slow to parse, and
  // Chrome blocks top-level navigation to one outright, so "open in a new tab" could never
  // work from it.
  const blobUrl = useMemo(() => {
    if (!base64) return null;
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    } catch {
      return null;
    }
  }, [base64]);

  useEffect(() => () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  // `pdfViewerEnabled` is undefined on older browsers; fall back to the mimeTypes probe and
  // only then assume no viewer. Assuming "yes" on an unknown browser would reproduce exactly
  // the bug this component exists to fix.
  const canRenderInline = useMemo(() => {
    if (typeof navigator === 'undefined') return true;
    if (typeof navigator.pdfViewerEnabled === 'boolean') return navigator.pdfViewerEnabled;
    return Boolean(navigator.mimeTypes?.['application/pdf']);
  }, []);

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="min-h-0 flex-1 overflow-hidden bg-gray-100">
        {!blobUrl ? (
          <EmptyState label={t('pdf_preview_unavailable')} />
        ) : canRenderInline ? (
          <iframe src={blobUrl} title={title || t('receipt_preview')} className="h-full w-full border-0" />
        ) : (
          <CanvasPreview base64={base64} />
        )}
      </div>

      {/* Offered on every platform, not just the fallback: on a phone the full-screen system
          viewer is easier to read than a panel inside a modal, and it is the only way to
          zoom into the figures. */}
      {blobUrl && (
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-white px-3 py-2">
          <a
            href={blobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            <ExternalLink size={13} />
            {t('open_in_new_tab')}
          </a>
          <a
            href={blobUrl}
            download={fileName}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            <Download size={13} />
            {t('download')}
          </a>
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ label, spinning = false }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-gray-400">
    {spinning ? <Loader2 size={22} className="animate-spin" /> : <FileText size={22} />}
    <p className="text-sm">{label}</p>
  </div>
);

/**
 * Paint every page of the PDF into a canvas with pdf.js.
 *
 * Rendering is keyed to the container's width so the page fills the panel, and multiplied by
 * devicePixelRatio so it is not soft on the phone screens that need this path in the first
 * place.
 */
const CanvasPreview = ({ base64 }) => {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let doc = null;

    (async () => {
      const container = containerRef.current;
      if (!container || !base64) return;

      try {
        setStatus('loading');

        const [pdfjs, workerUrl] = await Promise.all([
          import('pdfjs-dist'),
          import('pdfjs-dist/build/pdf.worker.mjs?url').then((m) => m.default),
        ]);
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        doc = await pdfjs.getDocument({
          data: bytes,
          // Helvetica is not embedded in our receipts - every viewer is required to have it,
          // but pdf.js has to fetch a substitute. Without this the Bengali (which IS
          // embedded) renders and every Latin character silently disappears.
          standardFontDataUrl: `${import.meta.env.BASE_URL || '/'}pdfjs/standard_fonts/`,
        }).promise;
        if (cancelled) return;

        setPageCount(doc.numPages);
        container.replaceChildren();

        // Cap the backing store so a 3x-DPR phone does not allocate a canvas large enough to
        // be silently refused by the browser.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const targetWidth = container.clientWidth || 360;

        for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
          const page = await doc.getPage(pageNumber);
          if (cancelled) return;

          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (targetWidth / base.width) * dpr });

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.className = 'block w-full rounded-md bg-white shadow-sm';

          container.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          if (cancelled) return;
        }

        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        console.error('PDF preview failed to render', err);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      doc?.destroy?.();
    };
  }, [base64]);

  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-gray-100 p-3">
      {status === 'loading' && <EmptyState label={t('pdf_preview_loading')} spinning />}
      {status === 'error' && <EmptyState label={t('pdf_preview_failed')} />}
      <div ref={containerRef} className="flex flex-col gap-3" />
      {status === 'ready' && pageCount > 1 && (
        <p className="pt-2 pb-1 text-center text-[11px] text-gray-400">
          {t('pdf_page_count', { count: pageCount })}
        </p>
      )}
    </div>
  );
};

export default PdfPreview;
