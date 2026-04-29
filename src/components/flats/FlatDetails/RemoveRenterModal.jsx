import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, UserMinus } from 'lucide-react';
import TkSymbol from '../../common/TkSymbol';

const RemoveRenterModal = ({
  open,
  onClose,
  totalRemainingAdvance,
  refundAmount,
  setRefundAmount,
  refundError,
  setRefundError,
  onConfirm,
  isRemoving,
}) => {
  const { t } = useTranslation();

  if (!open) return null;

  const handleRefundChange = (e) => {
    const value = e.target.value;
    setRefundError('');

    if (value === '' || value === '.') {
      setRefundAmount(value);
      return;
    }

    const numeric = parseFloat(value);
    if (isNaN(numeric)) {
      setRefundError(t('invalid_amount') || 'Invalid amount');
      setRefundAmount(value);
      return;
    }

    if (numeric > totalRemainingAdvance) {
      setRefundError(
        `${t('refund_exceeds_advance') || 'Refund cannot exceed'} ৳ ${totalRemainingAdvance.toLocaleString()}`
      );
    }

    setRefundAmount(value);
  };

  const handleConfirm = () => {
    const parsed = parseFloat(refundAmount || '0');
    if (isNaN(parsed)) {
      setRefundError(t('invalid_amount') || 'Invalid amount');
      return;
    }
    if (parsed > totalRemainingAdvance) {
      setRefundError(
        `${t('refund_exceeds_advance') || 'Refund cannot exceed'} ৳ ${totalRemainingAdvance.toLocaleString()}`
      );
      return;
    }
    onConfirm(parsed);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-subdued/20">
          <h3 className="text-lg font-bold text-text flex items-center gap-2">
            <UserMinus size={20} className="text-red-500" />
            {t('remove_renter') || 'Remove Renter'}
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
        <div className="p-5 space-y-4">
          {/* Warning */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-medium">
              {t('remove_renter_warning') ||
                'Are you sure you want to remove this renter? This action will vacate the flat and cannot be undone.'}
            </p>
          </div>

          {/* Advance refund section */}
          {totalRemainingAdvance > 0 && (
            <div className="space-y-2">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {t('advance_refund_notice') ||
                    'This renter has a remaining advance balance.'}{' '}
                  <span className="font-bold">
                    <TkSymbol />{totalRemainingAdvance.toLocaleString()}
                  </span>
                  {'. '}
                  {t('enter_refund_amount') ||
                    'Enter the amount to refund (leave 0 to forfeit).'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-subdued mb-1">
                  {t('refund_amount') || 'Refund Amount'} (
                  {t('max') || 'max'}: <TkSymbol />
                  {totalRemainingAdvance.toLocaleString()})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subdued font-google-sans-code">
                    ৳
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={totalRemainingAdvance}
                    step="0.01"
                    value={refundAmount}
                    onChange={handleRefundChange}
                    className={`w-full pl-8 pr-4 py-2 border rounded-lg bg-white text-text focus:outline-none focus:ring-2 ${
                      refundError
                        ? 'border-red-400 focus:ring-red-300'
                        : 'border-subdued/30 focus:ring-primary/30'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {refundError && (
                  <p className="text-xs text-red-600 mt-1">{refundError}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            disabled={isRemoving}
            className="px-4 py-2 text-subdued hover:text-text transition-colors disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isRemoving || !!refundError}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <UserMinus size={16} />
            {isRemoving
              ? t('removing') || 'Removing...'
              : t('remove_renter') || 'Remove Renter'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemoveRenterModal;
