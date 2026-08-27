import React, { useState, useEffect } from 'react';
import { Landmark, Plus, Pencil } from 'lucide-react';
import HouseSelector from '../../components/common/HouseSelector';
import {
  useGetLoansByHouseQuery,
  useCreateLoanMutation,
  useRecordLoanPaymentMutation,
  useUpdateLoanMutation,
  useDeleteLoanMutation,
  useUpdateLoanPaymentMutation,
} from '../../store/api/loanApi';
import LoanCard from './LoanCard';
import Modal, { useModal } from '../../components/common/Modal';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { apiErrorMessage } from '../../utils/apiError';
import { useAuth } from '../../hooks';
import { useGetHousesQuery } from '../../store/api/houseApi';

const formatDate = (d) => {
  if (!d) return '–';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
};

const formatAmount = (val) => {
  if (val == null) return '–';
  return Number(val).toLocaleString();
};

// Create Loan Modal
const CreateLoanModal = ({ isOpen, onClose, selectedHouseId, onSuccess }) => {
  const { t } = useTranslation();
  const [createLoan, { isLoading }] = useCreateLoanMutation();
  const [form, setForm] = useState({
    house_id: selectedHouseId || '',
    provider_name: '',
    amount: '',
    start_date: new Date().toISOString().slice(0, 10),
    interest_rate: '',
    end_date: '',
    monthly_payment: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && selectedHouseId) setForm((p) => ({ ...p, house_id: selectedHouseId }));
  }, [isOpen, selectedHouseId]);

  const handleChange = (key) => (e) => {
    const v = e.target.value;
    setForm((p) => ({ ...p, [key]: v }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.house_id) nextErrors.house_id = t('house_required') || 'House is required';
    if (!form.provider_name?.trim()) nextErrors.provider_name = t('provider_required') || 'Provider name is required';
    if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = t('amount_required') || 'Amount is required';
    if (!form.start_date) nextErrors.start_date = t('date_required') || 'Start date is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await createLoan({
        house_id: Number(form.house_id),
        provider_name: form.provider_name.trim(),
        amount: Number(form.amount),
        start_date: form.start_date,
        ...(form.interest_rate ? { interest_rate: Number(form.interest_rate) } : {}),
        ...(form.end_date ? { end_date: form.end_date } : {}),
        ...(form.monthly_payment ? { monthly_payment: Number(form.monthly_payment) } : {}),
      }).unwrap();
      toast.success(t('loan_created') || 'Loan created successfully');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to create loan'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('create_loan') || 'Create Loan'}
      subtitle={t('mark_house_has_loan') || 'Mark that a house has a loan'}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? (t('creating') || 'Creating...') : (t('create_loan') || 'Create Loan')}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <HouseSelector
            value={form.house_id}
            onChange={(id) => setForm((p) => ({ ...p, house_id: id }))}
            label={t('house') || 'House'}
          />
          {errors.house_id && <p className="text-red-500 text-sm mt-1">{errors.house_id}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('provider_name') || 'Lender / Provider'}</label>
          <input
            type="text"
            value={form.provider_name}
            onChange={handleChange('provider_name')}
            placeholder="e.g. Bank XYZ"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
          />
          {errors.provider_name && <p className="text-red-500 text-sm mt-1">{errors.provider_name}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('amount')}</label>
            <input
              type="number"
              min="1"
              value={form.amount}
              onChange={handleChange('amount')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
            />
            {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('start_date') || 'Start Date'}</label>
            <input
              type="date"
              value={form.start_date}
              onChange={handleChange('start_date')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
            />
            {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('interest_rate') || 'Interest Rate (%)'}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.interest_rate}
              onChange={handleChange('interest_rate')}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('monthly_payment') || 'Monthly Payment'}</label>
            <input
              type="number"
              min="0"
              value={form.monthly_payment}
              onChange={handleChange('monthly_payment')}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

// Edit Loan Modal
const EditLoanModal = ({ isOpen, onClose, loan, onSuccess }) => {
  const { t } = useTranslation();
  const [updateLoan, { isLoading }] = useUpdateLoanMutation();
  const [form, setForm] = useState({
    provider_name: '',
    amount: '',
    start_date: '',
    interest_rate: '',
    end_date: '',
    monthly_payment: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (loan && isOpen) {
      setForm({
        provider_name: loan.provider_name || '',
        amount: loan.amount != null ? String(loan.amount) : '',
        start_date: loan.start_date ? loan.start_date.slice(0, 10) : '',
        interest_rate: loan.interest_rate != null ? String(loan.interest_rate) : '',
        end_date: loan.end_date ? loan.end_date.slice(0, 10) : '',
        monthly_payment: loan.monthly_payment != null ? String(loan.monthly_payment) : '',
      });
    }
  }, [loan, isOpen]);

  const handleChange = (key) => (e) => {
    const v = e.target.value;
    setForm((p) => ({ ...p, [key]: v }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.provider_name?.trim()) nextErrors.provider_name = t('provider_required') || 'Provider name is required';
    if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = t('amount_required') || 'Amount is required';
    if (!form.start_date) nextErrors.start_date = t('date_required') || 'Start date is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await updateLoan({
        id: loan.id,
        provider_name: form.provider_name.trim(),
        amount: Number(form.amount),
        start_date: form.start_date,
        ...(form.interest_rate ? { interest_rate: Number(form.interest_rate) } : {}),
        ...(form.end_date ? { end_date: form.end_date } : {}),
        ...(form.monthly_payment ? { monthly_payment: Number(form.monthly_payment) } : {}),
      }).unwrap();
      toast.success(t('loan_updated') || 'Loan updated successfully');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update loan'));
    }
  };

  if (!loan) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('edit_loan') || 'Edit Loan'}
      subtitle={`${loan.provider_name} (${formatAmount(loan.amount)} ৳)`}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? (t('saving') || 'Saving...') : (t('save') || 'Save')}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('provider_name') || 'Lender / Provider'}</label>
          <input
            type="text"
            value={form.provider_name}
            onChange={handleChange('provider_name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
          />
          {errors.provider_name && <p className="text-red-500 text-sm mt-1">{errors.provider_name}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('amount')}</label>
            <input
              type="number"
              min="1"
              value={form.amount}
              onChange={handleChange('amount')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
            />
            {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('start_date') || 'Start Date'}</label>
            <input
              type="date"
              value={form.start_date}
              onChange={handleChange('start_date')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
            />
            {errors.start_date && <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('interest_rate') || 'Interest Rate (%)'}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.interest_rate}
              onChange={handleChange('interest_rate')}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('monthly_payment') || 'Monthly Payment'}</label>
            <input
              type="number"
              min="0"
              value={form.monthly_payment}
              onChange={handleChange('monthly_payment')}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

// Record Payment Modal
const RecordPaymentModal = ({ isOpen, onClose, loan, onSuccess }) => {
  const { t } = useTranslation();
  const [recordLoanPayment, { isLoading }] = useRecordLoanPaymentMutation();
  const [form, setForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    transaction_id: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (key) => (e) => {
    const v = e.target.value;
    setForm((p) => ({ ...p, [key]: v }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = t('amount_required') || 'Amount is required';
    if (!form.payment_date) nextErrors.payment_date = t('date_required') || 'Date is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await recordLoanPayment({
        loanId: loan.id,
        paymentData: {
          amount: Number(form.amount),
          payment_date: form.payment_date,
          ...(form.transaction_id ? { transaction_id: form.transaction_id } : {}),
          ...(form.notes ? { notes: form.notes } : {}),
        },
      }).unwrap();
      toast.success(t('payment_recorded') || 'Payment recorded successfully');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to record payment'));
    }
  };

  if (!loan) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('record_payment') || 'Record Payment'}
      subtitle={`${t('loan') || 'Loan'}: ${loan.provider_name} (${formatAmount(loan.amount)} ৳)`}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? (t('recording') || 'Recording...') : (t('record_payment') || 'Record Payment')}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('amount')}</label>
          <input
            type="number"
            min="0.01"
            value={form.amount}
            onChange={handleChange('amount')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
          />
          {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('payment_date') || 'Payment Date'}</label>
          <input
            type="date"
            value={form.payment_date}
            onChange={handleChange('payment_date')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
          />
          {errors.payment_date && <p className="text-red-500 text-sm mt-1">{errors.payment_date}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('transaction_id') || 'Transaction ID'}</label>
          <input
            type="text"
            value={form.transaction_id}
            onChange={handleChange('transaction_id')}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes') || 'Notes'}</label>
          <input
            type="text"
            value={form.notes}
            onChange={handleChange('notes')}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </form>
    </Modal>
  );
};

// Edit Loan Payment Modal
const EditLoanPaymentModal = ({ isOpen, onClose, payment, loan, onSuccess }) => {
  const { t } = useTranslation();
  const [updateLoanPayment, { isLoading }] = useUpdateLoanPaymentMutation();
  const [form, setForm] = useState({
    amount: '',
    payment_date: '',
    transaction_id: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (payment && isOpen) {
      setForm({
        amount: payment.amount != null ? String(payment.amount) : '',
        payment_date: payment.payment_date ? payment.payment_date.slice(0, 10) : '',
        transaction_id: payment.transaction_id || '',
        notes: payment.notes || '',
      });
    }
  }, [payment, isOpen]);

  const handleChange = (key) => (e) => {
    const v = e.target.value;
    setForm((p) => ({ ...p, [key]: v }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = t('amount_required') || 'Amount is required';
    if (!form.payment_date) nextErrors.payment_date = t('date_required') || 'Date is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await updateLoanPayment({
        loanPaymentId: payment.id,
        amount: Number(form.amount),
        payment_date: form.payment_date,
        ...(form.transaction_id !== undefined ? { transaction_id: form.transaction_id } : {}),
        ...(form.notes !== undefined ? { notes: form.notes } : {}),
      }).unwrap();
      toast.success(t('payment_updated') || 'Payment updated successfully');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update payment'));
    }
  };

  if (!payment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('edit_loan_payment') || 'Edit Loan Payment'}
      subtitle={loan ? `${loan.provider_name} — ${formatAmount(payment.amount)} ৳` : ''}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? (t('saving') || 'Saving...') : (t('save') || 'Save')}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('amount')}</label>
          <input
            type="number"
            min="0.01"
            value={form.amount}
            onChange={handleChange('amount')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
          />
          {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('payment_date') || 'Payment Date'}</label>
          <input
            type="date"
            value={form.payment_date}
            onChange={handleChange('payment_date')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
          />
          {errors.payment_date && <p className="text-red-500 text-sm mt-1">{errors.payment_date}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('transaction_id') || 'Transaction ID'}</label>
          <input
            type="text"
            value={form.transaction_id}
            onChange={handleChange('transaction_id')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes') || 'Notes'}</label>
          <input
            type="text"
            value={form.notes}
            onChange={handleChange('notes')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </form>
    </Modal>
  );
};

// View Payments Modal (list payments for a loan, with Edit per row)
const ViewPaymentsModal = ({ isOpen, onClose, loan, onEditPayment }) => {
  const { t } = useTranslation();
  const payments = loan?.payments ?? [];

  if (!loan) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('loan_payment_history') || 'Loan Payment History'}
      subtitle={`${loan.provider_name} — ${formatAmount(loan.paid_amount)} ৳ ${t('paid')} / ${formatAmount(loan.amount)} ৳`}
      size="lg"
    >
      {payments.length === 0 ? (
        <p className="text-subdued py-4">{t('no_loan_payments') || 'No payments recorded yet'}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2 px-3 font-medium text-gray-700">{t('date')}</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">{t('amount')}</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">{t('transaction_id') || 'Transaction ID'}</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">{t('notes')}</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">{t('action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="py-2 px-3 text-gray-600">{formatDate(p.payment_date)}</td>
                  <td className="py-2 px-3 font-medium">{formatAmount(p.amount)} ৳</td>
                  <td className="py-2 px-3 text-gray-600">{p.transaction_id || '–'}</td>
                  <td className="py-2 px-3 text-gray-600">{p.notes || '–'}</td>
                  <td className="py-2 px-3">
                    <button
                      type="button"
                      onClick={() => onEditPayment(p)}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Pencil size={14} />
                      {t('edit') || 'Edit'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
};

const LoansPage = () => {
  const { t } = useTranslation();
  const { isHouseOwner } = useAuth();
  const [selectedHouseId, setSelectedHouseId] = useState('');

  /**
   * A house owner lands on their own houses, so leaving the picker empty made the page open
   * on an empty state and asked them to choose from a list of one or two — every visit.
   *
   * Derived rather than pushed into state by an effect: `selectedHouseId` stays the record of
   * what the user chose, and an explicit choice always wins over the default. Setting state
   * from an effect would also fight the user for a frame on first paint.
   *
   * Same query arguments as HouseSelector's own, so RTK Query serves both from one cache
   * entry and this costs no extra request. Admins are untouched — they pick an owner first,
   * and there is no sensible default among every owner on the platform.
   */
  const { data: myHouses } = useGetHousesQuery({ page: 1, limit: 100 }, { skip: !isHouseOwner });
  const defaultHouseId = isHouseOwner ? String(myHouses?.data?.[0]?.id ?? '') : '';
  const effectiveHouseId = selectedHouseId || defaultHouseId;
  const createModal = useModal(false);
  const editLoanModal = useModal(false);
  const paymentModal = useModal(false);
  const viewPaymentsModal = useModal(false);
  const editPaymentModal = useModal(false);
  const deleteConfirmModal = useModal(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const { data: loansResponse, isLoading: loansLoading } = useGetLoansByHouseQuery(effectiveHouseId, {
    skip: !effectiveHouseId,
  });
  const loans = (Array.isArray(loansResponse?.data) ? loansResponse.data : loansResponse?.data?.data) ?? [];

  const [deleteLoan, { isLoading: isDeleting }] = useDeleteLoanMutation();

  const handleRecordPayment = (loan) => {
    setSelectedLoan(loan);
    setSelectedPayment(null);
    paymentModal.open();
  };

  const handleEditLoan = (loan) => {
    setSelectedLoan(loan);
    editLoanModal.open();
  };

  const handleViewPayments = (loan) => {
    setSelectedLoan(loan);
    setSelectedPayment(null);
    viewPaymentsModal.open();
  };

  const handleEditPayment = (payment) => {
    setSelectedPayment(payment);
    viewPaymentsModal.close();
    editPaymentModal.open();
  };

  const handleConfirmDelete = async () => {
    if (!selectedLoan?.id) return;
    try {
      await deleteLoan(selectedLoan.id).unwrap();
      toast.success(t('loan_deleted') || 'Loan deleted successfully');
      deleteConfirmModal.close();
      setSelectedLoan(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete loan'));
    }
  };

  const openDeleteConfirm = (loan) => {
    setSelectedLoan(loan);
    deleteConfirmModal.open();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <Landmark className="w-7 h-7 text-primary" />
            {t('loans') || 'Loans'}
          </h1>
          <p className="text-subdued text-sm mt-1">
            {t('loans_subtitle') || 'Manage house loans and record payments'}
          </p>
        </div>
        <button
          onClick={createModal.open}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
        >
          <Plus size={18} />
          {t('create_loan') || 'Create Loan'}
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-subdued/20 p-4">
        <div className="mb-4">
          <HouseSelector
            value={effectiveHouseId}
            onChange={setSelectedHouseId}
            label={t('select_house') || 'Select House'}
          />
        </div>

        {effectiveHouseId ? (
          loansLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-48 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : loans.length === 0 ? (
            <div className="py-12 text-center text-subdued">
              <Landmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('no_loans') || 'No loans for this house'}</p>
            </div>
          ) : (
            /* Cards, not rows. A loan is a balance moving against a deadline, and a table of
               amount / paid / start date printed the three numbers without ever relating them —
               whether repayment was keeping pace with the term was left to the reader to work
               out. Two columns from sm up; one on a phone, where a row of six columns was
               unreadable anyway. */
            <div className="grid gap-4 sm:grid-cols-2">
              {loans.map((loan) => (
                <LoanCard
                  key={loan.id}
                  loan={loan}
                  onRecordPayment={handleRecordPayment}
                  onViewPayments={handleViewPayments}
                  onEdit={handleEditLoan}
                  onDelete={openDeleteConfirm}
                />
              ))}
            </div>
          )
        ) : (
          <div className="py-12 text-center text-subdued">
            <Landmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('select_house_to_view_loans') || 'Select a house to view its loans'}</p>
          </div>
        )}
      </div>

      <CreateLoanModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        selectedHouseId={effectiveHouseId || undefined}
        onSuccess={() => {}}
      />

      <EditLoanModal
        isOpen={editLoanModal.isOpen}
        onClose={() => { editLoanModal.close(); setSelectedLoan(null); }}
        loan={selectedLoan}
        onSuccess={() => {}}
      />

      <RecordPaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => { paymentModal.close(); setSelectedLoan(null); }}
        loan={selectedLoan}
        onSuccess={() => {}}
      />

      <ViewPaymentsModal
        isOpen={viewPaymentsModal.isOpen}
        onClose={() => { viewPaymentsModal.close(); setSelectedLoan(null); }}
        loan={selectedLoan}
        onEditPayment={handleEditPayment}
      />

      <EditLoanPaymentModal
        isOpen={editPaymentModal.isOpen}
        onClose={() => { editPaymentModal.close(); setSelectedPayment(null); }}
        payment={selectedPayment}
        loan={selectedLoan}
        onSuccess={() => {}}
      />

      <ConfirmationModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => { deleteConfirmModal.close(); setSelectedLoan(null); }}
        onConfirm={handleConfirmDelete}
        title={t('delete_loan') || 'Delete Loan'}
        message={t('delete_loan_confirm') || 'Are you sure you want to delete this loan? This cannot be undone.'}
        confirmText={t('delete') || 'Delete'}
        cancelText={t('cancel')}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default LoansPage;
