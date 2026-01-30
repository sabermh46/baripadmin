// pages/Caretakers.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetCaretakersQuery,
  useDeleteCaretakerMutation,
} from '../../store/api/caretakerApi';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Shield,
  Home,
  User,
  Mail,
  Phone,
  Calendar,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks';
import Btn from '../common/Button';
import ConfirmationModal from '../common/ConfirmationModal';
import Table from '../common/Table';
import { useTranslation } from 'react-i18next';

const CaretakerList = () => {
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const { t } = useTranslation();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCaretaker, setSelectedCaretaker] = useState(null);
  
  const { data, isLoading, error, refetch } = useGetCaretakersQuery(filters);
  const [deleteCaretaker, { isLoading: isDeleting }] = useDeleteCaretakerMutation();
  const { user } = useAuth();

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleDelete = async () => {
    if (!selectedCaretaker) return;
    
    try {
      await deleteCaretaker(selectedCaretaker.id).unwrap();
      toast.success('Caretaker deleted successfully');
      setDeleteModalOpen(false);
      setSelectedCaretaker(null);
      refetch();
    } catch (error) {
      toast.error(error.data?.error || 'Failed to delete caretaker');
    }
  };

  const openDeleteModal = (caretaker) => {
    setSelectedCaretaker(caretaker);
    setDeleteModalOpen(true);
  };

  const columns = [
    {
      title: t('caretaker'),
      key: 'caretaker',
      render: (row) => (
        <div className="flex items-center">
          {row.avatarUrl ? (
            <img
              src={row.avatarUrl}
              alt={row.name}
              className="h-10 w-10 rounded-full mr-3"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
              <User className="h-5 w-5 text-primary-600" />
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: t('contact'),
      key: 'contact',
      render: (row) => (
        <div className="text-sm">
          {row.phone ? (
            <div className="flex items-center text-gray-600">
              <Phone className="h-4 w-4 mr-1" />
              {row.phone}
            </div>
          ) : (
            <span className="text-gray-400">No phone</span>
          )}
        </div>
      ),
    },
    {
      title: t('assignments'),
      key: 'assignments',
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <Home className="h-4 w-4 mr-1 text-gray-500" />
            <span className="font-medium">{row.houseCount}</span>
            <span className="text-gray-500 ml-1">houses</span>
          </div>
          <div className="flex items-center text-sm">
            <User className="h-4 w-4 mr-1 text-gray-500" />
            <span className="font-medium">{row.assignmentCount}</span>
            <span className="text-gray-500 ml-1">assignments</span>
          </div>
        </div>
      ),
    },
    {
      title: t('house_owners'),
      key: 'owners',
      render: (row) => (
        <div className="max-w-xs">
          {row.houseOwners?.slice(0, 2).map((owner, idx) => (
            <div key={idx} className="text-sm truncate" title={owner.name}>
              {owner.name}
              {idx === 0 && row.houseOwners.length > 2 && (
                <span className="text-gray-500 ml-1">
                  +{row.houseOwners.length - 2} more
                </span>
              )}
            </div>
          ))}
          {row.houseOwners?.length === 0 && (
            <span className="text-gray-400 text-sm">No owners</span>
          )}
        </div>
      ),
    },
    {
      title: t('status'),
      key: 'status',
      render: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.status === 'active'
            ? 'bg-green-100 text-green-800'
            : row.status === 'inactive'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </span>
      ),
    },
    {
      title: t('joined'),
      key: 'joined',
      render: (row) => (
        <div className="text-sm text-gray-500">
          {new Date(row.createdAt).toLocaleDateString()}
        </div>
      ),
    },
    {
      title: t('actions'),
      key: 'actions',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <Link to={`/caretakers/${row.id}/details`}>
            <Btn size="sm" variant="ghost" title="View Details">
              <Eye className="h-4 w-4" />
            </Btn>
          </Link>
          
          <Link to={`/caretakers/${row.id}/edit`}>
            <Btn size="sm" variant="ghost" title="Edit">
              <Edit className="h-4 w-4" />
            </Btn>
          </Link>
          
          {(user.role.slug === 'web_owner' || 
            (user.role.slug === 'staff' && user.permissions?.includes('caretakers.delete'))) && (
            <Btn
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-800"
              onClick={() => openDeleteModal(row)}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Btn>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('caretakers')}</h1>
          <p className="text-gray-600 mt-1">
            {t('manage_caretakers_and_their_permissions')}
          </p>
        </div>
        
        {(user.role.slug === 'web_owner' || 
          (user.role.slug === 'staff' && user.permissions?.includes('caretakers.create'))) && (
          <Link to="/caretakers/new">
            <Btn>
              <Plus className="h-4 w-4 mr-2" />
              {
                t('add_caretaker')
              }
            </Btn>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>
          
          <div>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="name">{t('sort_by_name')}</option>
              <option value="createdAt">{t('sort_by_date')}</option>
              <option value="email">{t('sort_by_email')}</option>
            </select>
          </div>
          
          <div>
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="asc">{t('accending')}</option>
              <option value="desc">{t('decending')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Caretakers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <Table
          columns={columns}
          data={data?.data || []}
          loading={isLoading}
          emptyMessage="No caretakers found"
          rowKey="id"
          showPagination
          pagination={{
            current: filters.page,
            totalPages: data?.pagination?.pages || 0,
            total: data?.pagination?.total || 0,
            limit: filters.limit,
          }}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={t('delete_caretaker')}
        message={`${t('are_you_sure_you_want_to_delete')} ${selectedCaretaker?.name}? ${t('this_will_remove_all_their_assignments_and_permissions_this_action_cannot_be_undone')}`}
        confirmText={t('delete_caretaker')}
        cancelText={t('cancel')}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default CaretakerList;