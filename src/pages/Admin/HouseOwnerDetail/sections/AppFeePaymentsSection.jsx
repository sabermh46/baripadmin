import React, { useEffect } from 'react';
import { DollarSign } from 'lucide-react';

const formatDate = (d) => {
  if (!d) return '–';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
};

const AppFeePaymentsSection = ({ appFeePayments = [], onSuccess }) => {
  useEffect(() => {
    if (onSuccess) onSuccess({ section: 'appFeePayments', data: appFeePayments });
  }, [appFeePayments, onSuccess]);

  return (
    <section className="bg-surface rounded-xl border border-subdued/20 p-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-3">
        <DollarSign className="h-4 w-4" />
        App Fee Payments ({appFeePayments?.length ?? 0})
      </h3>
      <div className="space-y-2">
        {!appFeePayments?.length ? (
          <p className="text-sm text-gray-500 py-2">No app fee payments</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">ID</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Amount</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Type</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Status</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Start</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appFeePayments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="py-2 px-3 text-gray-600">#{p.id}</td>
                    <td className="py-2 px-3 font-medium">
                      {p.amount != null ? Number(p.amount).toLocaleString() : '–'}
                    </td>
                    <td className="py-2 px-3 text-gray-600">{p.fee_type || '–'}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          p.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : p.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {p.status || '–'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-600">{formatDate(p.start_date)}</td>
                    <td className="py-2 px-3 text-gray-600">{formatDate(p.paid_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default AppFeePaymentsSection;
