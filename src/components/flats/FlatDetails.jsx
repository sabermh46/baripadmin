// components/flats/FlatDetails.jsx
import React, { useState, useMemo } from 'react';
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
  useGetFlatAdvancePaymentsQuery
} from '../../store/api/flatApi';
import { useGetAvailableRentersQuery } from '../../store/api/renterApi';
import FlatForm from './FlatForm';
import RecordPaymentModal from './RecordPaymentModal';
import ApplyAdvancePaymentModal from './ApplyAdvancePaymentModal'; // New component
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import AssignRenterModal from './AssignRenterModal';
import { useGetHouseDetailsQuery } from '../../store/api/houseApi';
import TkSymbol from '../common/TkSymbol';
import Table from '../common/Table';

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
  const [reminderResult, setReminderResult] = useState(null);
  const [selectedPaymentRenterId, setSelectedPaymentRenterId] = useState(null);
  const [selectedAdvanceRenterId, setSelectedAdvanceRenterId] = useState(null);

  // Queries
  const { data: flatData, isLoading, refetch: refetchDetails } = useGetFlatDetailsQuery(id);
  // const { data: financialSummaryData, refetch: refetchFinancialSummary } = useGetFlatFinancialSummaryQuery({ flatId: id }, { skip: !id });
  const { data: houseData } = useGetHouseDetailsQuery(flatData?.data?.flat?.house_id, { skip: !flatData?.data?.flat?.house_id });
  
  // New query for advance payments
  const { data: advancePaymentsData, refetch: refetchAdvancePayments } = useGetFlatAdvancePaymentsQuery(
    { flatId: id },
    { skip: !id }
  );

  const { data: rentersResponse } = useGetAvailableRentersQuery(
    { houseId: flatData?.data?.flat?.house_id, search: '' },
    { skip: !flatData?.data?.flat?.house_id || !id, refetchOnMountOrArgChange: true }
  );

  const [sendReminder, { isLoading: isSendingReminder }] = useSendRentReminderMutation();

  // Derived data (with fallbacks for loading state - hooks must run before early return)
  const flat = flatData?.data?.flat || {};
  const house = flatData?.data?.house || {};
  const payments = useMemo(() => flatData?.data?.payments || [], [flatData?.data?.payments]);
  const stats = flatData?.data?.stats || {};
  const advancePayments = useMemo(() => advancePaymentsData?.data || [], [advancePaymentsData?.data]);
  const availableRenters = useMemo(() => rentersResponse?.data || rentersResponse || [], [rentersResponse]);

  const renter = {
    name: flat.renterName,
    phone: flat.renterPhone,
    email: flat.renterEmail,
    id: flat.renterId,
  };

  // Unique renter IDs from payments (for payment history tab)
  const paymentRenterIds = useMemo(() => {
    return [...new Set(payments.map(p => p.renter_id).filter(Boolean))];
  }, [payments]);

  // Unique renter IDs from advance payments (for advance tab)
  const advanceRenterIds = useMemo(() => {
    const ids = [...new Set(advancePayments.map(p => p.renter_id).filter(Boolean))];
    return ids.length > 0 ? ids : (flat.renter_id ? [flat.renter_id] : []);
  }, [advancePayments, flat.renter_id]);

  // Renter options for payment history (include current renter + any from payments)
  const paymentRenterOptions = useMemo(() => {
    const idsSet = new Set(paymentRenterIds);
    if (flat.renter_id) idsSet.add(flat.renter_id);
    const ids = Array.from(idsSet);
    return ids.map(rid => {
      if (rid === flat.renter_id) {
        return { value: rid, label: flat.renterName || `Renter #${rid}` };
      }
      const r = availableRenters.find(x => x.id === rid || x.id === parseInt(rid, 10));
      return { value: rid, label: r ? r.name : `Renter #${rid}` };
    });
  }, [paymentRenterIds, flat.renter_id, flat.renterName, availableRenters]);

  const advanceRenterOptions = useMemo(() => {
    const idsSet = new Set(advanceRenterIds);
    if (flat.renter_id) idsSet.add(flat.renter_id);
    const ids = Array.from(idsSet);
    return ids.map(rid => {
      if (rid === flat.renter_id) {
        return { value: rid, label: flat.renterName || `Renter #${rid}` };
      }
      const r = availableRenters.find(x => x.id === rid || x.id === parseInt(rid, 10));
      return { value: rid, label: r ? r.name : `Renter #${rid}` };
    });
  }, [advanceRenterIds, flat.renter_id, flat.renterName, availableRenters]);

  // Default to current renter when null (derived, no effect needed)
  const effectivePaymentRenterId = selectedPaymentRenterId ?? flat.renter_id;
  const effectiveAdvanceRenterId = selectedAdvanceRenterId ?? flat.renter_id;

  const filteredPayments = useMemo(() => {
    if (!effectivePaymentRenterId) return payments;
    return payments.filter(p => p.renter_id === effectivePaymentRenterId || p.renter_id === parseInt(effectivePaymentRenterId, 10));
  }, [payments, effectivePaymentRenterId]);

  const filteredAdvancePayments = useMemo(() => {
    if (!effectiveAdvanceRenterId) return advancePayments;
    return advancePayments.filter(p => !p.renter_id || p.renter_id === effectiveAdvanceRenterId || p.renter_id === parseInt(effectiveAdvanceRenterId, 10));
  }, [advancePayments, effectiveAdvanceRenterId]);

  const selectedPaymentRenterInfo = useMemo(() => {
    if (effectivePaymentRenterId === flat.renter_id) {
      return { name: flat.renterName, phone: flat.renterPhone, email: flat.renterEmail };
    }
    const r = availableRenters.find(x => x.id === effectivePaymentRenterId || x.id === parseInt(effectivePaymentRenterId, 10));
    return r ? { name: r.name, phone: r.phone, email: r.email } : null;
  }, [effectivePaymentRenterId, flat.renter_id, flat.renterName, flat.renterPhone, flat.renterEmail, availableRenters]);

  const selectedAdvanceRenterInfo = useMemo(() => {
    if (effectiveAdvanceRenterId === flat.renter_id) {
      return { name: flat.renterName, phone: flat.renterPhone, email: flat.renterEmail };
    }
    const r = availableRenters.find(x => x.id === effectiveAdvanceRenterId || x.id === parseInt(effectiveAdvanceRenterId, 10));
    return r ? { name: r.name, phone: r.phone, email: r.email } : null;
  }, [effectiveAdvanceRenterId, flat.renter_id, flat.renterName, flat.renterPhone, flat.renterEmail, availableRenters]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Parse metadata to get advance payment summary
  let flatMetadata = {};
  try {
    flatMetadata = flat.metadata && typeof flat.metadata === 'string'
      ? JSON.parse(flat.metadata)
      : flat.metadata || {};
  } catch (err) {
    console.error("Error parsing flat metadata:", err);
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
      const response = await sendReminder({ flat_id: id, houseId: flat.house_id }).unwrap();
      const result = response?.data ?? response;
      setReminderResult(result || { remindersSent: 1, results: [] });
    } catch (error) {
      toast.error('Failed to send reminder');
      console.error('Failed to send reminder:', error);
    }
  };

  const handleCloseReminderModal = () => {
    setOpenReminder(false);
    setReminderResult(null);
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
                  
                  {/* Total Due/Pending - only shows due for this month (totalDue - totalPaid) */}
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-red-700 uppercase tracking-wider">{t('total_due')}</p>
                      <AlertCircle className="text-red-600" size={16} />
                    </div>
                    <p className="text-xl font-bold text-red-700 mt-1">
                      <TkSymbol /> {Math.max(0, Number(stats.totalDue || 0) - Number(stats.totalPaid || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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

            {/* Renter selector */}
            <div className="bg-surface rounded-lg p-4 border border-subdued/20">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-subdued mb-2">{t('select_renter')}</label>
                  <select
                    value={effectivePaymentRenterId ?? ''}
                    onChange={(e) => setSelectedPaymentRenterId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="w-full sm:max-w-xs px-3 py-2 border border-subdued/30 rounded-lg bg-white text-text focus:ring-2 focus:ring-primary/30"
                  >
                    {paymentRenterOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                        <p className="text-sm text-subdued flex items-center gap-1"><Phone size={14}/> {selectedPaymentRenterInfo.phone}</p>
                      )}
                      {selectedPaymentRenterInfo.email && (
                        <p className="text-sm text-subdued flex items-center gap-1"><Mail size={14}/> {selectedPaymentRenterInfo.email}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <Table
              columns={[
                { key: 'due_date', title: t('due_date'), dataIndex: 'due_date', render: (row) => row.due_date ? format(new Date(row.due_date), 'dd MMM yyyy') : '-' },
                { key: 'amount', title: t('amount'), render: (row) => (
                  <div>
                    <div className="font-bold"><TkSymbol />{row.amount?.toLocaleString()}</div>
                    {row.base_amount && row.amenities_charge && (
                      <div className="text-xs text-subdued">
                        Base: <TkSymbol />{row.base_amount} + Amenities: <TkSymbol />{row.amenities_charge}
                      </div>
                    )}
                  </div>
                )},
                { key: 'paid_date', title: t('paid_date'), render: (row) => row.paid_date ? format(new Date(row.paid_date), 'dd MMM yyyy') : '-' },
                { key: 'method', title: t('method'), render: (row) => (row.payment_method?.replace('_', ' ') || '-') },
                { key: 'late_fee', title: t('late_fee'), render: (row) => (
                  <span className="text-orange-600">{row.late_fee_amount > 0 ? <><TkSymbol />{row.late_fee_amount}</> : '-'}</span>
                )},
                { key: 'advance_used', title: t('advance_used'), render: (row) => {
                  let advanceUsed = null;
                  try {
                    const meta = row.metadata ? JSON.parse(row.metadata) : {};
                    if (meta.advance_payment_used) advanceUsed = meta.advance_payment_used;
                  } catch { /* ignore parse errors */ }
                  return advanceUsed ? (
                    <div className="text-xs text-green-700">
                      <div className="font-medium"><TkSymbol />{advanceUsed.amount}</div>
                      <div className="text-green-600">{t('advance_applied')}</div>
                    </div>
                  ) : '-';
                }},
                { key: 'status', title: t('status'), render: (row) => (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    row.status === 'paid' ? 'bg-green-100 text-green-800' : 
                    row.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {row.status}
                  </span>
                )},
              ]}
              data={filteredPayments}
              rowKey="id"
              emptyMessage={t('no_payment_history') || 'No payment history found.'}
            />
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
                      <TkSymbol />{filteredAdvancePayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toLocaleString()}
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
                      <TkSymbol />{filteredAdvancePayments.reduce((sum, p) => sum + (parseFloat(p.remaining_amount) || 0), 0).toLocaleString()}
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
                      {flat.rent_amount > 0 ? (filteredAdvancePayments.reduce((sum, p) => sum + (parseFloat(p.remaining_amount) || 0), 0) / flat.rent_amount).toFixed(1) : '0'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Renter selector */}
            <div className="bg-surface rounded-lg p-4 border border-subdued/20">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-subdued mb-2">{t('select_renter')}</label>
                  <select
                    value={effectiveAdvanceRenterId ?? ''}
                    onChange={(e) => setSelectedAdvanceRenterId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="w-full sm:max-w-xs px-3 py-2 border border-subdued/30 rounded-lg bg-white text-text focus:ring-2 focus:ring-primary/30"
                  >
                    {advanceRenterOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                        <p className="text-sm text-subdued flex items-center gap-1"><Phone size={14}/> {selectedAdvanceRenterInfo.phone}</p>
                      )}
                      {selectedAdvanceRenterInfo.email && (
                        <p className="text-sm text-subdued flex items-center gap-1"><Mail size={14}/> {selectedAdvanceRenterInfo.email}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Advance Payments List */}
            <div className="bg-surface rounded-lg border border-subdued/20 overflow-hidden">
              <div className="p-4 border-b border-subdued/20">
                <h3 className="text-lg font-bold text-text">{t('advance_payment_history')}</h3>
              </div>
              <Table
                columns={[
                  { key: 'date', title: t('date'), render: (row) => format(new Date(row.payment_date), 'dd MMM yyyy') },
                  { key: 'amount', title: t('amount'), render: (row) => <span className="font-bold"><TkSymbol />{row.amount?.toLocaleString()}</span> },
                  { key: 'paid_amount', title: t('paid_amount'), render: (row) => <span className="text-green-600"><TkSymbol />{row.paid_amount?.toLocaleString()}</span> },
                  { key: 'remaining', title: t('remaining'), render: (row) => (
                    <span className={`font-bold ${parseFloat(row.remaining_amount) > 0 ? 'text-green-600' : 'text-subdued'}`}>
                      <TkSymbol />{row.remaining_amount?.toLocaleString()}
                    </span>
                  )},
                  { key: 'method', title: t('method'), render: (row) => (row.payment_method?.replace('_', ' ') || '-') },
                  { key: 'status', title: t('status'), render: (row) => (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      row.status === 'paid' ? 'bg-green-100 text-green-800' :
                      row.status === 'partially_used' ? 'bg-yellow-100 text-yellow-800' :
                      row.status === 'fully_used' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {row.status}
                    </span>
                  )},
                  { key: 'actions', title: t('actions'), render: (row) => (
                    parseFloat(row.remaining_amount) > 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAdvancePayment(row);
                          setOpenApplyAdvance(true);
                        }}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded"
                      >
                        Apply
                      </button>
                    ) : '-'
                  )},
                ]}
                data={filteredAdvancePayments}
                rowKey="id"
                emptyMessage={t('no_advance_payments_recorded') || 'No advance payments recorded'}
              />
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

      {/* Reminder Confirmation / Result Dialog */}
      {openReminder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg p-4 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                {reminderResult ? (t('reminder_result') || 'Reminder Result') : t('send_reminder')}
              </h3>
              <button onClick={handleCloseReminderModal} className="p-1 hover:bg-subdued/10 rounded"><X size={20}/></button>
            </div>

            {reminderResult ? (
              <>
                <p className="text-green-600 font-medium mb-3">
                  {t('reminder_sent_success') || 'Rent reminder sent successfully'}
                </p>
                <p className="text-subdued text-sm mb-4">
                  {reminderResult.remindersSent} {t('reminder_sent_count') || 'reminder(s) sent'}
                </p>
                {reminderResult.results?.length > 0 && (
                  <ul className="space-y-2 mb-4">
                    {reminderResult.results.map((r, i) => (
                      <li key={r.paymentId ?? i} className="p-3 bg-subdued/5 rounded-lg text-sm">
                        <span className="font-medium">{r.renterName}</span>
                        <span className="text-subdued mx-2">•</span>
                        {r.sent ? (
                          <span className="text-green-600">{t('sent_to') || 'Sent to'}: {r.sentTo || 'email, sms'}</span>
                        ) : (
                          <span className="text-orange-600">{t('not_sent') || 'Not sent'}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex justify-end">
                  <button onClick={handleCloseReminderModal} className="px-6 py-2 bg-primary text-white rounded-lg">
                    {t('close') || 'Close'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-subdued mb-6">
                  {t('send_reminder_message', { name: renter.name })}
                </p>
                <div className="flex justify-end gap-3">
                  <button onClick={handleCloseReminderModal} className="px-4 py-2 text-subdued">{t('cancel')}</button>
                  <button 
                    onClick={handleSendReminder} 
                    disabled={isSendingReminder}
                    className="px-6 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
                  >
                    {isSendingReminder ? (t('sending') || 'Sending...') : (t('confirm_send') || 'Confirm & Send')}
                  </button>
                </div>
              </>
            )}
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