import React, { useEffect } from 'react';
import { CreditCard } from 'lucide-react';

const formatDate = (d) => {
  if (!d) return '–';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
};

const LoanPaymentsSection = ({ loanPayments = [], onSuccess }) => {
  useEffect(() => {
    if (onSuccess) onSuccess({ section: 'loanPayments', data: loanPayments });
  }, [loanPayments, onSuccess]);

  return (
    <section className="bg-surface rounded-xl border border-subdued/20 p-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-3">
        <CreditCard className="h-4 w-4" />
        Loan Payments ({loanPayments?.length ?? 0})
      </h3>
      {!loanPayments?.length ? (
        <p className="text-sm text-gray-500 py-2">No loan payments</p>
      ) : (
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
              {loanPayments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="py-2 px-3 text-gray-600">#{p.id}</td>
                  <td className="py-2 px-3 font-medium">
                    {p.amount != null ? Number(p.amount).toLocaleString() : '–'}
                  </td>
                  <td className="py-2 px-3 text-gray-600">{formatDate(p.paid_date ?? p.date ?? p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default LoanPaymentsSection;
