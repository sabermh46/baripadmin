// components/admin/Staff/StaffActivity.jsx
import React, { useState } from 'react';
import { useGetStaffActivityQuery } from '../../../store/api/staffApi';
import Modal from '../../../components/common/Modal';
import Table from '../../../components/common/Table';
import {
  Activity,
  TrendingUp,
  Shield,
  Clock,
  Download,
  Calendar,
  CheckCircle,
  XCircle,
  Users
} from 'lucide-react';

const StaffActivity = ({ staffId, staffName, isOpen, onClose }) => {
  const { data, isLoading } = useGetStaffActivityQuery(staffId, {
    skip: !staffId || !isOpen,
  });
  
  const [dateRange, setDateRange] = useState('30days');

  const activityData = data?.data || {};
  
  const stats = [
    {
      title: 'Total Activity',
      value: activityData.totalActivity || 0,
      icon: <Activity className="h-6 w-6" />,
      color: 'bg-blue-100 text-blue-600',
      change: ''
    },
    {
      title: 'Permissions Granted',
      value: activityData.grantedPermissions || 0,
      icon: <CheckCircle className="h-6 w-6" />,
      color: 'bg-green-100 text-green-600',
      change: ''
    },
    {
      title: 'Permissions Revoked',
      value: activityData.revokedPermissions || 0,
      icon: <XCircle className="h-6 w-6" />,
      color: 'bg-red-100 text-red-600',
      change: ''
    },
    {
      title: 'Staff Managed',
      value: activityData.staffManaged || 0,
      icon: <Users className="h-6 w-6" />,
      color: 'bg-purple-100 text-purple-600',
      change: ''
    }
  ];

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const timelineColumns = [
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
      render: (item) => (
        <div className="flex items-center text-sm text-gray-500">
          <Clock className="h-4 w-4 mr-2" />
          {formatDate(item.time)}
        </div>
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (item) => (
        <div className="flex items-center">
          {item.action === 'granted' ? (
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500 mr-2" />
          )}
          <span className="font-medium capitalize">{item.action}</span>
        </div>
      )
    },
    {
      title: 'Permission',
      key: 'permission',
      render: (item) => (
        <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
          {item.permission}
        </div>
      )
    },
    {
      title: 'Target Staff',
      key: 'target',
      render: (item) => (
        <div className="text-sm">
          {item.targetStaff?.name || 'N/A'}
        </div>
      )
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center">
          <Activity className="h-6 w-6 mr-2 text-blue-600" />
          Staff Activity
        </div>
      }
      subtitle={`${staffName} - Last ${dateRange.replace('days', ' days')}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Header with date range selector */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Activity Overview</h3>
              <p className="text-sm text-gray-500">
                Track permission management activities
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
              <option value="1year">Last year</option>
              <option value="all">All time</option>
            </select>
            
            <button className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  {stat.icon}
                </div>
                <span className="text-sm font-medium text-green-600">
                  {stat.change}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.title}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Last Activity */}
        {activityData.lastActivity && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900">Last Activity</h4>
                  <p className="text-sm text-blue-700">
                    {activityData.lastActivity.action} permission "
                    {activityData.lastActivity.permission}"
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {formatDate(activityData.lastActivity.time)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Timeline */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Recent Activities</h3>
            <p className="text-sm text-gray-500">
              Timeline of permission management actions
            </p>
          </div>
          
          <div className="p-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading activities...</p>
              </div>
            ) : activityData.recentActivities?.length > 0 ? (
              <Table
                columns={timelineColumns}
                data={activityData.recentActivities}
                emptyMessage="No recent activities found"
                compact={true}
                hoverable={true}
              />
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No activity recorded in this period</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Chart Placeholder */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Activity Trends</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                Granted
              </span>
              <span className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                Revoked
              </span>
            </div>
          </div>
          
          {/* Chart placeholder - replace with actual chart library */}
          <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Activity chart would appear here</p>
              <p className="text-sm text-gray-400">
                (Integrate with Recharts, Chart.js, or similar)
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default StaffActivity;