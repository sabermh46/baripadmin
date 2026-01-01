// src/components/house/HouseStats.jsx
import {
  Home, TrendingUp, TrendingDown, Users, Layers,
  Building, Calendar, MapPin, DollarSign
} from 'lucide-react';
import { useGetHouseStatsQuery } from '../../../store/api/houseApi';
import HouseList from './HouseList';
import { toast } from 'react-toastify';
import AccessDeniedPage from '../../../pages/utility/AccessDeniedPage';
import { LoaderMinimal } from '../../common/RouteLoader';
import { useAuth } from '../../../hooks';

const HouseStats = () => {
  const { data, isLoading, error } = useGetHouseStatsQuery();
  const { isWebOwner, isDeveloper, isStaff, isHouseOwner } = useAuth();


  if (error) {
    toast.error(error?.data?.error || 'Failed to load properties.');

    if (error?.status === 403) {
      return <AccessDeniedPage />;
    }
  }

  const stats = data?.data || {
    totalHouses: 0,
    totalFlats: 0,
    totalCaretakers: 0,
    recentHouses: [],
    housesByMonth: []
  };

  const shouldShowRecentHouses = (isWebOwner && stats?.totalHouses > 5) || isWebOwner || isStaff || isDeveloper;

  const StatCard = ({ title, value, icon: Icon, color = 'blue', trend }) => (
    <div className="bg-surface border border-surface rounded-xl p-4 shadow">
      <div className="flex flex-col items-center">
        <div className='flex justify-center items-center gap-3'>
          
          <div className={`p-3 rounded-lg ${color === 'blue' ? 'bg-blue-100 text-blue-600' : 
            color === 'green' ? 'bg-green-100 text-green-600' :
            color === 'purple' ? 'bg-purple-100 text-purple-600' : 'bg-yellow-100 text-yellow-600'}`}>
            <Icon className="w-6 h-6" />
          </div>
          <p className="text-3xl font-bold text-text ">{value}</p>
        </div>
        <p className="text-sm text-subdued mb-2 text-center mt-2">{title}</p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <LoaderMinimal />
    );
  }

  return !isLoading && !error && (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">House Statistics</h1>
        <p className="text-subdued">Overview of {isHouseOwner ? 'your' : 'all'} houses in the system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Properties"
          value={stats?.totalHouses}
          icon={Building}
          color="blue"
          trend={12}
        />
        <StatCard
          title="Total Flats"
          value={stats?.totalFlats}
          icon={Layers}
          color="green"
          trend={8}
        />
        <StatCard
          title="Active Caretakers"
          value={stats?.totalCaretakers}
          icon={Users}
          color="purple"
          trend={-3}
        />
        <StatCard
          title="Active Renters"
          value={stats?.totalRenters}
          icon={Users}
          color="primary"
          trend={-3}
        />
      </div>

      {
        shouldShowRecentHouses ?
        <>
                {/* Recent Houses */}
            <div className="bg-surface border border-surface rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Properties
                </h2>
                <button className="text-sm text-primary hover:text-primary/80 transition-colors">
                  View All
                </button>
              </div>
              
              <div className="space-y-4">
                {stats.recentHouses?.length > 0 ? (
                  stats.recentHouses.map((house, index) => (
                    <div key={index} className="flex items-center justify-between p-4 hover:bg-surface/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                          <Building className="w-4 h-4" />
                        </div>
                        <div>
                          <p className='font-medium'>{house.name}</p>
                          <p className="text-slate-500 flex gap-2 items-center text-sm">
                              <MapPin className="w-3 h-3" />
                              {house.address}
                          </p>
                          <p className="text-sm text-subdued flex items-center gap-1">
                            
                            {house.owner?.name || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-subdued">
                          {new Date(house.createdAt).toLocaleDateString()}
                        </p>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${house.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {house.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Building className="w-12 h-12 text-subdued mx-auto mb-3 opacity-50" />
                    <p className="text-text">No recent properties</p>
                    <p className="text-subdued text-sm mt-1">Properties you add will appear here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Chart */}
            {stats.housesByMonth?.length > 0 && (
              <div className="bg-surface border border-surface rounded-xl p-6">
                <h2 className="text-lg font-semibold text-text mb-6">Monthly Activity</h2>
                <div className="flex items-end h-48 gap-2">
                  {stats.housesByMonth.map((monthData, index) => {
                    const maxCount = Math.max(...stats.housesByMonth.map(m => m.count));
                    const height = (monthData.count / maxCount) * 100;
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="text-xs text-subdued mb-2">{monthData.month}</div>
                        <div
                          className="w-full bg-primary/20 hover:bg-primary/30 transition-colors rounded-t-lg"
                          style={{ height: `${height}%` }}
                          title={`${monthData.count} properties`}
                        >
                          <div className="h-full bg-primary rounded-t-lg"></div>
                        </div>
                        <div className="text-xs font-medium text-text mt-2">{monthData.count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
        </>
        : null
      }


      <HouseList />
    </div>
  );
};

export default HouseStats;