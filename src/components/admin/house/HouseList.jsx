import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, Edit, Trash2, Eye, Plus, 
  Home, Users, Layers, RefreshCw, MapPin, LayoutGrid, List, MoreVertical
} from 'lucide-react';
import { useGetHousesQuery, useDeleteHouseMutation } from '../../../store/api/houseApi';
import { useAuth } from '../../../hooks';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import Table from '../../common/Table';

const HouseList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isWebOwner, isHouseOwner, isCaretaker } = useAuth();
  
  // Default view based on role
  const [viewMode, setViewMode] = useState(isWebOwner ? 'table' : 'grid');
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
  });


  const { data, isFetching, refetch } = useGetHousesQuery(filters);
  const [deleteHouse] = useDeleteHouseMutation();

  const houses = data?.data || [];
  const pagination = data?.pagination;

  // --- Handlers ---
  const handleSearch = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleDelete = async (e, id, address) => {
    e.stopPropagation();
    if (!isWebOwner) return toast.error(t('action_not_allowed'));
    
    if (window.confirm(`${t('confirm_delete')} "${address}"?`)) {
      try {
        await deleteHouse(id).unwrap();
        toast.success(t('house_deleted'));
        refetch();
      } catch (error) {
        toast.error(t('delete_failed'));
      }
    }
  };

  // --- Column Configuration ---
  const columns = [
    {
      title: t('property'),
      key: 'name',
      render: (row) => (
        <div className="py-1">
          <p className="font-semibold text-text leading-tight">{row?.name}</p>
          <p className="text-[10px] text-subdued mt-1 uppercase tracking-tighter font-mono">{row?.uuid}</p>
        </div>
      ),
    },
    {
      title: t('address'),
      dataIndex: 'address',
      className: 'max-w-xs truncate text-subdued text-sm',
    },
    {
      title: t('owner'),
      key: 'owner',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="truncate">
            <p className="text-sm font-medium text-text">{row?.owner?.name || 'N/A'}</p>
            <p className="text-[11px] text-subdued leading-none">{row?.owner?.email}</p>
          </div>
        </div>
      ),
    },
    {
      title: t('flats'),
      key: 'stats',
      render: (row) => (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/houses/${row.id}/flats`);
          }} 
          className="inline-flex cursor-pointer hover:scale-105 transition-transform"
        >
          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-bold flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {row?.stats?.flats || 0} {t('flats')}
          </span>
        </div>
      ),
    },
    {
      title: t('status'),
      key: 'status',
      render: (row) => (
        <span className={`px-2 py-1 text-[11px] font-bold rounded-md uppercase tracking-wide ${
          row.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {row.active ? t('active') : t('inactive')}
        </span>
      ),
    },
    {
      title: t('actions'),
      key: 'actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => navigate(`/houses/${row?.id}`)} className="p-2 text-subdued hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => navigate(`/houses/${row?.id}/edit`)} className="p-2 text-subdued hover:text-secondary hover:bg-secondary/5 rounded-lg transition-colors">
            <Edit className="w-4 h-4" />
          </button>
          {isWebOwner && (
            <button onClick={(e) => handleDelete(e, row?.id, row?.address)} className="p-2 text-subdued hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-0 space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text tracking-tight">{t('house_list')}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-subdued hover:text-text'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-primary' : 'text-subdued hover:text-text'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>

          <button onClick={() => refetch()} className="p-2.5 border border-gray-200 rounded-xl hover:bg-white text-subdued hover:text-primary transition-all">
            <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          {isWebOwner && (
            <button onClick={() => navigate('/houses/create')} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all font-bold shadow-lg shadow-primary/20">
              <Plus className="w-5 h-5" /> {t('add_house')}
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={<Home />} label={t('total_properties')} value={data.stats.total} color="blue" />
          <StatCard icon={<Layers />} label={t('total_flats')} value={data.stats.flats} color="green" />
          <StatCard icon={<Users />} label={t('active_properties')} value={data.stats.active} color="purple" />
        </div>
      )}

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-subdued group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder={t('search_by_address_or_name')}
          value={filters.search}
          onChange={handleSearch}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
        />
      </div>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isFetching ? (
            [...Array(6)].map((_, i) => <div key={i} className="h-56 bg-white border border-gray-100 rounded-2xl animate-pulse" />)
          ) : houses.map((house) => (
            <HouseCard 
              key={house.id} 
              house={house} 
              t={t} 
              onDelete={handleDelete} 
              isWebOwner={isWebOwner}
              navigate={navigate}
            />
          ))}
        </div>
      ) : (
        <Table
          columns={columns}
          data={houses}
          loading={isFetching}
          showPagination={true}
          pagination={{
            current: filters.page,
            totalPages: pagination?.pages || 1,
            total: pagination?.total || 0,
            pageSize: filters.limit
          }}
          onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
          onRowClick={(row) => navigate(`/houses/${row.id}`)}
          className="shadow-sm overflow-hidden border-none bg-transparent"
        />
      )}

      {/* Empty State */}
      {!isFetching && houses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <div className="p-4 bg-white rounded-full shadow-sm mb-4">
            <Home className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-text font-bold text-lg">{t('no_properties_found')}</p>
          <p className="text-subdued text-sm">{t('try_different_search')}</p>
        </div>
      )}
    </div>
  );
};

// --- Sub-Components ---

const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600`}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <div>
      <p className="text-xs font-bold text-subdued uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-text">{value}</p>
    </div>
  </div>
);

const HouseCard = ({ house, t, onDelete, isWebOwner, onClick, navigate }) => (
  <div 
    onClick={() => navigate(`/houses/${house.id}`)}
    className="group bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
  >
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 bg-primary/5 text-primary rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
        <Home size={24} />
      </div>
      <div className="flex gap-1">
        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${house.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {house.active ? t('active') : t('inactive')}
        </span>
      </div>
    </div>

    <h3 className="text-xl font-bold text-text truncate group-hover:text-primary transition-colors">{house.name}</h3>
    <div className="flex items-center text-subdued text-sm mt-1 mb-6">
      <MapPin className="w-3.5 h-3.5 mr-1 shrink-0" />
      <span className="truncate">{house.address}</span>
    </div>

    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
      <div className="flex gap-4 flex-1">
        <div onClick={(e)=>{e.stopPropagation(); navigate(`/houses/${house.id}/flats`)}} className="cursor-pointer bg-gray-200 hover:bg-gray-300 transition-colors px-2 py-1 rounded-lg text-center pt-2 flex-1">
          <p className="text-[10px] text-subdued uppercase font-bold leading-none mb-1">{t('flats')}</p>
          <p className="text-sm font-black text-text">{house?.stats?.flats || 0}</p>
        </div>
        <div onClick={(e)=>{e.stopPropagation(); navigate(`/caretakers`)}} className='bg-gray-200 hover:bg-gray-300 transition-colors px-2 py-1 rounded-lg text-center pt-2 flex-1'>
          <p className="text-[10px] text-subdued uppercase font-bold leading-none mb-1">{t('caretakers')}</p>
          <p className="text-sm font-black text-text">{house?.stats?.caretakers || 0}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-1 ">
         {isWebOwner && (
           <button 
             onClick={(e) => onDelete(e, house.id, house.address)}
             className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
           >
             <Trash2 size={16} />
           </button>
         )}
      </div>
    </div>
  </div>
);

export default HouseList;