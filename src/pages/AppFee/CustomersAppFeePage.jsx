import React, { useState } from 'react';
import { useGetAppFeePaymentsQuery } from '../../store/api/appFeeApi';
import AppFeeViewEditModal from './AppFeeViewEditModal';
import { addDays, format } from 'date-fns';


const selectNextAdminPending = (payments = []) => {
  const pending = payments.filter((p) => p.status === 'pending');

  const adminPending = pending.filter((p) => {
    const role = p.metadata?.createdBy?.role;
    return role === 'web_owner' || role === 'staff';
  });

  if (!adminPending.length) return null;

  const sorted = [...adminPending].sort((a, b) => {
    const aDate = a.start_date || a.due_date || a.created_at;
    const bDate = b.start_date || b.due_date || b.created_at;
    if (!aDate || !bDate) return 0;
    return new Date(aDate) - new Date(bDate);
  });

  return sorted[0] || null;
};

const CustomersAppFeePage = () => {
  const [viewEditId, setViewEditId] = useState(null);

  const listParams = { page: 1, limit: 50 };
  const { data: listResponse, isLoading } = useGetAppFeePaymentsQuery(listParams);
  const payments = listResponse?.data ?? [];
  const nextAdminPending = selectNextAdminPending(payments);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {nextAdminPending && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-amber-800">
              Upcoming subscription payment
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {nextAdminPending.amount != null
                ? Number(nextAdminPending.amount).toLocaleString()
                : '—'}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Status: <span className="font-medium capitalize">{nextAdminPending.status}</span>{' '}
              · Due{' '}
              {
                    addDays(new Date(nextAdminPending.start_date), nextAdminPending.subscription_days)
                    ? format(addDays(new Date(nextAdminPending.start_date), nextAdminPending.subscription_days), 'dd MMM yyyy')
                    : '—'
                  }
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <button
              type="button"
              onClick={() =>
                setViewEditId({
                  id: nextAdminPending.id,
                  forceEditable: true,
                  defaultStatus: 'paid',
                })
              }
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90"
            >
              Already paid?
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-gray-500">No app fee payments found.</p>
        ) : (
          payments.map((p) => (
            <div
              key={p.id}
              className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <p className="text-sm text-gray-500">
                  #{p.id}{' '}
                  {p.fee_type ? (
                    <span className="ml-1 text-gray-700 font-medium">{p.fee_type}</span>
                  ) : null}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {p.amount != null ? Number(p.amount).toLocaleString() : '—'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Due{' '}
                  {
                    addDays(new Date(p.start_date), p.subscription_days)
                    ? format(addDays(new Date(p.start_date), p.subscription_days), 'dd MMM yyyy')
                    : '—'
                  }
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    p.status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : p.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : p.status === 'overdue'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {p.status || '—'}
                </span>
                <button
                  type="button"
                  onClick={() => setViewEditId({ id: p.id })}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
                >
                  View details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AppFeeViewEditModal
        paymentId={viewEditId?.id}
        isOpen={!!viewEditId}
        onClose={() => setViewEditId(null)}
        onSuccess={() => setViewEditId(null)}
        forceEditable={!!viewEditId?.forceEditable}
        defaultStatus={viewEditId?.defaultStatus}
      />
    </div>
  );
};

export default CustomersAppFeePage;
