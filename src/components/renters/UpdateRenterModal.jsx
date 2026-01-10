// components/renter/UpdateRenterModal.jsx
import React, { useState } from 'react';
import { useUpdateRenterMutation } from '../../store/api/renterApi';
import { useForm } from 'react-hook-form';
import { 
  Upload, 
  X,
  CheckCircle,
  Eye
} from 'lucide-react';
import Modal from '../common/Modal';
import Btn from '../common/Button';

const UpdateRenterModal = ({ isOpen, onClose, renter, onSuccess }) => {
  const [updateRenter, { isLoading }] = useUpdateRenterMutation();
  const [nidFrontImage, setNidFrontImage] = useState(null);
  const [nidBackImage, setNidBackImage] = useState(null);
  const [previewFront, setPreviewFront] = useState(renter?.nidFrontImageUrl);
  const [previewBack, setPreviewBack] = useState(renter?.nidBackImageUrl);
  const [showFrontPreview, setShowFrontPreview] = useState(false);
  const [showBackPreview, setShowBackPreview] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: renter?.name || '',
      phone: renter?.phone || '',
      alternativePhone: renter?.alternativePhone || '',
      email: renter?.email || '',
      nid: renter?.nid || '',
      status: renter?.status || 'active'
    }
  });

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    const cleanPath = imagePath.replace(/^\/uploads\//, '');
    return `${import.meta.env.VITE_APP_API_URL}/api/images/${encodeURIComponent(cleanPath)}`;
  };

  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'front') {
      setNidFrontImage(file);
      setPreviewFront(URL.createObjectURL(file));
    } else {
      setNidBackImage(file);
      setPreviewBack(URL.createObjectURL(file));
    }
  };

  const removeImage = (type) => {
    if (type === 'front') {
      setNidFrontImage(null);
      setPreviewFront(null);
    } else {
      setNidBackImage(null);
      setPreviewBack(null);
    }
  };

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      
      // Append text fields
      Object.keys(data).forEach(key => {
        if (data[key]) {
          formData.append(key, data[key]);
        }
      });
      
      // Append files if changed
      if (nidFrontImage) {
        formData.append('nidFrontImage', nidFrontImage);
      }
      if (nidBackImage) {
        formData.append('nidBackImage', nidBackImage);
      }
      
      await updateRenter({ id: renter.id, formData }).unwrap();
      onSuccess();
    } catch (error) {
      console.error('Failed to update renter:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Renter"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                {...register('name', { required: 'Name is required' })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                {...register('phone', { 
                  required: 'Phone is required',
                  pattern: {
                    value: /^[0-9+\-\s()]*$/,
                    message: 'Invalid phone number'
                  }
                })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alternative Phone
              </label>
              <input
                type="tel"
                {...register('alternativePhone')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NID Number
              </label>
              <input
                type="text"
                {...register('nid')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* NID Images */}
        {/* Front Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NID Front Image
              </label>
              
              {previewFront ? (
                <div className="relative">
                  <img
                    src={getImageUrl(previewFront)}
                    alt="NID Front Preview"
                    className="w-full h-48 object-contain border rounded-lg"
                  />
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <button
                      type="button"
                      onClick={() => setShowFrontPreview(true)}
                      className="p-1 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"
                      title="View Full Size"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage('front')}
                      className="p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : renter?.nidFrontImageUrl ? (
                <div className="relative">
                    {
                        console.log(getImageUrl(renter.nidFrontImageUrl))
                        
                    }
                  <img
                    src={getImageUrl(renter.nidFrontImageUrl)}
                    alt="Current NID Front"
                    className="w-full h-48 object-contain border rounded-lg"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder-image.jpg';
                    }}
                  />
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <button
                      type="button"
                      onClick={() => window.open(getImageUrl(renter.nidFrontImageUrl), '_blank')}
                      className="p-1 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"
                      title="View Full Size"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Current image</p>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click to upload</p>
                    <p className="text-xs text-gray-400">PNG, JPG, GIF up to 5MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'front')}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Back Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NID Back Image
              </label>
              
              {previewBack ? (
                <div className="relative">
                  <img
                    src={previewBack}
                    alt="NID Back Preview"
                    className="w-full h-48 object-contain border rounded-lg"
                  />
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <button
                      type="button"
                      onClick={() => setShowBackPreview(true)}
                      className="p-1 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"
                      title="View Full Size"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage('back')}
                      className="p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : renter?.nidBackImageUrl ? (
                <div className="relative">
                  <img
                    src={getImageUrl(renter.nidBackImageUrl)}
                    alt="Current NID Back"
                    className="w-full h-48 object-contain border rounded-lg"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder-image.jpg';
                    }}
                  />
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <button
                      type="button"
                      onClick={() => window.open(getImageUrl(renter.nidBackImageUrl), '_blank')}
                      className="p-1 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"
                      title="View Full Size"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Current image</p>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click to upload</p>
                    <p className="text-xs text-gray-400">PNG, JPG, GIF up to 5MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'back')}
                    className="hidden"
                  />
                </label>
              )}
            </div>


        {/* Footer */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Btn
            type="normal"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Btn>
          <Btn
            type="primary"
            submit={true}
            disabled={isLoading}
            className="flex items-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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