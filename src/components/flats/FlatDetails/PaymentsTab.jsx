import React from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Eye, Phone, Mail, Shield, Pencil, Trash2 } from 'lucide-react';
import TkSymbol from '../../common/TkSymbol';
import Table from '../../common/Table';

const statusPillClass = (status) => {
  if (status === 'paid') return 'bg-green-100 text-green-800';
  if (status === 'overdue') return 'bg-red-100 text-red-800';
  return 'bg-yellow-100 text-yellow-800';
};

const PaymentsTab = ({
  filteredPayments,
  availableAdvance,
  paymentRenterOptions,
  effectivePaymentRenterId,
  setSelectedPaymentRenterId,
  selectedPaymentRenterInfo,
  setSelectedPaymentForEmailLog,
  setOpenPaymentEmailLog,
  onEditPayment,
  onDeletePayment,
}) => {
  const { t } = useTranslation();

  const handleViewReceipt = (row) => {
    setSelectedPaymentForEmailLog(row);
    setOpenPaymentEmailLog(true);
  };

  const tableColumns = [
    {
      key: 'due_date',
      title: t('due_date'),
      render: (row) =>
        row.due_date ? format(new Date(row.due_date), 'dd MMM yyyy') : '-',
    },
    {
      key: 'amount',
      title: t('amount'),
      render: (row) => (
        <div>
          <div className="font-bold">
            <TkSymbol />{row.amount?.toLocaleString()}
          </div>
          {row.base_amount && row.amenities_charge ? (
            <div className="text-xs text-subdued">
              {t('base') || 'Base'}: <TkSymbol />{row.base_amount} + {t('amenities') || 'Amenities'}: <TkSymbol />{row.amenities_charge}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'paid_date',
      title: t('paid_date'),
      render: (row) =>
        row.paid_date ? format(new Date(row.paid_date), 'dd MMM yyyy') : '-',
    },
    {
      key: 'method',
      title: t('method'),
      render: (row) => row.payment_method?.replace('_', ' ') || '-',
    },
    {
      key: 'late_fee',
      title: t('late_fee'),
      render: (row) =>
        row.late_fee_amount > 0 ? (
          <span className="text-orange-600">
            <TkSymbol />{row.late_fee_amount}
          </span>
        ) : (
          '-'
        ),
    },
    {
      key: 'advance_used',
      title: t('advance_used'),
      render: (row) =>
        row.advance_used ? (
          <div className="text-xs text-green-700">
            <div className="font-medium">
              <TkSymbol />{row.advance_used}
            </div>
            <div className="text-green-600">{t('advance_applied') || 'Advance applied'}</div>
          </div>
        ) : (
          '-'
        ),
    },
    {
      key: 'status',
      title: t('status'),
      render: (row) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${statusPillClass(row.status)}`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'actions',
      title: t('actions'),
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleViewReceipt(row); }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
            title={t('view_receipt') || 'View Receipt'}
          >
            <Eye size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEditPayment(row); }}
            className="p-1.5 text-primary hover:bg-primary/10 rounded"
            title={t('edit_payment') || 'Edit'}
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeletePayment(row); }}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded"
            title={t('delete_payment') || 'Delete'}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Advance Payment Notice */}
      {availableAdvance > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Shield className="text-green-600" size={20} />
            <div>
              <p className="font-medium text-green-800">
                {t('advance_payment_available') || 'Advance Payment Available'}
              </p>
              <p className="text-sm text-green-700">
                <TkSymbol />{availableAdvance.toLocaleString()}{' '}
                {t('can_be_applied_to_pending_payments') || 'can be applied to pending payments'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Renter Selector */}
      <div className="bg-surface rounded-lg p-4 border border-subdued/20">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-subdued mb-2">
              {t('select_renter')}
            </label>
            <select
              value={effectivePaymentRenterId ?? ''}
              onChange={(e) =>
                setSelectedPaymentRenterId(
                  e.target.value ? parseInt(e.target.value, 10) : null
                )
              }
              className="w-full sm:max-w-xs px-3 py-2 border border-subdued/30 rounded-lg bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {paymentRenterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {selectedPaymentRenterInfo && (
            <div className="flex items-center gap-4 p-3 bg-subdued/5 rounded-lg">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                {selectedPaymentRenterInfo.name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="font-semibold">{selectedPaymentRenterInfo.name || '-'}</p>
                {selectedPaymentRenterInfo.phone && (
                  <p className="text-sm text-subdued flex items-center gap-1">
                    <Phone size={14} /> {selectedPaymentRenterInfo.phone}
                  </p>
                )}
                {selectedPaymentRenterInfo.email && (
                  <p className="text-sm text-subdued flex items-center gap-1">
                    <Mail size={14} /> {selectedPaymentRenterInfo.email}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="sm:hidden space-y-3">
        {filteredPayments.length === 0 ? (
          <p className="text-subdued text-center py-8">
            {t('no_payment_history') || 'No payment history found.'}
          </p>
        ) : (
          filteredPayments.map((row) => (
            <div
              key={row.id}
              className="bg-surface rounded-lg border border-subdued/20 p-4 space-y-3"
            >
              {/* Top row: month label + status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-subdued">
                  {row.for_month ||
                    (row.due_date
                      ? format(new Date(row.due_date), 'MMM yyyy')
                      : '-')}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusPillClass(row.status)}`}
                >
                  {row.status}
                </span>
              </div>

              {/* Amount */}
              <p className="text-2xl font-bold text-text">
                <TkSymbol />{row.amount?.toLocaleString()}
              </p>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div>
                  <span className="text-subdued">{t('due_date')}: </span>
                  <span>
                    {row.due_date
                      ? format(new Date(row.due_date), 'dd MMM yyyy')
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-subdued">{t('paid_date')}: </span>
                  <span>
                    {row.paid_date
                      ? format(new Date(row.paid_date), 'dd MMM yyyy')
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-subdued">{t('method')}: </span>
                  <span>{row.payment_method?.replace('_', ' ') || '-'}</span>
                </div>
                {row.late_fee_amount > 0 && (
                  <div>
                    <span className="text-subdued">{t('late_fee')}: </span>
                    <span className="text-orange-600">
                      <TkSymbol />{row.late_fee_amount}
                    </span>
                  </div>
                )}
                {row.advance_used && (
                  <div className="col-span-2">
                    <span className="text-subdued">{t('advance_used')}: </span>
                    <span className="text-green-600">
                      <TkSymbol />{row.advance_used}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom action row */}
              <div className="border-t border-subdued/20 pt-3 flex items-center justify-between">
                <button
                  onClick={() => handleViewReceipt(row)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Eye size={15} />
                  {t('view_receipt') || 'View Receipt'}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditPayment(row)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Pencil size={15} />
                    {t('edit') || 'Edit'}
                  </button>
                  <button
                    onClick={() => onDeletePayment(row)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                    {t('delete') || 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block">
        <Table
          columns={tableColumns}
          data={filteredPayments}
          rowKey="id"
          emptyMessage={t('no_payment_history') || 'No payment history found.'}
        />
      </div>
    </div>
  );
};

export default PaymentsTab;
