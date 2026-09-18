import React from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  Phone,
  Mail,
  Banknote,
  ArrowDownRight,
  TrendingUp,
  PlusCircle,
} from 'lucide-react';
import TkSymbol from '../../common/TkSymbol';
import { advanceStatusLabel, advanceStatusToneClass } from '../../../utils/advanceStatus';



const AdvanceTab = ({
  filteredAdvancePayments,
  flat,
  advanceRenterOptions,
  effectiveAdvanceRenterId,
  setSelectedAdvanceRenterId,
  selectedAdvanceRenterInfo,
  setSelectedAdvancePaymentForForm,
  setAdvancePaymentFormMode,
  setOpenAdvancePaymentForm,
  setOpenPayment,
  onViewAdvance,
}) => {
  const { t } = useTranslation();

  const totalAdvance = filteredAdvancePayments.reduce(
    (sum, p) => sum + (parseFloat(p.amount) || 0),
    0
  );
  const remainingAdvance = filteredAdvancePayments.reduce(
    (sum, p) => sum + (parseFloat(p.remaining_amount) || 0),
    0
  );
  const monthsCovered =
    flat.rent_amount > 0 ? (remainingAdvance / flat.rent_amount).toFixed(1) : '0';

  // The detail view is its own modal now, not a mode of the create/edit form. The deduction
  // history, the breakdown and the payment particulars all live there.
  const handleView = (row) => onViewAdvance?.(row);

  const tableColumns = [
    {
      key: 'date',
      title: t('date'),
      render: (row) =>
        row.payment_date ? format(new Date(row.payment_date), 'dd MMM yyyy') : '-',
    },
    {
      key: 'amount',
      title: t('advance_received') || 'Received',
      render: (row) => (
        <span className="font-bold">
          <TkSymbol />{(parseFloat(row.paid_amount ?? row.amount) || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'used',
      title: t('applied_to_rent') || 'Applied to rent',
      render: (row) => {
        const used = Math.max(
          0,
          (parseFloat(row.paid_amount ?? row.amount) || 0) - (parseFloat(row.remaining_amount) || 0),
        );
        return used > 0
          ? <span className="text-subdued"><TkSymbol />{used.toLocaleString()}</span>
          : <span className="text-subdued/50">-</span>;
      },
    },
    {
      key: 'remaining',
      title: t('remaining'),
      render: (row) => (
        <span
          className={`font-bold ${
            parseFloat(row.remaining_amount) > 0 ? 'text-green-600' : 'text-subdued'
          }`}
        >
          <TkSymbol />{row.remaining_amount?.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      title: t('status'),
      render: (row) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${advanceStatusToneClass(row.status)}`}
        >
          {advanceStatusLabel(t, row.status)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: t('actions'),
      // Labelled, not a bare icon. This is the way into everything the row no longer shows -
      // the breakdown, the particulars and the deduction history - so it has to read as an
      // invitation rather than as one more glyph to decode.
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleView(row);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-subdued/25 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
          >
            <Eye size={16} />
            {t('see_details') || 'See details'}
          </button>
          {parseFloat(row.remaining_amount) > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenPayment(true);
              }}
              className="rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-200"
            >
              {t('apply') || 'Apply'}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface rounded-lg p-4 border border-subdued/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Banknote className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-subdued">{t('total_advance')}</p>
              <p className="text-xl font-bold">
                <TkSymbol />{totalAdvance.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-4 border border-subdued/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowDownRight className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-subdued">{t('remaining_available')}</p>
              <p className="text-xl font-bold text-green-600">
                <TkSymbol />{remainingAdvance.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-4 border border-subdued/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-subdued">{t('months_covered')}</p>
              <p className="text-xl font-bold">
                {monthsCovered} {t('months')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Renter Selector */}
      <div className="bg-surface rounded-lg p-4 border border-subdued/20">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-subdued mb-2">
              {t('select_renter')}
            </label>
            <select
              value={effectiveAdvanceRenterId ?? ''}
              onChange={(e) =>
                setSelectedAdvanceRenterId(
                  e.target.value ? parseInt(e.target.value, 10) : null
                )
              }
              className="w-full sm:max-w-xs px-3 py-2 border border-subdued/30 rounded-lg bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {advanceRenterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {selectedAdvanceRenterInfo && (
            <div className="flex items-center gap-4 p-3 bg-subdued/5 rounded-lg">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                {selectedAdvanceRenterInfo.name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="font-semibold">{selectedAdvanceRenterInfo.name || '-'}</p>
                {selectedAdvanceRenterInfo.phone && (
                  <p className="text-sm text-subdued flex items-center gap-1">
                    <Phone size={14} /> {selectedAdvanceRenterInfo.phone}
                  </p>
                )}
                {selectedAdvanceRenterInfo.email && (
                  <p className="text-sm text-subdued flex items-center gap-1">
                    <Mail size={14} /> {selectedAdvanceRenterInfo.email}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section Header */}
      <div className="bg-surface rounded-lg border border-subdued/20 overflow-hidden">
        <div className="p-4 border-b border-subdued/20 flex justify-between items-center">
          <h3 className="text-lg font-bold text-text">
            {t('advance_payment_history')}
          </h3>
          <button
            onClick={() => {
              setSelectedAdvancePaymentForForm(null);
              setAdvancePaymentFormMode('create');
              setOpenAdvancePaymentForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm transition-colors"
          >
            <PlusCircle size={16} />
            {t('add_advance_payment') || 'Add Advance Payment'}
          </button>
        </div>

        {/* Mobile Card List */}
        <div className="sm:hidden p-4 space-y-3">
          {filteredAdvancePayments.length === 0 ? (
            <p className="text-subdued text-center py-8">
              {t('no_advance_payments_recorded') || 'No advance payments recorded.'}
            </p>
          ) : (
            filteredAdvancePayments.map((row) => (
              <div
                key={row.id}
                className="rounded-lg border border-subdued/20 bg-background p-4 space-y-3"
              >
                {/* Top: date + status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-subdued">
                    {row.payment_date
                      ? format(new Date(row.payment_date), 'dd MMM yyyy')
                      : '-'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${advanceStatusToneClass(row.status)}`}
                  >
                    {advanceStatusLabel(t, row.status)}
                  </span>
                </div>

                {/* Amount / Remaining row */}
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-subdued">{t('amount') || 'Amount'}: </span>
                    <span className="font-bold">
                      <TkSymbol />{row.amount?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-subdued">{t('remaining') || 'Remaining'}: </span>
                    <span
                      className={`font-bold ${
                        parseFloat(row.remaining_amount) > 0
                          ? 'text-green-600'
                          : 'text-subdued'
                      }`}
                    >
                      <TkSymbol />{row.remaining_amount?.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Applied so far, when any of it has been. On a freshly recorded advance
                    this line would only restate the amount received. */}
                {(parseFloat(row.paid_amount ?? row.amount) || 0) - (parseFloat(row.remaining_amount) || 0) > 0 && (
                  <div className="text-sm">
                    <span className="text-subdued">{t('applied_to_rent') || 'Applied to rent'}: </span>
                    <span>
                      <TkSymbol />
                      {(
                        (parseFloat(row.paid_amount ?? row.amount) || 0)
                        - (parseFloat(row.remaining_amount) || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Action row. Method, the particulars and the deduction history are all one
                    tap away rather than crowded onto the card. */}
                <div className="flex flex-wrap items-center gap-2 border-t border-subdued/20 pt-3">
                  <button
                    onClick={() => handleView(row)}
                    className="flex items-center gap-2 rounded-lg border border-subdued/25 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    <Eye size={16} />
                    {t('see_details') || 'See details'}
                  </button>
                  {parseFloat(row.remaining_amount) > 0 && (
                    <button
                      onClick={() => setOpenPayment(true)}
                      className="flex items-center gap-2 rounded-lg bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-200"
                    >
                      {t('apply') || 'Apply'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop table.
            Hand-rolled rather than the shared <Table>, which has no notion of an expanded row -
            and the whole point here is that each advance opens to show what it was spent on. */}
        {/* Desktop table.
            Back to a flat list: the deduction history was an expanded row here, which meant a
            table inside a table and an outer row carrying columns that only mattered once you
            were already investigating one advance. It lives in the details modal now. */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-primary">
              <tr>
                {tableColumns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`px-6 py-3 text-xs font-bold uppercase tracking-wider text-black ${
                      column.key === 'actions' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredAdvancePayments.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length} className="px-6 py-8 text-center text-subdued">
                    {t('no_advance_payments_recorded') || 'No advance payments recorded.'}
                  </td>
                </tr>
              ) : (
                filteredAdvancePayments.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {tableColumns.map((column) => (
                      <td key={column.key} className="whitespace-nowrap px-6 py-4">
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdvanceTab;
