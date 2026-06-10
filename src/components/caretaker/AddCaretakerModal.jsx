import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from '../common/Modal';
import { useCreateUserMutation } from '../../store/api/authApi';
import { useGetManagedOwnersQuery } from '../../store/api/houseApi';

const EMPTY_FORM = {
  email: '',
  name: '',
  phone: '',
  password: '',
  house_owner_id: '',
  sendEmail: false,
};

const AddCaretakerModal = ({ isOpen, onClose, onSuccess }) => {
  const [createUser, { isLoading }] = useCreateUserMutation();

  const [ownerSearchTerm, setOwnerSearchTerm] = useState('');
  const [ownersPage, setOwnersPage] = useState(1);
  const ownersLimit = 10;

  const {
    data: managedOwnersResponse,
    isLoading: ownersLoading,
    isFetching: ownersFetching,
  } = useGetManagedOwnersQuery({ search: ownerSearchTerm, page: ownersPage, limit: ownersLimit });

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const debouncedSearch = useMemo(() => {
    let timeout;
    return (value) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setOwnerSearchTerm(value);
        setOwnersPage(1);
      }, 500);
    };
  }, []);

  const ownerOptions = managedOwnersResponse?.data?.map(o => ({
    label: `${o.name} (${o.email})`,
    value: o.id.toString(),
  })) ?? [];

  const handleChange = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const reset = () => {
    setFormData(EMPTY_FORM);
    setErrors({});
    setOwnerSearchTerm('');
    setOwnersPage(1);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validate = () => {
    const errs = {};
    if (!formData.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Enter a valid email address';
    }
    if (!formData.house_owner_id) {
      errs.house_owner_id = 'House owner is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await createUser({
        email: formData.email.trim(),
        name: formData.name.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        password: formData.password || undefined,
        roleSlug: 'caretaker',
        sendEmail: formData.sendEmail,
        metadata: { house_owner_id: formData.house_owner_id },
      }).unwrap();

      toast.success('Caretaker created successfully');
      onSuccess?.();
      handleClose();
    } catch (err) {
      const msg = err?.data?.error || err?.data?.message || err?.message || 'Failed to create caretaker';
      toast.error(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Caretaker"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-caretaker-form"
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm"
          >
            {isLoading ? 'Creating...' : 'Create Caretaker'}
          </button>
        </div>
      }
    >
      <form id="add-caretaker-form" onSubmit={handleSubmit} className="space-y-4">
        {/* House Owner selector */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            House Owner <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Select the house owner for whom this caretaker will work
          </p>

          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search house owners by name or email..."
              onChange={e => debouncedSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
            />
          </div>

          <select
            value={formData.house_owner_id}
            onChange={handleChange('house_owner_id')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm ${errors.house_owner_id ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="">Select a house owner...</option>
            {ownerOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500">
            <span>
              {ownersLoading || ownersFetching
                ? 'Loading...'
                : `${ownerOptions.length} of ${managedOwnersResponse?.meta?.total ?? 0} owners`}
            </span>
            {managedOwnersResponse?.meta?.totalPages > 1 && (
              <div className="flex gap-1">
                <button type="button" onClick={() => setOwnersPage(p => Math.max(1, p - 1))} disabled={ownersPage === 1} className="px-1.5 disabled:opacity-40">←</button>
                <span>{ownersPage} / {managedOwnersResponse.meta.totalPages}</span>
                <button type="button" onClick={() => setOwnersPage(p => Math.min(managedOwnersResponse.meta.totalPages, p + 1))} disabled={ownersPage === managedOwnersResponse.meta.totalPages} className="px-1.5 disabled:opacity-40">→</button>
              </div>
            )}
          </div>
          {errors.house_owner_id && <p className="text-red-500 text-xs mt-1">{errors.house_owner_id}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            placeholder="caretaker@example.com"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={handleChange('name')}
            placeholder="Full name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={handleChange('phone')}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={handleChange('password')}
            placeholder="Leave blank to auto-generate"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
          />
        </div>

        {/* Send email */}
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.sendEmail}
            onChange={handleChange('sendEmail')}
          />
          Send credentials by email
        </label>
      </form>
    </Modal>
  );
};

export default AddCaretakerModal;
