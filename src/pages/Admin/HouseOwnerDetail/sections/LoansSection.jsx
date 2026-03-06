import React, { useEffect } from 'react';
import { Landmark } from 'lucide-react';

const formatDate = (d) => {
  if (!d) return '–';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
};

const LoansSection = ({ loans = [], onSuccess }) => {
  useEffect(() => {
    if (onSuccess) onSuccess({ section: 'loans', data: loans });
  }, [loans, onSuccess]);

  return (
    <section className="bg-surface rounded-xl border border-subdued/20 p-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-3">
        <Landmark className="h-4 w-4" />
        Loans ({loans?.length ?? 0})
      </h3>
      {!loans?.length ? (
        <p className="text-sm text-gray-500 py-2">No loans</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2 px-3 font-medium text-gray-700">ID</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Amount</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Source / Note</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loans.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/50">
                  <td className="py-2 px-3 text-gray-600">#{l.id}</td>
                  <td className="py-2 px-3 font-medium">
                    {l.amount != null ? Number(l.amount).toLocaleString() : '–'}
                  </td>
                  <td className="py-2 px-3 text-gray-600">{l.source ?? l.note ?? '–'}</td>
                  <td className="py-2 px-3 text-gray-600">{formatDate(l.date ?? l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default LoansSection;
