

// HouseOwnerHouses
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Mail, 
  Home, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical,
  UserPlus
} from 'lucide-react';
import { useGetManagedOwnersQuery } from '../../store/api/houseApi';
import debounce from 'lodash/debounce';
import { useTranslation } from 'react-i18next';

const HouseOwnersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const {t} = useTranslation();


  // 1. Debounced Search Handler
  const debouncedSearch = useMemo(
    () => debounce((value) => {
      setSearchTerm(value);
      setPage(1); // Reset to first page on search
    }, 500),
    []
  );

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  // 2. API Query
  const { data, isLoading, isFetching } = useGetManagedOwnersQuery({
    search: searchTerm,
    page,
    limit
  });

  console.log(data);
  

  const owners = data?.data || [];
  const meta = data?.meta || { totalPages: 1 };

  return (
    <div className="space-y-4 bg-background min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">House Owners</h1>
          <p className="text-subdued text-sm">Manage and monitor all registered property owners.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors w-fit">
          <UserPlus size={18} />
          Add Owner
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface p-4 rounded-xl border border-subdued/20 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-subdued" size={18} />
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
          />
        </div>
        <div className="text-sm text-subdued">
          Showing <span className="text-text font-medium">{owners.length}</span> of {meta.total || 0} owners
        </div>
      </div>

      {/* Owners Grid/Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading || isFetching ? (
          // Skeleton Loader
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-surface animate-pulse rounded-xl border border-subdued/10" />
          ))
        ) : owners.length > 0 ? (
          owners.map((owner) => (
            <div key={owner.id} className="bg-surface p-5 rounded-xl border border-subdued/20 hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {owner.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-text group-hover:text-primary transition-colors">{owner.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-subdued">
                      <Mail size={12} />
                      {owner.email}
                    </div>
                  </div>
                </div>
                <button className="text-subdued hover:text-text p-1">
                  <MoreVertical size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-subdued/10">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-subdued font-semibold">Properties</p>
                  <div className="flex items-center gap-2 text-text">
                    <Home size={16} className="text-primary" />
                    <span className="font-bold">{owner.houseCount}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-subdued font-semibold">Status</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                    owner.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                  }`}>
                    {owner.status}
                  </span>
                </div>
              </div>

              {/* Houses Preview Tooltip/List */}
              <div className="mt-4">
                 <p className="text-xs text-subdued italic truncate">
                   {owner.houses?.map(h => h.name).join(', ') || 'No houses assigned'}
                 </p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-surface rounded-xl border border-dashed border-subdued/30">
            <p className="text-subdued">No owners found matching your search.</p>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || isFetching}
            className="p-2 rounded-lg border border-subdued/30 hover:bg-surface disabled:opacity-50 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center gap-1">
            {[...Array(meta.totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setPage(i + 1)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  page === i + 1 
                    ? 'bg-primary text-white' 
                    : 'hover:bg-surface text-subdued border border-transparent hover:border-subdued/30'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
            disabled={page === meta.totalPages || isFetching}
            className="p-2 rounded-lg border border-subdued/30 hover:bg-surface disabled:opacity-50 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default HouseOwnersPage;
