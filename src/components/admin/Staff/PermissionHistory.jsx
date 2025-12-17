// components/admin/Staff/PermissionHistory.jsx
import React, { useState } from 'react';
import { useGetPermissionHistoryQuery } from '../../../store/api/staffApi';
import Table from '../../../components/common/Table';
import Modal from '../../../components/common/Modal';
import {
  History,
  Clock,
  User,
  Shield,
  Calendar,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

const PermissionHistory = ({ staffId, staffName, isOpen, onClose }) => {
  const { data, isLoading, isError, refetch } = useGetPermissionHistoryQuery(staffId, {
    skip: !staffId || !isOpen,
  });
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const history = data?.data || [];
  
  // Filter and search
  const filteredHistory = history.filter(item => {
    const matchesSearch = search === '' || 
      item.permission?.key?.toLowerCase().includes(search.toLowerCase()) ||
      item.permission?.description?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalItems = filteredHistory.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentItems = filteredHistory.slice(startIndex, endIndex);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (durationMs) => {
    if (!durationMs) return 'N/A';
    
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
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
      case 'revoked':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Revoked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const columns = [
    {
      title: 'Permission',
      key: 'permission',
      render: (item) => (
        <div>
          <div className="font-mono text-sm font-medium">{item.permission?.key}</div>
          <div className="text-xs text-gray-500">{item.permission?.description}</div>
        </div>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (item) => getStatusBadge(item.status)
    },
    {
      title: 'Granted',
      key: 'granted',
      render: (item) => (
        <div className="text-sm">
          <div className="font-medium">{formatDate(item.grantedAt)}</div>
          <div className="text-xs text-gray-500">
            by {item.grantedBy?.name || 'System'}
          </div>
        </div>
      )
    },
    {
      title: 'Revoked',
      key: 'revoked',
      render: (item) => (
        <div className="text-sm">
          {item.revokedAt ? (
            <>
              <div className="font-medium">{formatDate(item.revokedAt)}</div>
              <div className="text-xs text-gray-500">
                by {item.revokedBy?.name || 'System'}
              </div>
            </>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      )
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (item) => (
        <div className="text-sm">
          {item.duration ? (
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1 text-gray-400" />
              {formatDuration(item.duration)}
            </div>
          ) : (
            <span className="text-green-600 font-medium">Active</span>
          )}
        </div>
      )
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center">
          <History className="h-6 w-6 mr-2 text-purple-600" />
          Permission History
        </div>
      }
      subtitle={staffName}
      size="xl"
    >
      <div className="space-y-6">
        {/* Header with filters */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Permission Timeline</h3>
              <p className="text-sm text-gray-500">
                Track all permission changes for this staff member
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={refetch}
              className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
              />
            </div>
          </div>
          
          <div className="w-full md:w-48">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="revoked">Revoked Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Total Permissions</p>
                <p className="text-2xl font-bold text-gray-900">{history.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Currently Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {history.filter(h => h.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-purple-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">Avg. Duration</p>
                <p className="text-2xl font-bold text-gray-900">
                  {history.length > 0 
                    ? formatDuration(
                        history.reduce((acc, h) => acc + (h.duration || 0), 0) / history.length
                      )
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* History Table
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Permission History</h3>
            <p className="text-sm text-gray-500">
              Showing {startIndex + 1}-{endIndex} of {totalItems} permissions
            </p>
          </div>
          
          <div className="p-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading history...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-red-400" />
                <p className="text-red-600">Failed to load permission history</p>
                <button
                  onClick={refetch}
                  className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                >
                  Retry
                </button>
              </div>
            ) : (
              <Table
                columns={columns}
                data={currentItems}
                loading={isLoading}
                emptyMessage={
                  <div className="text-center py-8">
                    <History className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No permission history found</p>
                    {search && (
                      <p className="text-sm text-gray-400 mt-1">
                        Try adjusting your search terms
                      </p>
                    )}
                  </div>
                }
                rowKey="id"
                showPagination={totalItems > itemsPerPage}
                pagination={{
                  current: currentPage,
                  totalPages,
                  total: totalItems,
                  startIndex,
                  endIndex
                }}
                onPageChange={setCurrentPage}
                hoverable={true}
                striped={true}
              />
            )}
          </div>
        </div> */}

        {/* Timeline View (Alternative) */}
        <div className="bg-gray-100 border border-gray-200 rounded-xl pr-2 py-3">
          <h3 className="font-semibold text-gray-900 mb-4 pl-4">Timeline</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {currentItems.map((item, index) => (
              <div key={index} className="relative pl-8 pb-1">
                {/* Timeline line */}
                {index !== currentItems.length - 1 && (
                  <div className="absolute left-3.5 top-1/2 bottom-0 w-0.5 bg-primary-200 h-[115%]"></div>
                )}
                
                {/* Timeline dot */}
                <div className={`absolute left-[7px] top-[40%] w-4 h-4 rounded-full border-4 border-gray-100 ${
                  item.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                
                {/* Content */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900 flex flex-wrap gap-2 justify-between items-center">
                        {item.permission?.key}
                        <span>
                            {getStatusBadge(item.status)}
                        </span>
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {item.permission?.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500">
                          Granted: {formatDate(item.grantedAt)}
                        </span>
                        {item.revokedAt && (
                          <span className="text-xs text-gray-500">
                            Revoked: {formatDate(item.revokedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PermissionHistory;