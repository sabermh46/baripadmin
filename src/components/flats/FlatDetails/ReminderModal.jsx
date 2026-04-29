import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

const ReminderModal = ({
  open,
  reminderResult,
  onClose,
  onSend,
  isSending,
  renterName,
}) => {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl p-6 max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text">
            {reminderResult
              ? t('reminder_result') || 'Reminder Result'
              : t('send_reminder')}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-subdued/10 rounded-lg transition-colors"
            aria-label={t('close') || 'Close'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {reminderResult ? (
          /* Result view */
          <>
            <p className="text-green-600 font-medium mb-2">
              {t('reminder_sent_success') || 'Rent reminder sent successfully'}
            </p>
            <p className="text-subdued text-sm mb-4">
              {reminderResult.remindersSent}{' '}
              {t('reminder_sent_count') || 'reminder(s) sent'}
            </p>

            {reminderResult.results?.length > 0 && (
              <ul className="space-y-2 mb-4">
                {reminderResult.results.map((r, i) => (
                  <li
                    key={r.paymentId ?? i}
                    className="p-3 bg-subdued/5 rounded-lg text-sm border border-subdued/10"
                  >
                    <span className="font-medium">{r.renterName}</span>
                    <span className="text-subdued mx-2">•</span>
                    {r.sent ? (
                      <span className="text-green-600">
                        {t('sent_to') || 'Sent to'}: {r.sentTo || 'email, sms'}
                      </span>
                    ) : (
                      <span className="text-orange-600">
                        {t('not_sent') || 'Not sent'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t('close') || 'Close'}
              </button>
            </div>
          </>
        ) : (
          /* Confirmation prompt */
          <>
            <p className="text-subdued mb-6">
              {t('send_reminder_confirm') ||
                `Send reminder to`}{' '}
              <span className="font-semibold text-text">{renterName}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-subdued hover:text-text transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={onSend}
                disabled={isSending}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isSending
                  ? t('sending') || 'Sending...'
                  : t('confirm_send') || 'Confirm & Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReminderModal;
