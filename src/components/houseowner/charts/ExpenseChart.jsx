// components/dashboard/charts/ExpenseChart.jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ExpenseChart = ({ data = [] }) => {

  const {t} = useTranslation();
  // Format data for the chart
  const chartData = data.map(item => ({
    name: item.category || 'Uncategorized',
    amount: item.total_amount,
    count: item.expense_count,
    formattedAmount: `$${item.total_amount.toLocaleString()}`,
    color: getColorForCategory(item.category)
  }));

  // Calculate total expenses
  const totalExpenses = data.reduce((sum, item) => sum + item.total_amount, 0);

  // Get color based on category
  function getColorForCategory(category) {
    const colors = {
      'maintenance': '#3b82f6',
      'utilities': '#10b981',
      'repair': '#f59e0b',
      'cleaning': '#8b5cf6',
      'security': '#ef4444',
      'other': '#6b7280',
      'default': '#3b82f6'
    };
    return colors[category?.toLowerCase()] || colors.default;
  }

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
            {t('expenses')}: <span className="font-semibold">{payload[0].payload.count}</span>
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
          <h3 className="text-lg font-bold text-gray-800">{t('expense_breakdown')}</h3>
          <p className="text-sm text-gray-500">{t('expenses_by_category')}</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
          <AlertCircle className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            ${totalExpenses.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fill: '#6b7280', fontSize: 11 }}
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
              <Bar
                dataKey="amount"
                name="Expense Amount"
                shape={<CustomBar />}
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-gray-50 rounded-lg">
            <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-500 font-medium">{t('no_expenses_recorded')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('expenses_will_appear_here_once_added')}</p>
          </div>
        )}
      </div>

      {/* Category Summary */}
      {data.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('expense_categories')}</h4>
          <div className="space-y-2">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">
                    ${item.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {Math.round((item.amount / totalExpenses) * 100)}% of total
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseChart;