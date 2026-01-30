// HouseOwnersPage - Updated to use Table component
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Mail, 
  Home, 
  UserPlus,
  MoreVertical
} from 'lucide-react';
import { useGetManagedOwnersQuery } from '../../store/api/houseApi';
import debounce from 'lodash/debounce';
import Table from '../../components/common/Table'; // Import the Table component
import { t } from 'i18next';

const HouseOwnersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const debouncedSearch = useMemo(
    () => debounce((value) => {
      setSearchTerm(value);
      setPage(1);
    }, 500),
    []
  );

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  const { data, isLoading, isFetching } = useGetManagedOwnersQuery({
    search: searchTerm,
    page,
    limit
  });

  const owners = data?.data || [];
  const meta = data?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };

  // Define columns for the Table component
  const columns = [
    {
      title: t('owner'),
      dataIndex: 'name',
      key: 'name',
      render: (owner) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {owner.name.charAt(0)}
          </div>
          <div>
            <div className="font-medium text-gray-900">{owner.name}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Mail size={12} />
              {owner.email}
            </div>
          </div>
        </div>
      )
    },
    {
      title: t('recent_properties'),
      dataIndex: 'houseCount',
      key: 'houseCount',
      render: (owner) => (
        <div className="flex items-center gap-2">
          <Home size={16} className="text-primary" />
          <span className="font-medium">{owner.houseCount}</span>
          <span className="text-sm text-gray-500">{t('houses')}</span>
        </div>
      )
    },
    {
      title: t('houses'),
      key: 'houses',
      render: (owner) => (
        <div className="text-sm text-gray-600 max-w-xs truncate">
          {owner.houses?.map(h => h.name).join(', ') || 'No houses assigned'}
        </div>
      )
    },
    {
      title: t('status'),
      dataIndex: 'status',
      key: 'status',
      render: (owner) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          owner.status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {owner.status}
        </span>
      )
    },
    {
      title: t('joined'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (owner) => (
        <div className="text-sm text-gray-500">
          {new Date(owner.createdAt).toLocaleDateString()}
        </div>
      )
    },
    {
      title: t('actions'),
      key: 'actions',
      render: () => (
        <button className="text-gray-400 hover:text-gray-600 p-1">
          <MoreVertical size={18} />
        </button>
      )
    }
  ];

  // Handle page change for the Table component
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  // Prepare pagination object for Table component
  const tablePagination = {
    current: meta.page,
    total: meta.total,
    totalPages: meta.totalPages,
    pageSize: meta.limit,
    startIndex: ((meta.page - 1) * meta.limit) + 1,
    endIndex: Math.min(meta.page * meta.limit, meta.total)
  };

  return (
    <div className="space-y-4 bg-background min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">{t('house_owners')}</h1>
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
            placeholder={t('search_owners_by_name_or_email')}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
          />
        </div>
        {!isLoading && (
          <div className="text-sm text-subdued">
            Showing <span className="text-text font-medium">
              {Math.min(tablePagination.startIndex, tablePagination.total)} to {tablePagination.endIndex}
            </span> of{' '}
            <span className="text-text font-medium">{tablePagination.total}</span> owners
          </div>
        )}
      </div>

      {/* Use Table Component */}
      <div className="bg-surface rounded-xl border border-subdued/20 overflow-hidden">
        <Table
          columns={columns}
          data={owners}
          loading={isLoading || isFetching}
          emptyMessage="No owners found matching your search"
          rowKey="id"
          striped={true}
          hoverable={true}
          showPagination={true}
          pagination={tablePagination}
          onPageChange={handlePageChange}
          className="border-0"
        />
      </div>
    </div>
  );
};

export default HouseOwnersPage;