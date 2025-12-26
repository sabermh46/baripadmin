// components/flats/FlatDetails.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  DollarSign,
  Calendar,
  User,
  Phone,
  Mail,
  Clock,
  AlertCircle,
  FileText,
  CreditCard,
  History,
  MessageSquare,
  Send,
  Printer,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useGetFlatDetailsQuery,
  useGetFlatPaymentsQuery,
  useSendRentReminderMutation
} from '../../store/api/flatApi';
import FlatForm from './FlatForm';
import RecordPaymentModal from './RecordPaymentModal';

const FlatDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [openEdit, setOpenEdit] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [openReminder, setOpenReminder] = useState(false);

  const { data: flatData, isLoading } = useGetFlatDetailsQuery(id);
  const { data: paymentsData } = useGetFlatPaymentsQuery(
    { flatId: id, limit: 10 },
    { skip: !id }
  );

  const [sendReminder, { isLoading: isSendingReminder }] = useSendRentReminderMutation();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const flat = flatData?.data?.flat || {};
  const renter = flatData?.data?.renter || {};
  const payments = paymentsData?.data || [];
  const stats = flatData?.stats || {};

  const handleSendReminder = async () => {
    try {
      await sendReminder({ flat_id: id }).unwrap();
      setOpenReminder(false);
    } catch (error) {
      console.error('Failed to send reminder:', error);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'payments', label: 'Payment History', icon: History },
    { id: 'notes', label: 'Notes', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-subdued/10 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text">
            {flat.number ? `Flat ${flat.number}` : flat.name}
          </h1>
          <p className="text-subdued">
            {flat.houseName} • {flat.houseAddress}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {flat.renter_id && (
            <button
              onClick={() => setOpenReminder(true)}
              className="flex items-center gap-2 px-4 py-2 border border-subdued/30 rounded-lg hover:bg-subdued/10 transition-colors"
            >
              <Send size={18} />
              Send Reminder
            </button>
          )}
          <button
            onClick={() => setOpenEdit(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Edit size={18} />
            Edit Flat
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-subdued/20">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-subdued hover:text-text'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {
        console.log(flat)
        
      }

      {/* Tab Content */}
      <div className="pt-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Basic Info & Renter Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Flat Information */}
              <div className="bg-surface rounded-xl p-6 border border-subdued/20">
                <h2 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                  <FileText size={20} />
                  Flat Information
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-subdued">Flat Name</p>
                    <p className="font-medium">{flat.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-subdued">Flat Number</p>
                    <p className="font-medium">{flat.number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-subdued">Monthly Rent</p>
                    <p className="font-bold text-text">
                      ${flat.rent_amount?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-subdued">Rent Due Day</p>
                    <p>Day {flat.should_pay_rent_day}</p>
                  </div>
                  <div>
                    <p className="text-sm text-subdued">Late Fee</p>
                    <p>{flat.late_fee_percentage || 5}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-subdued">Status</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                      flat.renter_id
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {flat.renter_id ? 'Occupied' : 'Vacant'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Renter */}
              <div className="bg-surface rounded-xl p-6 border border-subdued/20">
                <h2 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                  <User size={20} />
                  Current Renter
                </h2>
                {flat.renter_id ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="text-primary" size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-text text-lg">{renter.name}</p>
                        <div className="flex flex-wrap gap-4 mt-2">
                          {renter.phone && (
                            <div className="flex items-center gap-2 text-subdued">
                              <Phone size={16} />
                              <span>{renter.phone}</span>
                            </div>
                          )}
                          {renter.email && (
                            <div className="flex items-center gap-2 text-subdued">
                              <Mail size={16} />
                              <span>{renter.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-subdued/20">
                      <div>
                        <p className="text-sm text-subdued">Last Payment</p>
                        <p className="font-medium">
                          {flat.last_rent_paid_date
                            ? format(new Date(flat.last_rent_paid_date), 'dd MMM yyyy')
                            : 'No payment yet'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-subdued">Next Due</p>
                        <p className="font-medium">
                          {flat.rent_due_date
                            ? format(new Date(flat.rent_due_date), 'dd MMM yyyy')
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="text-yellow-600" size={24} />
                    </div>
                    <p className="text-subdued mb-4">No renter assigned</p>
                    <button
                      onClick={() => navigate(`/flats/${id}/assign-renter`)}
                      className="px-4 py-2 border border-subdued/30 rounded-lg hover:bg-subdued/10 transition-colors"
                    >
                      Assign Renter
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Statistics */}
            <div className="bg-surface rounded-xl p-6 border border-subdued/20">
              <h2 className="text-lg font-bold text-text mb-6">Payment Statistics</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="text-blue-600" size={24} />
                  </div>
                  <p className="text-sm text-subdued">Total Due</p>
                  <p className="text-2xl font-bold text-text mt-1">
                    ${stats.totalDue?.toLocaleString() || '0'}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="text-green-600" size={24} />
                  </div>
                  <p className="text-sm text-subdued">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    ${stats.totalPaid?.toLocaleString() || '0'}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="text-yellow-600" size={24} />
                  </div>
                  <p className="text-sm text-subdued">Late Fees</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">
                    ${stats.totalLateFees?.toLocaleString() || '0'}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="text-red-600" size={24} />
                  </div>
                  <p className="text-sm text-subdued">Pending</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {stats.pendingCount || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-surface rounded-xl border border-subdued/20 overflow-hidden">
            <div className="p-6 border-b border-subdued/20 flex justify-between items-center">
              <h2 className="text-lg font-bold text-text">Payment History</h2>
              <button
                onClick={() => setOpenPayment(true)}
                disabled={!flat.renter_id}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CreditCard size={18} />
                Record Payment
              </button>
            </div>
            
            {payments.length === 0 ? (
              <div className="p-8 text-center text-subdued">
                No payment history found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-subdued/5 border-b border-subdued/20">
                    <tr>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Date</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Amount</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Due Date</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Paid Date</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Method</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Late Fee</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Status</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Transaction ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subdued/10">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-subdued/5 transition-colors">
                        <td className="py-4 px-6">
                          {format(new Date(payment.created_at), 'dd MMM yyyy')}
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-bold text-text">
                            ${payment.amount?.toLocaleString()}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          {format(new Date(payment.due_date), 'dd MMM yyyy')}
                        </td>
                        <td className="py-4 px-6">
                          {payment.paid_date
                            ? format(new Date(payment.paid_date), 'dd MMM yyyy')
                            : '-'}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm border border-subdued/30">
                            {payment.payment_method || 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {payment.late_fee_amount > 0 ? (
                            <span className="text-yellow-600 font-medium">
                              ${payment.late_fee_amount?.toLocaleString()}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                            payment.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'overdue'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-sm text-subdued">
                            {payment.transaction_id || 'N/A'}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-surface rounded-xl p-6 border border-subdued/20">
            <h2 className="text-lg font-bold text-text mb-4">Notes & Additional Information</h2>
            {flat.metadata ? (
              <div className="bg-subdued/5 rounded-lg p-6 border border-subdued/20">
                <p className="whitespace-pre-wrap text-text">{flat.metadata}</p>
              </div>
            ) : (
              <div className="text-center py-8 text-subdued">
                No additional notes provided
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <FlatForm
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        houseId={flat.house_id}
        flat={flat}
      />

      <RecordPaymentModal
        open={openPayment}
        onClose={() => setOpenPayment(false)}
        flat={flat}
        renter={renter}
      />

      {/* Send Reminder Dialog */}
      {openReminder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-text mb-2">Send Rent Reminder</h3>
            <p className="text-subdued mb-4">
              Send a rent reminder to {renter.name}?
            </p>
            
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Reminder will be sent via email and SMS if contact information is available.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setOpenReminder(false)}
                className="px-4 py-2 border border-subdued/30 rounded-lg hover:bg-subdued/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReminder}
                disabled={isSendingReminder}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSendingReminder ? 'Sending...' : 'Send Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlatDetails;