import React, { useState, useRef } from 'react';
import { useGenerateTokenMutation } from '../../../store/api/authApi';
import { toast } from 'react-toastify';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Copy, Link, X, Check, Calendar, Mail, User, Shield } from 'lucide-react';

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
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const closeModal = () => {
    setModalIsOpen(false);
  };
  
  const openModal = () => {
    setModalIsOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Email validation - email should be required
    if (formData.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    }
    
    // Role validation
    const validRoles = ['house_owner', 'staff', 'caretaker'];
    if (!validRoles.includes(formData.roleSlug)) {
      errors.roleSlug = 'Please select a valid role';
    }
    
    // ExpiresInHours validation
    const hours = parseInt(formData.expiresInHours);
    if (isNaN(hours) || hours < 1 || hours > 720) {
      errors.expiresInHours = 'Please enter a value between 1 and 720 hours';
    }
    
    // Metadata validation (must be valid JSON)
    try {
      JSON.parse(formData.metadata);
    } catch (error) {
      errors.metadata = 'Metadata must be valid JSON';
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
      
      console.log('Response:', response); // Debug log
      
      // Check if response has data property
      if (response) {
        setGeneratedToken(response);
        openModal();
        toast.success('Token generated successfully!');
        
        // Reset form
        setFormData({
          email: '',
          roleSlug: 'house_owner',
          expiresInHours: 24,
          metadata: '{}'
        });
      } else {
        toast.error('Unexpected response format from server');
      }
      
    } catch (error) {
      console.error('Token generation failed:', error);
      let errorMessage = 'Failed to generate token';
      
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.data?.error) {
        errorMessage = error.data.error;
      }
      
      toast.error(`Error: ${errorMessage}`);
    }
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied to clipboard!`);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatRoleName = (roleSlug) => {
    const roleMap = {
      house_owner: 'House Owner',
      staff: 'Staff',
      caretaker: 'Caretaker'
    };
    return roleMap[roleSlug] || roleSlug;
  };

  // Add a cancel button ref for focus management
  const cancelButtonRef = useRef(null);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Generate Invitation Token</h1>
        <p className="text-gray-600 mt-2">
          Create invitation tokens for users to register with specific roles
        </p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                validationErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="user@example.com"
            />
            {validationErrors.email && (
              <p className="text-red-500 text-sm mt-2">{validationErrors.email}</p>
            )}
          </div>
          
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Role *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {['house_owner', 'staff', 'caretaker'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, roleSlug: role }))}
                  className={`flex items-center justify-center px-4 py-3 border rounded-lg transition-all ${
                    formData.roleSlug === role
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Shield className="h-5 w-5 mr-2" />
                  {formatRoleName(role)}
                </button>
              ))}
            </div>
            {validationErrors.roleSlug && (
              <p className="text-red-500 text-sm mt-2">{validationErrors.roleSlug}</p>
            )}
          </div>
          
          {/* Expiration Hours */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Expires In (Hours) *
            </label>
            <div className="relative">
              <input
                type="number"
                name="expiresInHours"
                value={formData.expiresInHours}
                onChange={handleChange}
                min="1"
                max="720"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                  validationErrors.expiresInHours ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                hours
              </div>
            </div>
            {validationErrors.expiresInHours && (
              <p className="text-red-500 text-sm mt-2">{validationErrors.expiresInHours}</p>
            )}
          </div>
          
          {/* Metadata Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Metadata (JSON) *
              </label>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, metadata: '{}' }))}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Reset to empty object
              </button>
            </div>
            <textarea
              name="metadata"
              value={formData.metadata}
              onChange={handleChange}
              rows="4"
              className={`w-full px-4 py-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
                validationErrors.metadata ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder='{"note": "Optional metadata here"}'
              required
            />
            {validationErrors.metadata && (
              <p className="text-red-500 text-sm mt-2">{validationErrors.metadata}</p>
            )}
            <p className="text-gray-500 text-sm mt-2">
              Optional JSON metadata that will be stored with the token
            </p>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium text-white transition ${
              isLoading
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Token...
              </span>
            ) : (
              'Generate Token'
            )}
          </button>
        </form>
      </div>

      {/* Headless UI Dialog Modal */}
      <Transition appear show={modalIsOpen} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-50" 
          onClose={closeModal}
          initialFocus={cancelButtonRef}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  {generatedToken && (
                    <>
                      {/* Modal Header */}
                      <div className="flex items-center justify-between pb-4 border-b">
                        <div>
                          <Dialog.Title className="text-2xl font-bold text-gray-900 flex items-center">
                            <Check className="h-6 w-6 text-green-500 mr-3" />
                            Token Generated Successfully
                          </Dialog.Title>
                          <p className="text-gray-600 mt-1">
                            Share the registration link with the user
                          </p>
                        </div>
                        <button
                          onClick={closeModal}
                          className="p-2 hover:bg-gray-100 rounded-full transition"
                          aria-label="Close"
                          ref={cancelButtonRef}
                        >
                          <X className="h-5 w-5 text-gray-500" />
                        </button>
                      </div>
                      
                      {/* Modal Content */}
                      <div className="mt-6 space-y-6">
                        {/* Token Section */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Access Token
                          </label>
                          <div className="flex items-center gap-3">
                            <code className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm overflow-x-auto">
                              {generatedToken.token}
                            </code>
                            <button
                              onClick={() => copyToClipboard(generatedToken.token, 'Token')}
                              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center whitespace-nowrap"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Token
                            </button>
                          </div>
                        </div>
                        
                        {/* Registration Link Section */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Registration Link
                          </label>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg overflow-x-auto">
                              <a
                                href={generatedToken.registrationLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                              >
                                <Link className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span className="truncate">{generatedToken.registrationLink}</span>
                              </a>
                            </div>
                            <button
                              onClick={() => copyToClipboard(generatedToken.registrationLink, 'Registration link')}
                              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center whitespace-nowrap"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Link
                            </button>
                          </div>
                        </div>
                        
                        {/* Token Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center mb-2">
                              <Mail className="h-5 w-5 text-gray-500 mr-2" />
                              <span className="text-sm font-medium text-gray-700">Email</span>
                            </div>
                            <p className="text-gray-900">{generatedToken.email}</p>
                          </div>
                          
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center mb-2">
                              <User className="h-5 w-5 text-gray-500 mr-2" />
                              <span className="text-sm font-medium text-gray-700">Role</span>
                            </div>
                            <p className="text-gray-900">{formatRoleName(generatedToken.roleSlug)}</p>
                          </div>
                          
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center mb-2">
                              <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                              <span className="text-sm font-medium text-gray-700">Expires At</span>
                            </div>
                            <p className="text-gray-900">
                              {new Date(generatedToken.expiresAt).toLocaleString()}
                            </p>
                          </div>
                          
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center mb-2">
                              <Shield className="h-5 w-5 text-gray-500 mr-2" />
                              <span className="text-sm font-medium text-gray-700">Status</span>
                            </div>
                            <p className="text-green-600 font-medium">Active</p>
                          </div>
                        </div>
                        
                        {/* Warning Message */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800">Important</h3>
                              <div className="mt-2 text-sm text-yellow-700 space-y-1">
                                <p>• This token can only be used once for registration</p>
                                <p>• The link expires on the date shown above</p>
                                <p>• Share the registration link securely with the intended user</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Modal Footer */}
                      <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
                        <button
                          onClick={closeModal}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                        >
                          Close
                        </button>
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              copyToClipboard(generatedToken.registrationLink, 'Registration link');
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                          >
                            Copy Registration Link
                          </button>
                          <button
                            onClick={() => {
                              window.open(generatedToken.registrationLink, '_blank');
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                          >
                            Open Link
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default GenerateToken;