// components/common/MobileResponsiveTable.jsx
import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const MobileResponsiveTable = ({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  rowKey = 'id',
  className = '',
  expandable = false,
  renderExpandedContent,
  defaultExpanded = false,
}) => {
  const [expandedRows, setExpandedRows] = React.useState({});

  const toggleRow = (rowId) => {
    setExpandedRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  // On mobile, we'll show a card view
  const isMobile = () => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  };

  const renderMobileView = () => {
    if (loading) {
      return Array.from({ length: 3 }).map((_, index) => (
        <div key={`mobile-skeleton-${index}`} className="mb-3 p-4 border rounded-lg">
          <div className="space-y-2">
            {columns.slice(0, 3).map((col, colIndex) => (
              <div key={`skeleton-mobile-${index}-${colIndex}`} className="flex justify-between">
                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      ));
    }

    if (!data || data.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          <svg
            className="w-12 h-12 text-gray-300 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm">{emptyMessage}</p>
        </div>
      );
    }

    return data.map((row, index) => (
      <div
        key={row[rowKey] || index}
        className="mb-3 border rounded-lg overflow-hidden"
      >
        <div 
          className={`p-4 ${expandable ? 'cursor-pointer' : ''}`}
          onClick={() => expandable && toggleRow(row[rowKey] || index)}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {columns[0].render ? columns[0].render(row) : row[columns[0].dataIndex]}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {columns[1] && (columns[1].render ? columns[1].render(row) : row[columns[1].dataIndex])}
              </div>
            </div>
            {expandable && (
              <button className="ml-2 text-gray-400">
                {expandedRows[row[rowKey] || index] ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>
            )}
          </div>
          
          {/* Additional fields as badges or labels */}
          <div className="flex flex-wrap gap-2 mt-2">
            {columns.slice(2).map((column, colIndex) => {
              if (column.hideOnMobile) return null;
              const value = column.render ? column.render(row) : row[column.dataIndex];
              if (!value) return null;
              
              return (
                <div key={`mobile-badge-${colIndex}`} className="text-xs">
                  <span className="text-gray-500">{column.title}: </span>
                  <span className="font-medium">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Expanded content on mobile */}
        {expandable && expandedRows[row[rowKey] || index] && renderExpandedContent && (
          <div className="border-t p-4 bg-gray-50">
            {renderExpandedContent(row)}
          </div>
        )}
      </div>
    ));
  };

  if (isMobile()) {
    return <div className={className}>{renderMobileView()}</div>;
  }

  // Desktop view using the regular Table component
  return (
    <div className={className}>
      {/* We'll use a regular table for desktop */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key || index}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`}>
                  {columns.map((column, colIndex) => (
                    <td key={`skeleton-${rowIndex}-${colIndex}`} className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data && data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr key={row[rowKey] || rowIndex} className="hover:bg-gray-50">
                  {columns.map((column, colIndex) => (
                    <td
                      key={`${row[rowKey] || rowIndex}-${colIndex}`}
                      className="px-6 py-4 whitespace-nowrap"
                    >
                      {column.render ? column.render(row) : row[column.dataIndex]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MobileResponsiveTable;