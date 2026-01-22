import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, User, Phone, Mail, IdCard, Form, Search } from 'lucide-react';
import {
  useCreateRenterMutation,
  useUpdateRenterMutation
} from '../../store/api/renterApi';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks';
import { useGetManagedOwnersQuery } from '../../store/api/houseApi';

const renterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  alternativePhone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  nid: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  metadata: z.string().optional(),
  houseOwnerId: z.string(),
});

const RenterForm = ({ open, onClose, renter, houseOwnerId }) => {
  const isEdit = !!renter;
  const [nidFrontImage, setNidFrontImage] = useState(null);
  const [nidBackImage, setNidBackImage] = useState(null);
  const [nidFrontPreview, setNidFrontPreview] = useState(null);
  const [nidBackPreview, setNidBackPreview] = useState(null);
  const [ownerSearch, setOwnerSearch] = useState('');
  
  const { isHouseOwner, isStaff, isWebOwner, user } = useAuth();

  // 2. Updated Query to include search param
  const { data: managedOwners, isLoading: ownersLoading } = useGetManagedOwnersQuery(
    { search: ownerSearch }, 
    { skip: isHouseOwner }
  );
    

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(renterSchema),
    defaultValues: {
      name: '',
      phone: '',
      alternativePhone: '',
      email: '',
      nid: '',
      status: 'active',
      metadata: '',
      houseOwnerId: houseOwnerId || ''
    }
  });

  const [createRenter] = useCreateRenterMutation();
  const [updateRenter] = useUpdateRenterMutation();

  useEffect(() => {
    if (renter) {
      reset({
        name: renter.name || '',
        phone: renter.phone || '',
        alternativePhone: renter.alternativePhone || '',
        email: renter.email || '',
        nid: renter.nid || '',
        status: renter.status || 'active',
        metadata: renter.metadata || '',
        houseOwnerId: renter.houseOwnerId || '',
      });
      
      // Set previews for existing images
      if (renter.nidFrontImageUrl) {
        setNidFrontPreview(renter.nidFrontImageUrl);
      }
      if (renter.nidBackImageUrl) {
        setNidBackPreview(renter.nidBackImageUrl);
      }
    } else {
      reset();
      setNidFrontImage(null);
      setNidBackImage(null);
      setNidFrontPreview(null);
      setNidBackPreview(null);
    }
  }, [renter, reset]);

  const handleFileChange = (e, setImage, setPreview) => {
  const file = e.target.files[0];
  if (file) {
    console.log('File selected:', file.name, file.type, file.size);
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  } else {
    console.log('No file selected');
  }
};

// Also update the removeFile function to clear file input
const removeFile = (setImage, setPreview, inputName) => {
  setImage(null);
  setPreview(null);
  // Clear the file input
  const fileInput = document.querySelector(`input[name="${inputName}"]`);
  if (fileInput) {
    fileInput.value = '';
  }
};

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      
      // Append all form data
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
          formData.append(key, data[key]);
        }
      });

      // Append houseOwnerId if provided
      if (houseOwnerId) {
        formData.append('houseOwnerId', houseOwnerId);
      } else if (isHouseOwner) {
        formData.append('houseOwnerId', user.id);
      }

      // Append files if selected
      if (nidFrontImage) {
        formData.append('nidFrontImage', nidFrontImage);
      }
      if (nidBackImage) {
        formData.append('nidBackImage', nidBackImage);
      }

      console.log(formData);
      

      if (isEdit) {
        await updateRenter({ id: renter.id, formData }).unwrap();
        toast.success('Renter updated successfully');
      } else {
        await createRenter(formData).unwrap();
        toast.success('Renter created successfully');
      }
      
      onClose();
      reset();
      setNidFrontImage(null);
      setNidBackImage(null);
      setNidFrontPreview(null);
      setNidBackPreview(null);
    } catch (error) {
      toast.error(`Failed to save renter: ${error?.data?.error || error.message}`);
      console.error('Failed to save renter:', error);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-subdued/20 p-6 z-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text">
              {isEdit ? 'Edit Renter' : 'Add New Renter'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-subdued/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued" size={20} />
                <input
                  {...register('name')}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                  placeholder="Enter renter's full name"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued" size={20} />
                <input
                  {...register('phone')}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                  placeholder="Enter phone number"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Alternative Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued" size={20} />
                <input
                  {...register('alternativePhone')}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                  placeholder="Optional alternative phone"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued" size={20} />
                <input
                  {...register('email')}
                  type="email"
                  className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                  placeholder="Enter email address"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                National ID (NID)
              </label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued" size={20} />
                <input
                  {...register('nid')}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                  placeholder="Enter NID number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Status
              </label>
              <select
                {...register('status')}
                className="w-full px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {(!houseOwnerId && (isStaff || isWebOwner || (!isStaff && !isWebOwner && !isHouseOwner))) && (
            <div className="bg-subdued/5 p-4 rounded-lg border border-subdued/20 space-y-3">
              <label className="block text-sm font-medium text-text">
                Assign House Owner *
              </label>
              
              {/* Search Field */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-subdued" size={16} />
                <input 
                  type="text"
                  placeholder="Search owners by name or email..."
                  className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                />
              </div>

              {/* Selection Field */}
              <select
                {...register('houseOwnerId', { required: !houseOwnerId })}
                className="w-full px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                disabled={ownersLoading}
              >
                <option value="">{ownersLoading ? 'Loading owners...' : 'Select House Owner'}</option>
                {managedOwners?.data?.map(owner => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name} ({owner.email})
                  </option>
                ))}
              </select>
              {errors.houseOwnerId && (
                <p className="text-xs text-red-600">Please select an owner</p>
              )}
            </div>
          )}

          {/* NID Images Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                NID Front Image
              </label>
              <div className="space-y-4">
                {nidFrontPreview ? (
                  <div className="relative">
                    <img
                      src={nidFrontPreview}
                      alt="NID Front Preview"
                      className="w-full h-48 object-cover rounded-lg border border-subdued/30"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(setNidFrontImage, setNidFrontPreview, 'nidFrontImage')}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-subdued/30 rounded-lg cursor-pointer bg-background hover:bg-subdued/5 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-subdued" />
                      <p className="text-sm text-subdued">Upload NID Front Image</p>
                      <p className="text-xs text-subdued mt-1">PNG, JPG up to 5MB</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      name="nidFrontImage"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setNidFrontImage, setNidFrontPreview)}
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                NID Back Image
              </label>
              <div className="space-y-4">
                {nidBackPreview ? (
                  <div className="relative">
                    <img
                      src={nidBackPreview}
                      alt="NID Back Preview"
                      className="w-full h-48 object-cover rounded-lg border border-subdued/30"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(setNidBackImage, setNidBackPreview, )}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-subdued/30 rounded-lg cursor-pointer bg-background hover:bg-subdued/5 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-subdued" />
                      <p className="text-sm text-subdued">Upload NID Back Image</p>
                      <p className="text-xs text-subdued mt-1">PNG, JPG up to 5MB</p>
                    </div>
                    <input
                      type="file"
                      name="nidBackImage"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setNidBackImage, setNidBackPreview)}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Additional Information
            </label>
            <textarea
              {...register('metadata')}
              rows={3}
              className="w-full px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              placeholder="Any additional information about the renter..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-subdued/20">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-subdued/30 rounded-lg hover:bg-subdued/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {isEdit ? 'Updating...' : 'Creating...'}
                </span>
              ) : isEdit ? (
                'Update Renter'
              ) : (
                'Create Renter'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenterForm;