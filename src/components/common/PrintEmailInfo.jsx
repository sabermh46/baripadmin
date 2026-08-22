import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import { Printer } from 'lucide-react';
import TkSymbol from './TkSymbol';
import { useTranslation } from 'react-i18next';
import { downloadProtectedFile } from './ProtectedImage';

/**
 * PrintEmailInfo - Displays email log info and supports printing (including HTML body).
 * @param {Object} log - Email log entry { id, toEmail, subject, status, sentAt, metadata, htmlBody? }
 * @param {Object} meta - Parsed metadata (optional, will parse from log.metadata if not provided)
 * @param {string} log.htmlBody - Optional HTML content to display/print
 */
const PrintEmailInfo = ({ log, meta: metaProp, htmlBody }) => {
  const { t } = useTranslation();
  const printRef = useRef(null);
  const [openingPdf, setOpeningPdf] = useState(false);

  let meta = metaProp;
  if (!meta && log?.metadata) {
    try {
      meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
    } catch {
      meta = {};
    }
  }
  meta = meta || {};

  // eslint-disable-next-line no-unused-vars
  const handlePrint = () => {
    if (!printRef.current) return;
    // Clone content but replace iframe with raw HTML for print
    const clone = printRef.current.cloneNode(true);
    const iframe = clone.querySelector('iframe[title="Email HTML body"]');
    if (iframe && htmlBody) {
      const div = document.createElement('div');
      div.className = 'html-body-content';
      div.innerHTML = htmlBody;
      iframe.parentNode?.replaceChild(div, iframe);
    }
    const printContent = clone.innerHTML;
    const printWindow = window.open('', '_blank');
    const title = (log?.subject || 'Email Log').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; font-size: 14px; }
            .meta-section { margin: 16px 0; padding: 12px; background: #f5f5f5; border-radius: 8px; }
            .meta-section p { margin: 4px 0; }
            .meta-label { color: #666; }
            .html-body { margin-top: 16px; border: 1px solid #ddd; border-radius: 8px; padding: 16px; }
            .html-body-content { max-width: 100%; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const isRentReminder = meta?.type === 'rent_reminder';
  const isPaymentReceipt = meta?.type === 'payment_receipt';

  return (
    <div ref={printRef} className="space-y-3">
      <div className="flex justify-between items-start gap-2">
        <div>
          <p className="font-medium text-sm">{log?.subject}</p>
          <p className="text-xs text-subdued mt-1">
            {log?.toEmail} • {log?.sentAt ? format(new Date(log.sentAt), 'dd MMM yyyy HH:mm') : '-'}
          </p>
          
          <div className="flex gap-4 items-center mt-2 ">
            <span
              className={`block px-2 py-0.5 rounded text-xs ${
                log?.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {log?.status}
            </span>
            {/* Two things were wrong with linking straight to the file. The path is served
                under /uploads/, not off the API root, so the URL pointed nowhere; and that
                route now requires a bearer token, so a plain anchor gets a 401. Fetch it
                with credentials and hand the browser the bytes. */}
            {meta?.invoicePdfPath && (
              <button
                type="button"
                disabled={openingPdf}
                onClick={async () => {
                  setOpeningPdf(true);
                  try {
                    await downloadProtectedFile(
                      `/uploads/${meta.invoicePdfPath}`,
                      `receipt-${meta.forMonth || log?.id || 'rent'}.pdf`
                    );
                  } finally {
                    setOpeningPdf(false);
                  }
                }}
                className="text-blue-600 text-xs hover:underline disabled:opacity-50"
              >
                {openingPdf ? t('opening') : t('view_pdf_receipt')}
              </button>
            )}
          </div>
        </div>
      </div>

      {(isRentReminder || isPaymentReceipt) && meta && (
        <div className="meta-section p-3 bg-subdued/5 rounded-lg border border-subdued/10 text-sm space-y-1">
          {meta.renterName && (
            <p><span className="meta-label text-subdued">{t('email_log_renter')}</span> {meta.renterName}</p>
          )}
          {(meta.flatNumber || meta.houseName) && (
            <p>
              <span className="meta-label text-subdued">{t('email_log_flat')}</span>{' '}
              {[meta.flatNumber, meta.houseName].filter(Boolean).join(' • ')}
            </p>
          )}
          {meta.amount != null && (
            <p>
              <span className="meta-label text-subdued">{t('email_log_amount')}</span>{' '}
              <TkSymbol />{Number(meta.amount).toLocaleString()}
            </p>
          )}
          {meta.forMonth && (
            <p><span className="meta-label text-subdued">{t('email_log_for_month')}</span> {meta.forMonth}</p>
          )}
          {isRentReminder && meta.dueDate && (
            <p><span className="meta-label text-subdued">{t('email_log_due')}</span> {meta.dueDate}</p>
          )}
        </div>
      )}

      {htmlBody && (
        <div className="html-body mt-3">
          <p className="text-xs text-subdued mb-2 font-medium">{t('email_log_body')}</p>
          <iframe
            srcDoc={htmlBody}
            title="Email HTML body"
            className="w-full min-h-[200px] border border-subdued/20 rounded-lg"
            sandbox="allow-same-origin"
          />
        </div>
      )}
    </div>
  );
};

export default PrintEmailInfo;
