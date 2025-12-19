// components/dashboard/SystemDashboard.jsx
import React, { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { useGetDashboardDataQuery } from '../../store/api/analyticsApi';
import { Users, Home, Building, Users as Staff, Shield, Activity, DollarSign, TrendingUp } from 'lucide-react';
import { LoaderMinimal } from '../common/RouteLoader';
import Btn from '../common/Button';
import { useAuth } from '../../hooks';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const StatCard = ({ title, value, icon: Icon, color, change }) => (
  <div className="bg-white rounded-xl shadow-lg py-4 md:py-6 px-1 text-center hover:shadow-xl transition-shadow duration-300">
    <div className="flex items-center justify-center mb-4">
      <div className={`p-3 rounded-lg bg-${color}-100`}>
        <Icon className={`h-6 w-6 text-${color}-600`} />
      </div>
      {change && (
        <span className={`text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change > 0 ? '+' : ''}{change}%
        </span>
      )}
    </div>
    <h3 className="text-2xl font-bold text-gray-800 mb-1">{value.toLocaleString()}</h3>
    <p className="text-gray-600 text-sm">{title}</p>
  </div>
);

const ChartCard = ({ title, children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
    <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
    {children}
  </div>
);

const RecentActivityItem = ({ type, title, user, time, icon: Icon }) => (
  <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
    <div className="flex-shrink-0">
      <Icon className="h-5 w-5 text-gray-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
      <p className="text-sm text-gray-500 truncate">
        {type} • {user} • {time}
      </p>
    </div>
  </div>
);

const SystemDashboard = () => {
  const { data, error, isLoading, refetch } = useGetDashboardDataQuery();
  console.log(data);
  
  
  
  const stats = useMemo(() => [
    { title: 'Total Users', value: data?.quickStats?.totalUsers || 0, icon: Users, color: 'blue' },
    { title: 'Total Houses', value: data?.quickStats?.totalHouses || 0, icon: Home, color: 'green' },
    { title: 'Total Flats', value: data?.quickStats?.totalFlats || 0, icon: Building, color: 'yellow' },
    { title: 'Active Staff', value: data?.quickStats?.activeStaff || 0, icon: Staff, color: 'purple' },
    { title: 'Caretakers', value: data?.quickStats?.activeCaretakers || 0, icon: Shield, color: 'red' },
    { title: 'System Health', value: '100%', icon: Activity, color: 'indigo' }
  ], [data]);

  const { user } = useAuth();

  if (isLoading) {
    return (
      <LoaderMinimal />
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Failed to load dashboard</h3>
          <p className="text-red-600 text-sm mb-2">
            {error?.data?.error || 'An unexpected error occurred.'}
          </p>
          <p className="text-gray-600 mb-4">Please try again</p>
            <Btn type="primary" onClick={refetch}>Retry</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}

      <div className='font-bold font-oswald text-sm text-slate-800'>
                  Hello, <span className='text-primary font-mooli'>{ user?.name }!</span>
              </div>

      <div className="flex gap-4 flex-wrap justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-700">System Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Last updated: {new Date(data?.timestamp).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {/* <button
            onClick={refetch}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Refresh
          </button>
          <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
            Export Report
          </button> */}
          <Btn className={`flex-1`} type="secondary" onClick={refetch}>Refresh</Btn>
          <Btn className={`flex-1`} type="secondary">Export Report</Btn>
          <Btn className={`flex-1`} type='primary' href={'/admin/generate-token'}>Generate Invitation Link</Btn>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* User Growth Chart */}
        <ChartCard title="User Growth (Last 12 Months)">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.systemOverview?.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="var(--color-primary)" 
                  fill="var(--color-primary-300)" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* House Statistics */}
        <ChartCard title="House Distribution">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Active', value: data?.systemOverview?.houseStats?.activeHouses || 0 },
                { name: 'Inactive', value: data?.systemOverview?.houseStats?.inactiveHouses || 0 },
                { name: 'With Flats', value: data?.systemOverview?.houseStats?.housesWithFlats || 0 },
                { name: 'With Caretakers', value: data?.systemOverview?.houseStats?.housesWithCaretakers || 0 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Role Distribution */}
        <ChartCard title="Role Distribution">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.systemOverview?.roleDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.role}: ${entry.count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data?.systemOverview?.roleDistribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Performance Metrics */}
        <ChartCard title="System Performance">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={[
                { metric: 'Response Time', value: 95, fullMark: 100 },
                { metric: 'Uptime', value: 99, fullMark: 100 },
                { metric: 'Database', value: 98, fullMark: 100 },
                { metric: 'Cache', value: 92, fullMark: 100 },
                { metric: 'Security', value: 100, fullMark: 100 },
                { metric: 'Backups', value: 97, fullMark: 100 }
              ]}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis />
                <Radar 
                  name="Performance" 
                  dataKey="value" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.6}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Users */}
        <ChartCard title="Recent Users" className="lg:col-span-1">
          <div className="space-y-2">
            {data?.recentActivities?.recentUsers?.map((user, index) => (
              <RecentActivityItem
                key={index}
                type="User"
                title={user.name || user.email}
                user={user.role?.name}
                time={new Date(user.createdAt).toLocaleDateString()}
                icon={Users}
              />
            ))}
          </div>
        </ChartCard>

        {/* Recent Houses */}
        <ChartCard title="Recent Houses" className="lg:col-span-1">
          <div className="space-y-2">
            {data?.recentActivities?.recentHouses?.map((house, index) => (
              <RecentActivityItem
                key={index}
                type="House"
                title={house.address}
                user={house.owner?.name}
                time={new Date(house.createdAt).toLocaleDateString()}
                icon={Home}
              />
            ))}
          </div>
        </ChartCard>

        {/* Recent Notices */}
        <ChartCard title="Recent Notices" className="lg:col-span-1">
          <div className="space-y-2">
            {data?.recentActivities?.recentNotices?.map((notice, index) => (
              <RecentActivityItem
                key={index}
                type="Notice"
                title={notice.title}
                user={notice.house?.address}
                time={new Date(notice.createdAt).toLocaleDateString()}
                icon={Activity}
              />
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Footer Status */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>System Status: Operational</span>
          </div>
          <div>
            <span>Cache: </span>
            <span className="text-green-600 font-medium">Active</span>
            <span className="mx-2">•</span>
            <span>Workers: </span>
            <span className="text-green-600 font-medium">2/2 Running</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemDashboard;