import React, { useState } from 'react';
import Modal from '../../components/common/Modal';
import { useCreateUserMutation } from '../../store/api/authApi';
import { toast } from 'react-toastify';

const CreateHouseOwnerModal = ({ isOpen, onClose, onSuccess }) => {
  const [createUser, { isLoading }] = useCreateUserMutation();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    password: '',
    houseLimit: '',
    sendEmail: false,
    generateToken: false,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => {
    setFormData({
      email: '',
      name: '',
      phone: '',
      password: '',
      houseLimit: '',
      sendEmail: false,
      generateToken: false,
    });
    setErrors({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!formData.email) nextErrors.email = 'Email is required';
    if (!formData.password && !formData.generateToken) {
      // Backend can auto-generate password; if generateToken is true we can omit it
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      const body = {
        email: formData.email,
        name: formData.name || undefined,
        phone: formData.phone || undefined,
        roleSlug: 'house_owner',
        password: formData.password || undefined,
        sendEmail: formData.sendEmail,
        generateToken: formData.generateToken,
        houseLimit:
          formData.houseLimit !== '' && formData.houseLimit != null
            ? Number(formData.houseLimit)
            : undefined,
      };
      await createUser(body).unwrap();
      toast.success('House owner created successfully.');
      onSuccess?.();
      handleClose();
    } catch (err) {
      const msg =
        err?.data?.error || err?.data?.message || err?.message || 'Failed to create house owner';
      toast.error(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add House Owner"
      size="md"
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
            form="create-house-owner-form"
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create'}
          </button>
        </div>
      }
    >
      <form
        id="create-house-owner-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="owner@example.com"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={handleChange('name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            placeholder="Owner name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Phone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={handleChange('phone')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            placeholder="Optional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Password
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={handleChange('password')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            placeholder="Leave blank to auto-generate"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            House limit
          </label>
          <input
            type="number"
            min="0"
            value={formData.houseLimit}
            onChange={handleChange('houseLimit')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            placeholder="Optional (e.g. 10)"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={formData.sendEmail}
            onChange={handleChange('sendEmail')}
          />
          <span>Send credentials by email</span>
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={formData.generateToken}
            onChange={handleChange('generateToken')}
          />
          <span>Also generate registration link</span>
        </label>
      </form>
    </Modal>
  );
};

export default CreateHouseOwnerModal;

