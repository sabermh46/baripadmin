import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ScrollText } from 'lucide-react';
import PrintEmailInfo from '../../common/PrintEmailInfo';

const ReminderLogModal = ({ open, onClose, paymentReceipts }) => {
  const { t } = useTranslation();

  const rentReminderLogs = useMemo(() => {
    if (!Array.isArray(paymentReceipts)) return [];
    return paymentReceipts.filter((log) => {
      try {
        const meta =
          log.metadata
            ? typeof log.metadata === 'string'
              ? JSON.parse(log.metadata)
              : log.metadata
            : {};
        return meta?.type === 'rent_reminder';
      } catch {
        return false;
      }
    });
  }, [paymentReceipts]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subdued/20 shrink-0">
          <h3 className="text-lg font-bold text-text flex items-center gap-2">
            <ScrollText size={20} />
            {t('reminder_log') || 'Reminder Log'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-subdued/10 rounded-lg transition-colors"
            aria-label={t('close') || 'Close'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 flex-1">
          {rentReminderLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ScrollText size={40} className="text-subdued/40 mb-3" />
              <p className="text-subdued">
                {t('no_reminder_log') || 'No rent reminder logs found.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {rentReminderLogs.map((log) => (
                <li
                  key={log.id}
                  className="p-4 bg-subdued/5 rounded-lg border border-subdued/10"
                >
                  <PrintEmailInfo
                    log={log}
                    htmlBody={log.htmlBody || log.html || log.body}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReminderLogModal;
