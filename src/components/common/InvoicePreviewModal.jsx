import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ChannelPicker from './ChannelPicker';
import { X, Send, SkipForward, Loader2, FileText } from 'lucide-react';

/**
 * Shows a jsPDF-generated receipt in an iframe and lets the admin
 * optionally add a note before confirming to send.
 *
 * Props:
 *   open        {boolean}
 *   pdfBase64   {string}   raw base64 (no data: prefix) — live preview
 *   renterName  {string}
 *   onConfirm   {(note: string) => void}
 *   onSkip      {() => void}
 *   isSending   {boolean}
 */
const InvoicePreviewModal = ({ open, pdfBase64, renterName, renterPhone, houseOwnerId, onConfirm, onSkip, isSending }) => {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [channels, setChannels] = useState(['email']);

  if (!open || !pdfBase64) return null;

  const dataUri = `data:application/pdf;base64,${pdfBase64}`;

  const handleConfirm = () => onConfirm(note.trim(), channels);

  const handleSkip = () => {
    setNote('');
    onSkip();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl flex flex-col" style={{ height: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">{t('receipt_preview')}</h3>
            {renterName && (
              <p className="text-sm text-gray-500 mt-0.5">{t('receipt_for', { name: renterName })}</p>
            )}
          </div>
          <button
            onClick={handleSkip}
            disabled={isSending}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* PDF iframe */}
        <div className="flex-1 overflow-hidden bg-gray-100 min-h-0">
          <iframe
            src={dataUri}
            title={t('receipt_preview')}
            className="w-full h-full border-0"
          />
        </div>

        {/* Note input */}
        <div className="px-5 pt-4 pb-2 border-t border-gray-200 shrink-0">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          <div className="mb-4">
            <ChannelPicker
              value={channels}
              onChange={setChannels}
              houseOwnerId={houseOwnerId}
              smsAvailable={!!renterPhone}
              smsUnavailableReason={`${renterName || 'This renter'} has no phone number on file`}
              note="The PDF receipt goes by email only — the SMS carries a short confirmation."
            />
          </div>

            <FileText size={13} />
            {t('receipt_note_label')}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isSending}
            rows={2}
            placeholder={t('receipt_note_placeholder')}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 disabled:opacity-50 placeholder:text-gray-400"
          />
          {note.trim() && (
            <p className="text-xs text-orange-500 mt-1">
              {t('receipt_note_included')}
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 rounded-b-xl shrink-0">
          <p className="text-sm text-gray-500">
            {t('receipt_send_question')}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              disabled={isSending}
              className="flex items-center gap-2 px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              <SkipForward size={16} />
              {t('skip')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSending}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: '#f9873c' }}
            >
              {isSending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {isSending ? t('sending') : t('send_receipt')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreviewModal;