import React, { useEffect, useState } from 'react';
import { 
  useGetStaffDetailsQuery, 
  useGetStaffListQuery 
} from '../../../store/api/staffApi';
import MobileResponsiveTable from '../../../components/common/MobileResponsiveTable';
import Modal from '../../../components/common/Modal';
import { 
  Search, 
  User, 
  Mail, 
  Shield, 
  Clock, 
  CheckCircle, 
  XCircle,
  Users,
  Key,
  Activity
} from 'lucide-react';

const ViewAllStaff = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffDetailsModalOpen, setStaffDetailsModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);

  const limit = 10;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // Staff list
  const {
    data,
    isLoading,
    isError,
    refetch
  } = useGetStaffListQuery({
    search: debouncedSearch,
    page,
    limit,
  });

  // Staff details (on click)
  const {
    data: staffDetails,
    isLoading: isStaffDetailsLoading,
  } = useGetStaffDetailsQuery(selectedStaff?.id, {
    skip: !selectedStaff?.id,
  });

  const staffList = data?.data || [];
  const pagination = data?.pagination;

  const handleViewStaff = (staff) => {
    setSelectedStaff(staff);
    setStaffDetailsModalOpen(true);
  };

  const handleViewPermissions = (staff) => {
    setSelectedStaff(staff);
    setPermissionsModalOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="h-3 w-3 mr-1" />
            Inactive
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            {status}
          </span>
        );
    }
  };

  const getAvatar = (staff) => {
    if (staff.avatarUrl) {
      return (
        <img
          src={staff.avatarUrl}
          alt={staff.name}
          className="w-8 h-8 rounded-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(staff.name) + '&background=random';
          }}
        />
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
        <User className="h-4 w-4 text-primary-600" />
      </div>
    );
  };

  useEffect(() => {
    console.log(staffDetails);
    
  }, [staffDetails]);

  // Table columns definition
  const columns = [
    {
      title: 'Staff Member',
      dataIndex: 'name',
      key: 'name',
      render: (staff) => (
        <div className="flex items-center gap-3">
          {getAvatar(staff)}
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">{staff.name}</div>
            <div className="text-sm text-gray-500 truncate">{staff.email}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (staff) => getStatusBadge(staff.status)
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (staff) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Shield className="h-3 w-3 mr-1" />
          {staff.role || 'Staff'}
        </span>
      )
    },
    {
      title: 'Reports To',
      key: 'parent',
      render: (staff) => (
        <div className="text-sm">
          {staff.parent ? (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span>{staff.parent.name}</span>
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      )
    },
    {
      title: 'Last Active',
      key: 'lastLogin',
      render: (staff) => (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          {formatDate(staff.lastLoginAt)}
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (staff) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewStaff(staff);
            }}
            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
            title="View Details"
          >
            <User className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewPermissions(staff);
            }}
            className="p-1.5 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition"
            title="View Permissions"
          >
            <Key className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];


  // Handle pagination
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Failed to load staff
          </h3>
          <p className="text-red-600 mb-4">
            Unable to fetch staff list. Please try again.
          </p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Staff Management
          </h1>
          <p className="text-gray-600 mt-2">
            View and manage all staff members and their permissions
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full md:w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Staff</p>
              <p className="text-2xl font-semibold text-gray-900">
                {pagination?.total || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-semibold text-gray-900">
                {staffList.filter(s => s.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-primary-50 rounded-lg">
              <Key className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Avg. Permissions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {staffList.length > 0 
                  ? Math.round(staffList.reduce((acc, s) => acc + (s.totalPermissions || 0), 0) / staffList.length)
                  : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Staff Members
            </h2>
            <button
              onClick={refetch}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>

          <MobileResponsiveTable
            columns={columns}
            data={staffList}
            loading={isLoading}
            emptyMessage={
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 mb-2">No staff members found</p>
                {search && (
                  <p className="text-sm text-gray-400">
                    Try adjusting your search terms
                  </p>
                )}
              </div>
            }
            rowKey="id"
            onRowClick={handleViewStaff}
            expandable={true}
            renderExpandedContent={(staff) => (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium">{staff.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Role</p>
                    <p className="text-sm font-medium">{staff.role || 'Staff'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reports To</p>
                    <p className="text-sm font-medium">
                      {staff.parent?.name || 'No Manager'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <div className="mt-1">{getStatusBadge(staff.status)}</div>
                  </div>
                </div>
              </div>
            )}
            className="mb-4"
          />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => handlePageChange(page - 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                          page === pageNum
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  disabled={page === pagination.totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Staff Details Modal */}
      <Modal
        isOpen={staffDetailsModalOpen}
        onClose={() => setStaffDetailsModalOpen(false)}
        title="Staff Details"
        size="md"
      >
        {selectedStaff && (
          <div className="space-y-6">
            {/* Staff Header */}
            <div className="flex items-center gap-4">
              {getAvatar(selectedStaff)}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedStaff.name}
                </h3>
                <p className="text-gray-600">{selectedStaff.email}</p>
                <div className="mt-2">{getStatusBadge(selectedStaff.status)}</div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Role</p>
                <p className="font-medium">{selectedStaff.role || 'Staff'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Reports To</p>
                <p className="font-medium">
                  {selectedStaff.parent?.name || 'No Manager'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Last Login</p>
                <p className="font-medium">{formatDate(selectedStaff.lastLoginAt)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Total Permissions</p>
                <p className="font-medium">{selectedStaff.totalPermissions || 0}</p>
              </div>
            </div>

            {/* Loading staff details */}
            {isStaffDetailsLoading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            )}

            {/* Additional details if available */}
            {staffDetails && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Additional Information</h4>
                <div className="space-y-2 text-sm">
                  {staffDetails.department && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium">{staffDetails.department}</span>
                    </div>
                  )}
                  {staffDetails.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{staffDetails.phone}</span>
                    </div>
                  )}
                  {staffDetails.joinedDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Joined Date:</span>
                      <span className="font-medium">{formatDate(staffDetails.joinedDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Permissions Modal */}
        <Modal
        isOpen={permissionsModalOpen}
        onClose={() => setPermissionsModalOpen(false)}
        title={
            <div className="flex items-center">
            <Key className="h-5 w-5 mr-2 text-primary-600" />
            Staff Permissions
            </div>
        }
        subtitle={selectedStaff?.name}
        size="lg"
        >
        {selectedStaff && (
            <div className="space-y-6">
            {/* Permission Summary */}
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-medium text-primary-900">Permission Summary</h4>
                    <p className="text-sm text-primary-700">
                    {staffDetails?.data?.assignedPermissions?.length || 0} permissions assigned
                    </p>
                </div>
                <button
                    onClick={() => {
                    // Handle edit permissions
                    console.log('Edit permissions for:', selectedStaff.id);
                    }}
                    className="px-3 py-1 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition"
                >
                    Edit Permissions
                </button>
                </div>
            </div>

            {/* Loading State */}
            {isStaffDetailsLoading && (
                <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading permissions...</p>
                </div>
            )}

            {/* Assigned Permissions */}
            {!isStaffDetailsLoading && (
                <div>
                <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-gray-400" />
                    Assigned Permissions
                </h5>
                
                {staffDetails?.data?.assignedPermissions?.length > 0 ? (
                    <div className="space-y-2">
                    {staffDetails.data.assignedPermissions.map((permission, index) => (
                        <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                        >
                        <div className="flex-1">
                            <div className="font-medium text-gray-900">
                            {permission.permission?.name || permission.name || `Permission ${index + 1}`}
                            </div>
                            {permission.permission?.description && (
                            <div className="text-sm text-gray-500 mt-1">
                                {permission.permission.description}
                            </div>
                            )}
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-800">
                            Assigned
                        </span>
                        </div>
                    ))}
                    </div>
                ) : (
                    <div className="text-center py-6 border border-dashed border-gray-300 rounded-lg">
                    <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No permissions assigned to this staff member</p>
                    <p className="text-sm text-gray-400 mt-1">
                        Use the "Edit Permissions" button to assign permissions
                    </p>
                    </div>
                )}
                </div>
            )}

            {/* Permissions Assigned to Others (if available) */}
            {!isStaffDetailsLoading && staffDetails?.data?.grantedToOthers?.length > 0 && (
                <div>
                <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                    <Users className="h-4 w-4 mr-2 text-gray-400" />
                    Permissions Granted to Others
                </h5>
                <div className="space-y-2">
                    {staffDetails.data.grantedToOthers.map((item, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                        <div className="flex-1">
                        <div className="font-medium text-gray-900">
                            {item.permission?.name || item.name || `Permission ${index + 1}`}
                        </div>
                        {item.toUser && (
                            <div className="text-sm text-gray-500 mt-1">
                            Granted to: {item.toUser.name} ({item.toUser.email})
                            </div>
                        )}
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded bg-blue-100 text-blue-800">
                        Granted
                        </span>
                    </div>
                    ))}
                </div>
                </div>
            )}

            {/* Permissions Revoked from Others (if available) */}
            {!isStaffDetailsLoading && staffDetails?.data?.revokedFromOthers?.length > 0 && (
                <div>
                <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                    <XCircle className="h-4 w-4 mr-2 text-gray-400" />
                    Permissions Revoked from Others
                </h5>
                <div className="space-y-2">
                    {staffDetails.data.revokedFromOthers.map((item, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                    >
                        <div className="flex-1">
                        <div className="font-medium text-gray-900">
                            {item.permission?.name || item.name || `Permission ${index + 1}`}
                        </div>
                        {item.fromUser && (
                            <div className="text-sm text-gray-500 mt-1">
                            Revoked from: {item.fromUser.name} ({item.fromUser.email})
                            </div>
                        )}
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-800">
                        Revoked
                        </span>
                    </div>
                    ))}
                </div>
                </div>
            )}

            {/* Staff Permissions (if available) */}
            {!isStaffDetailsLoading && staffDetails?.data?.staffPermissionsAssigned?.length > 0 && (
                <div>
                <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    Staff Permissions Assigned
                </h5>
                <div className="space-y-2">
                    {staffDetails.data.staffPermissionsAssigned.map((perm, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg"
                    >
                        <div className="flex-1">
                        <div className="font-medium text-gray-900">
                            {perm.permission?.name || perm.name || `Permission ${index + 1}`}
                        </div>
                        {perm.description && (
                            <div className="text-sm text-gray-500 mt-1">
                            {perm.description}
                            </div>
                        )}
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded bg-indigo-100 text-indigo-800">
                        Staff
                        </span>
                    </div>
                    ))}
                </div>
                </div>
            )}

            {/* Empty State for all permission categories */}
            {!isStaffDetailsLoading && 
            (!staffDetails?.data?.assignedPermissions || staffDetails.data.assignedPermissions.length === 0) &&
            (!staffDetails?.data?.grantedToOthers || staffDetails.data.grantedToOthers.length === 0) &&
            (!staffDetails?.data?.revokedFromOthers || staffDetails.data.revokedFromOthers.length === 0) &&
            (!staffDetails?.data?.staffPermissionsAssigned || staffDetails.data.staffPermissionsAssigned.length === 0) && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <Key className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h4 className="text-lg font-medium text-gray-700 mb-2">No Permission Data Available</h4>
                <p className="text-gray-500 max-w-md mx-auto">
                    This staff member doesn't have any permissions assigned and hasn't granted or revoked any permissions.
                </p>
                </div>
            )}
            </div>
        )}
        </Modal>
    </div>
  );
};

export default ViewAllStaff;