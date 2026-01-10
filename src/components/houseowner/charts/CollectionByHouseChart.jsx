// components/dashboard/charts/CollectionByHouseChart.jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Building2 } from 'lucide-react';

const CollectionByHouseChart = ({ data = [] }) => {
  // Format data for the chart
  const chartData = data.map(item => ({
    name: item.house_name,
    amount: item.total_collected,
    payments: item.payment_count,
    formattedAmount: `$${item.total_collected.toLocaleString()}`,
    color: getColorForHouse(item.house_id)
  })).sort((a, b) => b.amount - a.amount); // Sort by amount descending

  // Calculate total collection
  const totalCollection = data.reduce((sum, item) => sum + item.total_collected, 0);

  // Get color for each house
  function getColorForHouse(houseId) {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
      '#ef4444', '#06b6d4', '#84cc16', '#f97316'
    ];
    return colors[houseId % colors.length];
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const houseData = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800 mb-2">{houseData.name}</p>
          <p className="text-sm text-gray-600 mb-1">
            Collected: <span className="font-semibold text-primary">${houseData.amount.toLocaleString()}</span>
          </p>
          <p className="text-sm text-gray-600 mb-1">
            Payments: <span className="font-semibold">{houseData.payments}</span>
          </p>
          <p className="text-sm text-gray-600">
            Percentage: <span className="font-semibold">
              {Math.round((houseData.amount / totalCollection) * 100)}%
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom bar shape
  const CustomBar = (props) => {
    const { fill, x, y, width, height } = props;
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        rx={4}
        ry={4}
      />
    );
  };

  return (
    <div className="h-full">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Rent Collection by House</h3>
          <p className="text-sm text-gray-500">Performance across properties</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
          <Building2 className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            ${totalCollection.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis 
                type="number" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(value) => `$${value/1000}k`}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Bar
                dataKey="amount"
                name="Rent Collected"
                shape={<CustomBar />}
                radius={[0, 4, 4, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-gray-50 rounded-lg">
            <Building2 className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-500 font-medium">No rent collection data</p>
            <p className="text-sm text-gray-400 mt-1">Data will appear here once available</p>
          </div>
        )}
      </div>

      {/* House Performance Ranking */}
      {data.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">House Performance</h4>
          <div className="space-y-3">
            {chartData.map((item, index) => {
              const percentage = Math.round((item.amount / totalCollection) * 100);
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
                      <span className="text-xs font-semibold text-gray-700">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: item.color
                            }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">{percentage}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">${item.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{item.payments} payments</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionByHouseChart;