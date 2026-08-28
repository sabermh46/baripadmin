// components/dashboard/UpcomingPayments.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Home, User, ChevronRight, AlertCircle } from 'lucide-react';
import { UPCOMING_MODES, readUpcomingMode, writeUpcomingMode } from '../../utils/upcomingMode';
import { useTranslation } from 'react-i18next';
import TkSymbol from '../common/TkSymbol';

const UpcomingPayments = ({ payments = [], paymentsThisMonth = [] }) => {
  /**
   * Two honest answers to "what is coming up", and owners bill differently enough that
   * neither is right for everyone:
   *
   *   days  — unsettled and due in the next 30 days. A rolling window.
   *   month — everything unsettled for the month we are now in, whatever its due date.
   *
   * They disagree in both directions. This month's rent that fell due last week is missing
   * from the rolling window (it counts as overdue); an invoice raised early for next month
   * sits inside the rolling window while having nothing to do with this month's rent.
   *
   * Read from localStorage at mount rather than held in a store: it is one owner's view
   * preference on one device, it needs no server round trip to change, and the dashboard
   * already has both lists in hand so switching is instant.
   */
  const [mode, setMode] = useState(readUpcomingMode);

  const shown = mode === UPCOMING_MODES.MONTH ? paymentsThisMonth : payments;

  const chooseMode = (next) => {
    setMode(next);
    writeUpcomingMode(next);
  };

  const {t}= useTranslation();
  const navigate = useNavigate();

  /**
   * The badge has to distinguish three states, not two.
   *
   * "This month" is scoped by for_month and says nothing about the due date, so it contains
   * invoices that fell due weeks ago — and those arrived here with days_left clamped to 0,
   * which this component read as "Due Today". Rent 27 days late was labelled as due this
   * morning, in red, with a full progress bar, which looks like the same thing as on time.
   */
  const dueState = (payment) => {
    const overdue = payment.days_overdue ?? 0;
    if (overdue > 0) return { key: 'overdue', days: overdue, tone: 'text-red-700 bg-red-100 border-red-300' };
    if (payment.days_left === 0) return { key: 'today', days: 0, tone: 'text-red-600 bg-red-50 border-red-200' };
    if (payment.days_left <= 3) return { key: 'left', days: payment.days_left, tone: 'text-red-600 bg-red-50 border-red-200' };
    if (payment.days_left <= 7) return { key: 'left', days: payment.days_left, tone: 'text-orange-600 bg-orange-50 border-orange-200' };
    return { key: 'left', days: payment.days_left, tone: 'text-blue-600 bg-blue-50 border-blue-200' };
  };

  // Function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Handle card click
  const handleCardClick = (flatId) => {
    if (flatId) {
      navigate(`/flats/${flatId}`);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-800">{t('upcoming_payments')}</h3>
            <p className="text-sm text-gray-500">
              {mode === UPCOMING_MODES.MONTH ? t('unsettled_for_this_month') : t('due_within_30_days')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* The count belongs to whichever list is on screen — showing the other one's
                total next to these rows is how a dashboard starts contradicting itself. */}
            <div className="px-3 py-1 bg-gray-50 rounded-full">
              <span className="text-sm font-medium text-gray-700">
                {shown.length} {t('payments')}
              </span>
            </div>

            <div className="flex rounded-lg border border-gray-200 p-0.5" role="group">
              <button
                type="button"
                onClick={() => chooseMode(UPCOMING_MODES.DAYS)}
                aria-pressed={mode === UPCOMING_MODES.DAYS}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  mode === UPCOMING_MODES.DAYS ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t('next_30_days')}
              </button>
              <button
                type="button"
                onClick={() => chooseMode(UPCOMING_MODES.MONTH)}
                aria-pressed={mode === UPCOMING_MODES.MONTH}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  mode === UPCOMING_MODES.MONTH ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t('this_month')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="divide-y divide-gray-100">
        {shown.length > 0 ? (
          shown.map((payment) => (
            <div 
              key={payment.id}
              onClick={() => handleCardClick(payment.flat?.id)}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors group"
            >
              <div className="flex items-start justify-between">
                {/* Left Side - Payment Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {(() => {
                      const state = dueState(payment);
                      return (
                        <div className={`px-3 py-1 rounded-full border text-xs font-medium ${state.tone}`}>
                          {state.key === 'overdue' && t('overdue_by_days', { days: state.days })}
                          {state.key === 'today' && t('due_today')}
                          {state.key === 'left' && t('days_left', { count: state.days })}
                        </div>
                      );
                    })()}
                    {/* Taka. This row was printing a dollar sign against Bangladeshi rent. */}
                    <div className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                      <TkSymbol />{parseFloat(payment.amount).toLocaleString()}
                    </div>
                  </div>

                  <div className="mb-3">
                    <h4 className="font-semibold text-gray-800 text-lg">
                      {payment.flat?.name || `Flat ${payment.flat?.number}`}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {payment.house?.name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {t('due')}: {formatDate(payment.due_date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {payment.renter?.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side - Chevron */}
                <div className="ml-4">
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                </div>
              </div>

              {/* Progress Bar for Urgency */}
              {(payment.days_overdue ?? 0) === 0 && payment.days_left <= 7 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Payment Due</span>
                    <span>{payment.days_left}/7 days</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        payment.days_left <= 3 
                          ? 'bg-red-500' 
                          : payment.days_left <= 7 
                            ? 'bg-orange-500' 
                            : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.max(0, 100 - (payment.days_left / 7 * 100))}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="flex flex-col items-center">
              <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
              <h4 className="text-lg font-semibold text-gray-600 mb-2">{t('no_upcoming_payments')}</h4>
              <p className="text-gray-500 max-w-md mx-auto">
                {t('you_have_no_payments_due_in_the_next_30_days')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {shown.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {t('total_due')}: <span className="font-semibold text-gray-800">
                  <TkSymbol />{shown.reduce((sum, p) => sum + parseFloat(p.amount), 0).toLocaleString()}
                </span>
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {t('click_any_payment_to_view_details')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpcomingPayments;