import React, { useState, useMemo } from 'react';
import { apiErrorMessage } from '../../../utils/apiError';
import { Search, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import Modal from '../../common/Modal';
import { useCreateUserMutation } from '../../../store/api/authApi';
import { useGetAvailablePermissionsQuery } from '../../../store/api/staffApi';

const EMPTY_FORM = {
  email: '',
  name: '',
  phone: '',
  password: '',
  sendEmail: false,
};

const CreateStaffModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [createUser, { isLoading }] = useCreateUserMutation();

  const { data: permissionsData } = useGetAvailablePermissionsQuery(undefined, {
    skip: !isOpen,
  });

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState([]);
  const [permSearch, setPermSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

  const groupedPermissions = useMemo(
    () => permissionsData?.data?.grouped ?? {},
    [permissionsData]
  );

  const categories = useMemo(() => Object.keys(groupedPermissions), [groupedPermissions]);

  const handleChange = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const reset = () => {
    setFormData(EMPTY_FORM);
    setErrors({});
    setSelectedPermissionKeys([]);
    setPermSearch('');
    setExpandedCategories({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const togglePermission = (key) => {
    setSelectedPermissionKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleCategoryAll = (category) => {
    const keys = (groupedPermissions[category] || []).map((p) => p.key);
    const allSelected = keys.every((k) => selectedPermissionKeys.includes(k));
    setSelectedPermissionKeys((prev) =>
      allSelected
        ? prev.filter((k) => !keys.includes(k))
        : [...new Set([...prev, ...keys])]
    );
  };

  const validate = () => {
    const errs = {};
    if (!formData.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Enter a valid email address';
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
        roleSlug: 'staff',
        sendEmail: formData.sendEmail,
        metadata: selectedPermissionKeys.length
          ? { default_permissions: selectedPermissionKeys }
          : {},
      }).unwrap();

      toast.success('Staff member created successfully');
      onSuccess?.();
      handleClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to create staff member'));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Staff Member"
      subtitle="Create a new staff account and optionally assign permissions"
      size="lg"
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
            form="create-staff-form"
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm"
          >
            {isLoading ? 'Creating...' : 'Create Staff'}
          </button>
        </div>
      }
    >
      <form id="create-staff-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            placeholder="staff@example.com"
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

        {/* Permissions selector */}
        <div className="border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-gray-700">Permissions (optional)</p>
                <p className="text-xs text-gray-500">
                  {selectedPermissionKeys.length} selected — can also be managed later
                </p>
              </div>
            </div>
          </div>

          <div className="p-3">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search permissions..."
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {categories.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No permissions available</p>
              )}
              {categories.map((category) => {
                const perms = (groupedPermissions[category] || []).filter(
                  (p) =>
                    !permSearch ||
                    p.key?.toLowerCase().includes(permSearch.toLowerCase()) ||
                    p.description?.toLowerCase().includes(permSearch.toLowerCase())
                );
                if (perms.length === 0) return null;

                const keys = perms.map((p) => p.key);
                const selectedCount = keys.filter((k) => selectedPermissionKeys.includes(k)).length;
                const isExpanded = expandedCategories[category] || !!permSearch;

                return (
                  <div key={category} className="border border-gray-100 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 capitalize"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                        {category}
                        <span className="text-xs text-gray-400">
                          ({selectedCount}/{perms.length})
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCategoryAll(category)}
                        className="text-xs text-primary hover:underline"
                      >
                        {keys.every((k) => selectedPermissionKeys.includes(k))
                          ? 'Clear'
                          : 'Select all'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="p-2 grid grid-cols-1 gap-1">
                        {perms.map((p) => {
                          const checked = selectedPermissionKeys.includes(p.key);
                          return (
                            <label
                              key={p.id ?? p.key}
                              className={`flex items-start gap-2 p-2 rounded-md cursor-pointer text-sm ${checked ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(p.key)}
                                className="mt-0.5 h-4 w-4 text-primary border-gray-300 rounded"
                              />
                              <div className="min-w-0">
                                <span className="font-mono text-xs text-gray-800 break-all">
                                  {p.key}
                                </span>
                                {p.description && (
                                  <p className="text-xs text-gray-500">{p.description}</p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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

export default CreateStaffModal;
