// components/dashboard/charts/OccupancyChart.jsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Home } from 'lucide-react';

const OccupancyChart = ({ data = { vacant: 0, occupied: 0 } }) => {
  const chartData = [
    { name: 'Occupied', value: data.occupied || 0, color: '#10b981' },
    { name: 'Vacant', value: data.vacant || 0, color: '#ef4444' }
  ];

  const totalFlats = data.occupied + data.vacant;
  const occupancyRate = totalFlats > 0 ? Math.round((data.occupied / totalFlats) * 100) : 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800">{payload[0].name}</p>
          <p className="text-sm text-gray-600">
            Flats: <span className="font-bold">{payload[0].value}</span>
          </p>
          <p className="text-sm text-gray-600">
            Percentage: <span className="font-bold">
              {Math.round((payload[0].value / totalFlats) * 100)}%
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-sm font-bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="h-full">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Flat Occupancy</h3>
          <p className="text-sm text-gray-500">Occupied vs Vacant Flats</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
          <Home className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {occupancyRate}% Occupied
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <p className="text-xs text-green-600 font-medium">Occupied</p>
          </div>
          <p className="text-lg font-bold text-gray-800 mt-1">{data.occupied || 0}</p>
          <p className="text-xs text-gray-500">
            {totalFlats > 0 ? Math.round((data.occupied / totalFlats) * 100) : 0}% of total
          </p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <p className="text-xs text-red-600 font-medium">Vacant</p>
          </div>
          <p className="text-lg font-bold text-gray-800 mt-1">{data.vacant || 0}</p>
          <p className="text-xs text-gray-500">
            {totalFlats > 0 ? Math.round((data.vacant / totalFlats) * 100) : 0}% of total
          </p>
        </div>
      </div>
    </div>
  );
};

export default OccupancyChart;