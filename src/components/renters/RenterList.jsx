// pages/RenterList.jsx
import React, { useEffect, useState } from 'react';
import { 
  useGetRentersQuery, 
  useDeleteRenterMutation 
} from '../../store/api/renterApi';
import ViewRenterModal from './ViewRenterModal';
import UpdateRenterModal from './UpdateRenterModal';
import CreateRenterModal from './CreateRenterModal';
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  User
} from 'lucide-react';
import Btn from '../common/Button';
import Table from '../common/Table';
import ConfirmationModal from '../common/ConfirmationModal';
import { useLocation, useParams } from 'react-router-dom';

const RenterList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRenter, setSelectedRenter] = useState(null);
  const location = useLocation();
const queryParams = new URLSearchParams(location.search);
const view = queryParams.get('view');
  console.log(view);
  
  
  
  
  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  useEffect(() => {
    //check view is a number and then open the view renter modal
    setTimeout(() => {
      if (view && !isNaN(view)) {
        setSelectedRenter({id: parseInt(view)});
        setViewModalOpen(true);
      }
    }, 500);
  }, [view]);
  // API hooks
  const { data, isLoading, refetch } = useGetRentersQuery({
    page,
    limit: 10,
    search,
    status: statusFilter || undefined
  });
  
  const [deleteRenter, { isLoading: isDeleting }] = useDeleteRenterMutation();

  const handleDelete = async () => {
    if (!selectedRenter) return;
    
    try {
      await deleteRenter(selectedRenter.id).unwrap();
      setDeleteModalOpen(false);
      setSelectedRenter(null);
      refetch();
    } catch (error) {
      console.error('Failed to delete renter:', error);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (renter) => (
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{renter.name}</p>
            <p className="text-sm text-gray-500">{renter.email || 'No email'}</p>
          </div>
        </div>
      )
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (renter) => (
        <div>
          <p className="text-gray-900">{renter.phone}</p>
          {renter.alternativePhone && (
            <p className="text-sm text-gray-500">Alt: {renter.alternativePhone}</p>
          )}
        </div>
      )
    },
    {
      title: 'NID',
      dataIndex: 'nid',
      key: 'nid',
      render: (renter) => renter.nid || 'Not provided'
    },
    {
      title: 'Flats',
      dataIndex: 'flatCount',
      key: 'flats',
      render: (renter) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {renter.flatCount} flats
        </span>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (renter) => {
        const statusColors = {
          active: 'bg-green-100 text-green-800',
          inactive: 'bg-yellow-100 text-yellow-800',
          pending: 'bg-gray-100 text-gray-800',
          deleted: 'bg-red-100 text-red-800'
        };
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[renter.status] || 'bg-gray-100 text-gray-800'}`}>
            {renter.status.charAt(0).toUpperCase() + renter.status.slice(1)}
          </span>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (renter) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedRenter(renter);
              setViewModalOpen(true);
            }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedRenter(renter);
              setEditModalOpen(true);
            }}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedRenter(renter);
              setDeleteModalOpen(true);
            }}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
            title="Delete"
            disabled={renter.status === 'deleted'}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-0">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Renters</h1>
        <p className="text-gray-600">Manage your renters and their information</p>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search renters..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
          
          <Btn
            type="primary"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Renter
          </Btn>
        </div>
      </div>

      {/* Renter Table */}
      <Table
        columns={columns}
        data={data?.data || []}
        loading={isLoading}
        emptyMessage="No renters found"
        showPagination={true}
        pagination={{
          current: page,
          total: data?.meta?.total || 0,
          totalPages: data?.meta?.totalPages || 1,
          startIndex: (page - 1) * 10 + 1,
          endIndex: Math.min(page * 10, data?.meta?.total || 0)
        }}
        onPageChange={setPage}
      />

      {/* Modals */}
      {selectedRenter && (
        <>
          <ViewRenterModal
            isOpen={viewModalOpen}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedRenter(null);
            }}
            renterId={selectedRenter.id}
          />
          
          <UpdateRenterModal
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedRenter(null);
            }}
            renter={selectedRenter}
            onSuccess={() => {
              refetch();
              setEditModalOpen(false);
              setSelectedRenter(null);
            }}
          />
        </>
      )}

      <CreateRenterModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          refetch();
          setCreateModalOpen(false);
        }}
      />

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedRenter(null);
        }}
        onConfirm={handleDelete}
        title="Delete Renter"
        message={`Are you sure you want to delete ${selectedRenter?.name}? This action cannot be undone.`}
        variant="danger"
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default RenterList;