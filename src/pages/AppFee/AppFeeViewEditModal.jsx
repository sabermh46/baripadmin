import React, { useState, useEffect } from 'react';
import Modal from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { useAuth } from '../../hooks';
import {
  useGetAppFeePaymentQuery,
  useUpdateAppFeePaymentMutation,
  useDeleteAppFeePaymentMutation,
} from '../../store/api/appFeeApi';
import { toast } from 'react-toastify';

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

const formatDateForInput = (d) => {
  if (!d) return '';
  try {
    const date = new Date(d);
    return date.toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const AppFeeViewEditModal = ({
  paymentId,
  isOpen,
  onClose,
  onSuccess,
  forceEditable = false,
  defaultStatus,
}) => {
  const { isWebOwner, isStaff } = useAuth();
  const canEdit = isWebOwner || isStaff || forceEditable;

  const { data: paymentResponse, isLoading } = useGetAppFeePaymentQuery(paymentId, {
    skip: !isOpen || !paymentId,
  });
  const payment = paymentResponse?.data;

  const [updatePayment, { isLoading: isUpdating }] = useUpdateAppFeePaymentMutation();
  const [deletePayment, { isLoading: isDeleting }] = useDeleteAppFeePaymentMutation();

  const [formData, setFormData] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Populate form from payment; depend on paymentId so we re-run when reopening (cache may return same payment ref)
  useEffect(() => {
    if (!isOpen || !paymentId || !payment || payment.id !== paymentId) return;
    // derive form state but defer setting it to avoid sync setState warning
    const next = {
      status: forceEditable && defaultStatus ? defaultStatus : (payment.status ?? ''),
      notes: payment.notes ?? '',
      verified_notes: '',
      paid_date: formatDateForInput(payment.paid_date),
      transaction_id: payment.transaction_id ?? '',
      payment_method: payment.payment_method ?? 'other',
      invoice_url: payment.metadata?.invoice_url ?? '',
      subscription_days: payment.subscription_days ?? '',
      offset_days: payment.offset_days ?? '',
      sendMail: true,
      sendSms: false,
    };
    Promise.resolve().then(() => {
      setFormData(next);
      setInitialData(JSON.stringify(next));
    });
  }, [isOpen, paymentId, payment, forceEditable, defaultStatus]);

  const currentSnapshot = formData ? JSON.stringify(formData) : '';
  const isDirty = initialData != null && currentSnapshot !== initialData;

  const handleClose = () => {
    setFormData(null);
    setInitialData(null);
    onClose();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!paymentId || !formData || !isDirty) return;
    try {
      const body = {
        status: formData.status || undefined,
        notes: formData.notes || undefined,
        verified_notes: formData.verified_notes || undefined,
        paid_date: formData.paid_date || undefined,
        transaction_id: formData.transaction_id || undefined,
        payment_method: formData.payment_method || undefined,
        invoice_url: formData.invoice_url || undefined,
        sendMail: formData.sendMail,
        sendSms: formData.sendSms,
      };
      if (formData.subscription_days !== '' && formData.subscription_days != null)
        body.subscription_days = Number(formData.subscription_days);
      if (formData.offset_days !== '' && formData.offset_days != null)
        body.offset_days = Number(formData.offset_days);
      await updatePayment({ id: paymentId, body }).unwrap();
      toast.success('Payment updated successfully.');
      setInitialData(JSON.stringify(formData));
      onSuccess?.();
    } catch (res) {
      const msg =
        res?.data?.error || res?.data?.message || res?.message || 'Failed to update payment';
      toast.error(msg);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!paymentId) return;
    try {
      await deletePayment(paymentId).unwrap();
      toast.success('Payment deleted successfully.');
      setShowDeleteConfirm(false);
      handleClose();
      onSuccess?.();
    } catch (res) {
      const msg =
        res?.data?.error || res?.data?.message || res?.message || 'Failed to delete payment';
      toast.error(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={payment ? `App Fee #${payment.id}` : 'App Fee'}
        size="lg"
        footer={
          <div className="flex justify-between w-full">
            <div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              {canEdit && (
                <button
                  type="submit"
                  form="app-fee-view-edit-form"
                  disabled={!isDirty || isUpdating}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Saving...' : 'Save changes'}
                </button>
              )}
            </div>
          </div>
        }
      >

        {
          console.log(payment, isLoading)
        }
        {isLoading || !payment ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : (
          <form
            id="app-fee-view-edit-form"
            onSubmit={handleSave}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">House owner</span>
                <p className="font-medium">{payment.house_owner_name ?? '–'}</p>
              </div>
              <div>
                <span className="text-gray-500">Amount</span>
                <p className="font-medium">
                  {payment.amount != null ? Number(payment.amount).toLocaleString() : '–'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Fee type</span>
                <p className="font-medium">{payment.fee_type ?? '–'}</p>
              </div>
              <div>
                <span className="text-gray-500">Due date</span>
                <p className="font-medium">
                  {payment.due_date
                    ? new Date(payment.due_date).toLocaleDateString()
                    : '–'}
                </p>
              </div>
            </div>

            {canEdit && formData && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, status: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="rejected">Rejected</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Paid date
                  </label>
                  <input
                    type="date"
                    value={formData.paid_date}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, paid_date: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Payment method
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, payment_method: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  >
                    {PAYMENT_METHODS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    value={formData.transaction_id}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, transaction_id: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, notes: e.target.value }))
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Verified notes
                  </label>
                  <textarea
                    value={formData.verified_notes}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, verified_notes: e.target.value }))
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Verification-specific notes"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Invoice URL
                  </label>
                  <input
                    type="url"
                    value={formData.invoice_url}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, invoice_url: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Subscription days
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.subscription_days ?? ''}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          subscription_days: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">
                      Offset days
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.offset_days ?? ''}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, offset_days: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.sendMail}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, sendMail: e.target.checked }))
                    }
                  />
                  <span className="text-sm text-gray-700">Send email</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.sendSms}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, sendSms: e.target.checked }))
                    }
                  />
                  <span className="text-sm text-gray-700">Send SMS (reserved)</span>
                </label>
              </>
            )}
          </form>
        )}
      </Modal>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete app fee payment"
        message="Are you sure you want to delete this app fee payment? This action cannot be undone."
        confirmText="Delete"
        isLoading={isDeleting}
        variant="danger"
      />
    </>
  );
};

export default AppFeeViewEditModal;
