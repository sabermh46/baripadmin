/* eslint-disable react-hooks/preserve-manual-memoization */
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
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// Import your logo or use the URL string
import appLogo from '../../assets//icons/logo.svg';

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

const RecentActivityItem = ({ type, title, address, user, time, icon: Icon }) => (
  <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
    <div className="flex-shrink-0">
      <Icon className="h-5 w-5 text-gray-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
      <p className="text-sm text-gray-500 truncate">
        {address} • {user} • {time}
      </p>
    </div>
  </div>
);

const SystemDashboard = () => {
  const { data, error, isLoading, refetch } = useGetDashboardDataQuery();

  console.log(data);
  
// {
//     "systemOverview": {
//         "userGrowth": [
//             {
//                 "month": "2025-08",
//                 "count": 0
//             },
//             {
//                 "month": "2025-09",
//                 "count": 0
//             },
//             {
//                 "month": "2025-10",
//                 "count": 0
//             },
//             {
//                 "month": "2025-11",
//                 "count": 0
//             },
//             {
//                 "month": "2025-12",
//                 "count": 0
//             },
//             {
//                 "month": "2026-01",
//                 "count": 4
//             }
//         ],
//         "houseStats": {
//             "totalHouses": 2,
//             "activeHouses": 2,
//             "inactiveHouses": 0,
//             "housesWithFlats": 3,
//             "housesWithCaretakers": 0,
//             "recentHouses": [
//                 {
//                     "id": 3,
//                     "uuid": "dcbaaad6-a17a-4894-8fd6-c34815040073",
//                     "address": "wh",
//                     "active": 1,
//                     "flatCount": 2,
//                     "caretakerCount": 0,
//                     "owner": {
//                         "name": "Sumon Rahman H",
//                         "email": "false.xenon.7@gmail.com"
//                     },
//                     "createdAt": "2026-01-30T16:46:58.569Z"
//                 },
//                 {
//                     "id": 2,
//                     "uuid": "39f206ab-1531-4135-b82e-e1d7042f5ab3",
//                     "address": "qwertyui",
//                     "active": 1,
//                     "flatCount": 1,
//                     "caretakerCount": 0,
//                     "owner": {
//                         "name": "H O 1",
//                         "email": "houseOwner01@gmail.com"
//                     },
//                     "createdAt": "2026-01-28T17:39:27.713Z"
//                 }
//             ]
//         },
//         "roleDistribution": [
//             {
//                 "role": "DEVELOPER",
//                 "count": 1,
//                 "slug": "developer"
//             },
//             {
//                 "role": "WEB_OWNER",
//                 "count": 1,
//                 "slug": "web_owner"
//             },
//             {
//                 "role": "STAFF",
//                 "count": 0,
//                 "slug": "staff"
//             },
//             {
//                 "role": "HOUSE_OWNER",
//                 "count": 2,
//                 "slug": "house_owner"
//             },
//             {
//                 "role": "CARETAKER",
//                 "count": 0,
//                 "slug": "caretaker"
//             }
//         ],
//         "summary": {
//             "totalUsers": 4,
//             "activeUsers": 4,
//             "totalNotifications": 1,
//             "recentActivity": 3,
//             "uptime": "99.9%",
//             "databaseHealth": "healthy",
//             "serverLoad": "low"
//         }
//     },
//     "recentActivities": {
//         "recentUsers": [
//             {
//                 "id": 4,
//                 "name": "Sumon Rahman H",
//                 "email": "false.xenon.7@gmail.com",
//                 "role": {
//                     "name": "HOUSE_OWNER",
//                     "slug": "house_owner"
//                 },
//                 "createdAt": "2026-01-30T16:00:49.995Z"
//             },
//             {
//                 "id": 3,
//                 "name": "H O 1",
//                 "email": "houseOwner01@gmail.com",
//                 "role": {
//                     "name": "HOUSE_OWNER",
//                     "slug": "house_owner"
//                 },
//                 "createdAt": "2026-01-25T17:40:23.999Z"
//             },
//             {
//                 "id": 2,
//                 "name": "Tanvir Haque",
//                 "email": "tanvirhaque.org@gmail.com",
//                 "role": {
//                     "name": "WEB_OWNER",
//                     "slug": "web_owner"
//                 },
//                 "createdAt": "2026-01-24T18:14:25.256Z"
//             },
//             {
//                 "id": 1,
//                 "name": "Saber Mahmud Sourav",
//                 "email": "sabermahmud.sourav.7@gmail.com",
//                 "role": {
//                     "name": "DEVELOPER",
//                     "slug": "developer"
//                 },
//                 "createdAt": "2026-01-24T18:14:25.254Z"
//             }
//         ],
//         "recentHouses": [
//             {
//                 "id": 3,
//                 "name": "White House",
//                 "address": "wh",
//                 "active": 1,
//                 "owner": {
//                     "name": "Sumon Rahman H",
//                     "email": "false.xenon.7@gmail.com"
//                 },
//                 "createdAt": "2026-01-30T16:46:58.569Z"
//             },
//             {
//                 "id": 2,
//                 "name": "Proshanti 2.0",
//                 "address": "qwertyui",
//                 "active": 1,
//                 "owner": {
//                     "name": "H O 1",
//                     "email": "houseOwner01@gmail.com"
//                 },
//                 "createdAt": "2026-01-28T17:39:27.713Z"
//             }
//         ],
//         "recentNotices": []
//     },
//     "quickStats": {
//         "totalUsers": 4,
//         "totalHouses": 2,
//         "totalFlats": 3,
//         "totalRenters": 3,
//         "activeStaff": 0,
//         "activeCaretakers": 0,
//         "systemHealth": "healthy"
//     },
//     "timestamp": "2026-01-30T18:43:41.926Z"
// }

  const getLogoBase64 = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = url;
            img.crossOrigin = 'Anonymous'; 
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
        });
    };

  const handleExportPDF = async () => {
    if (!data) return;

    const doc = new jsPDF();
    const primaryColorRGB = [15, 23, 42]; // Matches slate-800

    // 1. Branding & Header (Same as your ReportGenPage)
    try {
        const logoData = await getLogoBase64(appLogo);
        if (logoData) doc.addImage(logoData, 'PNG', 20, 15, 12, 12);
    } catch (e) {
        doc.setFillColor(...primaryColorRGB);
        doc.circle(26, 21, 6, 'F');
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Bari Porichalona", 36, 21);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("System Administration Dashboard", 36, 26);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("SYSTEM OVERVIEW REPORT", 130, 20);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated By: ${user?.name}`, 130, 26);
    doc.text(`Date: ${new Date().toLocaleString()}`, 130, 31);

    doc.setDrawColor(...primaryColorRGB);
    doc.line(20, 36, 190, 36);

    // 2. Quick Stats Table
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColorRGB);
    doc.text("Key Metrics", 20, 45);

    autoTable(doc, {
        startY: 50,
        margin: { left: 20 },
        tableWidth: 170,
        head: [['Metric', 'Value', 'Status']],
        body: [
            ['Total Users', data.quickStats.totalUsers, 'Active'],
            ['Total Houses', data.quickStats.totalHouses, 'Operational'],
            ['Total Flats', data.quickStats.totalFlats, 'Recorded'],
            ['System Health', '100%', 'Excellent'],
            ['Server Load', data.systemOverview.summary.serverLoad.toUpperCase(), 'Normal'],
        ],
        theme: 'striped',
        headStyles: { fillColor: primaryColorRGB },
    });

    // 3. User Role Distribution
    const finalY1 = doc.lastAutoTable.finalY;
    doc.text("Role Distribution", 20, finalY1 + 15);
    
    autoTable(doc, {
        startY: finalY1 + 20,
        margin: { left: 20 },
        tableWidth: 80,
        head: [['Role', 'Count']],
        body: data.systemOverview.roleDistribution.map(r => [r.role, r.count]),
        theme: 'grid',
        headStyles: { fillColor: [100, 116, 139] }, // Slate-500
    });

    // 4. Recent Houses Table (Horizontal placement or below)
    const finalY2 = doc.lastAutoTable.finalY;
    doc.text("Recently Added Properties", 20, finalY2 + 15);

    const houseRows = data.recentActivities.recentHouses.map(h => [
        h.name,
        h.address,
        h.owner.name,
        new Date(h.createdAt).toLocaleDateString()
    ]);

    autoTable(doc, {
        startY: finalY2 + 20,
        margin: { left: 20, right: 20 },
        head: [['House Name', 'Address', 'Owner', 'Created']],
        body: houseRows,
        theme: 'striped',
        headStyles: { fillColor: primaryColorRGB },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Bari Porichalona Confidential | Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    }

    doc.save(`System_Dashboard_Report_${new Date().getTime()}.pdf`);
};

  const {t} = useTranslation();
  const stats = useMemo(() => [
    { title: t('total_users'), value: data?.quickStats?.totalUsers || 0, icon: Users, color: 'blue' },
    { title: t('total_houses'), value: data?.quickStats?.totalHouses || 0, icon: Home, color: 'green' },
    { title: t('total_flats'), value: data?.quickStats?.totalFlats || 0, icon: Building, color: 'yellow' },
    { title: t('active_staff'), value: data?.quickStats?.activeStaff || 0, icon: Staff, color: 'purple' },
    { title: t('caretakers'), value: data?.quickStats?.activeCaretakers || 0, icon: Shield, color: 'red' },
    { title: t('system_health'), value: '100%', icon: Activity, color: 'indigo' }
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
                  {t('welcome')}, <span className='text-primary font-mooli'>{ user?.name }!</span>
              </div>

      <div className="flex gap-4 flex-wrap justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-700">{t('system_dashboard')}</h1>
          <p className="text-gray-600 mt-1">
            Last updated: {new Date(data?.timestamp).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">

          <Btn className={`flex-1`} type="secondary" onClick={refetch}>{t('refresh')}</Btn>
          <Btn className={`flex-1`} onClick={handleExportPDF} type="secondary">{t('export_report')}</Btn>
          <Btn className={`flex-1`} type='primary' href={'/admin/generate-token'}>{t('generate_invitation_link')}</Btn>
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
        <ChartCard title={t('user_growth_last_12_months')}>
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
        <ChartCard title={t('house_distribution')}>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: t('active'), value: data?.systemOverview?.houseStats?.activeHouses || 0 },
                { name: t('inactive'), value: data?.systemOverview?.houseStats?.inactiveHouses || 0 },
                { name: t('with_flats'), value: data?.systemOverview?.houseStats?.housesWithFlats || 0 },
                { name: t('with_caretakers'), value: data?.systemOverview?.houseStats?.housesWithCaretakers || 0 }
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
        <ChartCard title={t('role_distribution')}>
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
        <ChartCard title={t('system_performance')}>
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
        <ChartCard title={t('recent_users')} className="lg:col-span-1">
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
        <ChartCard title={t('recent_houses')} className="lg:col-span-1">
          <div className="space-y-2">
            {data?.recentActivities?.recentHouses?.map((house, index) => (
              <RecentActivityItem
                key={index}
                type="House"
                title={house?.name}
                address={house?.address}
                user={house?.owner?.name}
                time={new Date(house?.createdAt).toLocaleDateString()}
                icon={Home}
              />
            ))}
          </div>
        </ChartCard>

        {/* Recent Notices */}
        <ChartCard title={t('recent_notices')} className="lg:col-span-1">
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