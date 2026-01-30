import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Home, Save, X, Building, MapPin, Layers,
  AlertCircle, CheckCircle, Loader2, ArrowLeft, DollarSign
} from 'lucide-react';
import { useGetHouseDetailsQuery, useUpdateHouseMutation } from '../../../store/api/houseApi';
import { useAuth } from '../../../hooks';
import AmenitiesInput from '../../common/AmenitiesInput';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const HouseEditForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isWebOwner, isHouseOwner, isCaretaker } = useAuth();
  const { t } = useTranslation();

  const { data, isLoading } = useGetHouseDetailsQuery(id);
  const [updateHouse, { isLoading: isUpdating, error }] = useUpdateHouseMutation();

  const [formData, setFormData] = useState({
    address: '',
    flatCount: 1,
    name: '',
    metadata: {
      description: '',
      amenities: [], // Changed to array of objects
      locationDetails: '',
    },
    active: false,
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (data?.data) {
      const house = data.data;
      console.log('House data received:', house); // Debug log
      // Handle both old and new metadata formats
      let metadata = {};
      
      // If metadata is a string, parse it
      if (typeof house.metadata === 'string') {
        try {
          metadata = JSON.parse(house.metadata);
          console.log('Parsed metadata:', metadata); // Debug log
        } catch (e) {
          console.error('Failed to parse metadata:', e);
          metadata = {};
        }
      } else if (house.metadata && typeof house.metadata === 'object') {
        metadata = { ...house.metadata };
      }
      
      // Convert old amenities format (array of strings) to new format (array of objects)
      let amenities = [];
      if (metadata.amenities && Array.isArray(metadata.amenities)) {
        amenities = metadata.amenities.map(amenity => {
          if (typeof amenity === 'string') {
            // Convert old string format to object format
            return { name: amenity, charge: 0 };
          } else if (amenity && typeof amenity === 'object') {
            // Ensure charge is a number
            return {
              name: amenity.name || '',
              charge: amenity.charge ? parseFloat(amenity.charge) : 0
            };
          }
          return { name: '', charge: 0 };
        });
      }
      
      console.log('Processed amenities:', amenities); // Debug log
      
      setFormData({
        address: house.address || '',
        flatCount: house.flatCount || 1,
        name: house.name || '',
        metadata: {
          description: metadata.description || '',
          amenities: amenities,
          locationDetails: metadata.locationDetails || '',
          // Preserve other metadata fields
          ...Object.keys(metadata)
            .filter(key => !['description', 'amenities', 'locationDetails'].includes(key))
            .reduce((obj, key) => {
              obj[key] = metadata[key];
              return obj;
            }, {})
        },
        active: house.active || false,
      });
    }
  }, [data]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.address.trim()) newErrors.address = t('address_is_required');
    if (formData.flatCount < 1) newErrors.flatCount = 'Must have at least 1 flat';
    
    // Validate amenities
    if (formData.metadata.amenities && Array.isArray(formData.metadata.amenities)) {
      const invalidAmenities = formData.metadata.amenities.filter(a => 
        !a.name || !a.name.trim() || a.charge === undefined || a.charge === null
      );
      if (invalidAmenities.length > 0) {
        newErrors.amenities = 'All amenities must have a name and charge';
      }
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
    console.log('Amenities changed:', amenities); // Debug log
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
      const result = await updateHouse({ id, ...formData }).unwrap();
      if (result.success) {
        toast.success(t('property_updated_successfully'));
        setSuccess(true);
        setTimeout(() => {
          navigate(`/houses/${id}`);
        }, 1500);
      }
    } catch (err) {
      console.error('Update error:', err);
      toast.error(t('failed_to_update_property'));
    } 
  }

  // Calculate total amenities charges
  const totalAmenitiesCharge = formData.metadata.amenities?.reduce(
    (sum, amenity) => sum + (parseFloat(amenity.charge) || 0), 
    0
  ) || 0;

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-subdued">Loading property data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/houses/${id}`)}
          className="inline-flex items-center gap-2 text-text hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          
          {t('back_to_property_details')}
        </button>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-secondary/10 text-secondary rounded-lg">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">{t('edit_property')}</h1>
            <p className="text-subdued">{t('update_property_information')}</p>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="bg-surface border border-surface rounded-md p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Update Failed</p>
              <p className="text-sm">{error.data?.error || 'Something went wrong. Please try again.'}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center gap-3 animate-fade-in">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Success!</p>
              <p className="text-sm">Property updated successfully. Redirecting...</p>
            </div>
          </div>
        )}

        {/* House 'active' Field with two radio */}
        <div className='space-y-2'>
            <label className="text-sm font-semibold text-text">Property Active</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  name='active'
                  type="radio"
                  value="true"
                  checked={formData.active === true}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-text">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  name='active'
                  type="radio"
                  value="false"
                  checked={formData.active === false}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-text">Inactive</span>
              </label>
            </div>
        </div>

        <div className="space-y-2">
            <label className="text-sm font-semibold text-text">House Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-background border border-surface rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="e.g., Proshanti Villa"
            />
        </div>

        {/* Address Field */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-text flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Address *
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="2"
            className={`w-full px-4 py-3 bg-background border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none ${
              errors.address ? 'border-red-500 bg-red-50' : 'border-surface'
            }`}
            placeholder="Enter complete property address"
          />
          {errors.address && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <X className="w-3 h-3" /> {errors.address}
            </p>
          )}
        </div>

        {/* Location Details & Flat Count */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text">Location Details</label>
            <input
              type="text"
              name="metadata.locationDetails"
              value={formData.metadata.locationDetails}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-background border border-surface rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              placeholder="e.g., Near City Bank, Opposite Park"
            />
          </div>
          <div className="space-y-2">
            <label className={`text-sm font-semibold flex items-center gap-2 ${(isCaretaker || isHouseOwner) ? 'text-gray-400' : 'text-text'}`}>
              <Layers className="w-4 h-4" /> Max Flat Limit *
            </label>
            <input
              type="number"
              name="flatCount"
              value={formData.flatCount}
              onChange={handleChange}
              disabled={isCaretaker || isHouseOwner}
              min="1"
              className={`w-full px-4 py-3 bg-background border rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none ${
                errors.flatCount ? 'border-red-500 bg-red-50' : 'border-surface'
              }`}
            /> 
            {errors.flatCount && (
              <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                <X className="w-3 h-3" /> {errors.flatCount}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-text">Description</label>
          <textarea
            name="metadata.description"
            value={formData.metadata.description}
            onChange={handleChange}
            rows="3"
            className="w-full px-4 py-3 bg-background border border-surface rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            placeholder="Describe the property features, notes, etc."
          />
        </div>

        {/* Amenities Section - UPDATED */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-text flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Amenities / Service Charges
            </label>
            {totalAmenitiesCharge > 0 && (
              <div className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                Total: ${totalAmenitiesCharge.toFixed(2)}
              </div>
            )}
          </div>
          
          <AmenitiesInput
            value={formData.metadata.amenities}
            onChange={handleAmenitiesChange}
          />
          
          {errors.amenities && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <X className="w-3 h-3" /> {errors.amenities}
            </p>
          )}
          
          <div className="text-sm text-subdued bg-gray-50 p-3 rounded-md">
            <p className="font-medium mb-1">Note:</p>
            <p>These charges will be added to the base rent for flats in this property.</p>
          </div>
        </div>

        {/* Active Status (Web Owner only) */}
        {isWebOwner && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text">Status</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="active"
                  value="false"
                  checked={formData.active === false}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-text">Inactive</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="active"
                  value="true"
                  checked={formData.active === true}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-text">Active</span>
              </label>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-black/20 text-xs md:text-base">
          <button
            type="button"
            onClick={() => navigate(`/houses/${id}`)}
            disabled={isUpdating}
            className="px-6 py-3 text-text hover:bg-surface rounded-md transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isUpdating}
            className="px-2 py-2 bg-primary text-white rounded-sm hover:bg-primary/90 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default HouseEditForm;