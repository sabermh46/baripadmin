import React, { useEffect } from 'react';
import { Wallet } from 'lucide-react';

const formatDate = (d) => {
  if (!d) return '–';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
};

const IncomeSection = ({ income = {}, onSuccess }) => {
  const rentPayments = income?.rentPayments ?? [];
  const advancePayments = income?.advancePayments ?? [];
  const hasData = rentPayments.length > 0 || advancePayments.length > 0;

  useEffect(() => {
    if (onSuccess) onSuccess({ section: 'income', data: income });
  }, [income, onSuccess]);

  return (
    <section className="bg-surface rounded-xl border border-subdued/20 p-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-3">
        <Wallet className="h-4 w-4" />
        Income
      </h3>
      {!hasData ? (
        <p className="text-sm text-gray-500 py-2">No income records</p>
      ) : (
        <div className="space-y-4">
          {rentPayments.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-600 uppercase mb-2">Rent payments</div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">ID</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Amount</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rentPayments.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/50">
                        <td className="py-2 px-3 text-gray-600">#{r.id}</td>
                        <td className="py-2 px-3 font-medium">
                          {r.amount != null ? Number(r.amount).toLocaleString() : '–'}
                        </td>
                        <td className="py-2 px-3 text-gray-600">{formatDate(r.paid_date ?? r.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {advancePayments.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-600 uppercase mb-2">Advance payments</div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">ID</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Amount</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {advancePayments.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50/50">
                        <td className="py-2 px-3 text-gray-600">#{a.id}</td>
                        <td className="py-2 px-3 font-medium">
                          {a.amount != null ? Number(a.amount).toLocaleString() : '–'}
                        </td>
                        <td className="py-2 px-3 text-gray-600">{formatDate(a.paid_date ?? a.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default IncomeSection;
