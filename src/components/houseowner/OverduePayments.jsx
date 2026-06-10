import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, AlertTriangle, User, ChevronRight, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const OverduePayments = ({ payments = [] }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getOverdueColor = (daysOverdue) => {
    if (daysOverdue >= 30) return 'text-red-700 bg-red-100 border-red-300';
    if (daysOverdue >= 7) return 'text-orange-700 bg-orange-100 border-orange-300';
    return 'text-yellow-700 bg-yellow-100 border-yellow-300';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleCardClick = (flatId) => {
    if (flatId) navigate(`/flats/${flatId}`);
  };

  const totalOverdue = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  return (
    <div className="bg-white rounded-xl border border-red-200 overflow-hidden mt-4">
      {/* Header */}
      <div className="px-6 py-4 border-b border-red-100 bg-red-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-lg font-bold text-gray-800">{t('overdue_payments')}</h3>
              <p className="text-sm text-gray-500">{t('payments_past_due_date')}</p>
            </div>
          </div>
          <div className="px-3 py-1 bg-red-100 rounded-full">
            <span className="text-sm font-medium text-red-700">
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
              className="px-6 py-4 hover:bg-red-50 cursor-pointer transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`px-3 py-1 rounded-full border text-xs font-medium ${getOverdueColor(payment.days_overdue)}`}>
                      {payment.days_overdue === 0 ? 'Due Today' : `${payment.days_overdue} days overdue`}
                    </div>
                    <div className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-700">
                      ৳{parseFloat(payment.amount).toLocaleString()}
                    </div>
                  </div>

                  <div className="mb-3">
                    <h4 className="font-semibold text-gray-800 text-lg">
                      {payment.flat?.name || `Flat ${payment.flat?.number}`}
                    </h4>
                    <p className="text-sm text-gray-600">{payment.house?.name}</p>
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
                      <span className="text-sm text-gray-600">{payment.renter?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="ml-4">
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="flex flex-col items-center">
              <CheckCircle className="w-16 h-16 text-green-300 mb-4" />
              <h4 className="text-lg font-semibold text-gray-600 mb-2">{t('no_overdue_payments')}</h4>
              <p className="text-gray-500 max-w-md mx-auto">
                {t('all_payments_are_up_to_date')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {payments.length > 0 && (
        <div className="px-6 py-3 bg-red-50 border-t border-red-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-600">
                {t('total_overdue')}: <span className="font-semibold text-red-700">
                  ৳{totalOverdue.toLocaleString()}
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

export default OverduePayments;
