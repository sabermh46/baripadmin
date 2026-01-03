// components/common/EnhancedMetadataInput.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  FolderTree,
  Folder,
  File,
  ArrowRight,
  ChevronRight,
  ChevronDown as ChevronDownIcon,
  Edit,
  Save,
  X
} from 'lucide-react';

const EnhancedMetadataInput = ({
  value = {},
  onChange,
  fixedFields = [],
  placeholder = 'Add key-value pairs',
  label = 'Metadata',
  description = 'Add structured metadata with nested objects and arrays',
  hideFixedFields = false,
  allowNesting = true,
  allowArrays = true,
}) => {
  
  const [structure, setStructure] = useState([]);
  const [fixedFieldValues, setFixedFieldValues] = useState({});
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingPath, setEditingPath] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  const lastValueRef = useRef(JSON.stringify(value));

  // Helper to convert object to structure array
  const objectToStructure = (obj, path = '', parentType = 'object') => {
    const result = [];
    
    if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([key, val]) => {
        const currentPath = path ? `${path}.${key}` : key;
        const item = {
          path: currentPath,
          key,
          value: val,
          type: Array.isArray(val) ? 'array' : (val && typeof val === 'object' ? 'object' : 'primitive'),
          depth: path.split('.').length,
          parentType,
        };
        
        result.push(item);
        
        // Recursively add children for objects and arrays
        if (item.type === 'object' || item.type === 'array') {
          const children = objectToStructure(val, currentPath, item.type);
          result.push(...children);
        }
      });
    }
    
    return result;
  };

  // Helper to convert structure back to object
  const structureToObject = (struct) => {
    const result = {};
    
    struct.forEach(item => {
      if (item.type === 'primitive' || item.type === 'empty-object' || item.type === 'empty-array') {
        const keys = item.path.split('.');
        let current = result;
        
        // Build the nested structure
        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];
          if (!current[key]) {
            current[key] = {};
          }
          current = current[key];
        }
        
        const lastKey = keys[keys.length - 1];
        if (item.type === 'empty-object') {
          current[lastKey] = {};
        } else if (item.type === 'empty-array') {
          current[lastKey] = [];
        } else {
          current[lastKey] = item.value;
        }
      }
    });
    
    return result;
  };

  // Initialize from props
  useEffect(() => {
    const stringifiedValue = JSON.stringify(value);
    
    if (stringifiedValue !== lastValueRef.current) {
      // Separate fixed fields from custom fields
      const initialFixed = {};
      const customObj = {};
      
      Object.entries(value || {}).forEach(([key, val]) => {
        const isFixed = fixedFields.some(field => field.key === key);
        if (isFixed) {
          initialFixed[key] = val;
        } else {
          customObj[key] = val;
        }
      });
      
      setFixedFieldValues(initialFixed);
      const struct = objectToStructure(customObj);
      setStructure(struct);
      lastValueRef.current = stringifiedValue;
    }
  }, [value, fixedFields]);

  // Notify parent of changes
  const notifyChange = (fixedVals, struct) => {
    const customObj = structureToObject(struct);
    const combined = { ...fixedVals, ...customObj };
    
    const stringifiedResult = JSON.stringify(combined);
    if (stringifiedResult !== lastValueRef.current) {
      lastValueRef.current = stringifiedResult;
      onChange(combined);
    }
  };

  const handleFixedFieldChange = (key, newValue) => {
    const newFixedValues = { ...fixedFieldValues, [key]: newValue };
    setFixedFieldValues(newFixedValues);
    notifyChange(newFixedValues, structure);
  };

  const addField = (parentPath = '', type = 'primitive') => {
    const newItem = {
      path: parentPath ? `${parentPath}.newField` : 'newField',
      key: 'newField',
      value: type === 'array' ? [] : (type === 'object' ? {} : ''),
      type: type === 'array' ? 'empty-array' : (type === 'object' ? 'empty-object' : 'primitive'),
      depth: parentPath.split('.').length,
      parentType: parentPath ? getParentType(parentPath) : 'object',
    };
    
    setStructure([...structure, newItem]);
    setEditingPath(newItem.path);
    setEditValue('');
  };

  const addArrayItem = (arrayPath) => {
    const newItem = {
      path: `${arrayPath}[0]`,
      key: '0',
      value: '',
      type: 'primitive',
      depth: arrayPath.split('.').length + 1,
      parentType: 'array',
    };
    
    setStructure([...structure, newItem]);
    setEditingPath(newItem.path);
    setEditValue('');
  };

  const getParentType = (path) => {
    const parent = structure.find(item => item.path === path);
    return parent ? parent.type : 'object';
  };

  const handleEditStart = (path, currentValue) => {
    setEditingPath(path);
    setEditValue(currentValue);
  };

  const handleEditSave = () => {
    if (!editingPath) return;
    
    const newStructure = structure.map(item => {
      if (item.path === editingPath) {
        // Parse value based on input
        let parsedValue = editValue;
        if (editValue.startsWith('{') || editValue.startsWith('[')) {
          try {
            parsedValue = JSON.parse(editValue);
          } catch (e) {
            // Keep as string if invalid JSON
          }
        }
        
        return {
          ...item,
          value: parsedValue,
          type: Array.isArray(parsedValue) ? 'array' : 
                (parsedValue && typeof parsedValue === 'object' ? 'object' : 'primitive')
        };
      }
      return item;
    });
    
    setStructure(newStructure);
    setEditingPath(null);
    setEditValue('');
    notifyChange(fixedFieldValues, newStructure);
  };

  const handleDelete = (path) => {
    // Remove item and all its children
    const newStructure = structure.filter(item => 
      !item.path.startsWith(path + '.') && item.path !== path
    );
    setStructure(newStructure);
    notifyChange(fixedFieldValues, newStructure);
  };

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

  const renderStructureItem = (item, index) => {
    const isEditing = editingPath === item.path;
    const indent = item.depth * 20;
    
    return (
      <div key={index} className="mb-2">
        <div 
          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
          style={{ marginLeft: `${indent}px` }}
        >
          {item.type === 'object' || item.type === 'empty-object' ? (
            <Folder className="h-4 w-4 text-blue-500" />
          ) : item.type === 'array' || item.type === 'empty-array' ? (
            <FolderTree className="h-4 w-4 text-green-500" />
          ) : (
            <File className="h-4 w-4 text-gray-500" />
          )}
          
          {isEditing ? (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 px-2 py-1 border rounded"
                placeholder={item.type.includes('object') ? '{"key": "value"}' : 'Value'}
              />
              <button
                onClick={handleEditSave}
                className="p-1 text-green-600 hover:text-green-800"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setEditingPath(null);
                  setEditValue('');
                }}
                className="p-1 text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <span className="font-medium text-gray-700">{item.key}:</span>
              <span className="text-gray-600 truncate">
                {item.type === 'object' ? '{...}' : 
                 item.type === 'array' ? '[...]' : 
                 JSON.stringify(item.value)}
              </span>
              <div className="ml-auto flex gap-1">
                <button
                  onClick={() => handleEditStart(item.path, item.value)}
                  className="p-1 text-blue-600 hover:text-blue-800"
                >
                  <Edit className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleDelete(item.path)}
                  className="p-1 text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </>
          )}
        </div>
        
        {/* Add buttons for objects and arrays */}
        {(item.type === 'empty-object' || item.type === 'empty-array') && (
          <div className="ml-8 mb-2">
            <button
              onClick={() => {
                if (item.type === 'empty-object') {
                  addField(item.path, 'primitive');
                } else {
                  addArrayItem(item.path);
                }
              }}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              + Add {item.type === 'empty-object' ? 'field' : 'item'}
            </button>
          </div>
        )}
      </div>
    );
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

      {/* Structure Editor */}
      <div className="border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium text-gray-700">Custom Fields</h4>
            <div className="flex gap-2">
              {allowNesting && (
                <button
                  type="button"
                  onClick={() => addField('', 'object')}
                  className="text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                >
                  + Object
                </button>
              )}
              {allowArrays && (
                <button
                  type="button"
                  onClick={() => addField('', 'array')}
                  className="text-sm px-3 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100"
                >
                  + Array
                </button>
              )}
              <button
                type="button"
                onClick={() => addField('', 'primitive')}
                className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                + Field
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4 min-h-[200px]">
          {structure.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No custom fields added yet
            </div>
          ) : (
            structure.map(renderStructureItem)
          )}
        </div>
      </div>

      {/* JSON Preview */}
      <div className="mt-4">
        <details className="border rounded-lg">
          <summary className="px-4 py-2 cursor-pointer text-sm font-medium text-gray-700">
            JSON Preview
          </summary>
          <pre className="px-4 py-3 bg-gray-50 text-sm overflow-x-auto max-h-60">
            {JSON.stringify(structureToObject(structure), null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default EnhancedMetadataInput;