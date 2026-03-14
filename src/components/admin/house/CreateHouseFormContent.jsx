import React, { useState } from 'react';
import {
  Building,
  MapPin,
  Layers,
  Info,
  Loader2,
  Save,
  DollarSign,
} from 'lucide-react';
import { useCreateHouseMutation } from '../../../store/api/houseApi';
import { toast } from 'react-toastify';
import AmenitiesInput from '../../common/AmenitiesInput';

/**
 * Create-house form content. Renders inside Modal (used e.g. on admin house owner detail).
 * When ownerId is provided, the house is created for that owner.
 */
const CreateHouseFormContent = ({ ownerId, ownerName, onSuccess, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    flatCount: 1,
    metadata: {
      description: '',
      amenities: [],
      locationDetails: '',
    },
    active: true,
  });
  const [errors, setErrors] = useState({});

  const [createHouse, { isLoading }] = useCreateHouseMutation();

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (name.startsWith('metadata.')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        metadata: { ...prev.metadata, [field]: value },
      }));
    } else if (name === 'active') {
      setFormData((prev) => ({ ...prev, [name]: value === 'true' }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'number' ? Math.max(1, parseInt(value, 10) || 0) : value,
      }));
    }
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleAmenitiesChange = (amenities) => {
    setFormData((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, amenities },
    }));
    if (errors.amenities) setErrors((prev) => ({ ...prev, amenities: undefined }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = 'House name is required';
    if (!formData.address?.trim()) newErrors.address = 'Address is required';
    if (formData.flatCount < 1) newErrors.flatCount = 'Must have at least 1 flat';
    if (formData.metadata?.amenities && Array.isArray(formData.metadata.amenities)) {
      const invalid = formData.metadata.amenities.filter(
        (a) => !a.name?.trim() || (a.charge === undefined && a.charge !== 0)
      );
      if (invalid.length > 0) newErrors.amenities = 'All amenities must have name and charge';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      ...formData,
      ownerId: ownerId || formData.ownerId,
    };
    if (!payload.ownerId) {
      toast.error('Owner is required');
      return;
    }
    try {
      const result = await createHouse(payload).unwrap();
      toast.success('Property created successfully');
      onSuccess?.(result?.data);
      onClose?.();
      setFormData({
        name: '',
        address: '',
        flatCount: 1,
        metadata: { description: '', amenities: [], locationDetails: '' },
        active: true,
      });
      setErrors({});
    } catch (err) {
      toast.error(err?.data?.error || 'Failed to create property');
    }
  };

  const totalAmenitiesCharge =
    formData.metadata?.amenities?.reduce(
      (sum, a) => sum + (parseFloat(a.charge) || 0),
      0
    ) || 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {ownerName && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-primary-800">
          <strong>Owner:</strong> {ownerName}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Building className="inline w-4 h-4 mr-1" /> House Name *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Proshanti, Kuhelika"
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <MapPin className="inline w-4 h-4 mr-1" /> Full Address *
        </label>
        <textarea
          name="address"
          value={formData.address}
          onChange={handleChange}
          rows={2}
          placeholder="Street, building, area..."
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 resize-none ${
            errors.address ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Info className="inline w-4 h-4 mr-1" /> Location Landmarks
          </label>
          <input
            type="text"
            name="metadata.locationDetails"
            value={formData.metadata.locationDetails}
            onChange={handleChange}
            placeholder="e.g. Near City Bank"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Layers className="inline w-4 h-4 mr-1" /> Total Flats *
          </label>
          <input
            type="number"
            name="flatCount"
            value={formData.flatCount}
            onChange={handleChange}
            min={1}
            max={100}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 ${
              errors.flatCount ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.flatCount && <p className="text-red-500 text-xs mt-1">{errors.flatCount}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          name="metadata.description"
          value={formData.metadata.description}
          onChange={handleChange}
          rows={2}
          placeholder="Property notes..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            <DollarSign className="inline w-4 h-4 mr-1" /> Amenities / Service Charges
          </label>
          {totalAmenitiesCharge > 0 && (
            <span className="text-sm text-primary-600 font-medium">
              Total: ৳{totalAmenitiesCharge.toLocaleString()}
            </span>
          )}
        </div>
        <AmenitiesInput
          value={formData.metadata.amenities}
          onChange={handleAmenitiesChange}
        />
        {errors.amenities && <p className="text-red-500 text-xs mt-1">{errors.amenities}</p>}
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="active"
            value="true"
            checked={formData.active === true}
            onChange={handleChange}
            className="w-4 h-4 text-primary-600"
          />
          <span className="text-sm text-gray-700">Active</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="active"
            value="false"
            checked={formData.active === false}
            onChange={handleChange}
            className="w-4 h-4 text-primary-600"
          />
          <span className="text-sm text-gray-700">Inactive (Draft)</span>
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Property
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default CreateHouseFormContent;
