import React from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  Phone,
  Mail,
  DollarSign,
  ArrowDownRight,
  TrendingUp,
  PlusCircle,
} from 'lucide-react';
import TkSymbol from '../../common/TkSymbol';
import Table from '../../common/Table';

const advanceStatusPillClass = (status) => {
  if (status === 'paid') return 'bg-green-100 text-green-800';
  if (status === 'partially_used') return 'bg-yellow-100 text-yellow-800';
  if (status === 'fully_used') return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-800';
};

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

  const handleView = (row) => {
    setSelectedAdvancePaymentForForm(row);
    setAdvancePaymentFormMode('view');
    setOpenAdvancePaymentForm(true);
  };

  const tableColumns = [
    {
      key: 'date',
      title: t('date'),
      render: (row) =>
        row.payment_date ? format(new Date(row.payment_date), 'dd MMM yyyy') : '-',
    },
    {
      key: 'amount',
      title: t('amount'),
      render: (row) => (
        <span className="font-bold">
          <TkSymbol />{row.amount?.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'paid_amount',
      title: t('paid_amount'),
      render: (row) => (
        <span className="text-green-600">
          <TkSymbol />{row.paid_amount?.toLocaleString()}
        </span>
      ),
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
      key: 'method',
      title: t('method'),
      render: (row) => row.payment_method?.replace('_', ' ') || '-',
    },
    {
      key: 'status',
      title: t('status'),
      render: (row) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${advanceStatusPillClass(row.status)}`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'actions',
      title: t('actions'),
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleView(row);
            }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
            title={t('view') || 'View'}
          >
            <Eye size={18} />
          </button>
          {parseFloat(row.remaining_amount) > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenPayment(true);
              }}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors"
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
              <DollarSign className="text-blue-600" size={24} />
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
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${advanceStatusPillClass(row.status)}`}
                  >
                    {row.status}
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

                {/* Method row */}
                <div className="text-sm">
                  <span className="text-subdued">{t('method') || 'Method'}: </span>
                  <span>{row.payment_method?.replace('_', ' ') || '-'}</span>
                </div>

                {/* Action row */}
                <div className="border-t border-subdued/20 pt-3 flex items-center gap-2">
                  <button
                    onClick={() => handleView(row)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Eye size={16} />
                    {t('view') || 'View'}
                  </button>
                  {parseFloat(row.remaining_amount) > 0 && (
                    <button
                      onClick={() => setOpenPayment(true)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
                    >
                      {t('apply') || 'Apply'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block">
          <Table
            columns={tableColumns}
            data={filteredAdvancePayments}
            rowKey="id"
            emptyMessage={t('no_advance_payments_recorded') || 'No advance payments recorded.'}
          />
        </div>
      </div>
    </div>
  );
};

export default AdvanceTab;
