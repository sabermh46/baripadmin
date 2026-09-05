// components/renter/UpdateRenterModal.jsx
import React, { useState } from 'react';
import { useUpdateRenterMutation } from '../../store/api/renterApi';
import { useForm } from 'react-hook-form';
import { Upload, X, CheckCircle } from 'lucide-react';
import Modal from '../common/Modal';
import Btn from '../common/Button';
import ProtectedImage from '../common/ProtectedImage';
import { toast } from 'react-toastify';
import { optimizeImage, optimizeErrorMessage, formatBytes } from '../../utils/imageOptimizer';

const UpdateRenterModal = ({ isOpen, onClose, renter, onSuccess }) => {
  const [updateRenter, { isLoading }] = useUpdateRenterMutation();

  // File objects for newly selected images (null = keep existing)
  const [nidFrontImage, setNidFrontImage] = useState(null);
  const [nidBackImage, setNidBackImage] = useState(null);
  // Local blob preview URLs for newly selected files only
  const [previewFront, setPreviewFront] = useState(null);
  const [previewBack, setPreviewBack] = useState(null);
  const [optimizing, setOptimizing] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: renter?.name || '',
      phone: renter?.phone || '',
      alternativePhone: renter?.alternativePhone || '',
      email: renter?.email || '',
      nid: renter?.nid || '',
      status: renter?.status || 'active',
    },
  });

  /**
   * Shrink on this device before the file is ever attached to the form.
   *
   * The optimiser was wired into RenterForm but not into this modal, which is what the
   * /renters page actually opens — so NID photos taken on a phone were still uploading at
   * full size from here, EXIF and all. Optimising in the handler keeps the rest of this
   * component's preview/state shape untouched.
   */
  const handleImageChange = async (e, type) => {
    const file = e.target.files[0];
    // Cleared so re-picking the same file after a failure still fires a change event.
    e.target.value = '';
    if (!file) return;

    setOptimizing(type);
    try {
      const optimized = await optimizeImage(file, 'document');
      const blobUrl = URL.createObjectURL(optimized.file);

      if (type === 'front') {
        setPreviewFront((old) => { if (old) URL.revokeObjectURL(old); return blobUrl; });
        setNidFrontImage(optimized.file);
      } else {
        setPreviewBack((old) => { if (old) URL.revokeObjectURL(old); return blobUrl; });
        setNidBackImage(optimized.file);
      }

      if (!optimized.skipped) {
        toast.success(
          `Image optimised: ${formatBytes(optimized.originalBytes)} → ${formatBytes(optimized.bytes)}`
          + (optimized.savedPct > 0 ? ` (${optimized.savedPct}% smaller)` : ''),
        );
      }
    } catch (err) {
      toast.error(optimizeErrorMessage(err));
    } finally {
      setOptimizing(null);
    }
  };

  const clearImage = (type) => {
    if (type === 'front') {
      if (previewFront) URL.revokeObjectURL(previewFront);
      setNidFrontImage(null);
      setPreviewFront(null);
    } else {
      if (previewBack) URL.revokeObjectURL(previewBack);
      setNidBackImage(null);
      setPreviewBack(null);
    }
  };

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (data[key]) formData.append(key, data[key]);
      });
      if (nidFrontImage) formData.append('nidFrontImage', nidFrontImage);
      if (nidBackImage) formData.append('nidBackImage', nidBackImage);
      await updateRenter({ id: renter.id, formData }).unwrap();
      onSuccess();
    } catch (error) {
      console.error('Failed to update renter:', error);
    }
  };

  const UploadArea = ({ type }) => (
    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
      <div className="flex flex-col items-center justify-center pt-5 pb-6">
        <Upload className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">
          {optimizing === type ? 'Optimising on your device…' : 'Click to upload'}
        </p>
        <p className="text-xs text-gray-400">Shrunk here before upload</p>
      </div>
      <input
        type="file"
        accept="image/*"
        disabled={optimizing === type}
        onChange={(e) => handleImageChange(e, type)}
        className="hidden"
      />
    </label>
  );

  const renderImageSlot = (type) => {
    const isFront = type === 'front';
    const newFile = isFront ? nidFrontImage : nidBackImage;
    const localPreview = isFront ? previewFront : previewBack;
    const serverUrl = isFront ? renter?.nidFrontImageUrl : renter?.nidBackImageUrl;
    const label = isFront ? 'NID Front Image' : 'NID Back Image';

    return (
      <div>
        <p className="block text-sm font-medium text-gray-700 mb-2">{label}</p>

        {newFile ? (
          // Newly selected file — safe blob URL
          <div className="relative">
            <img src={localPreview} alt={label} className="w-full h-48 object-contain border rounded-lg" />
            <button
              type="button"
              onClick={() => clearImage(type)}
              className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
              title="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : serverUrl ? (
          // Existing server image — must use ProtectedImage (bearer token required)
          <div className="relative">
            <ProtectedImage src={serverUrl} alt={label} className="w-full h-48 object-contain border rounded-lg" />
            <label
              className="absolute bottom-2 right-2 px-2 py-1 bg-white text-xs text-gray-600 rounded shadow cursor-pointer hover:bg-gray-100"
              title="Replace image"
            >
              {optimizing === type ? 'Optimising…' : 'Replace'}
              <input
        type="file"
        accept="image/*"
        disabled={optimizing === type}
        onChange={(e) => handleImageChange(e, type)}
        className="hidden"
      />
            </label>
            <p className="text-xs text-gray-500 mt-1">Current image</p>
          </div>
        ) : (
          <UploadArea type={type} />
        )}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Renter" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                {...register('name', { required: 'Name is required' })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                {...register('phone', {
                  required: 'Phone is required',
                  pattern: { value: /^[0-9+\-\s()]*$/, message: 'Invalid phone number' },
                })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alternative Phone</label>
              <input
                type="tel"
                {...register('alternativePhone')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NID Number</label>
              <input
                type="text"
                {...register('nid')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* NID Images */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderImageSlot('front')}
          {renderImageSlot('back')}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Btn type="normal" onClick={onClose} disabled={isLoading}>Cancel</Btn>
          <Btn type="primary" submit={true} disabled={isLoading} className="flex items-center">
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Update Renter
              </>
            )}
          </Btn>
        </div>
      </form>
    </Modal>
  );
};

export default UpdateRenterModal;
