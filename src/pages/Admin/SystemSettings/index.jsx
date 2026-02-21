import React, { useState } from 'react';
import { 
  useGetSystemSettingsQuery,
  useUpdateSystemSettingMutation,
  useGetEmailStatsQuery
} from '../../../store/api/admin/systemPermissions';
import Table from '../../../components/common/Table';
import Modal from '../../../components/common/Modal';
import ConfirmationModal from '../../../components/common/ConfirmationModal';
import { 
  Settings, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Lock, 
  Globe, 
  Eye, 
  EyeOff,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Server,
  HardDrive
} from 'lucide-react';
import { toast } from 'react-toastify';

const SystemSettings = () => {
  const { data: settingsResponse, isLoading, isError, refetch } = useGetSystemSettingsQuery();
  const [updateSystemSetting, { isLoading: isUpdating }] = useUpdateSystemSettingMutation();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedSetting, setSelectedSetting] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [errors, setErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: emailStats } = useGetEmailStatsQuery();
  const emailStatsData = emailStats?.data ?? emailStats;

  const settings = settingsResponse?.data || [];
  
  // Get unique categories
  const categories = ['all', ...new Set(settings.map(setting => setting.category))];
  
  // Filter settings based on search and category
  const filteredSettings = settings.filter(setting => {
    const matchesSearch = searchTerm === '' || 
      setting.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (setting.value && String(setting.value).toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || setting.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });
  
  // Pagination calculations
  const totalSettings = filteredSettings.length;
  const totalPages = Math.ceil(totalSettings / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalSettings);
  const currentSettings = filteredSettings.slice(startIndex, endIndex);

  const handleEditSetting = (setting) => {
    setSelectedSetting(setting);
    setEditForm({
      value: setting.type === 'array' || setting.type === 'object' 
        ? JSON.stringify(setting.value, null, 2) 
        : String(setting.value),
      type: setting.type,
      category: setting.category,
      isPublic: setting.isPublic
    });
    setErrors({});
    setEditModalOpen(true);
  };

  const handleViewSetting = (setting) => {
    setSelectedSetting(setting);
    setViewModalOpen(true);
  };

  const handleDeleteSetting = (setting) => {
    setSelectedSetting(setting);
    setDeleteModalOpen(true);
  };

  const validateEditForm = () => {
    const newErrors = {};
    
    if (!editForm.value) {
      newErrors.value = 'Value is required';
    }
    
    // Validate based on type
    if (editForm.type === 'array' || editForm.type === 'object') {
      try {
        JSON.parse(editForm.value);
      } catch (error) {
        console.error(error);
        newErrors.value = `Invalid JSON for type ${editForm.type}`;
      }
    } else if (editForm.type === 'number') {
      if (isNaN(Number(editForm.value))) {
        newErrors.value = 'Value must be a valid number';
      }
    } else if (editForm.type === 'boolean') {
      if (editForm.value !== 'true' && editForm.value !== 'false') {
        newErrors.value = 'Value must be "true" or "false"';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateSetting = async () => {
    if (!validateEditForm()) return;
    
    try {
        let submittedValue = editForm.value; // Start with the string value
      
      // --- START OF FIX ---
      if (editForm.type === 'boolean') {
        // Convert the string 'true'/'false' to the actual boolean value true/false
        submittedValue = editForm.value === 'true'; 
      } else if (editForm.type === 'number') {
        // Also good practice to convert number strings to actual numbers
        submittedValue = Number(editForm.value);
      } else if (editForm.type === 'array' || editForm.type === 'object') {
        // Parse JSON strings to objects/arrays
        submittedValue = JSON.parse(editForm.value);
      }
      // --- END OF FIX ---

      const updateData = {
        value: submittedValue,
        type: editForm.type,
        category: editForm.category,
        isPublic: editForm.isPublic
      };
      
      await updateSystemSetting({
        id: selectedSetting.id,
        data: updateData
      }).unwrap();
      
      setViewModalOpen(false);
      setEditModalOpen(false);
      setSelectedSetting(null);
      
      toast.success('Setting updated successfully');
      
    } catch (error) {
      console.error('Failed to update setting:', error);
      setErrors({ submit: error.data?.error || 'Failed to update setting' });
    }
  };

  const handleConfirmDelete = async () => {

      setDeleteModalOpen(false);
      setSelectedSetting(null);
      toast.error("Syatem settings cannot be deleted.");

  };

  const formatValue = (value, type) => {
    if (value === null || value === undefined) return 'N/A';
    
    if (type === 'boolean') {
      return value ? 'true' : 'false';
    }
    
    if (type === 'array' || type === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    
    return String(value);
  };

  const renderValuePreview = (value, type) => {
    const formattedValue = formatValue(value, type);
    
    if (formattedValue.length > 50) {
      return (
        <div className="group relative">
          <span className="truncate">{formattedValue.substring(0, 50)}...</span>
          <div className="absolute z-10 hidden group-hover:block bg-gray-900 text-white text-xs p-2 rounded shadow-lg max-w-xs break-words">
            {formattedValue}
          </div>
        </div>
      );
    }
    
    return formattedValue;
  };

  const getTypeColor = (type) => {
    const colors = {
      string: 'bg-blue-100 text-blue-800',
      number: 'bg-green-100 text-green-800',
      boolean: 'bg-purple-100 text-purple-800',
      array: 'bg-yellow-100 text-yellow-800',
      object: 'bg-red-100 text-red-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryColor = (category) => {
    const hash = category.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = [
      'bg-indigo-100 text-indigo-800',
      'bg-pink-100 text-pink-800',
      'bg-teal-100 text-teal-800',
      'bg-orange-100 text-orange-800',
      'bg-cyan-100 text-cyan-800'
    ];
    return colors[hash % colors.length];
  };

  // Table columns
  const columns = [
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      render: (setting) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gray-100 rounded">
            <Settings className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <div className="font-mono text-sm font-medium">{setting.key}</div>
            <div className="text-xs text-gray-500">
              {setting.description || 'No description'}
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Value',
      key: 'value',
      render: (setting) => (
        <div className="text-sm">
          {renderValuePreview(setting.value, setting.type)}
        </div>
      )
    },
    {
      title: 'Type',
      key: 'type',
      render: (setting) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(setting.type)}`}>
          {setting.type}
        </span>
      )
    },
    {
      title: 'Category',
      key: 'category',
      render: (setting) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(setting.category)}`}>
          {setting.category}
        </span>
      )
    },
    {
      title: 'Visibility',
      key: 'visibility',
      render: (setting) => (
        <div className="flex items-center">
          {setting.isPublic ? (
            <div className="flex items-center text-green-600">
              <Globe className="h-4 w-4 mr-1" />
              <span className="text-xs">Public</span>
            </div>
          ) : (
            <div className="flex items-center text-gray-600">
              <Lock className="h-4 w-4 mr-1" />
              <span className="text-xs">Private</span>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (setting) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewSetting(setting);
            }}
            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditSetting(setting);
            }}
            className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
            title="Edit Setting"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteSetting(setting);
            }}
            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            title="Delete Setting"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Failed to load system settings
          </h3>
          <p className="text-red-600 mb-4">
            Unable to fetch system settings. Please try again.
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
    <div className="max-w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-700 flex items-center">
            <Settings className="h-8 w-8 mr-3 text-primary" />
            System Settings
          </h1>
          <p className="text-gray-600 mt-2">
            Manage application-wide configuration settings
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={refetch}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            title="Refresh Settings"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-orange-50 rounded-lg">
              <Settings className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Settings</p>
              <p className="text-2xl font-semibold text-gray-900">
                {settings.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-orange-50 rounded-lg">
              <Globe className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Public Settings</p>
              <p className="text-2xl font-semibold text-gray-900">
                {settings.filter(s => s.isPublic).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-orange-50 rounded-lg">
              <Lock className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Private Settings</p>
              <p className="text-2xl font-semibold text-gray-900">
                {settings.filter(s => !s.isPublic).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-3 bg-orange-50 rounded-lg">
              <Filter className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Categories</p>
              <p className="text-2xl font-semibold text-gray-900">
                {categories.length - 1}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Email & Workers Stats Block */}
      {emailStatsData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary-600" />
            Email & Worker Statistics
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Queue Stats */}
            {emailStatsData.queue && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email Queue
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-amber-50 rounded p-3">
                    <p className="text-xs text-gray-500">Queued</p>
                    <p className="text-lg font-semibold">{emailStatsData.queue.queued ?? 0}</p>
                  </div>
                  <div className="bg-blue-50 rounded p-3">
                    <p className="text-xs text-gray-500">Processing</p>
                    <p className="text-lg font-semibold">{emailStatsData.queue.processing ?? 0}</p>
                  </div>
                  <div className="bg-green-50 rounded p-3">
                    <p className="text-xs text-gray-500">Sent</p>
                    <p className="text-lg font-semibold text-green-700">{emailStatsData.queue.sent ?? 0}</p>
                  </div>
                  <div className="bg-red-50 rounded p-3">
                    <p className="text-xs text-gray-500">Failed</p>
                    <p className="text-lg font-semibold text-red-700">{emailStatsData.queue.failed ?? 0}</p>
                  </div>
                </div>
              </div>
            )}
            {/* Workers Stats */}
            {emailStatsData.workers && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Server className="h-4 w-4" /> Workers
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Total Workers</p>
                    <p className="text-lg font-semibold">{emailStatsData.workers.totalWorkers ?? '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Busy Workers</p>
                    <p className="text-lg font-semibold">{emailStatsData.workers.busyWorkers ?? '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Queue Length</p>
                    <p className="text-lg font-semibold">{emailStatsData.workers.queueLength ?? '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Active Tasks</p>
                    <p className="text-lg font-semibold">{emailStatsData.workers.activeTasks ?? '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">CPU Count</p>
                    <p className="text-lg font-semibold">{emailStatsData.workers.cpuCount ?? '-'}</p>
                  </div>
                </div>
                {emailStatsData.workers.memoryUsage && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      <HardDrive className="h-3 w-3" /> Memory Usage
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <span>RSS: {(emailStatsData.workers.memoryUsage.rss / 1024 / 1024).toFixed(2)} MB</span>
                      <span>Heap: {(emailStatsData.workers.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} / {(emailStatsData.workers.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by key or value..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
              />
            </div>
          </div>
          
          <div className="w-full md:w-64">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Settings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              System Configuration
            </h2>
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1}-{endIndex} of {totalSettings} settings
            </div>
          </div>

          <Table
            columns={columns}
            data={currentSettings}
            loading={isLoading}
            emptyMessage={
              <div className="text-center py-12">
                <Settings className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 mb-2">No system settings found</p>
                {searchTerm && (
                  <p className="text-sm text-gray-400">
                    Try adjusting your search terms
                  </p>
                )}
              </div>
            }
            rowKey="id"
            onRowClick={handleViewSetting}
            showPagination={totalSettings > itemsPerPage}
            pagination={{
              current: currentPage,
              totalPages,
              total: totalSettings,
              startIndex,
              endIndex
            }}
            onPageChange={setCurrentPage}
            hoverable={true}
            striped={true}
          />
        </div>
      </div>

      {/* View Setting Details Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="System Setting Details"
        size="lg"
      >
        {selectedSetting && (
          <div className="space-y-6">
            {/* Setting Header */}
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex flex-col items-start gap-3 md:flex-row md:items-center justify-between">
                <div className="flex flex-col items-start md:flex-row md:items-center gap-3">
                  <div className="p-2 bg-primary-100 rounded">
                    <Settings className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-700 font-poppins break-all">
                      {selectedSetting.key}
                    </h3>
                    <div className="flex items-center flex-wrap gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(selectedSetting.type)}`}>
                        {selectedSetting.type}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(selectedSetting.category)}`}>
                        {selectedSetting.category}
                      </span>
                      {selectedSetting.isPublic ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <Globe className="h-3 w-3 mr-1" />
                          Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          <Lock className="h-3 w-3 mr-1" />
                          Private
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleEditSetting(selectedSetting)}
                  className="px-3 py-1 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition flex items-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
              </div>
            </div>

            {/* Setting Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500 mb-2">Value</p>
                <div className="font-mono text-sm bg-white p-3 rounded border overflow-x-auto">
                  {formatValue(selectedSetting.value, selectedSetting.type)}
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500 mb-2">Formatted Value</p>
                <div className="p-3">
                  {selectedSetting.type === 'boolean' ? (
                    <div className="flex items-center">
                      {selectedSetting.value ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mr-2" />
                      )}
                      <span className={selectedSetting.value ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {selectedSetting.value ? 'Enabled/True' : 'Disabled/False'}
                      </span>
                    </div>
                  ) : selectedSetting.type === 'array' || selectedSetting.type === 'object' ? (
                    <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                      {JSON.stringify(selectedSetting.value, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-gray-900">{formatValue(selectedSetting.value, selectedSetting.type)}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Metadata</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm font-medium">
                    {new Date(selectedSetting.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="text-sm font-medium">
                    {new Date(selectedSetting.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">ID</p>
                  <p className="text-sm font-mono font-medium">
                    {selectedSetting.id}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Setting Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={
          <div className="flex items-center">
            <Edit className="h-5 w-5 mr-2 text-green-600" />
            Edit System Setting
          </div>
        }
        subtitle={selectedSetting?.key}
        size="lg"
      >
        {selectedSetting && (
          <div className="space-y-4">
            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value
                </label>
                {editForm.type === 'boolean' ? (
                  <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        checked={editForm.value === 'true'}
                        onChange={() => setEditForm({ ...editForm, value: 'true' })}
                        className="form-radio h-4 w-4 text-primary"
                      />
                      <span className="ml-2">True</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        checked={editForm.value === 'false'}
                        onChange={() => setEditForm({ ...editForm, value: 'false' })}
                        className="form-radio h-4 w-4 text-primary"
                      />
                      <span className="ml-2">False</span>
                    </label>
                  </div>
                ) : editForm.type === 'array' || editForm.type === 'object' ? (
                  <textarea
                    value={editForm.value}
                    onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                    rows={8}
                    className={`w-full px-3 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition ${
                      errors.value ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={`Enter valid JSON (${editForm.type})`}
                  />
                ) : editForm.type === 'number' ? (
                  <input
                    type="number"
                    value={editForm.value}
                    onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition ${
                      errors.value ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                ) : (
                  <input
                    type="text"
                    value={editForm.value}
                    onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition ${
                      errors.value ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                )}
                {errors.value && (
                  <p className="text-red-500 text-sm mt-1">{errors.value}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                    disabled={true} // Type should not be changed
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="array">Array</option>
                    <option value="object">Object</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                  >
                    {categories.filter(c => c !== 'all').map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editForm.isPublic}
                    onChange={(e) => setEditForm({ ...editForm, isPublic: e.target.checked })}
                    className="form-checkbox h-4 w-4 text-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Public (accessible without authentication)
                  </span>
                </label>
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{errors.submit}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSetting}
                disabled={isUpdating}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete System Setting"
        message={
          <>
            Are you sure you want to delete the setting{' '}
            <span className="font-mono font-semibold break-all bg-primary-300">{selectedSetting?.key}</span>?
            <br />
            <span className="text-red-600">
              This action cannot be undone and may affect system functionality.
            </span>
          </>
        }
        confirmText="Delete Setting"
        cancelText="Cancel"
        variant="danger"
        isLoading={false}
      />
    </div>
  );
};

export default SystemSettings;