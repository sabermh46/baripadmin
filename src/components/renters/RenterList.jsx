// pages/RenterList.jsx
import React, { useState } from 'react';
import { 
  useGetRentersQuery, 
  useDeleteRenterMutation 
} from '../../store/api/renterApi';
import ViewRenterModal from './ViewRenterModal';
import UpdateRenterModal from './UpdateRenterModal';
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
import { useLocation } from 'react-router-dom';
import RenterForm from './RenterForm';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks';
import { apiErrorMessage } from '../../utils/apiError';
import { showMessageInLanguage } from '../../utils/showMessageInLanguage';

const RenterList = () => {
  const { user, hasPermission, isWebOwner, isDeveloper, isHouseOwner, isStaff } = useAuth();

  /**
   * Mirrors RenterController::destroy exactly, which is NOT simply "holds renters.delete".
   *
   *   web_owner / developer  — always
   *   house_owner            — only renters they created, and no permission is consulted
   *   staff                  — only with renters.delete
   *   caretaker              — never, even though renters.delete is in the caretaker
   *                            catalogue and can be granted on an assignment
   *
   * Gating this on hasPermission('renters.delete') alone would keep offering the button to a
   * caretaker who holds the key and would still be refused by the server.
   */
  const canDelete = (renter) =>
    isWebOwner
    || isDeveloper
    || (isHouseOwner && renter?.createdBy === user?.id)
    || (isStaff && hasPermission('renters.delete'));
  const { t } = useTranslation();
  const location = useLocation();

  // `/renters?view=45` is a deep link from the flat overview and the dashboard's renters
  // modal. Read once, at mount, straight into initial state.
  //
  // It used to be an effect that waited 500ms and then set state — presumably to let the list
  // load, though ViewRenterModal fetches the renter by id itself and never needed the list.
  // The timer had no cleanup either, so leaving the page within half a second left it to fire
  // against an unmounted component.
  //
  // This block has to stay ABOVE the state declarations that read `deepLinkId`: `const` is
  // hoisted but not initialised, so referencing it earlier in the same scope is a TDZ
  // ReferenceError at render, not a lint error and not a build failure.
  const view = new URLSearchParams(location.search).get('view');
  const deepLinkId = view && !Number.isNaN(Number(view)) ? Number(view) : null;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRenter, setSelectedRenter] = useState(deepLinkId ? { id: deepLinkId } : null);

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(Boolean(deepLinkId));
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  // API hooks
  const { data, isLoading, refetch, error } = useGetRentersQuery({
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
      title: t('name'),
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
      title: t('phone'),
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
      title: t('nid'),
      dataIndex: 'nid',
      key: 'nid',
      render: (renter) => renter.nid || 'Not provided'
    },
    {
      title: t('flats'),
      dataIndex: 'flatCount',
      key: 'flats',
      render: (renter) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {renter.flatCount} flats
        </span>
      )
    },
    {
      title: t('status'),
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
      title: t('actions'),
      key: 'actions',
      render: (renter) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedRenter(renter);
              setViewModalOpen(true);
            }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title={t('view_details')}
          >
            <Eye className="h-4 w-4" />
          </button>
          {hasPermission('renters.edit') && (
            <button
              onClick={() => {
                setSelectedRenter(renter);
                setEditModalOpen(true);
              }}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
              title={t('edit')}
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {canDelete(renter) && (
            <button
              onClick={() => {
                setSelectedRenter(renter);
                setDeleteModalOpen(true);
              }}
              className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-40"
              title={t('delete')}
              disabled={renter.status === 'deleted'}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-0">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('renters')}</h1>
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
          
          {hasPermission('renters.create') && (
            <Btn
              type="primary"
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('add_renter')}
            </Btn>
          )}
        </div>
      </div>

      {/* Shown, not toasted. The toast sat in the render body, so a failed load re-fired it
          on EVERY re-render — a keystroke in the search box, a page change, any state update
          at all — stacking notifications for a single failure. And behind them the table
          said "No renters found", which is a different problem with a different fix. */}
      {error ? (
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
          <p className="text-sm text-red-800">
            {showMessageInLanguage(apiErrorMessage(error, t('failed_to_fetch_renters')))}
          </p>
          <button
            type="button"
            onClick={refetch}
            className="mt-3 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            {t('retry')}
          </button>
        </div>
      ) : (
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
      )}

      {/* Modals.
          Mounted per-dialog rather than as one subtree gated on `selectedRenter`. The edit
          form seeds react-hook-form from defaultValues, which are read once at mount and
          never again — so arriving via `/renters?view=45` mounted it against the deep link's
          stub `{ id: 45 }`, and every field was blank when the form was later opened for a
          real row. Mounting it only while it is open means it always mounts against the full
          record. */}
      {selectedRenter && viewModalOpen && (
        <ViewRenterModal
          isOpen
          onClose={() => {
            setViewModalOpen(false);
            setSelectedRenter(null);
          }}
          renterId={selectedRenter.id}
        />
      )}

      {selectedRenter && editModalOpen && (
        <UpdateRenterModal
          key={selectedRenter.id}
          isOpen
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
      )}

      <RenterForm 
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        houseOwnerId={null}
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