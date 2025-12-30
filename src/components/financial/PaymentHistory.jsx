// components/financial/PaymentHistory.jsx
import React from 'react';
import { useGetFlatPaymentsQuery } from '../../store/api/financialApi';
import { format } from 'date-fns';
import { Download, FileText, Receipt, Filter } from 'lucide-react';

const PaymentHistory = ({ flatId }) => {
  const { data: payments, isLoading, error } = useGetFlatPaymentsQuery(flatId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Failed to load payment history.
      </div>
    );
  }

  if (!payments?.data?.length) {
    return (
      <div className="text-center py-8 text-subdued">
        <Receipt className="mx-auto mb-3 text-subdued/50" size={48} />
        <p>No payment records found</p>
      </div>
    );
  }

  const totalCollected = payments.data
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0);

  const totalPending = payments.data
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">Total Collected</p>
          <p className="text-2xl font-bold text-green-900">
            ${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">Pending Amount</p>
          <p className="text-2xl font-bold text-yellow-900">
            ${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">Total Transactions</p>
          <p className="text-2xl font-bold text-blue-900">
            {payments.data.length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-subdued/20">
              <th className="text-left py-3 font-medium text-text">Date</th>
              <th className="text-left py-3 font-medium text-text">Due Date</th>
              <th className="text-left py-3 font-medium text-text">Amount</th>
              <th className="text-left py-3 font-medium text-text">Paid</th>
              <th className="text-left py-3 font-medium text-text">Method</th>
              <th className="text-left py-3 font-medium text-text">Status</th>
              <th className="text-left py-3 font-medium text-text">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {payments.data.map((payment) => (
              <tr key={payment.id} className="border-b border-subdued/10 hover:bg-subdued/5">
                <td className="py-3">
                  {payment.paid_date ? format(new Date(payment.paid_date), 'dd MMM yyyy') : '-'}
                </td>
                <td className="py-3">
                  {format(new Date(payment.due_date), 'dd MMM yyyy')}
                </td>
                <td className="py-3">
                  <div className="font-medium">${payment.amount?.toLocaleString()}</div>
                  {payment.late_fee_amount > 0 && (
                    <div className="text-xs text-red-600">
                      +${payment.late_fee_amount} late fee
                    </div>
                  )}
                </td>
                <td className="py-3 font-bold">
                  ${payment.paid_amount?.toLocaleString()}
                </td>
                <td className="py-3 capitalize">
                  {payment.payment_method?.replace('_', ' ')}
                </td>
                <td className="py-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    payment.status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : payment.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : payment.status === 'overdue'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {payment.status}
                  </span>
                </td>
                <td className="py-3">
                  {payment.receipt_url ? (
                    <a
                      href={payment.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <FileText size={16} />
                      View
                    </a>
                  ) : (
                    <span className="text-subdued text-sm">No receipt</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 border border-subdued/30 rounded-lg hover:bg-subdued/10 transition-colors">
          <Download size={18} />
          Export as CSV
        </button>
      </div>
    </div>
  );
};

export default PaymentHistory;