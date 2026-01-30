import React, { useState, useEffect } from 'react';
import { Home, Plus, X, Save, User, Info, Loader2, Building, MapPin, Layers, CheckCircle, DollarSign } from 'lucide-react';
import { useCreateHouseMutation, useGetManagedOwnersQuery } from '../../../store/api/houseApi';
import { useAuth } from '../../../hooks';
import Btn from '../../common/Button';
import { toast } from 'react-toastify';
import AmenitiesInput from '../../common/AmenitiesInput';

const CreateHouseForm = ({ onSuccess, onCancel }) => {
  const { user, isWebOwner, isHouseOwner, isCaretaker, isStaff } = useAuth();
  
  const [formData, setFormData] = useState({
    ownerId: '',
    address: '',
    flatCount: 1,
    name: '',
    metadata: {
      description: '',
      amenities: [], // Changed to array of objects
      locationDetails: '',
      // Keep other metadata fields as they are
    },
    active: false,
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const [ownerSearchTerm, setOwnerSearchTerm] = useState('');
  const [ownersPage, setOwnersPage] = useState(1);
  const ownersLimit = 10;
  const { 
      data: managedOwnersResponse, 
      isLoading: ownersLoading, 
      isFetching: ownersFetching 
    } = useGetManagedOwnersQuery({
      search: ownerSearchTerm,
      page: ownersPage,
      limit: ownersLimit
    });
  

  const [createHouse, { isLoading, error, reset }] = useCreateHouseMutation();

  useEffect(() => {
    if (isHouseOwner && user?.id) {
      setFormData(prev => ({ ...prev, ownerId: user.id }));
    }
  }, [user, isHouseOwner]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.ownerId) newErrors.ownerId = 'Owner selection is required';
    if (!formData.name.trim()) newErrors.name = 'House name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (formData.flatCount < 1) newErrors.flatCount = 'Must have at least 1 flat';
    
    // Validate amenities (optional)
    if (formData.metadata.amenities && Array.isArray(formData.metadata.amenities)) {
      const invalidAmenities = formData.metadata.amenities.filter(a => 
        !a.name || !a.name.trim() || a.charge === undefined || a.charge === null
      );
      if (invalidAmenities.length > 0) {
        newErrors.amenities = 'All amenities must have a name and charge';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      toast.error(Object.values(newErrors).join(' \n '));
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('metadata.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        metadata: { ...prev.metadata, [field]: value }
      }));
    } else if (name === 'active') {
      setFormData(prev => ({
        ...prev,
        [name]: value === 'true'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? Math.max(1, parseInt(value) || 0) : value
      }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleAmenitiesChange = (amenities) => {
    setFormData(prev => ({
      ...prev,
      metadata: { ...prev.metadata, amenities }
    }));
    
    if (errors.amenities) {
      setErrors(prev => ({ ...prev, amenities: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const result = await createHouse(formData).unwrap();
      if (result.success) {
        setSuccess(true);
        toast.success("Property created successfully!");
        reset();
        // Reset form but keep ownerId if user is house owner
        setFormData({
          ownerId: isHouseOwner ? user.id : '',
          address: '',
          name: '',
          flatCount: 1,
          metadata: { 
            description: '', 
            amenities: [], // Reset to empty array
            locationDetails: '' 
          },
          active: false,
        });
        if (onSuccess) onSuccess(result.data);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Submit error:', err);
      toast.error(err.data?.error || 'Failed to create property');
    }
  };

  const getManagedOwnersOptions = () => {
    if (!managedOwnersResponse?.data) return [];
    
    return managedOwnersResponse.data.map(owner => ({
      label: `${owner.name} (${owner.email})`,
      value: owner.id.toString()
    }));
  };


  // Calculate total amenities charges
  const totalAmenitiesCharge = formData.metadata.amenities?.reduce(
    (sum, amenity) => sum + (parseFloat(amenity.charge) || 0), 
    0
  ) || 0;

  // Permission Check
  const canCreate = isWebOwner || ((isStaff || isHouseOwner) && user?.permissions?.includes('houses.create'));
  
  if (!canCreate) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
          <X size={20} /> You do not have permission to create houses.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-indigo-50 flex items-center gap-4">
        <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
          <Building size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Add New Property</h2>
          <p className="text-sm text-gray-600">Register a house to the management system</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 animate-fade-in">
            <X size={18} />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error.data?.error || 'Something went wrong. Please try again.'}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle size={18} />
            <div>
              <p className="font-medium">Success!</p>
              <p className="text-sm">Property created successfully!</p>
            </div>
          </div>
        )}

        {/* Owner Selection - Only for Staff and Web Owner */}
{(isStaff || isWebOwner) && (
  <div className="space-y-2">
    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
      <User size={16} /> Select House Owner *
    </label>
    <select
      name="ownerId" // Target the correct field in state
      value={formData.ownerId}
      onChange={handleChange} // Use the existing handleChange helper
      className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all hover:border-gray-300 ${
        errors.ownerId ? 'border-red-500 bg-red-50' : 'border-gray-200'
      }`}
    >
      <option value="">Select a house owner...</option>
      {getManagedOwnersOptions().map((owner) => (
        <option key={owner.value} value={owner.value}>
          {owner.label}
        </option>
      ))}
    </select>

    {/* Loading and pagination info */}
    <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
      <div className="flex items-center gap-2">
        {ownersLoading || ownersFetching ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>Loading house owners...</span>
          </>
        ) : (
          <span>
            Showing {getManagedOwnersOptions().length} of {managedOwnersResponse?.meta?.total || 0} owners
          </span>
        )}
      </div>
      
      {managedOwnersResponse?.meta?.totalPages > 1 && (
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1">
          <button
            type="button"
            onClick={() => setOwnersPage(p => Math.max(1, p - 1))}
            disabled={ownersPage === 1}
            className="p-1 hover:text-primary-600 disabled:opacity-30"
          >
            ←
          </button>
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            {ownersPage} / {managedOwnersResponse.meta.totalPages}
          </span>
          <button
            type="button"
            onClick={() => setOwnersPage(p => Math.min(managedOwnersResponse.meta.totalPages, p + 1))}
            disabled={ownersPage === managedOwnersResponse.meta.totalPages}
            className="p-1 hover:text-primary-600 disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}
    </div>

    {errors.ownerId && (
      <p className="text-red-500 text-xs mt-1 ml-1 flex items-center gap-1">
        <X size={12} /> {errors.ownerId}
      </p>
    )}
  </div>
)}

        {/* House Owner View - Show read-only info */}
        {isHouseOwner && (
          <div className="bg-primary-50 p-4 rounded-xl border border-primary-100">
            <div className="flex items-center gap-3">
              <User size={20} className="text-primary-500" />
              <div>
                <p className="text-sm font-medium text-primary-800">Creating house for:</p>
                <p className="text-lg font-bold text-primary-900">{user?.name}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
              <Building size={16} /> House Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all hover:border-gray-300 ${
                errors.name ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}
              placeholder="e.g., Proshanti, Kuhelika"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1 ml-1 flex items-center gap-1">
                <X size={12} /> {errors.name}
              </p>
            )}
          </div>

        {/* Address Field */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
            <MapPin size={16} /> Full Address *
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="2"
            className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none
              ${errors.address ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
            placeholder="Enter complete address including street, building, area..."
          />
          {errors.address && (
            <p className="text-red-500 text-xs mt-1 ml-1 flex items-center gap-1">
              <X size={12} /> {errors.address}
            </p>
          )}
        </div>

        {/* Grid Row: Location Details and Flat Count */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
              <Info size={16} /> Location Landmarks
            </label>
            <input
              type="text"
              name="metadata.locationDetails"
              value={formData.metadata.locationDetails}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all hover:border-gray-300"
              placeholder="e.g., Near City Bank, Opposite Park"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
              <Layers size={16} /> Total Flats *
            </label>
            <input
              type="number"
              name="flatCount"
              value={formData.flatCount}
              onChange={handleChange}
              min="1"
              max="100"
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all
                ${errors.flatCount ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
            />
            {errors.flatCount && (
              <p className="text-red-500 text-xs mt-1 ml-1 flex items-center gap-1">
                <X size={12} /> {errors.flatCount}
              </p>
            )}
          </div>
        </div>

        {/* Description Field */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Description</label>
          <textarea
            name="metadata.description"
            value={formData.metadata.description}
            onChange={handleChange}
            rows="3"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none hover:border-gray-300"
            placeholder="Describe the property, features, notes..."
          />
        </div>

        {/* Amenities Section - UPDATED */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
              <DollarSign size={16} /> Amenities / Service Charges
            </label>
            {totalAmenitiesCharge > 0 && (
              <div className="text-sm bg-primary-50 text-primary-700 px-3 py-1 rounded-full font-medium">
                Total: ${totalAmenitiesCharge.toFixed(2)}
              </div>
            )}
          </div>
          
          <AmenitiesInput
            value={formData.metadata.amenities}
            onChange={handleAmenitiesChange}
          />
          
          {errors.amenities && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <X size={12} /> {errors.amenities}
            </p>
          )}
          
          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-1">Note:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>These charges will be added to the base rent for each flat</li>
              <li>Charges can be updated later if needed</li>
              <li>Each flat can have customized charges if required</li>
            </ul>
          </div>
        </div>

        {/* Web Owner Only - Status Toggle */}
        {isWebOwner && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Publish Status</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="active"
                  value="false"
                  checked={formData.active === false}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-gray-700">Inactive (Draft)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="active"
                  value="true"
                  checked={formData.active === true}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-gray-700">Active (Live)</span>
              </label>
            </div>
          </div>
        )}

        {/* Status Info Box */}
        <div className="bg-primary-50 p-4 rounded-xl border border-primary-100">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-primary-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary-800">
                {isWebOwner && "✓ House will be created and immediately visible to all users."}
                {isStaff && "✓ House will be created as inactive and requires admin approval."}
                {isHouseOwner && "✓ House will be created as inactive and requires manager approval."}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
          <Btn
            type="button"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Btn>
          <Btn
            onClick={handleSubmit}
            type="primary"
            disabled={isLoading}
            className='flex gap-2'
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating Property...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Property
              </>
            )}
          </Btn>
        </div>
      </form>
    </div>
  );
};

export default CreateHouseForm;