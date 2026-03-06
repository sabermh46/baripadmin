import React, { useEffect } from 'react';
import { Receipt } from 'lucide-react';

const formatDate = (d) => {
  if (!d) return '–';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
};

const ExpensesSection = ({ expenses = [], onSuccess }) => {
  useEffect(() => {
    if (onSuccess) onSuccess({ section: 'expenses', data: expenses });
  }, [expenses, onSuccess]);

  return (
    <section className="bg-surface rounded-xl border border-subdued/20 p-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-3">
        <Receipt className="h-4 w-4" />
        Expenses ({expenses?.length ?? 0})
      </h3>
      {!expenses?.length ? (
        <p className="text-sm text-gray-500 py-2">No expenses</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2 px-3 font-medium text-gray-700">ID</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Amount</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Category / Note</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50/50">
                  <td className="py-2 px-3 text-gray-600">#{e.id}</td>
                  <td className="py-2 px-3 font-medium">
                    {e.amount != null ? Number(e.amount).toLocaleString() : '–'}
                  </td>
                  <td className="py-2 px-3 text-gray-600">{e.category ?? e.note ?? '–'}</td>
                  <td className="py-2 px-3 text-gray-600">{formatDate(e.date ?? e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default ExpensesSection;
