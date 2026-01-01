// components/flats/FlatDetails.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit, DollarSign, Calendar, User, Phone, Mail,
  Clock, AlertCircle, FileText, CreditCard, History,
  MessageSquare, Send, X, PlusCircle
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useGetFlatDetailsQuery,
  useSendRentReminderMutation
} from '../../store/api/flatApi';
import FlatForm from './FlatForm';
import RecordPaymentModal from './RecordPaymentModal';
import { toast } from 'react-toastify';

const FlatDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State Management
  const [activeTab, setActiveTab] = useState('overview');
  const [openEdit, setOpenEdit] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [openReminder, setOpenReminder] = useState(false);

  // Queries
  const { data: flatData, isLoading, refetch: refetchDetails } = useGetFlatDetailsQuery(id);
//   const { data: paymentsData, refetch: refetchPayments } = useGetFlatPaymentsQuery(
//     { flatId: id, limit: 50 },
//     { skip: !id }
//   );

  const [sendReminder, { isLoading: isSendingReminder }] = useSendRentReminderMutation();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }


  const flat = flatData?.data?.flat || {};
  const renter = {
    name: flat.renterName,
    phone: flat.renterPhone,
    email: flat.renterEmail,
    id: flat.renterId,
  }
  const house = flatData?.data?.house || {};
  const payments = flatData?.data?.payments || [];
  const stats = flatData?.stats || {};

  // Feature: Calculate Next Due Date (from Snippet 1)
  const calculateNextDueDate = () => {
    if (!flat.should_pay_rent_day) return null;
    const today = new Date();
    let dueDate = new Date(today.getFullYear(), today.getMonth(), flat.should_pay_rent_day);
    if (today.getDate() > flat.should_pay_rent_day) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    console.log('dueDate: ', dueDate);
    
    return dueDate;
  };

  const nextDueDate = calculateNextDueDate();

  const handleSendReminder = async () => {
    try {
      await sendReminder({ flat_id: id }).unwrap();
      toast.success('Reminder sent successfully');
      setOpenReminder(false);
    } catch (error) {
      toast.error('Failed to send reminder');
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
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-subdued/10 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">
              {flat.number ? `Flat ${flat.number}` : flat.name}
            </h1>
            <p className="text-subdued">
              {house.name || flat.houseName} • {house.address || flat.houseAddress}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
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
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-subdued/30 text-text rounded-lg hover:bg-subdued/10 transition-colors"
          >
            <Edit size={18} />
            Edit Flat
          </button>
          <button
            onClick={() => setOpenPayment(true)}
            disabled={!flat.renter_id}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <PlusCircle size={18} />
            Record Payment
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
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

      {/* Tab Content */}
      <div className="pt-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-surface rounded-xl p-6 border border-subdued/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg"><DollarSign className="text-blue-600" size={24} /></div>
                  <div>
                    <p className="text-sm text-subdued">Monthly Rent</p>
                    <p className="text-xl font-bold">${flat.rent_amount?.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-surface rounded-xl p-6 border border-subdued/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg"><Calendar className="text-green-600" size={24} /></div>
                  <div>
                    <p className="text-sm text-subdued">Due Day</p>
                    <p className="text-xl font-bold">Day {flat.should_pay_rent_day}</p>
                  </div>
                </div>
                {nextDueDate && <p className="text-xs text-subdued mt-2">Next: {format(nextDueDate, 'dd MMM')}</p>}
              </div>
              <div className="bg-surface rounded-xl p-6 border border-subdued/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg"><AlertCircle className="text-orange-600" size={24} /></div>
                  <div>
                    <p className="text-sm text-subdued">Late Fee</p>
                    <p className="text-xl font-bold">{flat.late_fee_percentage ?? 5}%</p>
                  </div>
                </div>
              </div>
              <div className="bg-surface rounded-xl p-6 border border-subdued/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg"><Clock className="text-purple-600" size={24} /></div>
                  <div>
                    <p className="text-sm text-subdued">Status</p>
                    <p className={`text-xl font-bold ${flat.renter_id ? 'text-green-600' : 'text-yellow-600'}`}>
                      {flat.renter_id ? 'Occupied' : 'Vacant'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Renter Details Card */}
              <div className="bg-surface rounded-xl p-6 border border-subdued/20">
                <h2 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                  <User size={20} /> Renter Information
                </h2>
                {flat.renter_id ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                        {renter.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-lg">{renter.name}</p>
                        <div className="flex flex-col gap-1 mt-1">
                          {renter.phone && <span className="text-sm text-subdued flex items-center gap-2"><Phone size={14}/> {renter.phone}</span>}
                          {renter.email && <span className="text-sm text-subdued flex items-center gap-2"><Mail size={14}/> {renter.email}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-subdued mb-4">No renter assigned to this flat.</p>
                    <button onClick={() => navigate(`/flats/${id}/assign-renter`)} className="text-primary font-medium hover:underline">
                      + Assign a Renter
                    </button>
                  </div>
                )}
              </div>

              {/* Financial Stats Card */}
            <div className="bg-surface rounded-xl p-6 border border-subdued/20">
                <h2 className="text-lg font-bold text-text mb-4">Financial Statistics</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Total Paid */}
                        <div className="p-4 bg-subdued/5 rounded-lg">
                        <p className="text-xs text-subdued uppercase tracking-wider">Total Paid</p>
                        <p className="text-xl font-bold text-green-600">
                            ${Number(flatData?.data?.stats?.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        </div>
                        
                        {/* Total Due/Pending */}
                        <div className="p-4 bg-subdued/5 rounded-lg">
                        <p className="text-xs text-subdued uppercase tracking-wider">Total Due</p>
                        <p className="text-xl font-bold text-red-600">
                            ${Number(flatData?.data?.stats?.totalDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        </div>

                        {/* Pending Months Count */}
                        <div className="p-4 bg-subdued/5 rounded-lg col-span-2 flex justify-between items-center">
                        <div>
                            <p className="text-xs text-subdued uppercase tracking-wider">Payment Status</p>
                            <p className="text-md font-semibold text-text">
                            {flatData?.data?.stats?.pendingCount || 0} Pending Month(s)
                            </p>
                        </div>
                        {flatData?.data?.stats?.overdueCount > 0 && (
                            <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold">
                            {flatData?.data?.stats?.overdueCount} OVERDUE
                            </span>
                        )}
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-surface rounded-xl border border-subdued/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-subdued/5 border-b border-subdued/20">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Due Date</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Amount</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Paid Date</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Method</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Late Fee</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-subdued">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subdued/10">
                  {payments.length > 0 ? payments.map((p) => (
                    <tr key={p.id} className="hover:bg-subdued/5 transition-colors">
                      <td className="py-4 px-6">{p.due_date ? format(new Date(p.due_date), 'dd MMM yyyy') : '-'}</td>
                      <td className="py-4 px-6 font-bold">${p.amount?.toLocaleString()}</td>
                      <td className="py-4 px-6">{p.paid_date ? format(new Date(p.paid_date), 'dd MMM yyyy') : '-'}</td>
                      <td className="py-4 px-6 capitalize">{p.payment_method?.replace('_', ' ') || '-'}</td>
                      <td className="py-4 px-6 text-orange-600">{p.late_fee_amount > 0 ? `$${p.late_fee_amount}` : '-'}</td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          p.status === 'paid' ? 'bg-green-100 text-green-800' : 
                          p.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" className="py-10 text-center text-subdued">No payment history found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-surface rounded-xl p-6 border border-subdued/20">
            <h2 className="text-lg font-bold text-text mb-4">Internal Notes</h2>
            <div className="bg-subdued/5 rounded-lg p-6 min-h-[150px]">
              <p className="whitespace-pre-wrap text-text">
                {flat.metadata || "No additional notes or metadata available for this flat."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <FlatForm 
        open={openEdit} 
        onClose={() => { setOpenEdit(false); refetchDetails(); }} 
        houseId={flat.house_id} 
        flat={flat} 
      />

      <RecordPaymentModal 
        open={openPayment} 
        onClose={() => { setOpenPayment(false); refetchDetails(); }} 
        flat={flat} 
        renter={renter} 
      />

      {/* Reminder Confirmation Dialog */}
      {openReminder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Send Reminder</h3>
              <button onClick={() => setOpenReminder(false)}><X size={20}/></button>
            </div>
            <p className="text-subdued mb-6">
              This will send a rent payment notification to <strong>{renter.name}</strong> via their registered contact methods.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setOpenReminder(false)} className="px-4 py-2 text-subdued">Cancel</button>
              <button 
                onClick={handleSendReminder} 
                disabled={isSendingReminder}
                className="px-6 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
              >
                {isSendingReminder ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlatDetails;