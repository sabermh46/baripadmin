// components/flats/FlatDetails.jsx
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit, FileText, History,
  Send, PlusCircle, Shield,
  ScrollText, UserMinus, MoreVertical,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { apiErrorMessage } from '../../utils/apiError';
import {
  useGetFlatOverviewQuery,
  useSendRentReminderMutation,
  useResendPaymentReceiptMutation,
  useRemoveRenterMutation,
  useSendPaymentReceiptPdfMutation,
  useUpdateRentPaymentMutation,
  useDeleteRentPaymentMutation,
} from '../../store/api/flatApi';
import FlatForm from './FlatForm';
import RecordPaymentModal from './RecordPaymentModal';
import AdvancePaymentFormModal from './AdvancePaymentFormModal';
import AssignRenterModal from './AssignRenterModal';
import InvoicePreviewModal from '../common/InvoicePreviewModal';
import { generateRentReceiptPdf } from '../../utils/invoiceGenerator';

import OverviewTab from './FlatDetails/OverviewTab';
import PaymentsTab from './FlatDetails/PaymentsTab';
import AdvanceTab from './FlatDetails/AdvanceTab';
import ReminderModal from './FlatDetails/ReminderModal';
import ReminderLogModal from './FlatDetails/ReminderLogModal';
import PaymentEmailLogModal from './FlatDetails/PaymentEmailLogModal';
import RemoveRenterModal from './FlatDetails/RemoveRenterModal';
import EditPaymentModal from './FlatDetails/EditPaymentModal';

const FlatDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [openEdit, setOpenEdit] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [openReminder, setOpenReminder] = useState(false);
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [reminderResult, setReminderResult] = useState(null);
  const [selectedPaymentRenterId, setSelectedPaymentRenterId] = useState(null);
  const [selectedAdvanceRenterId, setSelectedAdvanceRenterId] = useState(null);
  const [openReminderLog, setOpenReminderLog] = useState(false);
  const [openPaymentEmailLog, setOpenPaymentEmailLog] = useState(false);
  const [selectedPaymentForEmailLog, setSelectedPaymentForEmailLog] = useState(null);
  const [openAdvancePaymentForm, setOpenAdvancePaymentForm] = useState(false);
  const [selectedAdvancePaymentForForm, setSelectedAdvancePaymentForForm] = useState(null);
  const [advancePaymentFormMode, setAdvancePaymentFormMode] = useState('view');
  const [openRemoveRenterModal, setOpenRemoveRenterModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundError, setRefundError] = useState('');
  const [openActionsMenu, setOpenActionsMenu] = useState(false);
  const [resendPreviewOpen, setResendPreviewOpen] = useState(false);
  const [resendPdfBase64, setResendPdfBase64] = useState(null);
  const [resendInvoiceData, setResendInvoiceData] = useState(null);
  const [resendPaymentId, setResendPaymentId] = useState(null);
  const [openEditPayment, setOpenEditPayment] = useState(false);
  const [selectedPaymentForEdit, setSelectedPaymentForEdit] = useState(null);
  const [openDeletePayment, setOpenDeletePayment] = useState(false);
  const [selectedPaymentForDelete, setSelectedPaymentForDelete] = useState(null);

  // ── Query ─────────────────────────────────────────────────────────────────
  // One request for the whole screen. This was four: the flat, its advance payments, its
  // emailed receipts, and the assignable renters — and the renter list could not even be
  // requested until the flat came back, since it needs the flat's house_id.
  //
  // `refetch` is aliased to the names the handlers below already use, so a single refresh
  // now covers everything the four separate refetches used to cover individually.
  const { data: flatData, isLoading, refetch } = useGetFlatOverviewQuery(id, { skip: !id });
  const refetchDetails = refetch;
  const refetchAdvancePayments = refetch;
  const refetchPaymentReceipts = refetch;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const [sendReminder, { isLoading: isSendingReminder }] = useSendRentReminderMutation();
  const [removeRenter, { isLoading: isRemovingRenter }] = useRemoveRenterMutation();
  const [, ] = useResendPaymentReceiptMutation();
  const [sendPaymentReceiptPdf, { isLoading: isSendingResendReceipt }] =
    useSendPaymentReceiptPdfMutation();
  const [updateRentPayment, { isLoading: isUpdatingPayment }] = useUpdateRentPaymentMutation();
  const [deleteRentPayment, { isLoading: isDeletingPayment }] = useDeleteRentPaymentMutation();

  // ── Derived data ──────────────────────────────────────────────────────────
  const flat = flatData?.data?.flat || {};
  const house = flatData?.data?.house || {};
  const payments = useMemo(() => flatData?.data?.payments || [], [flatData?.data?.payments]);
  const stats = flatData?.data?.stats || {};
  // Derived server-side so the flat page and the house page describe the same flat in the
  // same words: where the rent stands, what it costs in total, and who is living in it.
  const rentState = flatData?.data?.rentState || {};
  const charges = flatData?.data?.charges || {};
  const tenancy = flatData?.data?.tenancy || null;
  // These three used to read `.data` off responses that were bare JSON arrays — the
  // advance-payments and payment-receipts endpoints both return an array at the top level,
  // so `advancePaymentsData?.data` was always undefined and both the Advance tab and the
  // receipts log rendered permanently empty regardless of what the API returned. They are
  // properties of one enveloped response now, so there is no shape to guess at.
  const advancePayments = useMemo(
    () => flatData?.data?.advancePayments || [],
    [flatData?.data?.advancePayments]
  );
  const availableRenters = useMemo(
    () => flatData?.data?.availableRenters || [],
    [flatData?.data?.availableRenters]
  );
  const paymentReceipts = useMemo(
    () => flatData?.data?.receipts || [],
    [flatData?.data?.receipts]
  );
  const totalRemainingAdvance = useMemo(
    () => advancePayments.reduce((sum, p) => sum + (parseFloat(p.remaining_amount) || 0), 0),
    [advancePayments]
  );
  const availableAdvance = useMemo(
    () => advancePayments.reduce((sum, p) => sum + (parseFloat(p.remaining_amount) || 0), 0),
    [advancePayments]
  );

  // Read from flat.renter, which is what the API sends. This used to be assembled from
  // flat.renterName / renterPhone / renterEmail / renterId — four keys the flat endpoint has
  // never returned, so every field was undefined. That is why Record Payment always claimed
  // the renter had no email on file, and why the receipt preview could never open.
  const renter = useMemo(
    () => ({
      id: flat.renter?.id ?? flat.renter_id,
      name: flat.renter?.name,
      phone: flat.renter?.phone,
      email: flat.renter?.email,
      nid: flat.renter?.nid,
    }),
    [flat.renter, flat.renter_id]
  );

  const paymentRenterIds = useMemo(
    () => [...new Set(payments.map(p => p.renter_id).filter(Boolean))],
    [payments]
  );
  const advanceRenterIds = useMemo(() => {
    const ids = [...new Set(advancePayments.map(p => p.renter_id).filter(Boolean))];
    return ids.length > 0 ? ids : (flat.renter_id ? [flat.renter_id] : []);
  }, [advancePayments, flat.renter_id]);

  const paymentRenterOptions = useMemo(() => {
    const idsSet = new Set(paymentRenterIds);
    if (flat.renter_id) idsSet.add(flat.renter_id);
    return Array.from(idsSet).map(rid => {
      if (rid === flat.renter_id) return { value: rid, label: flat.renter?.name || `Renter #${rid}` };
      const r = availableRenters.find(x => x.id === rid || x.id === parseInt(rid, 10));
      return { value: rid, label: r ? r.name : `Renter #${rid}` };
    });
  }, [paymentRenterIds, flat.renter_id, flat.renter?.name, availableRenters]);

  const advanceRenterOptions = useMemo(() => {
    const idsSet = new Set(advanceRenterIds);
    if (flat.renter_id) idsSet.add(flat.renter_id);
    return Array.from(idsSet).map(rid => {
      if (rid === flat.renter_id) return { value: rid, label: flat.renter?.name || `Renter #${rid}` };
      const r = availableRenters.find(x => x.id === rid || x.id === parseInt(rid, 10));
      return { value: rid, label: r ? r.name : `Renter #${rid}` };
    });
  }, [advanceRenterIds, flat.renter_id, flat.renter?.name, availableRenters]);

  const effectivePaymentRenterId = selectedPaymentRenterId ?? flat.renter_id;
  const effectiveAdvanceRenterId = selectedAdvanceRenterId ?? flat.renter_id;

  const filteredPayments = useMemo(() => {
    if (!effectivePaymentRenterId) return payments;
    return payments.filter(
      p => p.renter_id === effectivePaymentRenterId ||
           p.renter_id === parseInt(effectivePaymentRenterId, 10)
    );
  }, [payments, effectivePaymentRenterId]);

  const filteredAdvancePayments = useMemo(() => {
    if (!effectiveAdvanceRenterId) return advancePayments;
    return advancePayments.filter(
      p => !p.renter_id ||
           p.renter_id === effectiveAdvanceRenterId ||
           p.renter_id === parseInt(effectiveAdvanceRenterId, 10)
    );
  }, [advancePayments, effectiveAdvanceRenterId]);

  const selectedPaymentRenterInfo = useMemo(() => {
    if (effectivePaymentRenterId === flat.renter_id)
      return { name: flat.renter?.name, phone: flat.renter?.phone, email: flat.renter?.email };
    const r = availableRenters.find(
      x => x.id === effectivePaymentRenterId || x.id === parseInt(effectivePaymentRenterId, 10)
    );
    return r ? { name: r.name, phone: r.phone, email: r.email } : null;
  }, [effectivePaymentRenterId, flat.renter_id, flat.renter, availableRenters]);

  const selectedAdvanceRenterInfo = useMemo(() => {
    if (effectiveAdvanceRenterId === flat.renter_id)
      return { name: flat.renter?.name, phone: flat.renter?.phone, email: flat.renter?.email };
    const r = availableRenters.find(
      x => x.id === effectiveAdvanceRenterId || x.id === parseInt(effectiveAdvanceRenterId, 10)
    );
    return r ? { name: r.name, phone: r.phone, email: r.email } : null;
  }, [effectiveAdvanceRenterId, flat.renter_id, flat.renter, availableRenters]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // flatMetadata / calculateNextDueDate / pendingPayments used to be derived here and handed
  // to the Overview tab. All three now come from the API (charges, rentState), where the
  // next due date is the flat's actual scheduled date rather than a guess reconstructed from
  // the day-of-month, and "pending" follows the same definition the rest of the app uses.

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSendReminder = async (channels = ['email']) => {
    try {
      const response = await sendReminder({ flat_id: id, houseId: flat.house_id, channels }).unwrap();
      const result = response?.data ?? response;

      // The request succeeds as a whole even when one channel failed — the email may well
      // have gone. Surface the SMS outcome on its own rather than letting a green
      // "reminder sent" imply both worked.
      const sms = response?.channels?.sms;
      if (sms && !sms.ok) {
        toast.warn(sms.message || 'The SMS could not be sent.');
      } else if (sms?.ok) {
        toast.success(`SMS sent (${sms.segments} SMS used).`);
      }

      setReminderResult(result || { remindersSent: 1, results: [] });
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to send reminder'));
    }
  };

  const handleCloseReminderModal = () => {
    setOpenReminder(false);
    setReminderResult(null);
  };

  const handleResendReceiptClick = async (payment) => {
    const renterInfo = selectedPaymentRenterInfo || { name: flat.renter?.name, email: flat.renter?.email };
    // Reissue the receipt that was sent, not a fresh one built from today's data.
    //
    // `snap` is what the payment recorded about itself at the time. Three of these used to
    // be wrong on a resend: `amenities` was hardcoded `[]`, so the itemised Service Charges
    // Detail table vanished from the reissued copy while its total still appeared above;
    // renter and house names came from the flat as it stands now, so a receipt reissued
    // after the tenant changed would name the wrong person; and the headline read `amount`
    // (what was billed) before `paid_amount` (what was collected) under a heading that says
    // TOTAL PAID.
    const snap = payment.receipt || {};
    const invoiceData = {
      renterName: snap.renterName || renterInfo.name || 'N/A',
      houseName: snap.houseName || house.name || 'N/A',
      houseAddress: house.address || null,
      ownerName: house.owner?.name || null,
      ownerEmail: house.owner?.email || null,
      ownerPhone: house.owner?.phone || null,
      flatNumber: snap.flatNumber || flat.number,
      totalAmount: payment.paid_amount || payment.amount || 0,
      paymentDate: payment.paid_date,
      transactionId: payment.transaction_id || null,
      baseRent: payment.base_amount || payment.amount || 0,
      amenitiesTotal: payment.amenities_charge || 0,
      lateFee: payment.late_fee_amount || 0,
      // Falls back to the flat's current amenities only for rows raised before the snapshot
      // existed (an invoice created by assignment carries no metadata of its own).
      amenities: snap.amenities?.length ? snap.amenities : (flat.metadata?.amenities ?? []),
      forMonth: payment.for_month || null,
      paymentMethod: payment.payment_method || null,
      paymentId: payment.id,
    };
    try {
      const pdfBase64 = await generateRentReceiptPdf(invoiceData);
      setResendInvoiceData(invoiceData);
      setResendPdfBase64(pdfBase64);
      setResendPaymentId(payment.id);
      setResendPreviewOpen(true);
    } catch {
      toast.error('Failed to generate PDF preview');
    }
  };

  const handleResendConfirm = async (note) => {
    try {
      let finalBase64 = resendPdfBase64;
      if (note) finalBase64 = await generateRentReceiptPdf({ ...resendInvoiceData, note });
      await sendPaymentReceiptPdf({ paymentId: resendPaymentId, pdfBase64: finalBase64 }).unwrap();
      toast.success(t('receipt_resent') || 'Payment receipt resent successfully');
      refetchPaymentReceipts();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to resend receipt'));
    } finally {
      setResendPreviewOpen(false);
      setResendPdfBase64(null);
      setResendInvoiceData(null);
      setResendPaymentId(null);
    }
  };

  const handleEditPayment = (payment) => {
    setSelectedPaymentForEdit(payment);
    setOpenEditPayment(true);
  };

  const handleEditPaymentSave = async (data) => {
    try {
      await updateRentPayment({ id: selectedPaymentForEdit.id, ...data }).unwrap();
      toast.success(t('payment_updated') || 'Payment updated successfully');
      setOpenEditPayment(false);
      setSelectedPaymentForEdit(null);
      refetchDetails();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to update payment'));
    }
  };

  const handleDeletePayment = (payment) => {
    setSelectedPaymentForDelete(payment);
    setOpenDeletePayment(true);
  };

  const handleDeletePaymentConfirm = async () => {
    try {
      await deleteRentPayment(selectedPaymentForDelete.id).unwrap();
      toast.success(t('payment_deleted') || 'Payment deleted successfully');
      setOpenDeletePayment(false);
      setSelectedPaymentForDelete(null);
      refetchDetails();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to delete payment'));
    }
  };

  const handleRemoveRenterConfirm = async (refund) => {
    try {
      await removeRenter({ flatId: flat.id, refund_amount: refund }).unwrap();
      toast.success(t('renter_removed_successfully') || 'Renter removed successfully');
      setOpenRemoveRenterModal(false);
      refetchDetails();
      refetchAdvancePayments();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to remove renter'));
    }
  };

  // ── Tabs config ───────────────────────────────────────────────────────────
  const tabs = [
    { id: 'overview',  label: t('overview'),         icon: FileText },
    { id: 'payments',  label: t('payment_history'),  icon: History  },
    { id: 'advance',   label: t('advance_payments'), icon: Shield   },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap md:items-center gap-4 justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-subdued/10 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text">
              {flat.number ? `Flat ${flat.number}` : flat.name}
            </h1>
            <p className="text-subdued text-sm md:text-base">
              {house.name || flat.houseName} • {house.address || flat.houseAddress}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* Primary CTA */}
          <button
            onClick={() => setOpenPayment(true)}
            disabled={!flat.renter_id}
            className="flex items-center whitespace-nowrap gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <PlusCircle size={18} />
            {t('record_payment')}
          </button>

          {/* 3-dot actions menu */}
          <div className="relative">
            <button
              onClick={() => setOpenActionsMenu(v => !v)}
              className="flex items-center justify-center w-10 h-10 border border-subdued/30 rounded-lg bg-white hover:bg-subdued/10 transition-colors"
              title="More actions"
            >
              <MoreVertical size={20} />
            </button>
            {openActionsMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenActionsMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-subdued/20 min-w-48 py-1 overflow-hidden">
                  {flat.renter_id && (
                    <>
                      <button
                        onClick={() => { setOpenReminder(true); setOpenActionsMenu(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-text hover:bg-subdued/10 transition-colors"
                      >
                        <Send size={16} className="text-subdued" />
                        {t('send_reminder')}
                      </button>
                      <button
                        onClick={() => {
                          const defaultRefund = totalRemainingAdvance > 0
                            ? totalRemainingAdvance.toFixed(2) : '0';
                          setRefundAmount(defaultRefund);
                          setRefundError('');
                          setOpenRemoveRenterModal(true);
                          setOpenActionsMenu(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <UserMinus size={16} />
                        {t('remove_renter') || 'Remove Renter'}
                      </button>
                      <div className="border-t border-subdued/10 my-1" />
                    </>
                  )}
                  <button
                    onClick={() => { setOpenReminderLog(true); setOpenActionsMenu(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-text hover:bg-subdued/10 transition-colors"
                  >
                    <ScrollText size={16} className="text-subdued" />
                    {t('see_reminder_log') || 'See Reminder Log'}
                  </button>
                  <button
                    onClick={() => { setOpenEdit(true); setOpenActionsMenu(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-text hover:bg-subdued/10 transition-colors"
                  >
                    <Edit size={16} className="text-subdued" />
                    {t('edit_flat')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs nav ─────────────────────────────────────────────────────── */}
      <div className="pt-4 border-t-2 border-subdued/20 mb-2">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center hover:bg-secondary/40 px-2 py-2 rounded-sm font-medium transition-all duration-300 min-w-10 ${
                  active ? 'bg-secondary/80 text-white' : 'text-subdued bg-secondary/30 hover:text-text'
                } ${index === 0 ? 'rounded-tl-2xl' : ''} ${index === tabs.length - 1 ? 'rounded-tr-2xl' : ''}`}
              >
                <Icon size={18} />
                <span
                  className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                    active ? 'max-w-xs opacity-100 pl-2' : 'max-w-0 opacity-0'
                  }`}
                >
                  {tab.label}
                </span>
                {tab.id === 'advance' && availableAdvance > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                    {availableAdvance.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="pt-2">
        {activeTab === 'overview' && (
          <OverviewTab
            flat={flat}
            stats={stats}
            rentState={rentState}
            charges={charges}
            tenancy={tenancy}
            advancePayments={advancePayments}
            availableAdvance={availableAdvance}
            setOpenPayment={setOpenPayment}
            setOpenAssignModal={setOpenAssignModal}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsTab
            filteredPayments={filteredPayments}
            availableAdvance={availableAdvance}
            paymentRenterOptions={paymentRenterOptions}
            effectivePaymentRenterId={effectivePaymentRenterId}
            setSelectedPaymentRenterId={setSelectedPaymentRenterId}
            selectedPaymentRenterInfo={selectedPaymentRenterInfo}
            setSelectedPaymentForEmailLog={setSelectedPaymentForEmailLog}
            setOpenPaymentEmailLog={setOpenPaymentEmailLog}
            onEditPayment={handleEditPayment}
            onDeletePayment={handleDeletePayment}
          />
        )}

        {activeTab === 'advance' && (
          <AdvanceTab
            filteredAdvancePayments={filteredAdvancePayments}
            flat={flat}
            advanceRenterOptions={advanceRenterOptions}
            effectiveAdvanceRenterId={effectiveAdvanceRenterId}
            setSelectedAdvanceRenterId={setSelectedAdvanceRenterId}
            selectedAdvanceRenterInfo={selectedAdvanceRenterInfo}
            setSelectedAdvancePaymentForForm={setSelectedAdvancePaymentForForm}
            setAdvancePaymentFormMode={setAdvancePaymentFormMode}
            setOpenAdvancePaymentForm={setOpenAdvancePaymentForm}
            setOpenPayment={setOpenPayment}
          />
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <FlatForm
        open={openEdit}
        onClose={() => { setOpenEdit(false); refetchDetails(); }}
        houseId={flat.house_id}
        flat={flat}
      />

      <RecordPaymentModal
        rentState={rentState}
        house={house}
        open={openPayment}
        onClose={() => { setOpenPayment(false); refetchDetails(); refetchAdvancePayments(); }}
        flat={flat}
        renter={renter}
        advancePayments={advancePayments}
      />

      <ReminderModal
        open={openReminder}
        reminderResult={reminderResult}
        onClose={handleCloseReminderModal}
        onSend={handleSendReminder}
        isSending={isSendingReminder}
        renterName={renter.name}
        renterPhone={renter.phone}
        houseOwnerId={house?.owner?.id}
      />

      <ReminderLogModal
        open={openReminderLog}
        onClose={() => setOpenReminderLog(false)}
        paymentReceipts={paymentReceipts}
      />

      <PaymentEmailLogModal
        open={openPaymentEmailLog}
        selectedPayment={selectedPaymentForEmailLog}
        paymentReceipts={paymentReceipts}
        onClose={() => { setOpenPaymentEmailLog(false); setSelectedPaymentForEmailLog(null); }}
        onResend={handleResendReceiptClick}
      />

      <AdvancePaymentFormModal
        open={openAdvancePaymentForm}
        onClose={() => { setOpenAdvancePaymentForm(false); setSelectedAdvancePaymentForForm(null); }}
        flatId={id}
        payment={selectedAdvancePaymentForForm}
        mode={advancePaymentFormMode || 'view'}
        onSuccess={() => { refetchDetails(); refetchAdvancePayments(); }}
      />

      <AssignRenterModal
        open={openAssignModal}
        onClose={() => setOpenAssignModal(false)}
        flat={flatData?.data?.flat || null}
        houseinfo={flatData?.data?.house || null}
        onSuccess={() => { refetchDetails(); refetchAdvancePayments(); }}
      />

      <RemoveRenterModal
        open={openRemoveRenterModal}
        onClose={() => setOpenRemoveRenterModal(false)}
        totalRemainingAdvance={totalRemainingAdvance}
        refundAmount={refundAmount}
        setRefundAmount={setRefundAmount}
        refundError={refundError}
        setRefundError={setRefundError}
        onConfirm={handleRemoveRenterConfirm}
        isRemoving={isRemovingRenter}
      />

      <EditPaymentModal
        open={openEditPayment}
        payment={selectedPaymentForEdit}
        onClose={() => { setOpenEditPayment(false); setSelectedPaymentForEdit(null); }}
        onSave={handleEditPaymentSave}
        isSaving={isUpdatingPayment}
      />

      {openDeletePayment && selectedPaymentForDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl max-w-sm w-full shadow-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-text">
              {t('delete_payment') || 'Delete Payment'}
            </h3>
            <p className="text-sm text-subdued">
              {t('delete_payment_confirm') ||
                'Are you sure you want to permanently delete this payment record? This cannot be undone.'}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setOpenDeletePayment(false); setSelectedPaymentForDelete(null); }}
                disabled={isDeletingPayment}
                className="px-4 py-2 text-subdued hover:text-text transition-colors disabled:opacity-50"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleDeletePaymentConfirm}
                disabled={isDeletingPayment}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeletingPayment ? (t('deleting') || 'Deleting…') : (t('delete') || 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      <InvoicePreviewModal
        open={resendPreviewOpen}
        pdfBase64={resendPdfBase64}
        renterName={resendInvoiceData?.renterName}
        onConfirm={handleResendConfirm}
        onSkip={() => {
          setResendPreviewOpen(false);
          setResendPdfBase64(null);
          setResendInvoiceData(null);
          setResendPaymentId(null);
        }}
        isSending={isSendingResendReceipt}
      />
    </div>
  );
};

export default FlatDetails;
