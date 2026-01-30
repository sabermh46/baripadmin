import React, { useState, useMemo } from 'react';
import { 
  useDeleteTokenMutation, 
  useGenerateTokenMutation, 
  useGetRegistrationTokensQuery 
} from '../../../store/api/authApi';
import { toast } from 'react-toastify';
import { 
  Copy, Link, X, Check, Calendar, Mail, User, 
  Shield, Trash2, Eye, RefreshCw, Search 
} from 'lucide-react';
import Btn from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import Table from '../../../components/common/Table';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import { useAuth } from '../../../hooks';
import MetadataInput from '../../../components/common/MetaDataInput';
import { useGetManagedOwnersQuery } from '../../../store/api/houseApi';

const GenerateToken = () => {
  const { isHouseOwner, isStaff, isWebOwner, user } = useAuth();
  const [generateToken, { isLoading }] = useGenerateTokenMutation();
  const [deleteToken, { isLoading: isDeleting }] = useDeleteTokenMutation();
  const { data: tokensResponse, isLoading: isTokensLoading, refetch } = useGetRegistrationTokensQuery();

  // State for managed owners search
  const [ownerSearchTerm, setOwnerSearchTerm] = useState('');
  const [ownersPage, setOwnersPage] = useState(1);
  const ownersLimit = 10;

  // Fetch managed owners with search and pagination
  const { 
    data: managedOwnersResponse, 
    isLoading: ownersLoading, 
    isFetching: ownersFetching 
  } = useGetManagedOwnersQuery({
    search: ownerSearchTerm,
    page: ownersPage,
    limit: ownersLimit
  });

  const [formData, setFormData] = useState({
    email: '',
    roleSlug: 'house_owner',
    expiresInHours: 24,
    metadata: {}
  });
  
  const [validationErrors, setValidationErrors] = useState({});
  const [generatedToken, setGeneratedToken] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewTokenModalOpen, setViewTokenModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const tokens = tokensResponse || [];
  const tokensMeta = tokensResponse?.meta || { total: 0, totalPages: 1 };
  
  // Pagination calculations for tokens
  const totalTokens = tokens?.length || 0;
  const totalPages = 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalTokens);
  const currentTokens = tokens.slice(startIndex, endIndex);

  const closeModal = () => {
    setModalIsOpen(false);
  };
  
  const openModal = () => {
    setModalIsOpen(true);
  };

  // Get managed owners for dropdown options
  const getManagedOwnersOptions = () => {
    if (!managedOwnersResponse?.data) return [];
    
    return managedOwnersResponse.data.map(owner => ({
      label: `${owner.name} (${owner.email})`,
      value: owner.id.toString()
    }));
  };

  // Function to handle owner search change
  const handleOwnerSearchChange = (searchValue) => {
    setOwnerSearchTerm(searchValue);
    setOwnersPage(1); // Reset to first page on new search
  };

  // Debounced search for owners
  const debouncedSearch = useMemo(
    () => {
      let timeout;
      return (value) => {
        clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/immutability
        timeout = setTimeout(() => {
          handleOwnerSearchChange(value);
        }, 500);
      };
    },
    []
  );

  const getFixedFields = () => {
    const fields = [];

    if (formData.roleSlug === 'caretaker') {
      if (!isHouseOwner) {
        fields.push({
          label: 'House Owner',
          key: 'house_owner_id',
          type: 'select',
          required: true,
          options: getManagedOwnersOptions(),
          description: 'Select the house owner for whom this caretaker will work',
          onSearch: debouncedSearch, // Add search functionality
          isLoading: ownersLoading || ownersFetching,
          pagination: managedOwnersResponse?.meta ? {
            current: managedOwnersResponse.meta.page,
            total: managedOwnersResponse.meta.total,
            totalPages: managedOwnersResponse.meta.totalPages,
            onPageChange: setOwnersPage
          } : null
        });
      } else if (isHouseOwner && user?.id) {
        fields.push({
          label: 'House Owner',
          key: 'house_owner_id',
          type: 'hidden',
          defaultValue: user.id.toString(),
          required: true
        });
      }
    }

    return fields;
  };

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

    // If role changes, clear any metadata validation errors
    if (name === 'roleSlug' && validationErrors.metadata) {
      setValidationErrors(prev => ({
        ...prev,
        metadata: ''
      }));
    }
  };

  const handleMetadataChange = (metadata) => {
    setFormData(prev => ({
      ...prev,
      metadata
    }));

    // Clear metadata validation errors
    if (validationErrors.metadata) {
      setValidationErrors(prev => ({
        ...prev,
        metadata: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Email validation - optional but must be valid if provided
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
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

    // Caretaker validation
    if (formData.roleSlug === 'caretaker') {
      if (!formData.metadata?.house_owner_id) {
        errors.metadata = 'House owner is required for caretaker tokens';
      } else if (isHouseOwner && user?.id && formData.metadata.house_owner_id !== user.id.toString()) {
        errors.metadata = 'As a house owner, you can only create caretaker tokens for yourself';
      }
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
        metadata: formData.metadata
      };
      
      // If caretaker and house owner, ensure the ID is included
      if (formData.roleSlug === 'caretaker' && isHouseOwner && user?.id) {
        requestData.metadata = {
          ...requestData.metadata,
          house_owner_id: user.id.toString()
        };
      }
      
      const response = await generateToken(requestData).unwrap();
      
      if (response) {
        setGeneratedToken(response);
        openModal();
        toast.success('Token generated successfully!');
        
        // Refetch tokens to update the list
        refetch();
        
        // Reset form
        setFormData({
          email: '',
          roleSlug: 'house_owner',
          expiresInHours: 24,
          metadata: {}
        });
        
        // Reset search state
        setOwnerSearchTerm('');
        setOwnersPage(1);
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

  const handleDeleteToken = async () => {
    if (!selectedToken) return;
      
    try {
      await deleteToken(selectedToken.id).unwrap();
      toast.success('Token deleted successfully!');
      setDeleteModalOpen(false);
      setSelectedToken(null);
      refetch();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete token');
    }
  };

  const openDeleteModal = (token) => {
    setSelectedToken(token);
    setDeleteModalOpen(true);
  };

  const openViewTokenModal = (token) => {
    setSelectedToken(token);
    setViewTokenModalOpen(true);
  };

  const formatRoleName = (roleSlug) => {
    const roleMap = {
      house_owner: 'House Owner',
      staff: 'Staff',
      caretaker: 'Caretaker'
    };
    return roleMap[roleSlug] || roleSlug;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (token) => {
    if (token.used) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Used
        </span>
      );
    }
    
    const now = new Date();
    const expiresAt = new Date(token.expiresAt);
    
    if (expiresAt < now) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Expired
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    );
  };

  // Table columns definition
  const columns = [
    {
      title: 'Token',
      dataIndex: 'token',
      key: 'token',
      render: (token) => (
        <div className="flex items-center">
          <code className="text-xs font-mono truncate max-w-[150px]">
            {token.token.substring(0, 20)}...
          </code>
        </div>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (token) => (
        <div className="text-sm text-gray-900">
          {token.email || 'Any Email'}
        </div>
      )
    },
    {
      title: 'Role',
      dataIndex: 'roleSlug',
      key: 'role',
      render: (token) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {formatRoleName(token.roleSlug)}
        </span>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (token) => getStatusBadge(token)
    },
    {
      title: 'Expires',
      key: 'expires',
      render: (token) => (
        <div className="text-sm text-gray-500">
          {formatDate(token.expiresAt)}
        </div>
      )
    },
    {
      title: 'Created By',
      key: 'creator',
      render: (token) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">{token.creator?.name}</div>
          <div className="text-gray-500">{token.creator?.email}</div>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (token) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openViewTokenModal(token);
            }}
            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
            title="View Token"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(token);
            }}
            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            title="Delete Token"
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-600">Token Management</h1>
          <p className="text-gray-600 mt-2">
            Generate and manage invitation tokens for user registration
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Generate Token Form */}
      <div className="bg-white rounded-xl shadow-sm border max-w-full border-gray-200 p-4 md:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate New Token</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Email Address (Optional)
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition ${
                validationErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="user@example.com (leave empty for any email)"
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
                  onClick={() => {
                    setFormData(prev => ({ 
                      ...prev, 
                      roleSlug: role,
                      metadata: role === 'caretaker' ? prev.metadata : {}
                    }));
                    
                    // Reset owner search when changing role
                    if (role === 'caretaker') {
                      setOwnerSearchTerm('');
                      setOwnersPage(1);
                    }
                  }}
                  className={`flex items-center justify-center px-4 py-3 border rounded-lg transition-all ${
                    formData.roleSlug === role
                      ? 'border-primary bg-primary-50 text-primary-700'
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
                className={`w-full px-3 py-2 md:px-4 md:py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition ${
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
          
          {/* Caretaker House Owner Field - Shown separately when role is caretaker */}
          {formData.roleSlug === 'caretaker' && !isHouseOwner && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium mb-2 text-gray-700">
                House Owner *
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Select the house owner for whom this caretaker will work
              </p>
              
              {/* Search input for house owners */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search house owners by name or email..."
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
              
              {/* House owner select dropdown */}
              <select
                value={formData.metadata?.house_owner_id || ''}
                onChange={(e) => handleMetadataChange({
                  ...formData.metadata,
                  house_owner_id: e.target.value
                })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition ${
                  validationErrors.metadata ? 'border-red-500' : 'border-gray-300'
                }`}
                required
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
                <div>
                  {ownersLoading || ownersFetching ? (
                    <span>Loading house owners...</span>
                  ) : (
                    <span>
                      Showing {getManagedOwnersOptions().length} of {managedOwnersResponse?.meta?.total || 0} owners
                    </span>
                  )}
                </div>
                {managedOwnersResponse?.meta?.totalPages > 1 && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setOwnersPage(p => Math.max(1, p - 1))}
                      disabled={ownersPage === 1}
                      className="px-2 py-1 text-xs disabled:opacity-50"
                    >
                      ←
                    </button>
                    <span className="px-2 py-1 text-xs">
                      Page {ownersPage} of {managedOwnersResponse.meta.totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOwnersPage(p => Math.min(managedOwnersResponse.meta.totalPages, p + 1))}
                      disabled={ownersPage === managedOwnersResponse.meta.totalPages}
                      className="px-2 py-1 text-xs disabled:opacity-50"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
              
              {validationErrors.metadata && (
                <p className="text-red-500 text-sm mt-2">{validationErrors.metadata}</p>
              )}
            </div>
          )}

          {/* House owner info when current user is house owner */}
          {formData.roleSlug === 'caretaker' && isHouseOwner && user?.id && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <label className="block text-sm font-medium mb-2 text-blue-700">
                House Owner
              </label>
              <p className="text-sm text-blue-600">
                You are creating a caretaker token for yourself ({user.name} - {user.email})
              </p>
              <input
                type="hidden"
                value={user.id}
                onChange={(e) => handleMetadataChange({
                  ...formData.metadata,
                  house_owner_id: user.id.toString()
                })}
              />
            </div>
          )}
          
          {/* Metadata Field for other data */}
          <div>
            <MetadataInput
              value={formData?.metadata}
              onChange={handleMetadataChange}
              label="Additional Metadata"
              fixedFields={[]} // We handle house_owner_id separately above
              description="Add any additional metadata for this token (optional)"
              hideFixedFields={true}
            />
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium text-white transition ${
              isLoading
                ? 'bg-primary-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 shadow-sm hover:shadow'
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

      {/* Tokens Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 max-w-full overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Generated Tokens</h2>
          <div className="text-sm text-gray-500">
            Showing {startIndex + 1}-{endIndex} of {totalTokens} tokens
          </div>
        </div>

        <Table
          columns={columns}
          data={currentTokens}
          loading={isTokensLoading}
          emptyMessage="No tokens generated yet"
          rowKey="id"
          showPagination={totalTokens > itemsPerPage}
          pagination={{
            current: currentPage,
            totalPages,
            total: totalTokens,
            startIndex,
            endIndex
          }}
          onPageChange={setCurrentPage}
          hoverable={true}
          striped={true}
        />
      </div>

      {/* Generated Token Success Modal */}
      <Modal
        isOpen={modalIsOpen}
        onClose={() => setModalIsOpen(false)}
        title={
          <div className="flex items-center">
            <Check className="h-6 w-6 text-green-500 mr-3" />
            Token Generated Successfully
          </div>
        }
        subtitle="Share the registration link with the user"
        size="lg"
      >
        {generatedToken && (
          <>
            <div className="mt-6 space-y-6">
              {/* Token Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Token
                </label>
                <div className="flex flex-col md:flex-row gap-3">
                  <code className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm overflow-x-auto">
                    {generatedToken.token}
                  </code>
                  <Btn
                    onClick={() => copyToClipboard(generatedToken.token, 'Token')}
                    className='w-max ml-auto'
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Token
                  </Btn>
                </div>
              </div>
              
              {/* Registration Link Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Link
                </label>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex-1 max-w-full">
                    <a
                      href={generatedToken.registrationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-800 hover:underline flex items-center"
                    >
                      <code className="flex-1 px-4 py-3 bg-orange-50 border border-primary-400 rounded-lg font-mono text-sm overflow-x-auto">
                        {generatedToken.registrationLink}
                      </code>
                    </a>
                  </div>
                  <Btn
                    onClick={() => copyToClipboard(generatedToken.registrationLink, 'Registration link')}
                    type='primary'
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Btn>
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
              
              {/* Token Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Mail className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Email</span>
                  </div>
                  <p className="text-gray-900">{generatedToken.email || 'Any Email'}</p>
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
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200 flex flex-wrap gap-3 items-center justify-between">
              <Btn
                onClick={closeModal}
              >
                Close
              </Btn>
              <div className="flex flex-wrap gap-3">
                <Btn
                  onClick={() => {
                    copyToClipboard(generatedToken.registrationLink, 'Registration link');
                  }}
                  type='primary'
                >
                  Copy Registration Link
                </Btn>
                <Btn
                  onClick={() => {
                    window.open(generatedToken.registrationLink, '_blank');
                  }}
                  className="!bg-green-600 text-white rounded-lg !hover:bg-green-700 transition"
                >
                  Open Link
                </Btn>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* View Token Details Modal */}
      <Modal
        isOpen={viewTokenModalOpen}
        onClose={() => setViewTokenModalOpen(false)}
        title="Token Details"
        size="lg"
      >
        {selectedToken && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Mail className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Email</span>
                </div>
                <p className="text-gray-900">{selectedToken.email || 'Any Email'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <User className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Role</span>
                </div>
                <p className="text-gray-900">{formatRoleName(selectedToken.roleSlug)}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Expires At</span>
                </div>
                <p className="text-gray-900">{formatDate(selectedToken.expiresAt)}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Shield className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Status</span>
                </div>
                {getStatusBadge(selectedToken)}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Created At</span>
                </div>
                <p className="text-gray-900">{formatDate(selectedToken.createdAt)}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <User className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Created By</span>
                </div>
                <p className="text-gray-900">{selectedToken.creator?.name}</p>
                <p className="text-gray-500 text-sm">{selectedToken.creator?.email}</p>
              </div>
            </div>
            
            {selectedToken.metadata && Object.keys(selectedToken.metadata).length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Metadata</span>
                </div>
                <pre className="text-sm text-gray-900 overflow-x-auto">
                  {JSON.stringify(selectedToken.metadata, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="flex justify-end">
              <Btn onClick={() => setViewTokenModalOpen(false)}>Close</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteToken}
        title="Delete Token"
        message={`Are you sure you want to delete this token? ${selectedToken?.email ? `This will remove the invitation for ${selectedToken.email}.` : ''} This action cannot be undone.`}
        confirmText="Delete Token"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default GenerateToken;