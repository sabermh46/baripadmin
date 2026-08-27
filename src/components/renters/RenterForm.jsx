import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, User, Phone, Mail, IdCard, Form, Search } from 'lucide-react';
import {
  useCreateRenterMutation,
  useUpdateRenterMutation
} from '../../store/api/renterApi';
import { toast } from 'react-toastify';
import { apiErrorMessage } from '../../utils/apiError';
import { useAuth } from '../../hooks';

import { useTranslation } from 'react-i18next';
import { showMessageInLanguage } from '../../utils/showMessageInLanguage';
import useOwnerOptions from '../../hooks/useOwnerOptions';
import ProtectedImage from '../common/ProtectedImage';

const renterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  alternativePhone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  nid: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  metadata: z.string().optional(),
  houseOwnerId: z.preprocess((val) => String(val), z.string().min(1, 'Owner ID is required')),
});

/**
 * One NID image: a freshly picked file, or the one already on the renter, or an upload area.
 *
 * The stored image goes through ProtectedImage. It used to be a plain <img src>, and the two
 * are not interchangeable: `/uploads/nids/x.png` is a relative path, so the browser resolved
 * it against the app's own origin rather than the API's, and the route behind it requires a
 * bearer token — so even pointed at the right host it answers 401. Every stored NID would
 * have rendered as a broken image here. (UpdateRenterModal already did this correctly; this
 * form, which HouseDetails uses to edit renters, did not.)
 */
const NidImageSlot = ({ label, inputName, newPreview, storedUrl, onSelect, onClear }) => (
  <div>
    <label className="block text-sm font-medium text-text mb-2">{label}</label>
    <div className="space-y-4">
      {newPreview || storedUrl ? (
        <div className="relative">
          {newPreview ? (
            <img
              src={newPreview}
              alt={label}
              className="w-full h-48 object-cover rounded-lg border border-subdued/30"
            />
          ) : (
            <ProtectedImage
              src={storedUrl}
              alt={label}
              className="w-full h-48 object-contain rounded-lg border border-subdued/30"
            />
          )}

          {newPreview ? (
            <button
              type="button"
              onClick={onClear}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
              title="Remove"
            >
              <X size={16} />
            </button>
          ) : (
            // Nothing to "remove" — the file is already saved, and the API has no way to
            // clear one. Replacing it is the action that exists, so that is what is offered.
            <label className="absolute bottom-2 right-2 px-2 py-1 bg-white text-xs text-gray-600 rounded shadow cursor-pointer hover:bg-gray-100">
              Replace
              <input type="file" name={inputName} accept="image/*" className="hidden" onChange={onSelect} />
            </label>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-subdued/30 rounded-lg cursor-pointer bg-background hover:bg-subdued/5 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-subdued" />
            <p className="text-sm text-subdued">Upload {label}</p>
            <p className="text-xs text-subdued mt-1">PNG, JPG up to 5MB</p>
          </div>
          <input type="file" name={inputName} accept="image/*" className="hidden" onChange={onSelect} />
        </label>
      )}
    </div>
  </div>
);

const RenterFormFields = ({ onClose, renter, houseOwnerId }) => {
  const isEdit = !!renter;
  const [nidFrontImage, setNidFrontImage] = useState(null);
  const [nidBackImage, setNidBackImage] = useState(null);
  const [nidFrontPreview, setNidFrontPreview] = useState(null);
  const [nidBackPreview, setNidBackPreview] = useState(null);
  const [ownerSearch, setOwnerSearch] = useState('');
  
  const { isHouseOwner, isStaff, isWebOwner, user } = useAuth();

  // 2. Updated Query to include search param
  // Shared picker cache (useOwnerOptions): one fixed query argument across every owner
  // dropdown in the app, filtered in memory. This used to refetch the whole owner list on
  // each keystroke of the search box.
  const { owners: ownerRows, isLoading: ownersLoading } = useOwnerOptions({ search: ownerSearch });
  const managedOwners = { data: ownerRows };

  const { t } = useTranslation();
    

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(renterSchema),
    // Seeded directly from the renter being edited. This used to be a blank set of defaults
    // followed by an effect that reset() them once the prop arrived — which is where the
    // set-state-in-effect warning came from, and which only worked because the effect
    // happened to re-run. The wrapper below remounts this component per renter, so mount-time
    // defaults are now the whole story and there is nothing left to synchronise.
    defaultValues: {
      name: renter?.name || '',
      phone: renter?.phone || '',
      alternativePhone: renter?.alternativePhone || '',
      email: renter?.email || '',
      nid: renter?.nid || '',
      status: renter?.status || 'active',
      metadata: renter?.metadata || '',
      houseOwnerId: renter
        ? renter.houseOwnerId || renter.createdBy || houseOwnerId || ''
        : (isHouseOwner ? user.id : houseOwnerId || ''),
    },
  });

  const [createRenter] = useCreateRenterMutation();
  const [updateRenter] = useUpdateRenterMutation();

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
        try {
          await updateRenter({ id: renter.id, formData }).unwrap();
          toast.success(showMessageInLanguage('Renter updated successfully || ভাড়াটিয়া সফলভাবে আপডেট হয়েছে'));
          onClose();
          reset();
          setNidFrontImage(null);
          setNidBackImage(null);
          setNidFrontPreview(null);
          setNidBackPreview(null);
        } catch (error) {
          toast.error(apiErrorMessage(error, 'Could not update the renter.'));
          console.error('Failed to update renter:', error);
        }
      } else {
        try {
          await createRenter(formData).unwrap();
          toast.success(showMessageInLanguage('Renter created successfully || ভাড়াটিয়া সফলভাবে তৈরি হয়েছে'));
          onClose();
          reset();
          setNidFrontImage(null);
          setNidBackImage(null);
          setNidFrontPreview(null);
          setNidBackPreview(null);
        } catch (error) {
          toast.error(apiErrorMessage(error));
          console.error('Failed to create renter:', error);
        }
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not save the renter.'));
      console.error('Failed to save renter:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-subdued/20 p-6 z-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text">
              {isEdit ? 'Edit Renter' : `${t('add_new_renter')}`}
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
            <NidImageSlot
              label="NID Front Image"
              inputName="nidFrontImage"
              newPreview={nidFrontPreview}
              storedUrl={renter?.nidFrontImageUrl}
              onSelect={(e) => handleFileChange(e, setNidFrontImage, setNidFrontPreview)}
              onClear={() => removeFile(setNidFrontImage, setNidFrontPreview, 'nidFrontImage')}
            />
            <NidImageSlot
              label="NID Back Image"
              inputName="nidBackImage"
              newPreview={nidBackPreview}
              storedUrl={renter?.nidBackImageUrl}
              onSelect={(e) => handleFileChange(e, setNidBackImage, setNidBackPreview)}
              onClear={() => removeFile(setNidBackImage, setNidBackPreview, 'nidBackImage')}
            />
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
              onClick={handleSubmit}
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

/**
 * Mount gate. Three screens keep this form permanently rendered and toggle `open`, so the
 * fields have to be remounted per renter — otherwise react-hook-form's defaultValues, read
 * once at mount, would still hold whoever was edited first.
 *
 * `renter?.id` in the key covers the case that prompted this: open the form for renter A,
 * close it, open it for renter B, and B's details have to appear. 'new' keeps the create form
 * a distinct mount from any edit.
 */
const RenterForm = ({ open, ...props }) => {
  if (!open) return null;

  return <RenterFormFields key={props.renter?.id ?? 'new'} {...props} />;
};

export default RenterForm;