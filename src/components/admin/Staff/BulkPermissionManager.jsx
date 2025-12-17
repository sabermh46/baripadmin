// components/admin/Staff/BulkPermissionManager.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  useGetAvailablePermissionsQuery,
  useGetStaffDetailsQuery,
  useBulkGrantPermissionsMutation,
  useBulkRevokePermissionsMutation 
} from '../../../store/api/staffApi';
import Modal from '../../../components/common/Modal';
import {
  Shield,
  CheckSquare,
  Square,
  Users,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';

const BulkPermissionManager = ({ staffId, staffName, isOpen, onClose, onSuccess }) => {
  const { data: permissionsData } = useGetAvailablePermissionsQuery(undefined, {
    skip: !isOpen,
  });
  
  const { data: staffData } = useGetStaffDetailsQuery(staffId, {
    skip: !staffId || !isOpen,
  });
  
  const [bulkGrant, { isLoading: isGranting }] = useBulkGrantPermissionsMutation();
  const [bulkRevoke, { isLoading: isRevoking }] = useBulkRevokePermissionsMutation();
  
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [action, setAction] = useState('grant'); // 'grant' or 'revoke'
  
  // Extract all permissions from the API response
  const allPermissions = useMemo(() => {
    if (!permissionsData?.data?.all) return [];
    return permissionsData.data.all;
  }, [permissionsData]);

  // Extract grouped permissions for categories
  const groupedPermissions = useMemo(() => {
    if (!permissionsData?.data?.grouped) return {};
    return permissionsData.data.grouped;
  }, [permissionsData]);

  // Get current permissions from staff data
  const currentPermissions = staffData?.data?.assignedPermissions || [];
  
  // Memoize currentPermissionIds
  const currentPermissionIds = useMemo(() => {
    return currentPermissions.map(p => p.id).filter(id => id);
  }, [currentPermissions]);

  // Extract categories from grouped permissions
  const categories = useMemo(() => {
    return ['all', ...Object.keys(groupedPermissions)];
  }, [groupedPermissions]);

  // Helper to extract category from permission key
  const getPermissionCategory = (permissionKey) => {
    if (!permissionKey) return 'uncategorized';
    const parts = permissionKey.split('.');
    return parts[0] || 'uncategorized';
  };

  // Memoize filtered permissions based on search and category
  const displayPermissions = useMemo(() => {
    let permissions = allPermissions;
    
    // Filter by search
    if (search) {
      permissions = permissions.filter(p =>
        p.key?.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Filter by category
    if (categoryFilter !== 'all') {
      permissions = permissions.filter(p => 
        getPermissionCategory(p.key) === categoryFilter
      );
    }
    
    return permissions;
  }, [allPermissions, search, categoryFilter]);

  // Initialize selected permissions when component mounts or action changes
  useEffect(() => {
    if (!displayPermissions.length) return;
    
    if (action === 'grant') {
      // For grant, select permissions the staff doesn't have
      setSelectedPermissions(
        displayPermissions
          .filter(p => !currentPermissionIds.includes(p.id))
          .map(p => p.id)
      );
    } else {
      // For revoke, select permissions the staff already has
      setSelectedPermissions(
        displayPermissions
          .filter(p => currentPermissionIds.includes(p.id))
          .map(p => p.id)
      );
    }
  }, [action, displayPermissions, currentPermissionIds]);

  // Update selected permissions when displayPermissions changes (search/filter)
  useEffect(() => {
    if (!displayPermissions.length) {
      setSelectedPermissions([]);
      return;
    }
    
    // Keep only permissions that exist in current displayPermissions
    setSelectedPermissions(prev => 
      prev.filter(id => 
        displayPermissions.some(p => p.id === id)
      )
    );
  }, [displayPermissions]);

  const handlePermissionToggle = (permissionId) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };
  
  const handleCategoryToggle = (category) => {
    if (category === 'all' || !groupedPermissions[category]) return;
    
    const categoryPermissions = groupedPermissions[category] || [];
    const categoryIds = categoryPermissions.map(p => p.id);
    
    const allCategorySelected = categoryIds.every(id => 
      selectedPermissions.includes(id)
    );
    
    if (allCategorySelected) {
      // Deselect all in category
      setSelectedPermissions(prev => 
        prev.filter(id => !categoryIds.includes(id))
      );
    } else {
      // Select all in category
      const newSelections = [...selectedPermissions];
      categoryIds.forEach(id => {
        if (!newSelections.includes(id)) {
          newSelections.push(id);
        }
      });
      setSelectedPermissions(newSelections);
    }
  };
  
  const handleSelectAll = () => {
    const allIds = displayPermissions.map(p => p.id);
    setSelectedPermissions(allIds);
  };
  
  const handleClearAll = () => {
    setSelectedPermissions([]);
  };
  
  const handleSubmit = async () => {
    if (selectedPermissions.length === 0) return;
    
    try {
      if (action === 'grant') {
        // For bulkGrant, we need to pass staffIds as params and permissionIds in body
        await bulkGrant({
          // This might need to be adjusted based on your actual API endpoint
          // If the endpoint expects staffIds in params, you might need to pass it differently
          staffId, // or staffIds: [staffId]
          permissionIds: selectedPermissions
        }).unwrap();
        toast.success('Permissions granted successfully');
      } else {
        // For bulkRevoke, we need to pass staffId as params and permissionIds in body
        await bulkRevoke({
          staffId,
          permissionIds: selectedPermissions
        }).unwrap();
        toast.success('Permissions revoked successfully');
      }
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error(`Failed to ${action} permissions:`, error);
    }
  };
  
  const getCategoryStats = (category) => {
    if (category === 'all' || !groupedPermissions[category]) {
      return { total: 0, selected: 0, has: 0 };
    }
    
    const categoryPermissions = groupedPermissions[category] || [];
    const categoryIds = categoryPermissions.map(p => p.id);
    
    const selectedInCategory = categoryIds.filter(id => 
      selectedPermissions.includes(id)
    ).length;
    
    const hasInCategory = categoryIds.filter(id =>
      currentPermissionIds.includes(id)
    ).length;
    
    return {
      total: categoryPermissions.length,
      selected: selectedInCategory,
      has: hasInCategory
    };
  };

  // Get all selected permission details
  const selectedPermissionDetails = useMemo(() => {
    return allPermissions.filter(p => selectedPermissions.includes(p.id));
  }, [allPermissions, selectedPermissions]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center text-sm md:text-lg">
          <Shield className="h-6 w-6 mr-2 text-primary-600" />
          Bulk Permission Manager
        </div>
      }
      subtitle={staffName}
      size="xl"
    >
      <div className="space-y-6">
        {/* Action Selector */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Bulk Operation</h3>
                <p className="text-sm text-gray-500">
                  Select permissions to grant or revoke in bulk
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setAction('grant')}
                className={`px-4 py-2 rounded-lg font-medium text-xs md:text-base transition ${
                  action === 'grant'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <CheckCircle className="h-4 w-4 inline mr-2" />
                Grant Permissions
              </button>
              <button
                onClick={() => setAction('revoke')}
                className={`px-4 py-2 rounded-lg font-medium  text-xs md:text-base transition ${
                  action === 'revoke'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <XCircle className="h-4 w-4 inline mr-2" />
                Revoke Permissions
              </button>
            </div>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Available</p>
                <p className="text-2xl font-bold text-gray-900">{allPermissions.length}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Currently Has</p>
                <p className="text-2xl font-bold text-gray-900">{currentPermissions.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Selected for {action}</p>
                <p className="text-2xl font-bold text-gray-900">{selectedPermissions.length}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                {action === 'grant' ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Filters and Actions */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search permissions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            >
              <option value="all">All Categories</option>
              {categories.filter(c => c !== 'all').map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
            
            <button
              onClick={handleSelectAll}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Select All
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Clear All
            </button>
          </div>
        </div>
        
        {/* Permissions List by Category */}
        <div className="space-y-4">
          {categories.filter(cat => cat !== 'all').map((category) => {
            if (categoryFilter !== 'all' && categoryFilter !== category) return null;
            
            const categoryPermissions = groupedPermissions[category] || [];
            
            // Filter category permissions by search
            const filteredCategoryPermissions = categoryPermissions.filter(p => 
              displayPermissions.some(dp => dp.id === p.id)
            );
            
            if (filteredCategoryPermissions.length === 0) return null;
            
            const stats = getCategoryStats(category);
            const isAllSelected = stats.selected === stats.total;
            
            return (
              <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => handleCategoryToggle(category)}
                  className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition"
                >
                  <div className="flex items-center">
                    {isAllSelected ? (
                      <CheckSquare className="h-5 w-5 text-blue-600 mr-3" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400 mr-3" />
                    )}
                    <div className="text-left">
                      <h4 className="font-medium text-gray-900 capitalize">
                        {category}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {stats.selected} of {stats.total} selected • {stats.has} currently assigned
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {isAllSelected ? 'Deselect All' : 'Select All'}
                    </span>
                    <Filter className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
                
                <div className="p-4 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredCategoryPermissions.map(permission => {
                      const isSelected = selectedPermissions.includes(permission.id);
                      const hasPermission = currentPermissionIds.includes(permission.id);
                      
                      return (
                        <label
                          key={permission.id}
                          className={`flex items-start p-3 border rounded-lg cursor-pointer transition ${
                            isSelected
                              ? action === 'grant'
                                ? 'border-green-500 bg-green-50'
                                : 'border-red-500 bg-red-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handlePermissionToggle(permission.id)}
                            className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex flex-wrap justify-between">
                              <span className="font-medium text-gray-900 font-mono text-sm break-all">
                                {permission.key}
                              </span>
                              {hasPermission && (
                                <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-800">
                                  Has Permission
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {permission.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded capitalize">
                                {category}
                              </span>
                              {/* Add dangerous flag if your permissions have it */}
                              {/* {permission.isDangerous && (
                                <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                                  Dangerous
                                </span>
                              )} */}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* If no categories or all categories filtered out, show a message */}
          {categories.filter(cat => cat !== 'all').length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No permission categories found.
            </div>
          )}
        </div>
        
        {/* Selected Permissions Preview */}
        {selectedPermissions.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">
              Selected Permissions ({selectedPermissions.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedPermissionDetails.slice(0, 10).map(permission => (
                <span key={permission.id} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  {permission.key}
                </span>
              ))}
              {selectedPermissions.length > 10 && (
                <span className="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded">
                  +{selectedPermissions.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-between items-center pt-4 border-t">
          <div>
            <p className="text-sm text-gray-500">
              <span className="font-medium text-gray-900">{selectedPermissions.length}</span> permissions selected for {action}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              disabled={isGranting || isRevoking}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedPermissions.length === 0 || isGranting || isRevoking}
              className={`px-4 py-2 text-xs md:text-base text-white rounded-lg transition flex items-center ${
                action === 'grant'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } ${(selectedPermissions.length === 0 || isGranting || isRevoking) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isGranting || isRevoking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  {action === 'grant' ? (
                    <CheckCircle className="min-h-4 min-w-4 mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  {action === 'grant' ? 'Grant Selected Permissions' : 'Revoke Selected Permissions'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BulkPermissionManager;