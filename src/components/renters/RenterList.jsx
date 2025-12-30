import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  User, 
  Phone, 
  Mail,
  Eye,
  Download
} from 'lucide-react';
import { 
  useGetRentersQuery, 
  useDeleteRenterMutation 
} from '../../store/api/renterApi';
import { toast } from 'react-toastify';
import RenterForm from './RenterForm';

const RenterList = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showRenterForm, setShowRenterForm] = useState(false);
  const [selectedRenter, setSelectedRenter] = useState(null);

  const { data, isLoading, refetch } = useGetRentersQuery({
    search,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit: 20
  });

  const [deleteRenter] = useDeleteRenterMutation();

  const handleEdit = (renter) => {
    setSelectedRenter(renter);
    setShowRenterForm(true);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteRenter(id).unwrap();
        toast.success('Renter deleted successfully');
        refetch();
      } catch (error) {
        toast.error(`Failed to delete renter: ${error?.data?.error || error.message}`);
      }
    }
  };

  const handleViewDetails = (renter) => {
    // Implement view details functionality
    toast.info('View details functionality to be implemented');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text">Renters</h1>
        <button
          onClick={() => setShowRenterForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <User size={20} />
          Add New Renter
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-xl border border-subdued/20 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Search Renters
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued" size={20} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                placeholder="Search by name, phone, email, or NID"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Status Filter
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued" size={20} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => refetch()}
              className="w-full px-4 py-2 bg-subdued/10 text-text rounded-lg hover:bg-subdued/20 transition-colors"
            >
              Refresh List
            </button>
          </div>
        </div>
      </div>

      {/* Renters Table */}
      <div className="bg-surface rounded-xl border border-subdued/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-subdued/5">
              <tr>
                <th className="text-left p-4 font-medium text-text">Renter</th>
                <th className="text-left p-4 font-medium text-text">Contact</th>
                <th className="text-left p-4 font-medium text-text">NID</th>
                <th className="text-left p-4 font-medium text-text">Status</th>
                <th className="text-left p-4 font-medium text-text">Flats</th>
                <th className="text-left p-4 font-medium text-text">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subdued/10">
              {data?.data?.map((renter) => (
                <tr key={renter.id} className="hover:bg-subdued/5">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="text-primary" size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-text">{renter.name}</p>
                        <p className="text-sm text-subdued">
                          Created by: {renter.creatorName || 'System'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      {renter.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={16} className="text-subdued" />
                          <span className="text-text">{renter.phone}</span>
                        </div>
                      )}
                      {renter.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-subdued" />
                          <span className="text-text">{renter.email}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {renter.nid ? (
                      <div>
                        <p className="text-text">{renter.nid}</p>
                        {(renter.nidFrontImageUrl || renter.nidBackImageUrl) && (
                          <p className="text-xs text-green-600 mt-1">Documents uploaded</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-subdued">Not provided</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      renter.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {renter.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <p className="text-text font-medium">{renter.flatCount || 0} flats</p>
                      {renter.flats?.length > 0 && (
                        <div className="text-xs text-subdued">
                          {renter.flats.slice(0, 2).map((flat, index) => (
                            <span key={flat.id}>
                              {flat.houseName} - {flat.number || flat.flatName}
                              {index < renter.flats.length - 1 && ', '}
                            </span>
                          ))}
                          {renter.flats.length > 2 && ` +${renter.flats.length - 2} more`}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetails(renter)}
                        className="p-2 hover:bg-subdued/10 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(renter)}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={18} className="text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(renter.id, renter.name)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} className="text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {data?.data?.length === 0 && (
          <div className="text-center py-12">
            <User className="mx-auto text-subdued mb-4" size={48} />
            <h3 className="text-lg font-medium text-text mb-2">No renters found</h3>
            <p className="text-subdued mb-6">
              {search || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Get started by adding your first renter'}
            </p>
            <button
              onClick={() => setShowRenterForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <User size={20} />
              Add New Renter
            </button>
          </div>
        )}

        {/* Pagination */}
        {data?.meta?.totalPages > 1 && (
          <div className="border-t border-subdued/20 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-subdued">
                Showing {(data.meta.page - 1) * data.meta.limit + 1} to{' '}
                {Math.min(data.meta.page * data.meta.limit, data.meta.total)} of{' '}
                {data.meta.total} renters
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-subdued/30 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-subdued/10 transition-colors"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-text">
                  Page {data.meta.page} of {data.meta.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(data.meta.totalPages, p + 1))}
                  disabled={page === data.meta.totalPages}
                  className="px-4 py-2 border border-subdued/30 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-subdued/10 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Renter Form Modal */}
      <RenterForm
        open={showRenterForm}
        onClose={() => {
          setShowRenterForm(false);
          setSelectedRenter(null);
          refetch();
        }}
        renter={selectedRenter}
      />
    </div>
  );
};

export default RenterList;