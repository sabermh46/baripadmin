// components/flats/FlatDetails.jsx
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit, DollarSign, Calendar, User, Phone, Mail,
  Clock, AlertCircle, FileText, CreditCard, History,
  MessageSquare, Send, X, PlusCircle, TrendingUp, TrendingDown,
  Shield, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useGetFlatDetailsQuery,
  useSendRentReminderMutation,
  useGetFlatAdvancePaymentsQuery,
  useGetFlatFinancialSummaryQuery
} from '../../store/api/flatApi';
import FlatForm from './FlatForm';
import RecordPaymentModal from './RecordPaymentModal';
import ApplyAdvancePaymentModal from './ApplyAdvancePaymentModal'; // New component
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import AssignRenterModal from './AssignRenterModal';
import { useGetHouseDetailsQuery } from '../../store/api/houseApi';
import TkSymbol from '../common/TkSymbol';

const FlatDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {t} = useTranslation();
  // State Management
  const [activeTab, setActiveTab] = useState('overview');
  const [openEdit, setOpenEdit] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [openReminder, setOpenReminder] = useState(false);
  const [openApplyAdvance, setOpenApplyAdvance] = useState(false); // New state
  const [selectedAdvancePayment, setSelectedAdvancePayment] = useState(null);
  const [openAssignModal, setOpenAssignModal] = useState(false);

  // Queries
  const { data: flatData, isLoading, refetch: refetchDetails } = useGetFlatDetailsQuery(id);
  // const { data: financialSummaryData, refetch: refetchFinancialSummary } = useGetFlatFinancialSummaryQuery({ flatId: id }, { skip: !id });
  const {data: houseData, isLoading: isHouseLoading, error } = useGetHouseDetailsQuery(flatData?.data?.flat?.house_id, { skip: !flatData?.data?.flat?.house_id });
  
  console.log(flatData);
  
  // New query for advance payments
  const { data: advancePaymentsData, refetch: refetchAdvancePayments } = useGetFlatAdvancePaymentsQuery(
    { flatId: id },
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
  const renter = {
    name: flat.renterName,
    phone: flat.renterPhone,
    email: flat.renterEmail,
    id: flat.renterId,
  };
  const house = flatData?.data?.house || {};
  const payments = flatData?.data?.payments || [];
  const stats = flatData?.data?.stats || {};
  const advancePayments = advancePaymentsData?.data || [];
  
  // Parse metadata to get advance payment summary
  let flatMetadata = {};
  try {
    flatMetadata = flat.metadata && typeof flat.metadata === 'string'
      ? JSON.parse(flat.metadata)
      : flat.metadata || {};
  } catch (e) {
    console.error("Error parsing flat metadata:", e);
  }

  // Calculate available advance amount
  const availableAdvance = advancePayments.reduce((sum, payment) => 
    sum + (parseFloat(payment.remaining_amount) || 0), 0
  );

  // Calculate next due date - use custom next_payment_date if available
  const calculateNextDueDate = () => {
    // First check if custom next payment date is set
    if (flat.rent_due_date) {
      return new Date(flat.rent_due_date);
    }
    
    // Fall back to calculation based on rent day
    if (!flat.should_pay_rent_day) return null;
    const today = new Date();
    let dueDate = new Date(today.getFullYear(), today.getMonth(), flat.should_pay_rent_day);
    if (today.getDate() > flat.should_pay_rent_day) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    return dueDate;
  };

  const nextDueDate = calculateNextDueDate();

  // Calculate pending payments that can be paid with advance
  const pendingPayments = payments.filter(p => 
    ['pending', 'overdue'].includes(p.status) && 
    parseFloat(p.amount) > (parseFloat(p.paid_amount) || 0)
  );

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
    { id: 'overview', label: t('overview'), icon: FileText },
    { id: 'payments', label: t('payment_history'), icon: History },
    { id: 'advance', label: t('advance_payments'), icon: Shield }, // New tab
  ];

  

  return (
    <div className="">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between mb-6">
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
            <>
              {availableAdvance > 0 && pendingPayments.length > 0 && (
                <button
                  onClick={() => setOpenApplyAdvance(true)}
                  className="flex items-center whitespace-nowrap gap-2 px-2 py-1 flex-1 md:px-4 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Shield size={18} />
                  {t('apply_advance')}
                </button>
              )}
              <button
                onClick={() => setOpenReminder(true)}
                className="flex items-center whitespace-nowrap gap-2 px-2 py-1 flex-1 md:px-4 md:py-2 border border-subdued/30 rounded-lg bg-white hover:bg-subdued/10 transition-colors"
              >
                <Send size={18} />
                {t('send_reminder')}
              </button>
            </>
          )}
          <button
            onClick={() => setOpenEdit(true)}
            className="flex items-center whitespace-nowrap gap-2 px-2 py-1 flex-1 md:px-4 md:py-2 bg-surface border border-subdued/30 text-text rounded-lg hover:bg-subdued/10 transition-colors"
          >
            <Edit size={18} />
            {t('edit_flat')}
          </button>
          <button
            onClick={() => setOpenPayment(true)}
            disabled={!flat.renter_id}
            className="flex items-center whitespace-nowrap gap-2 px-2 py-1 flex-1 md:px-4 md:py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <PlusCircle size={18} />
            {t('record_payment')}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="pt-4 border-t-2 border-subdued/20 mb-2">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 hover:bg-secondary/40 px-2 py-2 rounded-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-secondary/80 text-white'
                    : 'text-subdued bg-secondary/30 hover:text-text'
                } ${index === 0 ? 'rounded-tl-2xl' : ''} ${index === tabs.length - 1 ? 'rounded-tr-2xl' : ''}`}
              >
                <Icon size={18} />
                {tab.label}
                {tab.id === 'advance' && availableAdvance > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                    <TkSymbol /> {availableAdvance.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Summary Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface rounded-lg p-4 border border-subdued/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg"><DollarSign className="text-blue-600" size={24} /></div>
                  <div>
                    <p className="text-sm text-subdued">{t('monthly_rent')}</p>
                    <p className="text-xl font-bold"><TkSymbol /> {flat.rent_amount?.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-surface rounded-lg p-4 border border-subdued/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg"><Calendar className="text-green-600" size={24} /></div>
                  <div>
                    <p className="text-sm text-subdued">{t('due_day')}</p>
                    <p className="text-xl font-bold">Day {flat.should_pay_rent_day}</p>
                  </div>
                </div>
                {nextDueDate && (
                  <p className="text-xs text-subdued mt-2">
                    Next: {format(nextDueDate, 'dd MMM yyyy')}
                  </p>
                )}
              </div>
              <div className="bg-surface rounded-lg p-4 border border-subdued/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg"><AlertCircle className="text-orange-600" size={24} /></div>
                  <div>
                    <p className="text-sm text-subdued">{t('late_fee')}</p>
                    <p className="text-xl font-bold">{flat.late_fee_percentage ?? 5}%</p>
                  </div>
                </div>
              </div>
              <div className="bg-surface rounded-lg p-4 border border-subdued/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg"><Clock className="text-purple-600" size={24} /></div>
                  <div>
                    <p className="text-sm text-subdued">{t('status')}</p>
                    <p className={`text-xl font-bold ${flat.renter_id ? 'text-green-600' : 'text-yellow-600'}`}>
                      {flat.renter_id ? 'Occupied' : 'Vacant'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Advance Payments Summary */}
            {availableAdvance > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                    <Shield size={20} /> {t('advance_payments_available')}
                  </h3>
                  <span className="text-2xl font-bold text-green-700">
                    <TkSymbol /> {availableAdvance.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-green-700">{t('total_advance')}</p>
                    <p className="text-xl font-bold">
                      <TkSymbol /> {advancePayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-green-700">{t('remaining')}</p>
                    <p className="text-xl font-bold"><TkSymbol /> {availableAdvance.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-green-700">{t('covers_months')}</p>
                    <p className="text-xl font-bold">
                      {flat.rent_amount > 0 ? (availableAdvance / flat.rent_amount).toFixed(1) : '0'} {t('months')}
                    </p>
                  </div>
                </div>
                {pendingPayments.length > 0 && (
                  <div className="mt-4 p-3 bg-white border border-green-300 rounded-lg">
                    <p className="text-sm text-green-800">
                      <span className="font-bold">{pendingPayments.length} pending payment(s)</span> can be paid using advance.
                      <button
                        onClick={() => setOpenApplyAdvance(true)}
                        className="ml-2 text-green-700 hover:text-green-900 underline"
                      >
                        Apply now →
                      </button>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Renter Details Card */}
              <div className="bg-surface rounded-lg p-4 border border-subdued/20">
                <h2 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                  <User size={20} /> {t('renter_details')}
                </h2>
                {flat.renter_id ? (
                  <Link to={`/renters?view=${flat.renter_id}`} className="space-y-4">
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
                    
                    {/* Advance payment summary from metadata */}
                    {flatMetadata.advance_payments_summary && (
                      <div className="mt-4 pt-4 border-t border-subdued/20">
                        <p className="text-sm font-medium text-text mb-2">{t('advance_payment_summary')}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-subdued">{t('total_advance_paid')}:</span>
                            <span className="font-bold text-green-600">
                              <TkSymbol /> {flatMetadata.advance_payments_summary.total_advance?.toLocaleString() || '0'}
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
                    <button onClick={() => setOpenAssignModal(true)} className="text-primary font-medium hover:underline">
                      + {t('assign_a_renter')}
                    </button>
                  </div>
                )}
              </div>

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
                      <TkSymbol /> {Number(stats.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    {availableAdvance > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        +<TkSymbol /> {availableAdvance.toLocaleString()} advance available
                      </p>
                    )}
                  </div>
                  
                  {/* Total Due/Pending */}
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-red-700 uppercase tracking-wider">{t('total_due')}</p>
                      <AlertCircle className="text-red-600" size={16} />
                    </div>
                    <p className="text-xl font-bold text-red-700 mt-1">
                      <TkSymbol /> {Number(stats.totalDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            {t('pay_now')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-4">
            {/* Advance Payment Notice */}
            {availableAdvance > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="text-green-600" size={20} />
                    <div>
                      <p className="font-medium text-green-800">{t('advance_payment_available')}</p>
                      <p className="text-sm text-green-700">
                        <TkSymbol /> {availableAdvance.toLocaleString()} {t('can_be_applied_to_pending_payments')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpenApplyAdvance(true)}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                  >
                    {t('apply_advance')}
                  </button>
                </div>
              </div>
            )}
            
            <div className="bg-surface rounded-lg border border-subdued/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-subdued/5 border-b border-subdued/20">
                    <tr>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">{t('due_date')}</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">{t('amount')}</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">{t('paid_date')}</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">{t('method')}</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">{t('late_fee')}</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">{t('advance_used')}</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subdued/10">
                    {payments.length > 0 ? payments.map((p) => {
                      // Parse metadata to check for advance payment usage
                      let advanceUsed = null;
                      try {
                        const meta = p.metadata ? JSON.parse(p.metadata) : {};
                        if (meta.advance_payment_used) {
                          advanceUsed = meta.advance_payment_used;
                        }
                      } catch (e) {}
                      
                      return (
                        <tr key={p.id} className="hover:bg-subdued/5 transition-colors">
                          <td className="py-4 px-6">{p.due_date ? format(new Date(p.due_date), 'dd MMM yyyy') : '-'}</td>
                          <td className="py-4 px-6">
                            <div className="font-bold"><TkSymbol />{p.amount?.toLocaleString()}</div>
                            {p.base_amount && p.amenities_charge && (
                              <div className="text-xs text-subdued">
                                Base: <TkSymbol />{p.base_amount} + Amenities: <TkSymbol />{p.amenities_charge}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6">{p.paid_date ? format(new Date(p.paid_date), 'dd MMM yyyy') : '-'}</td>
                          <td className="py-4 px-6 capitalize">{p.payment_method?.replace('_', ' ') || '-'}</td>
                          <td className="py-4 px-6 text-orange-600">{p.late_fee_amount > 0 ? <><TkSymbol />{p.late_fee_amount}</> : '-'}</td>
                          <td className="py-4 px-6">
                            {advanceUsed ? (
                              <div className="text-xs text-green-700">
                                <div className="font-medium"><TkSymbol />{advanceUsed.amount}</div>
                                <div className="text-green-600">{t('advance_applied')}</div>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              p.status === 'paid' ? 'bg-green-100 text-green-800' : 
                              p.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan="7" className="py-10 text-center text-subdued">No payment history found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'advance' && (
          <div className="space-y-4">
            {/* Advance Payments Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface rounded-lg p-4 border border-subdued/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-subdued">{t('total_advance')}</p>
                    <p className="text-xl font-bold">
                      <TkSymbol />{advancePayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-surface rounded-lg p-4 border border-subdued/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ArrowDownRight className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-subdued">{t('remaining_available')}</p>
                    <p className="text-xl font-bold text-green-600">
                      <TkSymbol />{availableAdvance.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-surface rounded-lg p-4 border border-subdued/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="text-orange-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-subdued">{t('months_covered')}</p>
                    <p className="text-xl font-bold">
                      {flat.rent_amount > 0 ? (availableAdvance / flat.rent_amount).toFixed(1) : '0'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Advance Payments List */}
            <div className="bg-surface rounded-lg border border-subdued/20 overflow-hidden">
              <div className="p-4 border-b border-subdued/20">
                <h3 className="text-lg font-bold text-text">{t('advance_payment_history')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-subdued/5 border-b border-subdued/20">
                    <tr>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">{t('date')}</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">{t('amount')}</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">{t('paid_amount')}</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">{t('remaining')}</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">{t('method')}</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">{t('status')}</th>
                      <th className="text-left py-4 px-6 text-sm font-medium text-subdued">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subdued/10">
                    {advancePayments.length > 0 ? advancePayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-subdued/5 transition-colors">
                        <td className="py-4 px-6">{format(new Date(payment.payment_date), 'dd MMM yyyy')}</td>
                        <td className="py-4 px-6 font-bold"><TkSymbol />{payment.amount?.toLocaleString()}</td>
                        <td className="py-4 px-6 text-green-600"><TkSymbol />{payment.paid_amount?.toLocaleString()}</td>
                        <td className="py-4 px-6">
                          <span className={`font-bold ${
                            payment.remaining_amount > 0 ? 'text-green-600' : 'text-subdued'
                          }`}>
                            <TkSymbol />{payment.remaining_amount?.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 px-6 capitalize">{payment.payment_method?.replace('_', ' ') || '-'}</td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                            payment.status === 'partially_used' ? 'bg-yellow-100 text-yellow-800' :
                            payment.status === 'fully_used' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {parseFloat(payment.remaining_amount) > 0 && (
                            <button
                              onClick={() => {
                                setSelectedAdvancePayment(payment);
                                setOpenApplyAdvance(true);
                              }}
                              className="px-3 py-1 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded"
                            >
                              Apply
                            </button>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="7" className="py-10 text-center text-subdued">
                          <Shield className="mx-auto mb-3 text-subdued/50" size={32} />
                          <p>{t('no_advance_payments_recorded')}</p>
                          <p className="text-sm mt-1">{t('advance_payments_added_when_assigning_renter')}</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
        onClose={() => { 
          setOpenPayment(false); 
          refetchDetails();
          refetchAdvancePayments();
        }} 
        flat={flat} 
        renter={renter} 
        advancePayments={advancePayments}
      />

      <ApplyAdvancePaymentModal 
        open={openApplyAdvance} 
        onClose={() => { 
          setOpenApplyAdvance(false); 
          setSelectedAdvancePayment(null);
          refetchDetails();
          refetchAdvancePayments();
        }} 
        flat={flat} 
        renter={renter}
        pendingPayments={pendingPayments}
        advancePayments={advancePayments}
        selectedAdvancePayment={selectedAdvancePayment}
      />

      {/* Reminder Confirmation Dialog */}
      {openReminder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg p-4 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{t('send_reminder')}</h3>
              <button onClick={() => setOpenReminder(false)}><X size={20}/></button>
            </div>
            <p className="text-subdued mb-6">
              {t('send_reminder_message', { name: renter.name })}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setOpenReminder(false)} className="px-4 py-2 text-subdued">{t('cancel')}</button>
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

      <AssignRenterModal
              open={openAssignModal}
              onClose={() => {
                setOpenAssignModal(false);
              }}
              flat={flatData?.data?.flat || null}
              houseinfo={houseData?.data || null}
            />
    </div>
  );
};

export default FlatDetails;