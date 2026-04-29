import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  AlertCircle,
  DollarSign,
  Calendar,
  Shield,
  User,
  Phone,
  Mail,
  Clock,
} from 'lucide-react';
import TkSymbol from '../../common/TkSymbol';

const OverviewTab = ({
  flat,
  house,
  stats,
  renter,
  advancePayments,
  availableAdvance,
  pendingPayments,
  flatMetadata,
  nextDueDate,
  setOpenPayment,
  setOpenAssignModal,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Financial Stats Card */}
      <div className="bg-surface rounded-lg p-4 border border-subdued/20">
        <h2 className="text-lg font-bold text-text mb-4">{t('financial_statistics')}</h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Total Paid */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-xs text-green-700 uppercase tracking-wider">{t('total_paid')}</p>
              <TrendingUp className="text-green-600" size={16} />
            </div>
            <p className="text-xl font-bold text-green-700 mt-1">
              <TkSymbol />{Number(stats.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            {availableAdvance > 0 && (
              <p className="text-xs text-green-600 mt-1">
                +<TkSymbol />{availableAdvance.toLocaleString()} {t('advance_available') || 'advance available'}
              </p>
            )}
          </div>

          {/* Total Due */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-xs text-red-700 uppercase tracking-wider">{t('total_due')}</p>
              <AlertCircle className="text-red-600" size={16} />
            </div>
            <p className="text-xl font-bold text-red-700 mt-1">
              <TkSymbol />{Math.max(0, Number(stats.totalDue || 0) - Number(stats.totalPaid || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Payment Status */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg col-span-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-blue-700 uppercase tracking-wider">{t('payment_status')}</p>
                <p className="text-md font-semibold text-blue-800 mt-1">
                  {stats.pendingCount || 0} {t('pending_months')}
                </p>
                {stats.overdueCount > 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    {stats.overdueCount} {t('overdue')}
                  </p>
                )}
              </div>
              {stats.overdueCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-bold rounded-full">
                    {t('overdue')}
                  </span>
                  <button
                    onClick={() => setOpenPayment(true)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    {t('pay_now') || 'Pay Now'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Rent & Due Day */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface rounded-lg p-4 border border-subdued/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-subdued">{t('monthly_rent')}</p>
              <p className="text-xl font-bold">
                <TkSymbol />{flat.rent_amount?.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg p-4 border border-subdued/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-subdued">{t('due_day')}</p>
              <p className="text-xl font-bold">
                {t('day') || 'Day'} {flat.should_pay_rent_day}
              </p>
            </div>
          </div>
          {nextDueDate && (
            <p className="text-xs text-subdued mt-2">
              {t('next') || 'Next'}: {format(nextDueDate, 'dd MMM yyyy')}
            </p>
          )}
        </div>
      </div>

      {/* Advance Payments Summary */}
      {availableAdvance > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
              <Shield size={20} /> {t('advance_payments_available') || 'Advance Payments Available'}
            </h3>
            <span className="text-2xl font-bold text-green-700">
              <TkSymbol />{availableAdvance.toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-green-700">{t('total_advance')}</p>
              <p className="text-xl font-bold">
                <TkSymbol />
                {advancePayments
                  .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-green-700">{t('remaining')}</p>
              <p className="text-xl font-bold">
                <TkSymbol />{availableAdvance.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-green-700">{t('covers_months')}</p>
              <p className="text-xl font-bold">
                {flat.rent_amount > 0
                  ? (availableAdvance / flat.rent_amount).toFixed(1)
                  : '0'}{' '}
                {t('months')}
              </p>
            </div>
          </div>
          {pendingPayments.length > 0 && (
            <div className="mt-4 p-3 bg-white border border-green-300 rounded-lg">
              <p className="text-sm text-green-800">
                <span className="font-bold">{pendingPayments.length} {t('pending_payments') || 'pending payment(s)'}</span>{' '}
                {t('can_be_paid_with_advance') || 'can be paid using advance.'}
                <button
                  onClick={() => setOpenPayment(true)}
                  className="ml-2 text-green-700 hover:text-green-900 underline"
                >
                  {t('apply_now') || 'Apply now'} →
                </button>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Renter Details & Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Renter Details Card */}
        <div className="bg-surface rounded-lg p-4 border border-subdued/20">
          <h2 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
            <User size={20} /> {t('renter_details')}
          </h2>

          {flat.renter_id ? (
            <Link
              to={`/renters?view=${renter.id}`}
              className="block space-y-4 hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                  {renter.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-bold text-lg">{renter.name}</p>
                  <div className="flex flex-col gap-1 mt-1">
                    {renter.phone && (
                      <span className="text-sm text-subdued flex items-center gap-2">
                        <Phone size={14} /> {renter.phone}
                      </span>
                    )}
                    {renter.email && (
                      <span className="text-sm text-subdued flex items-center gap-2">
                        <Mail size={14} /> {renter.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {flatMetadata.advance_payments_summary && (
                <div className="mt-4 pt-4 border-t border-subdued/20">
                  <p className="text-sm font-medium text-text mb-2">
                    {t('advance_payment_summary')}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-subdued">{t('total_advance_paid')}:</span>
                      <span className="font-bold text-green-600">
                        <TkSymbol />
                        {flatMetadata.advance_payments_summary.total_advance?.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-subdued">{t('payment_count')}:</span>
                      <span>{flatMetadata.advance_payments_summary.payment_count || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </Link>
          ) : (
            <div className="text-center py-6">
              <p className="text-subdued mb-4">{t('no_renter_assigned')}</p>
              <button
                onClick={() => setOpenAssignModal(true)}
                className="text-primary font-medium hover:underline"
              >
                + {t('assign_a_renter')}
              </button>
            </div>
          )}
        </div>

        {/* Status & Charges Card */}
        <div className="bg-surface rounded-lg p-4 border border-subdued/20">
          <h2 className="text-lg font-bold text-text mb-4">
            {t('status_and_charges') || 'Status & Charges'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle className="text-orange-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-orange-700">{t('late_fee')}</p>
                  <p className="text-xl font-bold text-orange-700">
                    {flat.late_fee_percentage ?? 5}%
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="text-purple-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-purple-700">{t('status')}</p>
                  <p
                    className={`text-xl font-bold ${
                      flat.renter_id ? 'text-green-600' : 'text-yellow-600'
                    }`}
                  >
                    {flat.renter_id
                      ? t('occupied') || 'Occupied'
                      : t('vacant') || 'Vacant'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
