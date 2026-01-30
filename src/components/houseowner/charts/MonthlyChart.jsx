// components/dashboard/charts/MonthlyChart.jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MonthlyChart = ({ data = [] }) => {
  const {t} = useTranslation();
  // Format data for the chart
  const chartData = data.map(item => ({
    name: item.month.split('-')[1] + '/' + item.month.split('-')[0].slice(2), // Format: MM/YY
    fullMonth: item.month,
    amount: item.total_collected,
    count: item.payment_count,
    formattedAmount: `$${item.total_collected.toLocaleString()}`
  }));

  // Calculate month-over-month change
  const calculateGrowth = () => {
    if (chartData.length < 2) return 0;
    const current = chartData[chartData.length - 1]?.amount || 0;
    const previous = chartData[chartData.length - 2]?.amount || 0;
    if (previous === 0) return 100;
    return Math.round(((current - previous) / previous) * 100);
  };

  const growth = calculateGrowth();

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          <p className="text-sm text-gray-600 mb-1">
            {t('amount')}: <span className="font-semibold text-primary">${payload[0].value.toLocaleString()}</span>
          </p>
          <p className="text-sm text-gray-600">
            {t('payments')}: <span className="font-semibold">{payload[0].payload.count}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">{t('rent_collected_over_months')}</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
          <TrendingUp className={`w-4 h-4 ${growth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
          <span className={`text-sm font-medium ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {growth >= 0 ? '+' : ''}{growth}%
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(value) => `$${value/1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={36}
              wrapperStyle={{ fontSize: '12px' }}
            />
            <Area 
              type="monotone" 
              dataKey="amount" 
              fill="url(#colorAmount)" 
              fillOpacity={0.1}
              stroke="transparent"
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6' }}
              activeDot={{ r: 6, fill: '#1d4ed8' }}
              name="Rent Collected"
            />
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-blue-600 font-medium">{t('current_month')}</p>
          <p className="text-lg font-bold text-gray-800">
            ${chartData[chartData.length - 1]?.amount.toLocaleString() || '0'}
          </p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <p className="text-xs text-purple-600 font-medium">{t('total_payments')}</p>
          <p className="text-lg font-bold text-gray-800">
            {data.reduce((sum, item) => sum + item.payment_count, 0)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MonthlyChart;