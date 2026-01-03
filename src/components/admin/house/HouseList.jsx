// src/components/house/HouseList.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, Edit, Trash2, Eye, Plus, ChevronRight,
  Home, Users, Layers, Calendar, MoreVertical, RefreshCw
} from 'lucide-react';
import { useGetHousesQuery, useDeleteHouseMutation } from '../../../store/api/houseApi';
import { useAuth } from '../../../hooks';
import { LoaderMinimal } from '../../common/RouteLoader';
import { toast } from 'react-toastify';
import AccessDeniedPage from '../../../pages/utility/AccessDeniedPage';
// import { formatDate, formatCurrency } from '../../utils/format';

const HouseList = () => {
  const navigate = useNavigate();
  const { isWebOwner, isHouseOwner, isStaff, isCaretaker } = useAuth();
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    ownerId: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const { data, isFetching, refetch } = useGetHousesQuery(filters);
  const [deleteHouse] = useDeleteHouseMutation();

  const houses = data?.data || [];
  const pagination = data?.pagination;

  const handleSearch = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleDelete = async (id, address) => {
    if(isWebOwner) {
        if (window.confirm(`Are you sure you want to delete "${address}"? This action cannot be undone.`)) {
            try {
                await deleteHouse(id).unwrap();
                refetch();
            } catch (error) {
                console.error('Delete failed:', error);
            }
        }
    }
    if(isHouseOwner) {
        toast.error("You don't have permission to delete House.");
    }
  };

  const StatusBadge = ({ active }) => (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">House List</h1>
          <p className="text-subdued">Manage all Houses</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3 py-2 border border-surface rounded-lg text-text hover:bg-surface transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/houses/create')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add House
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-surface border border-surface rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-subdued" />
            <input
              type="text"
              placeholder="Search by address or UUID..."
              value={filters.search}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-surface rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 border border-surface rounded-lg text-text hover:bg-surface transition-colors flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface border border-surface rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-subdued">Total Properties</p>
                <p className="text-2xl font-bold text-text">{data.stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-surface border border-surface rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-subdued">Total Flats</p>
                <p className="text-2xl font-bold text-text">{data.stats.flats}</p>
              </div>
            </div>
          </div>
          <div className="bg-surface border border-surface rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-subdued">Active Properties</p>
                <p className="text-2xl font-bold text-text">{data.stats.active}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Houses Table */}
      <div className="bg-surface border border-surface rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface">
              <tr className="border-b border-surface">
                <th className="text-left py-3 px-4 text-sm font-medium text-subdued">Property</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-subdued">Address</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-subdued">Owner</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-subdued">Flats</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-subdued">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-subdued">Created</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-subdued">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface">
              {houses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center">
                    <div className="max-w-sm mx-auto">
                      <Home className="w-12 h-12 text-subdued mx-auto mb-3 opacity-50" />
                      <p className="text-text font-medium">No properties found</p>
                      <p className="text-subdued text-sm mt-1">Try adjusting your search or create a new property</p>
                    </div>
                  </td>
                </tr>
              ) : (
                houses.map((house) => (
                  <tr key={house?.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-text">{house?.name}</p>
                        <p className="text-xs text-subdued mt-1">{house?.uuid}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-text">{house?.address}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="w-3 h-3 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text">{house?.owner?.name}</p>
                          <p className="text-xs text-subdued">{house?.owner?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          {house?.stats?.flats || 0} flats
                        </span>
                        {house?.stats?.caretakers > 0 && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                            {house?.stats.caretakers} caretakers
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge active={house?.active} />
                    </td>
                    <td className="py-3 px-4 text-sm text-subdued">
                      {/* {formatDate(house?.createdAt)} */}
                        {new Date(house?.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/houses/${house?.id}`)}
                          className="cursor-pointer p-1.5 text-text hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/houses/${house?.id}/edit`)}
                          className="cursor-pointer p-1.5 text-text hover:text-secondary hover:bg-secondary/10 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {(isWebOwner) && (
                          <button
                            onClick={() => handleDelete(house?.id, house?.address)}
                            className="cursor-pointer p-1.5 text-text hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/houses/${house?.id}`)}
                          className="p-1.5 text-text hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          title="More"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-surface pt-4">
          <div className="text-sm text-subdued">
            Showing {(filters.page - 1) * filters.limit + 1} to{' '}
            {Math.min(filters.page * filters.limit, pagination.total)} of {pagination.total} properties
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={filters.page <= 1}
              className="px-3 py-1.5 border border-surface rounded-lg text-text hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                let pageNum;
                if (pagination.pages <= 5) {
                  pageNum = i + 1;
                } else if (filters.page <= 3) {
                  pageNum = i + 1;
                } else if (filters.page >= pagination.pages - 2) {
                  pageNum = pagination.pages - 4 + i;
                } else {
                  pageNum = filters.page - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setFilters(prev => ({ ...prev, page: pageNum }))}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      filters.page === pageNum
                        ? 'bg-primary text-white'
                        : 'text-text hover:bg-surface'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={filters.page >= pagination.pages}
              className="px-3 py-1.5 border border-surface rounded-lg text-text hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HouseList;