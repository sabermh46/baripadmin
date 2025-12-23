import React, { useState, useEffect } from 'react';
import { Home, Plus, X, Save, User, Info, Loader2, Building, MapPin, Layers, CheckCircle } from 'lucide-react';
import { useCreateHouseMutation, useGetManagedOwnersQuery } from '../../../store/api/houseApi';
import { useAuth } from '../../../hooks';
import Btn from '../../common/Button';
import { toast } from 'react-toastify';

const CreateHouseForm = ({ onSuccess, onCancel }) => {
  const { user, isWebOwner, isHouseOwner, isCaretaker, isStaff } = useAuth();
  
  const [formData, setFormData] = useState({
    ownerId: '',
    address: '',
    flatCount: 1,
    name: '',
    metadata: {
      description: '',
      amenities: [],
      locationDetails: '',
    },
    active: false,
  });

  const [amenityInput, setAmenityInput] = useState('');
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // Use managed owners list only if user is staff
  const { data: managedOwners, isLoading: ownersLoading } = useGetManagedOwnersQuery(undefined, {
    
  });
  console.log('Managed Owners:', managedOwners);

  const [createHouse, { isLoading, error, reset }] = useCreateHouseMutation();



  useEffect(() => {
    // If the logged-in user is a House Owner, auto-fill their own ID as the owner
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
    console.log(newErrors);
    
    Object.keys(newErrors).length > 0 && toast.error(`${
        Object.values(newErrors).join(` \n `)
    }`)
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
      // Handle active field (boolean)
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

  const handleAddAmenity = () => {
    const val = amenityInput.trim();
    if (val && !formData.metadata.amenities.includes(val)) {
      setFormData(prev => ({
        ...prev,
        metadata: { ...prev.metadata, amenities: [...prev.metadata.amenities, val] }
      }));
      setAmenityInput('');
    }
  };

  const handleRemoveAmenity = (index) => {
    setFormData(prev => ({
      ...prev,
      metadata: { ...prev.metadata, amenities: prev.metadata.amenities.filter((_, i) => i !== index) }
    }));
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
          metadata: { description: '', amenities: [], locationDetails: '' },
          active: false,
        });
        if (onSuccess) onSuccess(result.data);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  // Permission Check
  const canCreate = isWebOwner || ( (isStaff || isHouseOwner) && user?.permissions?.includes('houses.create'));
  
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
              <User size={16} /> Assigned House Owner *
            </label>
            <div className="relative">
              <select
                name="ownerId"
                value={formData.ownerId}
                onChange={handleChange}
                disabled={ownersLoading}
                className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all appearance-none
                  ${errors.ownerId ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}
                  ${ownersLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">Select an owner...</option>
                {ownersLoading ? (
                  <option value="" disabled>Loading owners...</option>
                ) : (
                  managedOwners?.data?.map(owner => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name} ({owner.email})
                    </option>
                  ))
                )}
              </select>
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              {errors.ownerId && (
                <p className="text-red-500 text-xs mt-1 ml-1 flex items-center gap-1">
                  <X size={12} /> {errors.ownerId}
                </p>
              )}
            </div>
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
              <Info size={16} /> House Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all hover:border-gray-300"
              placeholder="e.g., Near City Bank, Opposite Park"
            />
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

        {/* Amenities Section */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
            <Plus size={16} /> Property Amenities
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={amenityInput}
              onChange={(e) => setAmenityInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddAmenity();
                }
              }}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all hover:border-gray-300"
              placeholder="e.g., Generator, CCTV, Lift, Parking"
            />
            <button
              type="button"
              onClick={handleAddAmenity}
              disabled={!amenityInput.trim()}
              className="px-5 py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={18} /> Add
            </button>
          </div>
          
          {/* Amenities Chips */}
          {formData.metadata.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {formData.metadata.amenities.map((amenity, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-primary-200 text-primary-700 rounded-lg font-medium shadow-sm"
                >
                  <span>{amenity}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAmenity(index)}
                    className="text-primary-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
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