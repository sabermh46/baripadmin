import React, { useState } from 'react';
import { useGenerateTokenMutation } from '../../../store/api/authApi';
import { toast } from 'react-toastify';

const GenerateToken = () => {
  const [generateToken, { isLoading }] = useGenerateTokenMutation();
  
  const [formData, setFormData] = useState({
    email: '',
    roleSlug: 'house_owner',
    expiresInHours: 24,
    metadata: '{}'
  });
  
  const [validationErrors, setValidationErrors] = useState({});
  const [generatedToken, setGeneratedToken] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Role validation
    const validRoles = ['house_owner', 'staff', 'caretaker'];
    if (!validRoles.includes(formData.roleSlug)) {
      errors.roleSlug = 'Please select a valid role';
    }
    
    // ExpiresInHours validation
    const hours = parseInt(formData.expiresInHours);
    if (isNaN(hours) || hours < 1 || hours > 720) { // Assuming max 30 days (720 hours)
      errors.expiresInHours = 'Please enter a value between 1 and 720 hours';
    }
    
    // Metadata validation (must be valid JSON)
    try {
      JSON.parse(formData.metadata);
    } catch (error) {
      errors.metadata = 'Metadata must be valid JSON:' + error.message;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }
    
    try {
      const requestData = {
        ...formData,
        expiresInHours: parseInt(formData.expiresInHours),
        metadata: JSON.parse(formData.metadata)
      };
      
      const response = await generateToken(requestData).unwrap();
      
      // Store the generated token
      setGeneratedToken(response.data);
      
      // Show success toast
      toast.success('Token generated successfully!');
      
      // Reset form
      setFormData({
        email: '',
        roleSlug: 'house_owner',
        expiresInHours: 24,
        metadata: '{}'
      });
      
    } catch (error) {
      console.error('Token generation failed:', error);
      
      // Handle different error structures
      let errorMessage = 'Failed to generate token';
      
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(`Error: ${errorMessage}`);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast.success('Copied to clipboard!');
      })
      .catch(() => {
        toast.error('Failed to copy to clipboard');
      });
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Generate Access Token</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded ${
              validationErrors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="user@example.com"
          />
          {validationErrors.email && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
          )}
        </div>
        
        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Role *
          </label>
          <select
            name="roleSlug"
            value={formData.roleSlug}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded ${
              validationErrors.roleSlug ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="house_owner">House Owner</option>
            <option value="staff">Staff</option>
            <option value="caretaker">Caretaker</option>
          </select>
          {validationErrors.roleSlug && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.roleSlug}</p>
          )}
        </div>
        
        {/* Expiration Hours */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Expires In (Hours) *
          </label>
          <input
            type="number"
            name="expiresInHours"
            value={formData.expiresInHours}
            onChange={handleChange}
            min="1"
            max="720"
            className={`w-full px-3 py-2 border rounded ${
              validationErrors.expiresInHours ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {validationErrors.expiresInHours && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.expiresInHours}</p>
          )}
        </div>
        
        {/* Metadata Field */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Metadata (JSON) *
          </label>
          <textarea
            name="metadata"
            value={formData.metadata}
            onChange={handleChange}
            rows="4"
            className={`w-full px-3 py-2 border rounded font-mono text-sm ${
              validationErrors.metadata ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder='{"customField": "value"}'
          />
          {validationErrors.metadata && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.metadata}</p>
          )}
          <p className="text-gray-500 text-sm mt-1">
            Enter valid JSON (e.g., {"{}"} for empty object)
          </p>
        </div>
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded font-medium ${
            isLoading
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {isLoading ? 'Generating Token...' : 'Generate Token'}
        </button>
      </form>
      
      {/* Display Generated Token */}
      {generatedToken && (
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded">
          <h2 className="text-lg font-semibold text-green-800 mb-2">
            ✅ Token Generated Successfully
          </h2>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-green-700">
                Access Token
              </label>
              <div className="flex items-center mt-1">
                <code className="flex-1 p-2 bg-green-100 rounded text-sm overflow-x-auto">
                  {generatedToken.token}
                </code>
                <button
                  onClick={() => copyToClipboard(generatedToken.token)}
                  className="ml-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Token expires at: {new Date(generatedToken.expiresAt).toLocaleString()}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm">{generatedToken.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Role</p>
                <p className="text-sm">{generatedToken.roleSlug}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Created By</p>
                <p className="text-sm">{generatedToken.metadata.createdByEmail}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Creator Name</p>
                <p className="text-sm">{generatedToken.metadata.createdByName}</p>
              </div>
            </div>
            
            <div>
              <button
                onClick={() => setGeneratedToken(null)}
                className="mt-2 text-sm text-green-700 hover:text-green-900"
              >
                Clear Results
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Display (if not using toast) - alternative approach */}
      {validationErrors._form && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600">{validationErrors._form}</p>
        </div>
      )}
    </div>
  );
};

export default GenerateToken;