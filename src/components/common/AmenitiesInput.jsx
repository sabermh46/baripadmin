// components/common/AmenitiesInput.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, DollarSign } from 'lucide-react';

const AmenitiesInput = ({ value = [], onChange }) => {
  const [amenities, setAmenities] = useState(value);
  const [newAmenity, setNewAmenity] = useState({ name: '', charge: '' });

  // Sync local state with prop value when it changes
  useEffect(() => {
    if (value && Array.isArray(value)) {
      // Ensure all amenities have proper structure
      const formattedAmenities = value.map(amenity => ({
        name: amenity.name || '',
        charge: amenity.charge || 0
      }));
      setAmenities(formattedAmenities);
    } else {
      setAmenities([]);
    }
  }, [value]);

  const handleAdd = () => {
    if (newAmenity.name.trim() && newAmenity.charge !== '') {
      const chargeValue = parseFloat(newAmenity.charge) || 0;
      const updated = [...amenities, {
        name: newAmenity.name.trim(),
        charge: chargeValue
      }];
      setAmenities(updated);
      onChange(updated);
      setNewAmenity({ name: '', charge: '' });
    }
  };

  const handleRemove = (index) => {
    const updated = amenities.filter((_, i) => i !== index);
    setAmenities(updated);
    onChange(updated);
  };

  const handleChange = (index, field, value) => {
    const updated = [...amenities];
    if (field === 'charge') {
      updated[index][field] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setAmenities(updated);
    onChange(updated);
  };

  const totalCharge = amenities.reduce((sum, item) => sum + (parseFloat(item.charge) || 0), 0);

  // Handle Enter key press in input fields
  const handleKeyDown = (e, callback) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      callback();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700">
          Amenities / Service Charges
        </label>
        <div className="text-sm text-gray-500">
          Total: <span className="font-bold">${totalCharge.toFixed(2)}</span>
        </div>
      </div>

      {/* Existing amenities */}
      {amenities.map((amenity, index) => (
        <div key={index} className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <input
              type="text"
              value={amenity.name}
              onChange={(e) => handleChange(index, 'name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              placeholder="Amenity name"
              onKeyDown={(e) => handleKeyDown(e, () => e.target.blur())}
            />
          </div>
          <div className="w-32">
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={amenity.charge}
                onChange={(e) => handleChange(index, 'charge', e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                placeholder="0.00"
                step="0.01"
                min="0"
                onKeyDown={(e) => handleKeyDown(e, () => e.target.blur())}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleRemove(index)}
            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
            title="Remove amenity"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {/* Add new amenity */}
      <div className="flex gap-3 items-center p-3 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="flex-1">
          <input
            type="text"
            value={newAmenity.name}
            onChange={(e) => setNewAmenity({ ...newAmenity, name: e.target.value })}
            onKeyDown={(e) => handleKeyDown(e, handleAdd)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            placeholder="New amenity name"
          />
        </div>
        <div className="w-32">
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={newAmenity.charge}
              onChange={(e) => setNewAmenity({ ...newAmenity, charge: e.target.value })}
              onKeyDown={(e) => handleKeyDown(e, handleAdd)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newAmenity.name.trim() || newAmenity.charge === ''}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add
        </button>
      </div>

      {amenities.length === 0 && (
        <div className="text-center py-4 text-gray-500 italic">
          No amenities added yet. Add amenities with their charges.
        </div>
      )}

      <div className="text-sm text-gray-500">
        These charges will be added to rent payments for flats in this house.
      </div>
    </div>
  );
};

export default AmenitiesInput;