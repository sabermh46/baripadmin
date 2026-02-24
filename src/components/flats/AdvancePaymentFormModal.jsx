import React, { useState, useEffect } from 'react';
import { X, Eye, Edit, Trash2, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import {
  useCreateAdvancePaymentMutation,
  useUpdateAdvancePaymentMutation,
  useDeleteAdvancePaymentMutation,
} from '../../store/api/flatApi';
import { toast } from 'react-toastify';
import TkSymbol from '../common/TkSymbol';
import ConfirmationModal from '../common/ConfirmationModal';
import { showMessageInLanguage } from '../../utils/showMessageInLanguage';
import { useTranslation } from 'react-i18next';

const MODES = { view: 'view', create: 'create', update: 'update' };

const AdvancePaymentFormModal = ({
  open,
  onClose,
  flatId,
  payment = null,
  mode: initialMode = MODES.view,
  onSuccess,
}) => {

  const {t} = useTranslation();
  const [mode, setMode] = useState(initialMode || MODES.view);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [form, setForm] = useState({
    amount: '',
    payment_method: 'cash',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    transaction_id: '',
    notes: '',
    paid_amount: '',
  });

  const [createAdvancePayment, { isLoading: isCreating }] = useCreateAdvancePaymentMutation();
  const [updateAdvancePayment, { isLoading: isUpdating }] = useUpdateAdvancePaymentMutation();
  const [deleteAdvancePayment, { isLoading: isDeleting }] = useDeleteAdvancePaymentMutation();

  useEffect(() => {
    if (open) {
      setMode(payment ? initialMode : MODES.create);
      if (payment) {
        setForm({
          amount: payment.amount ?? '',
          payment_method: payment.payment_method || 'cash',
          payment_date: payment.payment_date ? format(new Date(payment.payment_date), 'yyyy-MM-dd') : '',
          transaction_id: payment.transaction_id || '',
          notes: payment.notes || '',
          paid_amount: payment.paid_amount ?? '',
        });
      } else {
        setForm({
          amount: '',
          payment_method: 'cash',
          payment_date: format(new Date(), 'yyyy-MM-dd'),
          transaction_id: '',
          notes: '',
          paid_amount: '',
        });
      }
    }
  }, [open, payment, initialMode]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Amount is required');
      return;
    }
    try {
      await createAdvancePayment({
        flatId,
        amount: parseFloat(form.amount),
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        transaction_id: form.transaction_id || undefined,
        notes: form.notes || undefined,
      }).unwrap();
      toast.success('Advance payment created');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.data?.error || 'Failed to create advance payment');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const paidAmount = parseFloat(form.paid_amount);
    if (isNaN(paidAmount) || paidAmount < 0) {
      toast.error('Paid amount must be a valid number');
      return;
    }
    try {
      await updateAdvancePayment({
        flatId,
        advanceId: payment.id,
        paid_amount: paidAmount,
      }).unwrap();
      toast.success('Advance payment updated');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(showMessageInLanguage(err?.data?.error) || 'Failed to update advance payment');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAdvancePayment({ flatId, advanceId: payment.id }).unwrap();
      toast.success('Advance payment deleted');
      setShowDeleteConfirm(false);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(showMessageInLanguage(err?.data?.error) || 'Failed to delete advance payment');
    }
  };

  if (!open || !flatId) return null;

  const isView = mode === MODES.view;
  const isCreate = mode === MODES.create;
  const isUpdate = mode === MODES.update;

  const InfoRow = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b border-subdued/10 last:border-0">
      <span className="text-subdued text-sm">{label}</span>
      <span className="font-medium text-sm">{value}</span>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-surface rounded-lg w-full max-w-md shadow-xl">
          <div className="flex justify-between items-center p-4 border-b border-subdued/20">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <DollarSign size={20} className="text-green-600" />
              {isCreate && 'Add Advance Payment'}
              {isView && 'Advance Payment Details'}
              {isUpdate && 'Edit Advance Payment'}
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-subdued/10 rounded">
              <X size={20} />
            </button>
          </div>

          <div className="p-4">
            {isView && payment && (
              <div className="space-y-2">
                <InfoRow label={t('date')} value={payment.payment_date ? format(new Date(payment.payment_date), 'dd MMM yyyy') : '-'} />
                <InfoRow label={t('amount')} value={<><TkSymbol />{payment.amount?.toLocaleString()}</>} />
                <InfoRow label={t('paid_amount')} value={<span className="text-green-600"><TkSymbol />{payment.paid_amount?.toLocaleString()}</span>} />
                <InfoRow label={t('remaining')} value={<span className={parseFloat(payment.remaining_amount) > 0 ? 'text-green-600 font-bold' : ''}><TkSymbol />{payment.remaining_amount?.toLocaleString()}</span>} />
                <InfoRow label={t('method')} value={payment.payment_method?.replace('_', ' ') || '-'} />
                <InfoRow label={t('status')} value={payment.status || '-'} />
                {payment.transaction_id && <InfoRow label={t('transaction_id')} value={payment.transaction_id} />}
                {payment.notes && <InfoRow label={t('notes')} value={payment.notes} />}
              </div>
            )}

            {isCreate && (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('amount')} *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(e) => handleChange('amount', e.target.value)}
                    className="w-full px-3 py-2 border border-subdued/30 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('payment_date')}</label>
                  <input
                    type="date"
                    value={form.payment_date}
                    onChange={(e) => handleChange('payment_date', e.target.value)}
                    className="w-full px-3 py-2 border border-subdued/30 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('payment_method')}</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => handleChange('payment_method', e.target.value)}
                    className="w-full px-3 py-2 border border-subdued/30 rounded-lg"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="mobile_payment">Mobile Payment</option>
                    <option value="cheque">Cheque</option>
                    <option value="others">Others</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('transaction_id')}</label>
                  <input
                    type="text"
                    value={form.transaction_id}
                    onChange={(e) => handleChange('transaction_id', e.target.value)}
                    className="w-full px-3 py-2 border border-subdued/30 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('notes')}</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-subdued/30 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={onClose} className="px-4 py-2 text-subdued">
                    Cancel
                  </button>
                  <button type="submit" disabled={isCreating} className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50">
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            )}

            {isUpdate && payment && (
              <form onSubmit={handleUpdate} className="space-y-4">
                <p className="text-sm text-subdued mb-2">{t('original_amount')}: <TkSymbol />{payment.amount?.toLocaleString()}</p>
                <div>
                  <label className="block text-sm font-medium mb-1">Paid Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.paid_amount}
                    onChange={(e) => handleChange('paid_amount', e.target.value)}
                    className="w-full px-3 py-2 border border-subdued/30 rounded-lg"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setMode(MODES.view)} className="px-4 py-2 text-subdued">
                    {t('cancel')}
                  </button>
                  <button type="submit" disabled={isUpdating} className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50">
                    {isUpdating ? t('updating') : t('update')}
                  </button>
                </div>
              </form>
            )}

            {isView && payment && (
              <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-subdued/20">
                <button
                  onClick={() => setMode(MODES.update)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Edit size={16} />
                  {t('edit')}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  <Trash2 size={16} />
                  {t('delete')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('delete_advance_payment')}
        message={t('are_you_sure_you_want_to_delete_this_advance_payment_this_action_cannot_be_undone')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
};

export default AdvancePaymentFormModal;
