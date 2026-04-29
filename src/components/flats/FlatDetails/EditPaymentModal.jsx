import React, { useState, useEffect } from 'react';
import { X, Save, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'mobile_banking', label: 'Mobile Banking' },
  { value: 'other', label: 'Other' },
];

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'partial', label: 'Partial' },
  { value: 'cancelled', label: 'Cancelled' },
];

const EditPaymentModal = ({ open, payment, onClose, onSave, isSaving }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    paid_amount: '',
    payment_method: 'cash',
    transaction_id: '',
    notes: '',
    paid_date: '',
    status: 'paid',
  });

  useEffect(() => {
    if (payment && open) {
      setForm({
        paid_amount: payment.paid_amount ?? payment.amount ?? '',
        payment_method: payment.payment_method || 'cash',
        transaction_id: payment.transaction_id || '',
        notes: payment.notes || '',
        paid_date: payment.paid_date
          ? format(new Date(payment.paid_date), 'yyyy-MM-dd')
          : '',
        status: payment.status || 'paid',
      });
    }
  }, [payment, open]);

  if (!open || !payment) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave({
      paid_amount: parseFloat(form.paid_amount) || 0,
      payment_method: form.payment_method,
      transaction_id: form.transaction_id || undefined,
      notes: form.notes || undefined,
      paid_date: form.paid_date || undefined,
      status: form.status,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-subdued/20">
          <h3 className="text-lg font-bold text-text flex items-center gap-2">
            <Pencil size={18} className="text-primary" />
            {t('edit_payment') || 'Edit Payment'}
          </h3>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 hover:bg-subdued/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-subdued mb-1">
                {t('amount') || 'Amount'} *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subdued font-google-sans-code">৳</span>
                <input
                  type="number"
                  name="paid_amount"
                  value={form.paid_amount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-3 py-2 border border-subdued/30 rounded-lg bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-subdued mb-1">
                {t('status') || 'Status'}
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-subdued/30 rounded-lg bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-subdued mb-1">
                {t('method') || 'Method'}
              </label>
              <select
                name="payment_method"
                value={form.payment_method}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-subdued/30 rounded-lg bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-subdued mb-1">
                {t('paid_date') || 'Paid Date'}
              </label>
              <input
                type="date"
                name="paid_date"
                value={form.paid_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-subdued/30 rounded-lg bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-subdued mb-1">
              {t('transaction_id') || 'Transaction ID'}
            </label>
            <input
              type="text"
              name="transaction_id"
              value={form.transaction_id}
              onChange={handleChange}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-subdued/30 rounded-lg bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-subdued mb-1">
              {t('notes') || 'Notes'}
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-subdued/30 rounded-lg bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-subdued hover:text-text transition-colors disabled:opacity-50"
          >
            {t('cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !form.paid_amount}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Save size={16} />
            {isSaving ? (t('saving') || 'Saving…') : (t('save_changes') || 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPaymentModal;
