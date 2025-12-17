// components/admin/Staff/CopyPermissions.jsx
import React, { useState } from 'react';
import { 
  useGetStaffListQuery,
  useGetStaffDetailsQuery,
  useCopyPermissionsMutation 
} from '../../../store/api/staffApi';
import Modal from '../../../components/common/Modal';
import Table from '../../../components/common/Table';
import {
  Copy,
  Users,
  Shield,
  UserCheck,
  UserX,
  Search,
  AlertTriangle
} from 'lucide-react';

const CopyPermissions = ({ 
  sourceStaffId, 
  sourceStaffName, 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const { data: staffList } = useGetStaffListQuery({ limit: 100 }, {
    skip: !isOpen,
  });
  
  const { data: sourceStaffData } = useGetStaffDetailsQuery(sourceStaffId, {
    skip: !sourceStaffId || !isOpen,
  });
  
  const [copyPermissions, { isLoading }] = useCopyPermissionsMutation();
  
  const [search, setSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState();
  const [excludedPermissions, setExcludedPermissions] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  
  const allStaff = staffList?.data || [];
  const sourcePermissions = sourceStaffData?.data?.assignedPermissions || [];
  
  // Filter staff (exclude source staff)
  const filteredStaff = allStaff.filter(staff => 
    staff.id !== sourceStaffId &&
    (search === '' || 
     staff.name.toLowerCase().includes(search.toLowerCase()) ||
     staff.email.toLowerCase().includes(search.toLowerCase()))
  );
  
  const handleStaffToggle = (staffId) => {
    setSelectedStaffId(staffId);
  };
  
  const handlePermissionToggle = (permissionId) => {
    setExcludedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(id => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };
  
  const handleSelectAllStaff = () => {
    setSelectedStaffId(filteredStaff.map(staff => staff.id)[0]);
  };
  
  const handleClearAllStaff = () => {
    setSelectedStaffId(null);
  };
  
  const handleCopy = async () => {
    try {
      await copyPermissions({
        sourceStaffId,
        targetStaffId: selectedStaffId
      }).unwrap();
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to copy permissions:', error);
    }
  };
  
  const selectedStaffCount = selectedStaffId ? 1 : 0;
  const permissionsToCopy = sourcePermissions.filter(
    p => !excludedPermissions.includes(p.id)
  ).length;
  
  const staffColumns = [
    {
      title: 'Staff Member',
      key: 'staff',
      render: (staff) => (
        <div className="flex items-center gap-3">
          {staff.avatarUrl ? (
            <img
              src={staff.avatarUrl}
              alt={staff.name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <Users className="h-4 w-4 text-gray-600" />
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">{staff.name}</div>
            <div className="text-sm text-gray-500">{staff.email}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Current Permissions',
      key: 'currentPermissions',
      render: (staff) => (
        <div className="text-sm">
          <span className="font-medium">{staff.totalPermissions || 0}</span> permissions
        </div>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (staff) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          staff.status === 'active'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {staff.status}
        </span>
      )
    },
    {
      title: 'Select',
      key: 'select',
      render: (staff) => (
        <input
          type="checkbox"
          checked={selectedStaffId === staff.id}
          onChange={() => handleStaffToggle(staff.id)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      )
    }
  ];
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center">
          <Copy className="h-6 w-6 mr-2 text-purple-600" />
          Copy Permissions
        </div>
      }
      subtitle={`From: ${sourceStaffName}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900">Permission Copy</h3>
                <p className="text-sm text-purple-700">
                  Copy permissions from one staff member to others
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-900">
                  {selectedStaffCount}
                </div>
                <div className="text-xs text-purple-700">Staff Selected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-900">
                  {permissionsToCopy}
                </div>
                <div className="text-xs text-purple-700">Permissions to Copy</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setPreviewMode(false)}
              className={`py-2 px-4 font-medium text-sm border-b-2 ${
                !previewMode
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Select Staff
            </button>
            <button
              onClick={() => setPreviewMode(true)}
              className={`py-2 px-4 font-medium text-sm border-b-2 ${
                previewMode
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Preview Permissions
            </button>
          </nav>
        </div>
        
        {!previewMode ? (
          /* Staff Selection Tab */
          <>
            {/* Search and Actions */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search staff..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAllStaff}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearAllStaff}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Clear All
                </button>
              </div>
            </div>
            
            {/* Staff List Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <Table
                columns={staffColumns}
                data={filteredStaff}
                emptyMessage={
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No staff members found</p>
                    {search && (
                      <p className="text-sm text-gray-400 mt-1">
                        Try adjusting your search terms
                      </p>
                    )}
                  </div>
                }
                rowKey="id"
                hoverable={true}
                compact={true}
              />
            </div>
          </>
        ) : (
          /* Permissions Preview Tab */
          <>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-yellow-800">Warning</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Existing permissions for selected staff will be preserved. 
                    New permissions from the source will be added. 
                    You can exclude specific permissions below.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Permissions List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">
                Source Permissions ({sourcePermissions.length})
              </h3>
              
              {sourcePermissions.map(permission => {
                const isExcluded = excludedPermissions.includes(permission.id);
                
                return (
                  <label
                    key={permission.id}
                    className={`flex items-start px-2 py-1.5 border rounded-lg cursor-pointer transition ${
                      isExcluded
                        ? 'border-gray-200 bg-gray-50'
                        : 'border-green-200 bg-green-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!isExcluded}
                      onChange={() => handlePermissionToggle(permission.id)}
                      className="mt-1 mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900 font-mono">
                            {permission.permission?.key || permission.key}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {permission.permission?.description || permission.description}
                          </p>
                        </div>

                      </div>
                      {permission.category && (
                        <div className="mt-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            {permission.category}
                          </span>
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-between items-center pt-4 border-t">
          <div>
            {!previewMode ? (
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-900">{selectedStaffCount}</span> staff selected
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-900">{permissionsToCopy}</span> permissions will be copied
              </p>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              {previewMode ? 'Back to Staff Selection' : 'Preview Permissions'}
            </button>
            
            <button
              onClick={handleCopy}
              disabled={!selectedStaffId || isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Copying...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to {selectedStaffCount} Staff
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CopyPermissions;