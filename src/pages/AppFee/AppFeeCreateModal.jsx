import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../hooks';
import { useCreateAppFeePaymentMutation } from '../../store/api/appFeeApi';
import { useGetManagedOwnersQuery } from '../../store/api/houseApi';
import { toast } from 'react-toastify';

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

const AppFeeCreateModal = ({ isOpen, onClose, onSuccess }) => {
  const { user, isWebOwner, isStaff, isHouseOwner, isCaretaker } = useAuth();
  const [createPayment, { isLoading: isCreating }] = useCreateAppFeePaymentMutation();

  const isWebOwnerOrStaff = isWebOwner || isStaff;
  const showHouseOwnerSelector = isWebOwnerOrStaff || (isCaretaker && !isHouseOwner);

  // House owner selector state (for web_owner, staff, caretaker)
  const [ownerSearchTerm, setOwnerSearchTerm] = useState('');
  const [ownersPage, setOwnersPage] = useState(1);
  const ownersLimit = 10;

  const {
    data: managedOwnersResponse,
    isLoading: ownersLoading,
    isFetching: ownersFetching,
  } = useGetManagedOwnersQuery(
    { search: ownerSearchTerm, page: ownersPage, limit: ownersLimit },
    { skip: !isOpen || !showHouseOwnerSelector }
  );

  const MONTHLY_FEE_PER_HOUSE = 500;

  const getActiveHouseCount = (owner) => {
    if (!owner) return 0;
    const activeHouses = owner.houses?.filter(
      (h) => h.active === 1 || h.active === true
    );
    return activeHouses?.length ?? owner.houseCount ?? 0;
  };

  const getInitialFormData = () => ({
    house_owner_id: '',
    amount: '',
    payment_method: 'bank_transfer',
    status: 'pending',
    start_date: '', // default to today (YYYY-MM-DD)
    transaction_id: '',
    notes: '',
    proof_image_url: '',
    sendMail: true,
    sendSms: false,
    house_count: '',
    subscription_days: '',
    offset_days: '',
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [validationErrors, setValidationErrors] = useState({});

  const getManagedOwnersOptions = () => {
    if (!managedOwnersResponse?.data) return [];
    return managedOwnersResponse.data.map((owner) => ({
      label: `${owner.name} (${owner.email})`,
      value: owner.id.toString(),
      owner,
    }));
  };

  const handleHouseOwnerChange = (ownerId) => {
    setFormData((prev) => {
      const next = { ...prev, house_owner_id: ownerId };
      if (!showHouseOwnerSelector || !ownerId || !managedOwnersResponse?.data) {
        return next;
      }
      const owner = managedOwnersResponse.data.find(
        (o) => o.id === Number(ownerId)
      );
      const activeCount = getActiveHouseCount(owner);
      if (activeCount > 0) {
        next.house_count = String(activeCount);
        next.amount = String(MONTHLY_FEE_PER_HOUSE * activeCount);
      }
      return next;
    });
  };

  const debouncedSearch = useMemo(() => {
    let timeout;
    return (value) => {
      clearTimeout(timeout);
      // eslint-disable-next-line react-hooks/immutability
      timeout = setTimeout(() => {
        setOwnerSearchTerm(value);
        setOwnersPage(1);
      }, 500);
    };
  }, []);

  const resetForm = () => {
    setFormData({
      ...getInitialFormData(),
      house_owner_id: isHouseOwner && user?.id ? String(user.id) : '',
    });
    setValidationErrors({});
    setOwnerSearchTerm('');
    setOwnersPage(1);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = {};
    const houseOwnerId = showHouseOwnerSelector
      ? formData.house_owner_id
      : isHouseOwner && user?.id
        ? user.id
        : formData.house_owner_id;
    if (!houseOwnerId) err.house_owner_id = 'House owner is required';
    if (!formData.amount || Number(formData.amount) <= 0)
      err.amount = 'Valid amount is required';
    if (formData.status === 'pending' && !formData.payment_method)
      err.payment_method = 'Payment method is required for pending payments';
    setValidationErrors(err);
    if (Object.keys(err).length) return;

    try {
      const payload = {
        house_owner_id: Number(houseOwnerId),
        amount: Number(formData.amount),
        start_date: formData.start_date || new Date().toISOString().slice(0, 10),
        payment_method: formData.payment_method || 'other',
        transaction_id: formData.transaction_id || undefined,
        notes: formData.notes || undefined,
        proof_image_url: formData.proof_image_url || undefined,
        sendMail: formData.sendMail,
        sendSms: formData.sendSms,
      };
      if (isWebOwnerOrStaff && formData.status === 'paid') {
        payload.status = 'paid';
      }
      if (isWebOwnerOrStaff) {
        if (formData.house_count !== '' && formData.house_count != null)
          payload.house_count = Number(formData.house_count);
        if (formData.subscription_days !== '' && formData.subscription_days != null)
          payload.subscription_days = Number(formData.subscription_days);
        if (formData.offset_days !== '' && formData.offset_days != null)
          payload.offset_days = Number(formData.offset_days);
      }
      await createPayment(payload).unwrap();
      toast.success('App fee payment created successfully.');
      onSuccess?.();
      handleClose();
    } catch (res) {
      const msg =
        res?.data?.error ||
        res?.data?.message ||
        res?.message ||
        'Failed to create app fee payment';
      toast.error(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New App Fee"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="app-fee-create-form"
            disabled={isCreating}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      }
    >
      <form id="app-fee-create-form" onSubmit={handleSubmit} className="space-y-4">
        {/* House Owner block – web_owner, staff, and caretaker (when not house owner) */}
        {showHouseOwnerSelector && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              House Owner *
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Select the house owner for this app fee payment
            </p>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search house owners by name or email..."
                onChange={(e) => debouncedSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <select
              value={formData.house_owner_id}
              onChange={(e) => handleHouseOwnerChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none ${
                validationErrors.house_owner_id ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Select a house owner...</option>
              {getManagedOwnersOptions().map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
              <span>
                {ownersLoading || ownersFetching
                  ? 'Loading house owners...'
                  : `Showing ${getManagedOwnersOptions().length} of ${managedOwnersResponse?.meta?.total || 0} owners`}
              </span>
              {managedOwnersResponse?.meta?.totalPages > 1 && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setOwnersPage((p) => Math.max(1, p - 1))}
                    disabled={ownersPage === 1}
                    className="px-2 py-1 text-xs disabled:opacity-50"
                  >
                    ←
                  </button>
                  <span className="px-2 py-1 text-xs">
                    Page {ownersPage} of {managedOwnersResponse.meta.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setOwnersPage((p) =>
                        Math.min(managedOwnersResponse.meta.totalPages, p + 1)
                      )
                    }
                    disabled={ownersPage === managedOwnersResponse.meta.totalPages}
                    className="px-2 py-1 text-xs disabled:opacity-50"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
            {validationErrors.house_owner_id && (
              <p className="text-red-500 text-sm mt-2">
                {validationErrors.house_owner_id}
              </p>
            )}
          </div>
        )}

        {/* house_owner: hidden field */}
        {isHouseOwner && user?.id && (
          <input type="hidden" name="house_owner_id" value={user.id} />
        )}

        {/* Amount and House count in one row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Amount *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={formData.amount}
              onChange={(e) =>
                setFormData((p) => ({ ...p, amount: e.target.value }))
              }
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none ${
                validationErrors.amount ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={showHouseOwnerSelector ? 'Select owner for default' : 'Amount'}
            />
            {validationErrors.amount && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.amount}</p>
            )}
          </div>
          {isWebOwnerOrStaff && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                House count
              </label>
              <input
                type="number"
                min="0"
                value={formData.house_count ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, house_count: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                placeholder="Optional – defaults to active house count"
              />
            </div>
          )}
        </div>

          <div className="flex gap-4 fle-wrap">
            <div className='flex-1'>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Start date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                placeholder="Optional (default to today)"
              />
            </div>

            <div className='flex-1'>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Payment method *
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
        </div>

        {isWebOwnerOrStaff && (
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
            </select>
          </div>
        )}

        {isWebOwnerOrStaff && (
          <div className="flex gap-4 fle-wrap">
            <div className='flex-1'>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Subscription days
              </label>
              <input
                type="number"
                min="0"
                value={formData.subscription_days ?? ''}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, subscription_days: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                placeholder="Optional – default 30"
              />
            </div>
            <div className='flex-1'>
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
                placeholder="Optional – default 5"
              />
            </div>
          </div>
        )}

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
            placeholder="Optional"
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
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Proof image URL
          </label>
          <input
            type="url"
            value={formData.proof_image_url}
            onChange={(e) =>
              setFormData((p) => ({ ...p, proof_image_url: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            placeholder="Optional"
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.sendMail}
            onChange={(e) =>
              setFormData((p) => ({ ...p, sendMail: e.target.checked }))
            }
          />
          <span className="text-sm text-gray-700">Send email notification</span>
        </label>
        {isWebOwnerOrStaff && (
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
        )}
      </form>
    </Modal>
  );
};

export default AppFeeCreateModal;
