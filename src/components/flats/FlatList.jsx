// components/flats/FlatList.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  Eye,
  Filter,
  Home,
  DollarSign,
  Calendar,
  Users,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  HouseHeartIcon,
  House
} from 'lucide-react';
import {
  useGetFlatsQuery,
  useDeleteFlatMutation,
  useRemoveRenterMutation
} from '../../store/api/flatApi';
import { format } from 'date-fns';
import FlatForm from './FlatForm';
import AssignRenterModal from './AssignRenterModal';
import RenterForm from '../renters/RenterForm';
import { useGetHouseDetailsQuery } from '../../store/api/houseApi';
import { toast } from 'react-toastify';
import HouseStats from '../admin/house/HouseStats';
import Btn from '../common/Button';

const FlatList = () => {
  const { houseId } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showRenterForm, setShowRenterForm] = useState(false);
  const {data, isLoading: isHouseLoading, error } = useGetHouseDetailsQuery(houseId)
  

  console.log(houseId);
  
  const { data: flatsData, isLoading } = useGetFlatsQuery({
    houseId,
    page,
    search,
    status,
    limit: 10
  });

  const [deleteFlat] = useDeleteFlatMutation();
  const [removeRenter] = useRemoveRenterMutation();

  const flats = flatsData?.data || [];
  const meta = flatsData?.meta || {};
  const stats = meta.stats || { total: 0, vacant: 0, occupied: 0 };

  const handleViewDetails = (flat) => {
    navigate(`/flats/${flat.id}`);
  };

  const handleEdit = (flat) => {
    setSelectedFlat(flat);
    setOpenForm(true);
  };

  const handleAddRenter = () => {
    // Note: You might need to pass houseOwnerId based on your auth context
    // For now, we'll pass null and let the backend handle it
    setShowRenterForm(true);
  };

  const handleAssignRenter = (flat) => {
    setSelectedFlat(flat);
    setOpenAssignModal(true);
  };

  const handleRemoveRenter = async (flat) => {
    if (window.confirm(`Remove renter from flat ${flat.number || flat.name}?`)) {
      try {
        await removeRenter(flat.id).unwrap();
      } catch (error) {
        toast.error(`Failed to remove renter: ${error?.data?.error || error.message}`);
        console.error('Failed to remove renter:', error);
      }
    }
  };

  const handleDelete = async () => {
    if (selectedFlat) {
      try {
        await deleteFlat(selectedFlat.id).unwrap();
        setDeleteConfirm(false);
        setSelectedFlat(null);
      } catch (error) {
        console.error('Failed to delete flat:', error);
      }
    }
  };

  const occupancyRate = stats.total ? Math.round((stats.occupied / stats.total) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-600">Flats</h1>
          <p className="text-black flex gap-2">
            <House size={20} />
            {data?.data?.name || 'House'}
          </p>
        </div>

        <div className='inline-flex gap-2.5 flex-wrap'>
          <Btn
          type='outline'
            onClick={handleAddRenter}
            className="flex items-center gap-2 px-4 py-2"
          >
            <Users size={20} />
            Add New Renter
          </Btn>
        <Btn
        type='primary'
          onClick={() => setOpenForm(true)}
          className="flex items-center gap-2 px-4 py-2"
        >
          <Plus size={20} />
          Add New Flat
        </Btn>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-xl p-4 shadow-sm border border-subdued/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued" size={20} />
            <input
              type="text"
              placeholder="Search flats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
            />
          </div>
          
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
          >
            <option value="">All Status</option>
            <option value="vacant">Vacant</option>
            <option value="occupied">Occupied</option>
          </select>
          
          <button
            onClick={() => { setSearch(''); setStatus(''); }}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-subdued/30 rounded-lg hover:bg-subdued/10 transition-colors"
          >
            <Filter size={20} />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl p-6 shadow-sm border border-subdued/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-subdued">Total Flats</p>
              <p className="text-3xl font-bold text-text mt-2">{stats.total || 0}</p>
            </div>
            <Home className="text-primary" size={24} />
          </div>
        </div>
        
        <div className="bg-surface rounded-xl p-6 shadow-sm border border-subdued/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-subdued">Vacant Flats</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.vacant || 0}</p>
            </div>
            <Home className="text-yellow-600" size={24} />
          </div>
        </div>
        
        <div className="bg-surface rounded-xl p-6 shadow-sm border border-subdued/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-subdued">Occupied Flats</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.occupied || 0}</p>
            </div>
            <Users className="text-green-600" size={24} />
          </div>
        </div>
        
        <div className="bg-surface rounded-xl p-6 shadow-sm border border-subdued/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-subdued">Occupancy Rate</p>
              <p className="text-3xl font-bold text-text mt-2">{occupancyRate}%</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold">{occupancyRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flats Table */}
      <div className="bg-surface rounded-xl shadow-sm border border-subdued/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-subdued/5 border-b border-subdued/20">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Flat</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Details</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Rent</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Renter</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Status</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Last Payment</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Next Due</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subdued/10">
              {flats.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-subdued">
                    No flats found
                  </td>
                </tr>
              ) : (
                flats.map((flat) => (
                  <tr key={flat.id} className="hover:bg-subdued/5 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-text">
                          {flat.number ? `Flat ${flat.number}` : flat.name}
                        </p>
                        <p className="text-sm text-subdued">{flat.houseName}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm">Day {flat.should_pay_rent_day} of month</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-text">
                        ${flat.rent_amount?.toLocaleString() || '0'}
                      </p>
                      <p className="text-sm text-subdued">Monthly</p>
                    </td>
                    <td className="py-4 px-6">
                      {flat.renterName ? (
                        <div>
                          <p className="font-medium text-text">{flat.renterName}</p>
                          <p className="text-sm text-subdued">{flat.renterPhone}</p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                          Vacant
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {flat.renter_id ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                          Occupied
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                          Vacant
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {flat.last_rent_paid_date ? (
                        <p className="text-sm">
                          {format(new Date(flat.last_rent_paid_date), 'dd MMM yyyy')}
                        </p>
                      ) : (
                        <p className="text-sm text-subdued">No payment yet</p>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {flat.rent_due_date ? (
                        <p className="text-sm">
                          {format(new Date(flat.rent_due_date), 'dd MMM yyyy')}
                        </p>
                      ) : (
                        <p className="text-sm text-subdued">Not set</p>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(flat)}
                          className="p-2 hover:bg-subdued/10 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={18} className="text-subdued" />
                        </button>
                        <button
                          onClick={() => handleEdit(flat)}
                          className="p-2 hover:bg-subdued/10 rounded-lg transition-colors"
                          title="Edit Flat"
                        >
                          <Edit size={18} className="text-blue-600" />
                        </button>
                        {flat.renter_id ? (
                          <button
                            onClick={() => handleRemoveRenter(flat)}
                            className="p-2 hover:bg-subdued/10 rounded-lg transition-colors"
                            title="Remove Renter"
                          >
                            <UserMinus size={18} className="text-orange-600" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAssignRenter(flat)}
                            className="p-2 hover:bg-subdued/10 rounded-lg transition-colors"
                            title="Assign Renter"
                          >
                            <UserPlus size={18} className="text-primary" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedFlat(flat);
                            setDeleteConfirm(true);
                          }}
                          className="p-2 hover:bg-subdued/10 rounded-lg transition-colors"
                          title="Delete Flat"
                        >
                          <Trash2 size={18} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-subdued/20">
            <div className="text-sm text-subdued">
              Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, meta.total)} of {meta.total} flats
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-subdued/30 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-subdued/10 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              
              {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                let pageNum;
                if (meta.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= meta.totalPages - 2) {
                  pageNum = meta.totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      page === pageNum
                        ? 'bg-primary text-white'
                        : 'hover:bg-subdued/10'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="p-2 rounded-lg border border-subdued/30 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-subdued/10 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Flat Modal */}
      <FlatForm
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setSelectedFlat(null);
        }}
        houseId={houseId}
        flat={selectedFlat}
      />

      <RenterForm
        open={showRenterForm}
        onClose={() => setShowRenterForm(false)}
        houseOwnerId={data?.data?.owner_id || null}
      />

      {/* Assign Renter Modal */}
      <AssignRenterModal
        open={openAssignModal}
        onClose={() => {
          setOpenAssignModal(false);
          setSelectedFlat(null);
        }}
        flat={selectedFlat}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-text mb-2">Confirm Delete</h3>
            <p className="text-subdued mb-4">
              Are you sure you want to delete flat "{selectedFlat?.number || selectedFlat?.name}"?
              This action cannot be undone.
            </p>
            
            {selectedFlat?.renter_id && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  This flat has an active renter. You must remove the renter first before deleting the flat.
                </p>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 border border-subdued/30 rounded-lg hover:bg-subdued/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={selectedFlat?.renter_id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlatList;