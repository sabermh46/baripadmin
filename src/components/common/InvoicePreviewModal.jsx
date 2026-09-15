import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ChannelPicker from './ChannelPicker';
import PdfPreview from './PdfPreview';
import { X, Send, SkipForward, Loader2, FileText } from 'lucide-react';

/**
 * Shows the generated receipt and lets the admin pick channels and add a note before
 * confirming the send.
 *
 * The preview is delegated to PdfPreview, which renders the PDF itself on browsers with no
 * built-in viewer - Chrome on Android used to show a download chip here instead of the
 * receipt, so the admin was approving a send having seen nothing.
 *
 * Props:
 *   open        {boolean}
 *   pdfBase64   {string}   raw base64 (no data: prefix)
 *   renterName  {string}
 *   onConfirm   {(note: string, channels: string[]) => void}
 *   onSkip      {() => void}
 *   isSending   {boolean}
 */
const InvoicePreviewModal = ({
  open,
  pdfBase64,
  renterName,
  renterPhone,
  houseOwnerId,
  onConfirm,
  onSkip,
  isSending,
}) => {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [channels, setChannels] = useState(['email']);

  if (!open || !pdfBase64) return null;

  const handleConfirm = () => onConfirm(note.trim(), channels);

  const handleSkip = () => {
    setNote('');
    onSkip();
  };

  return (
    // Full-bleed sheet on a phone, centred dialog from sm up. The old fixed 90vh card with
    // p-4 around it wasted a quarter of a small screen on margin and rounded corners.
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 sm:p-4">
      <div className="flex h-full w-full flex-col bg-white sm:h-[90vh] sm:max-w-3xl sm:rounded-xl">

        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-800 sm:text-lg">{t('receipt_preview')}</h3>
            {renterName && (
              <p className="mt-0.5 truncate text-xs text-gray-500 sm:text-sm">
                {t('receipt_for', { name: renterName })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSending}
            aria-label={t('skip')}
            className="-mr-1 shrink-0 rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Preview.
            On a phone it takes a fixed slice of the screen and the controls below it scroll;
            from sm up it takes whatever space the controls leave. Letting it flex on mobile
            squeezed it to a sliver once the channel picker and note field were laid out. */}
        <div className="h-[38vh] shrink-0 border-b border-gray-200 sm:h-auto sm:min-h-0 sm:flex-1">
          <PdfPreview
            base64={pdfBase64}
            fileName="rent-receipt.pdf"
            title={t('receipt_preview')}
            className="h-full"
          />
        </div>

        {/* Controls: the only scrolling region on a phone. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:flex-none sm:overflow-visible sm:px-5 sm:py-4">
          <ChannelPicker
            value={channels}
            onChange={setChannels}
            houseOwnerId={houseOwnerId}
            smsAvailable={!!renterPhone}
            smsUnavailableReason={renterName
              ? t('channel_sms_no_phone', { name: renterName })
              : t('no_phone_on_file')}
            note={t('channel_pdf_email_only')}
          />

          {/* This label used to be opened BEFORE the channel picker and closed after it, so
              the picker rendered inside the label and the caption "Note / Notice" ended up
              floating beside the channel cards instead of above the textarea. */}
          <label htmlFor="receipt-note" className="mt-4 mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <FileText size={13} />
            {t('receipt_note_label')}
          </label>
          <textarea
            id="receipt-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isSending}
            rows={2}
            placeholder={t('receipt_note_placeholder')}
            // text-base below sm: anything under 16px makes iOS Safari zoom the page in on
            // focus, and it does not zoom back out afterwards.
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-base placeholder:text-gray-400 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:opacity-50 sm:text-sm"
          />
          {note.trim() && (
            <p className="mt-1 text-xs text-orange-500">{t('receipt_note_included')}</p>
          )}
        </div>

        {/* Footer: stacked on a phone so the buttons get a full-width, thumb-sized row
            instead of being crushed next to the question by a wrapping Bengali sentence. */}
        <div className="shrink-0 space-y-2.5 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:flex sm:items-center sm:justify-between sm:space-y-0 sm:rounded-b-xl sm:px-5">
          <p className="text-xs text-gray-500 sm:text-sm">{t('receipt_send_question')}</p>
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSending}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 sm:flex-none sm:px-5 sm:py-2"
            >
              <SkipForward size={16} />
              {t('skip')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSending}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 sm:flex-none sm:px-5 sm:py-2"
              style={{ backgroundColor: '#f9873c' }}
            >
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {isSending ? t('sending') : t('send_receipt')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreviewModal;
