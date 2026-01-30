// components/dashboard/UpcomingPayments.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Home, User, ChevronRight, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const UpcomingPayments = ({ payments = [] }) => {
  const {t}= useTranslation();
  const navigate = useNavigate();

  // Function to get days color based on urgency
  const getDaysColor = (daysLeft) => {
    if (daysLeft <= 3) return 'text-red-600 bg-red-50 border-red-200';
    if (daysLeft <= 7) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{t('upcoming_payments')}</h3>
            <p className="text-sm text-gray-500">{t('due_in_next_30_days')}</p>
          </div>
          <div className="px-3 py-1 bg-gray-50 rounded-full">
            <span className="text-sm font-medium text-gray-700">
              {payments.length} {t('payments')}
            </span>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="divide-y divide-gray-100">
        {payments.length > 0 ? (
          payments.map((payment) => (
            <div 
              key={payment.id}
              onClick={() => handleCardClick(payment.flat?.id)}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors group"
            >
              <div className="flex items-start justify-between">
                {/* Left Side - Payment Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`px-3 py-1 rounded-full border text-xs font-medium ${getDaysColor(payment.days_left)}`}>
                      {payment.days_left === 0 ? 'Due Today' : `${payment.days_left} days left`}
                    </div>
                    <div className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                      ${parseFloat(payment.amount).toLocaleString()}
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
              {payment.days_left <= 7 && (
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
      {payments.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {t('total_due')}: <span className="font-semibold text-gray-800">
                  ${payments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toLocaleString()}
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