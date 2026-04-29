import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, MailCheck } from 'lucide-react';
import PrintEmailInfo from '../../common/PrintEmailInfo';
import TkSymbol from '../../common/TkSymbol';

const PaymentEmailLogModal = ({
  open,
  selectedPayment,
  paymentReceipts,
  onClose,
  onResend,
}) => {
  const { t } = useTranslation();

  const paymentLogs = useMemo(() => {
    if (!selectedPayment || !Array.isArray(paymentReceipts)) return [];
    return paymentReceipts.filter((l) => l.row_id === selectedPayment.id);
  }, [paymentReceipts, selectedPayment]);

  if (!open || !selectedPayment) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subdued/20 shrink-0">
          <h3 className="text-lg font-bold text-text flex items-center gap-2">
            <MailCheck size={20} />
            {t('payment_email_log') || 'Payment Email Log'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-subdued/10 rounded-lg transition-colors"
            aria-label={t('close') || 'Close'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Payment summary + resend action */}
        <div className="p-4 border-b border-subdued/20 flex items-center justify-between gap-4 shrink-0">
          <p className="text-sm text-subdued">
            {t('for_month') || 'For'}{' '}
            <span className="font-medium text-text">{selectedPayment.for_month || '-'}</span>
            {' • '}
            <TkSymbol />{selectedPayment.amount?.toLocaleString()}
          </p>
          <button
            onClick={() => onResend(selectedPayment)}
            className="shrink-0 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm transition-colors"
          >
            {t('resend_receipt') || 'Resend Payment Receipt'}
          </button>
        </div>

        {/* Log list */}
        <div className="overflow-y-auto p-4 flex-1">
          {paymentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MailCheck size={40} className="text-subdued/40 mb-3" />
              <p className="text-subdued">
                {t('no_email_log_for_payment') || 'No email logs for this payment.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {paymentLogs.map((log) => (
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

export default PaymentEmailLogModal;
