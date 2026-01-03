// components/common/MetadataInput.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const MetadataInput = ({
  value = {},
  onChange,
  fixedFields = [], // Array of { key, label, type, required, options, defaultValue, disabled }
  placeholder = 'Add key-value pairs',
  label = 'Metadata',
  description = 'Add additional metadata as key-value pairs',
  hideFixedFields = false,
}) => {

  console.log(fixedFields);
  
  const [customFields, setCustomFields] = useState([]);
  const [fixedFieldValues, setFixedFieldValues] = useState({});
  const [isExpanded, setIsExpanded] = useState(true);

  const lastValueRef = useRef(JSON.stringify(value));

  // 1. Sync internal state when external 'value' changes
  useEffect(() => {
    const stringifiedValue = JSON.stringify(value);
    
    // Only update internal state if the prop value is actually different from 
    // what we last sent up or what we currently have
    if (stringifiedValue !== lastValueRef.current) {
      const initialFixed = {};
      const initialCustom = [];
      
      Object.entries(value || {}).forEach(([key, val]) => {
        const isFixed = fixedFields.some(field => field.key === key);
        if (isFixed) {
          initialFixed[key] = val;
        } else {
          initialCustom.push({ key, value: val });
        }
      });
      
      setFixedFieldValues(initialFixed);
      setCustomFields(initialCustom);
      lastValueRef.current = stringifiedValue;
    }
  }, [value, fixedFields]);

  // 2. Centralized Change Handler
  const notifyChange = (fixedVals, customFlds) => {
    const combined = { ...fixedVals };
    customFlds.forEach(field => {
      if (field.key && field.key.trim() !== '') {
        combined[field.key.trim()] = field.value;
      }
    });
    
    // Clean empty values
    Object.keys(combined).forEach(key => {
      if (combined[key] === '' || combined[key] === undefined || combined[key] === null) {
        delete combined[key];
      }
    });

    const stringifiedResult = JSON.stringify(combined);
    if (stringifiedResult !== lastValueRef.current) {
      lastValueRef.current = stringifiedResult;
      onChange(combined);
    }
  };

  // 3. UI Handlers
  const handleFixedFieldChange = (key, newValue) => {
    const newFixedValues = { ...fixedFieldValues, [key]: newValue };
    setFixedFieldValues(newFixedValues);
    notifyChange(newFixedValues, customFields);
  };

  const handleCustomFieldChange = (index, field, newValue) => {
    const newCustomFields = [...customFields];
    newCustomFields[index][field] = newValue;
    setCustomFields(newCustomFields);
    notifyChange(fixedFieldValues, newCustomFields);
  };

  const handleAddCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
    // No need to notifyChange yet as key is empty
  };

  const handleRemoveCustomField = (index) => {
    const newCustomFields = customFields.filter((_, i) => i !== index);
    setCustomFields(newCustomFields);
    notifyChange(fixedFieldValues, newCustomFields);
  };

//   const handleChange = (fixedVals, customFlds) => {
//     // Combine fixed and custom fields
//     const combined = { ...fixedVals };
//     customFlds.forEach(field => {
//       if (field.key && field.key.trim() !== '') {
//         combined[field.key.trim()] = field.value;
//       }
//     });
    
//     // Remove empty keys
//     Object.keys(combined).forEach(key => {
//       if (combined[key] === '' || combined[key] === undefined || combined[key] === null) {
//         delete combined[key];
//       }
//     });
    
//     onChange(combined);
//   };

  const renderFixedField = (field) => {
    const {
      key,
      label: fieldLabel,
      type = 'text',
      required = false,
      options = [],
      disabled = false,
      placeholder: fieldPlaceholder = '',
      description: fieldDescription = ''
    } = field;

    const value = fixedFieldValues[key] || '';

    switch (type) {
      case 'select':
        return (
          <div key={key} className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              {fieldLabel} {required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleFixedFieldChange(key, e.target.value)}
              disabled={disabled}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition ${
                disabled ? 'bg-gray-100 text-gray-500' : 'bg-white border-gray-300'
              }`}
              required={required}
            >
              <option value="">Select {fieldLabel}</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldDescription && (
              <p className="text-gray-500 text-sm mt-1">{fieldDescription}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={key} className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              {fieldLabel} {required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => handleFixedFieldChange(key, e.target.value)}
              disabled={disabled}
              placeholder={fieldPlaceholder}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition ${
                disabled ? 'bg-gray-100 text-gray-500' : 'bg-white border-gray-300'
              }`}
              required={required}
            />
            {fieldDescription && (
              <p className="text-gray-500 text-sm mt-1">{fieldDescription}</p>
            )}
          </div>
        );

      default: // text
        return (
          <div key={key} className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              {fieldLabel} {required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleFixedFieldChange(key, e.target.value)}
              disabled={disabled}
              placeholder={fieldPlaceholder}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition ${
                disabled ? 'bg-gray-100 text-gray-500' : 'bg-white border-gray-300'
              }`}
              required={required}
            />
            {fieldDescription && (
              <p className="text-gray-500 text-sm mt-1">{fieldDescription}</p>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
          {description && (
            <p className="text-gray-500 text-sm mt-1">{description}</p>
          )}
        </div>
        {!hideFixedFields && fixedFields.length > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center text-sm text-primary-600 hover:text-primary-800"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Hide fields
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show fields
              </>
            )}
          </button>
        )}
      </div>

      {/* Fixed Fields Section */}
      {!hideFixedFields && isExpanded && fixedFields.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          {fixedFields.map(renderFixedField)}
        </div>
      )}

      {/* Custom Fields Section */}
      <div className="space-y-3">
        {customFields.map((field, index) => (
          <div key={index} className="flex gap-3 items-start">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Key"
                value={field.key}
                onChange={(e) => handleCustomFieldChange(index, 'key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                placeholder="Value"
                value={field.value}
                onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => handleRemoveCustomField(index)}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
              title="Remove field"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddCustomField}
          className="flex items-center px-4 py-2 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Key-Value Pair
        </button>
      </div>

      {/* JSON Preview (Optional) */}
      <div className="mt-4">
        <details className="border rounded-lg">
          <summary className="px-4 py-2 cursor-pointer text-sm font-medium text-gray-700">
            JSON Preview
          </summary>
          <pre className="px-4 py-3 bg-gray-50 text-sm overflow-x-auto max-h-40">
            {JSON.stringify({ ...fixedFieldValues, ...Object.fromEntries(
              customFields
                .filter(f => f.key && f.key.trim() !== '')
                .map(f => [f.key.trim(), f.value])
            ) }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default MetadataInput;