import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle, Coins, Calendar, Plus, Trash2, CreditCard, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useRecordPaymentMutation, useSendPaymentReceiptPdfMutation } from '../../store/api/flatApi';
import { toast } from 'react-toastify';
import { apiErrorMessage } from '../../utils/apiError';
import TkSymbol from '../common/TkSymbol';
import InvoicePreviewModal from '../common/InvoicePreviewModal';
import { generateRentReceiptPdf } from '../../utils/invoiceGenerator';
import { showMessageInLanguage } from '../../utils/showMessageInLanguage';
/** "2026-09" → "September 2026". */
const monthNameOf = (ym) => {
  if (!ym) return null;
  const [y, m] = String(ym).split('-').map(Number);
  if (!y || !m) return ym;
  return format(new Date(y, m - 1, 1), 'MMMM yyyy');
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Payment date as three plain dropdowns instead of one <input type="date">.
 *
 * The native picker asks for 08/22/2026 — a format an older landlord has to decode before
 * they can trust it, and one whose day/month order differs by locale and by browser. A month
 * written out as "August" cannot be misread, and picking from a list beats typing digits into
 * a masked field. The value written back to the form is still yyyy-MM-dd, so nothing
 * downstream changes.
 */
const DateChooser = ({ value, onChange, label, hint, t }) => {
  const parsed = value ? new Date(`${value}T00:00:00`) : new Date();
  const year = parsed.getFullYear();
  const month = parsed.getMonth();
  const day = parsed.getDate();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const years = Array.from({ length: 6 }, (_, i) => year - 3 + i);

  const emit = (y, m, d) => {
    // Clamp the day when a shorter month is chosen, so 31 January → February lands on the
    // 28th rather than silently rolling into March.
    const safeDay = Math.min(d, new Date(y, m + 1, 0).getDate());
    onChange(format(new Date(y, m, safeDay), 'yyyy-MM-dd'));
  };

  const selectClass =
    'w-full px-3 py-3 text-base bg-background border-2 border-subdued/40 rounded-lg ' +
    'focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none';

  return (
    <div>
      <label className="block text-base font-semibold text-text mb-2">{label}</label>
      <div className="grid grid-cols-[1.4fr_0.8fr_1fr] gap-2">
        <select
          aria-label={t("month_label")}
          value={month}
          onChange={(e) => emit(year, Number(e.target.value), day)}
          className={selectClass}
        >
          {MONTHS.map((name, i) => (
            <option key={name} value={i}>{name}</option>
          ))}
        </select>
        <select
          aria-label={t("day_label")}
          value={Math.min(day, daysInMonth)}
          onChange={(e) => emit(year, month, Number(e.target.value))}
          className={selectClass}
        >
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          aria-label={t("year_label")}
          value={year}
          onChange={(e) => emit(Number(e.target.value), month, day)}
          className={selectClass}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <p className="mt-1.5 text-sm text-subdued">
        {hint ?? format(new Date(year, month, Math.min(day, daysInMonth)), 'EEEE, d MMMM yyyy')}
      </p>
    </div>
  );
};

const paymentSchema = z.object({
  paid_amount: z.coerce.number().positive('Amount must be positive'),
  payment_method: z.string().min(1, 'Payment method is required'),
  transaction_id: z.string().optional(),
  notes: z.string().optional(),
  paid_date: z.string().default(() => format(new Date(), 'yyyy-MM-dd')),
  status: z.enum(['pending', 'paid', 'overdue', 'partial', 'cancelled']).default('paid'),
  calculate_next_payment: z.boolean().default(true),
  use_advance_payment: z.boolean().default(false),
  send_pdf_attachment: z.boolean().default(true),
});

const RecordPaymentModal = ({ open, onClose, flat, house = {}, renter, advancePayments = [], rentState = {} }) => {
  const { t } = useTranslation();
  const [lateFee, setLateFee] = useState(0);
  const [amenities, setAmenities] = useState([]);
  const [showAmenitiesEditor, setShowAmenitiesEditor] = useState(false);
  const [useAdvancePayment, setUseAdvancePayment] = useState(false);
  const [availableAdvance, setAvailableAdvance] = useState(0);
  const [renterPaidRemaining, setRenterPaidRemaining] = useState(0);

  // Invoice preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [invoicePdfBase64, setInvoicePdfBase64] = useState(null);
  const [pendingPaymentId, setPendingPaymentId] = useState(null);
  const [pendingReceiptData, setPendingReceiptData] = useState(null);

  // Calculate total available advance payments
  useEffect(() => {
    const total = advancePayments.reduce(
      (sum, payment) => sum + (parseFloat(payment.remaining_amount) || 0),
      0
    );
    setAvailableAdvance(total);
  }, [advancePayments]);

  // Memoize parsedMetadata
  const parsedMetadata = useMemo(() => {
    if (!flat?.metadata) return {};
    if (typeof flat.metadata === 'string') {
      try {
        return JSON.parse(flat.metadata);
      } catch (e) {
        console.error('Failed to parse flat metadata:', e);
        return {};
      }
    }
    return flat.metadata;
  }, [flat?.metadata]);

  // Derive amenitiesTotal
  const amenitiesTotal = useMemo(() => {
    return amenities.reduce(
      (sum, amenity) => sum + (parseFloat(amenity.charge) || 0),
      0
    );
  }, [amenities]);

  // Initialize amenities from flat metadata when modal opens
  useEffect(() => {
    if (open && parsedMetadata.amenities) {
      const flatAmenities = Array.isArray(parsedMetadata.amenities) ? parsedMetadata.amenities : [];
      if (flatAmenities.length > 0) {
        const formattedAmenities = flatAmenities.map(amenity => ({
          name: amenity.name || '',
          charge: parseFloat(amenity.charge) || 0
        }));
        setAmenities(formattedAmenities);
        setShowAmenitiesEditor(true);
      }
    }
  }, [open, parsedMetadata]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paid_amount: parsedMetadata.base_rent || flat?.rent_amount || '',
      payment_method: 'cash',
      transaction_id: '',
      notes: '',
      paid_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'paid',
      calculate_next_payment: true,
      use_advance_payment: false,
      send_pdf_attachment: true,
    }
  });

  const [recordPayment] = useRecordPaymentMutation();
  const [sendPaymentReceiptPdf, { isLoading: isSendingReceipt }] = useSendPaymentReceiptPdfMutation();

  const paidDate = watch('paid_date');
  // Spelled out, because "next month" is only obvious once you have worked out which month
  // this payment lands in.
  /**
   * Which month this payment lands on, and whether a bill for it exists yet.
   *
   * The server settles the oldest unpaid bill first, whatever date is typed in — so a flat
   * owing August takes September's cash against August. And when nothing is owed at all, the
   * bill for the chosen month has to be raised before money can sit on it.
   *
   * Both facts used to be invisible until after the button was pressed, and the second one
   * surfaced as a refusal written in bookkeeping terms. Working it out here means the form
   * can say it in advance, in a sentence, and never dead-end.
   */
  const plan = useMemo(() => {
    const owed = Number(rentState?.outstanding ?? 0);

    if (owed > 0 && rentState?.forMonth) {
      return {
        mode: 'settles-existing',
        month: rentState.forMonth,
        owed,
        overdueDays: rentState.daysOverdue ?? 0,
      };
    }

    // Nothing outstanding: the payment date decides the month, and the bill is created here.
    const d = paidDate ? new Date(`${paidDate}T00:00:00`) : new Date();
    const month = Number.isNaN(d.getTime())
      ? null
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    return { mode: 'creates-new', month, owed: 0, overdueDays: 0 };
  }, [rentState?.outstanding, rentState?.forMonth, rentState?.daysOverdue, paidDate]);

  const planMonthLabel = useMemo(() => monthNameOf(plan.month), [plan.month]);

  const nextMonthLabel = useMemo(() => {
    if (!paidDate) return null;
    const d = new Date(`${paidDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return format(new Date(d.getFullYear(), d.getMonth() + 1, 1), 'MMMM yyyy');
  }, [paidDate]);

  const paidAmount = watch('paid_amount') || 0;
  const paymentStatus = watch('status');
  const baseRent = parsedMetadata.base_rent || flat?.rent_amount || 0;

  // Calculate late fee when paid date changes
  useEffect(() => {
    if (!flat?.rent_due_date || !paidDate) {
      setLateFee(0);
      return;
    }

    const dueDate = new Date(flat.rent_due_date);
    const paymentDate = new Date(paidDate);

    if (paymentDate <= dueDate) {
      setLateFee(0);
      return;
    }

    const daysLate = Math.ceil((paymentDate - dueDate) / (1000 * 60 * 60 * 24));
    const dailyLateFee = (baseRent * (flat.late_fee_percentage || 5)) / 100 / 30;
    const fee = Math.round(dailyLateFee * daysLate * 100) / 100;

    setLateFee(fee);
  }, [paidDate, flat?.rent_due_date, flat?.late_fee_percentage, baseRent]);

  const totalAmount = parseFloat(paidAmount) + lateFee + amenitiesTotal;
  const amountAfterAdvance = useAdvancePayment
    ? Math.max(totalAmount - Math.min(availableAdvance, totalAmount), 0)
    : totalAmount;

  // Default renterPaidRemaining when using advance
  useEffect(() => {
    if (!useAdvancePayment) {
      setRenterPaidRemaining(0);
      return;
    }
    setRenterPaidRemaining(amountAfterAdvance);
  }, [useAdvancePayment, amountAfterAdvance]);

  const handleAddAmenity = () => {
    setAmenities([...amenities, { name: '', charge: 0 }]);
  };

  const handleRemoveAmenity = (index) => {
    setAmenities(amenities.filter((_, i) => i !== index));
  };

  const handleAmenityChange = (index, field, value) => {
    const updated = [...amenities];
    updated[index][field] = field === 'charge' ? (parseFloat(value) || 0) : value;
    setAmenities(updated);
  };

  const resetForm = () => {
    reset();
    setAmenities([]);
    setLateFee(0);
    setShowAmenitiesEditor(false);
    setUseAdvancePayment(false);
    setPreviewOpen(false);
    setInvoicePdfBase64(null);
    setPendingPaymentId(null);
    setPendingReceiptData(null);
  };

  const onSubmit = async (formData) => {
    try {
      if (useAdvancePayment) {
        const maxRemaining = amountAfterAdvance;
        const val = parseFloat(renterPaidRemaining || 0);
        if (isNaN(val) || val < 0) {
          toast.error(t('err_remaining_invalid'));
          return;
        }
        if (val - maxRemaining > 1e-6) {
          toast.error(t('err_remaining_too_big'));
          return;
        }
      }

      const paymentData = {
        ...formData,
        paid_amount: totalAmount,
        amenities: amenities.filter(a => a.name.trim()),
        base_rent: parseFloat(paidAmount) || 0,
        amenities_total: amenitiesTotal,
        late_fee: lateFee,
        use_advance_payment: useAdvancePayment,
        renter_paid_remaining: useAdvancePayment ? parseFloat(renterPaidRemaining || 0) : 0,
        send_pdf_attachment: formData.send_pdf_attachment,
      };

      const response = await recordPayment({ flatId: flat.id, ...paymentData }).unwrap();

      const settledLabel = monthNameOf(response.data?.settledMonth) ?? planMonthLabel;

      if (formData.status === 'pending') {
        toast.success(t('toast_bill_created', { month: settledLabel ?? '' }));
      } else {
        toast.success(
          useAdvancePayment
            ? t('toast_payment_recorded_advance', { month: settledLabel ?? '', amount: `৳${Math.min(availableAdvance, totalAmount).toLocaleString()}` })
            : response.data?.createdInvoice
              ? t('toast_payment_recorded_month', { month: settledLabel ?? '' })
              : showMessageInLanguage(response.message) || t('payment_recorded')
        );
      }

      // The toggle used to give no sign of whether it had done anything — and for a long
      // while it hadn't (the server compared a boolean against the string 'true').
      if (formData.calculate_next_payment) {
        if (response.data?.nextInvoice === 'created') {
          toast.info(t('toast_next_bill_created', { month: nextMonthLabel ?? '' }));
        } else if (response.data?.nextInvoice === 'already_exists') {
          toast.info(t('toast_next_bill_exists', { month: nextMonthLabel ?? '' }));
        }
      }

      // Show PDF preview if: toggle is on, renter has email, payment is not pending
      const shouldShowPreview =
        formData.send_pdf_attachment &&
        renter?.email &&
        response.data?.status !== 'pending';

      if (shouldShowPreview) {
        try {
          const invoiceData = {
            renterName: renter.name,
            // From `house`, not `flat`. flat.houseName / house_name / ownerEmail / ownerPhone
            // are keys the flat endpoint has never sent, so the receipt printed the fallback
            // 'N/A' for the property and left the owner's contact details off entirely.
            houseName: house?.name || 'N/A',
            houseAddress: house?.address || null,
            ownerName: house?.owner?.name || null,
            ownerEmail: house?.owner?.email || null,
            ownerPhone: house?.owner?.phone || null,
            flatNumber: flat.number,
            totalAmount,
            paymentDate: formData.paid_date,
            transactionId: formData.transaction_id || null,
            baseRent: parseFloat(paidAmount) || 0,
            amenitiesTotal,
            lateFee,
            amenities: amenities.filter(a => a.name.trim()),
            forMonth: response.data?.for_month || null,
            paymentMethod: formData.payment_method,
            paymentId: response.data?.paymentId,
          };
          const pdfBase64 = await generateRentReceiptPdf(invoiceData);

          setPendingPaymentId(response.data.paymentId);
          setPendingReceiptData({ pdfBase64, invoiceData });
          setInvoicePdfBase64(pdfBase64);
          setPreviewOpen(true);
        } catch (pdfErr) {
          console.error('PDF generation failed:', pdfErr);
          toast.warn(t('toast_pdf_failed'));
          resetForm();
          onClose();
        }
      } else {
        resetForm();
        onClose();
      }
    } catch (error) {
      console.error('Failed to record payment:', error);
      toast.error(apiErrorMessage(error));
    }
  };

  const handleConfirmSend = async (note) => {
    try {
      let finalBase64 = pendingReceiptData?.pdfBase64;

      // Regenerate with the note if one was provided
      if (note) {
        finalBase64 = await generateRentReceiptPdf({
          ...pendingReceiptData?.invoiceData,
          note,
        });
      }

      await sendPaymentReceiptPdf({
        paymentId: pendingPaymentId,
        pdfBase64: finalBase64,
      }).unwrap();
      toast.success(t('toast_receipt_sent'));
    } catch (err) {
      console.error('Failed to send receipt:', err);
      toast.error(t('toast_receipt_failed', { reason: apiErrorMessage(err) }));
    } finally {
      resetForm();
      onClose();
    }
  };

  const handleSkipReceipt = () => {
    resetForm();
    onClose();
  };

  if (!open || !flat) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-surface rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
          <div className="sticky top-0 bg-surface/30 backdrop-blur-sm border-b z-50 border-subdued/20 p-4 ">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-2xl font-bold text-text">{t('record_rent_payment')}</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-subdued/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Renter & Flat Info */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
              <p className="text-lg font-semibold text-text">{renter?.name || t('no_renter_assigned_short')}</p>
              <p className="text-base text-subdued">
                {flat.number ? `Flat ${flat.number}` : flat.name}
                {renter?.phone ? ` · ${renter.phone}` : ''}
              </p>
            </div>

            {/* Say what pressing the button will do, before it is pressed. */}
            {plan.mode === 'settles-existing' ? (
              <div className="rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3">
                <p className="text-base font-semibold text-amber-900">
                  {t('pay_goes_towards', { month: planMonthLabel })}
                </p>
                <p className="text-base text-amber-800 mt-0.5">
                  {plan.overdueDays > 0
                    ? t('still_owed_for_month_late', { amount: `৳${plan.owed.toLocaleString()}`, days: plan.overdueDays })
                    : t('still_owed_for_month', { amount: `৳${plan.owed.toLocaleString()}` })}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-sky-300 bg-sky-50 px-4 py-3">
                <p className="text-base font-semibold text-sky-900">
                  {t('nothing_owed_new_bill', { month: planMonthLabel })}
                </p>
                <p className="text-base text-sky-800 mt-1">
                  {t('change_date_to_bill_other_month')}
                </p>

                {/* The one genuine decision at this point, asked plainly rather than left to
                    a status dropdown labelled in accounting terms. */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setValue('status', 'paid', { shouldDirty: true })}
                    className={`text-left px-3 py-2.5 rounded-lg border-2 transition-colors ${
                      paymentStatus !== 'pending'
                        ? 'border-primary bg-white shadow-sm'
                        : 'border-subdued/30 bg-white/60 hover:border-subdued/50'
                    }`}
                  >
                    <span className="block text-base font-semibold text-text">
                      {t('choice_renter_has_paid')}
                    </span>
                    <span className="block text-sm text-subdued">
                      {t('choice_renter_has_paid_hint')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('status', 'pending', { shouldDirty: true })}
                    className={`text-left px-3 py-2.5 rounded-lg border-2 transition-colors ${
                      paymentStatus === 'pending'
                        ? 'border-primary bg-white shadow-sm'
                        : 'border-subdued/30 bg-white/60 hover:border-subdued/50'
                    }`}
                  >
                    <span className="block text-base font-semibold text-text">
                      {t('choice_not_paid_yet')}
                    </span>
                    <span className="block text-sm text-subdued">
                      {t('choice_not_paid_yet_hint')}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Base Rent Amount */}
              <div>
                <label className="block text-base font-semibold text-text mb-2">
                  {t('base_rent_amount')} *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued">
                    <TkSymbol />
                  </span>
                  <input
                    {...register('paid_amount')}
                    type="number"
                    step="0.01"
                    className="w-full pl-12 pr-4 py-3 text-lg font-semibold bg-background border-2 border-subdued/40 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                  />
                </div>
                {errors.paid_amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.paid_amount.message}</p>
                )}
              </div>

              <DateChooser
                label={t('payment_date')}
                value={paidDate}
                onChange={(v) => setValue('paid_date', v, { shouldDirty: true })}
                t={t}
              />

              {/* Payment Method */}
              <div>
                <label className="block text-base font-semibold text-text mb-2">
                  {t('payment_method_label')} *
                </label>
                <select
                  {...register('payment_method')}
                  className="w-full px-4 py-3 text-base bg-background border-2 border-subdued/40 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                >
                  <option value="cash">{t('method_cash')}</option>
                  <option value="bank">{t('method_bank')}</option>
                  <option value="mobile_banking">{t('method_mobile_banking')}</option>
                  <option value="other">{t('method_other')}</option>
                </select>
                {errors.payment_method && (
                  <p className="mt-1 text-sm text-red-600">{errors.payment_method.message}</p>
                )}
              </div>

              {/* Payment Status. Hidden in the create case — the two buttons above already
                  asked this, in words that do not require knowing what a payment status is. */}
              <div className={plan.mode === 'creates-new' ? 'hidden' : ''}>
                <label className="block text-base font-semibold text-text mb-2">{t('payment_status_label')}</label>
                {/* 'Overdue' and 'Cancelled' were offered here and neither is something you
                    choose while handing over money — overdue is decided by the calendar, and
                    cancelling is not a payment. The server recalculates this from the amount
                    anyway, so the two remaining options describe intent, not outcome. */}
                <select
                  {...register('status')}
                  className="w-full px-4 py-3 text-base bg-background border-2 border-subdued/40 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                >
                  <option value="paid">{t('status_paid_in_full')}</option>
                  <option value="partial">{t('status_part_payment')}</option>
                </select>
                <p className="mt-1.5 text-sm text-subdued">
                  {t('status_help')}
                </p>
              </div>
            </div>

            {/* Transaction ID */}
            <div>
              <label className="block text-base font-semibold text-text mb-2">
                {t('transaction_id')}
              </label>
              <input
                {...register('transaction_id')}
                className="w-full px-4 py-3 text-base bg-background border-2 border-subdued/40 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                placeholder={t('optional')}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-base font-semibold text-text mb-2">
                {t('notes_label')}
              </label>
              <textarea
                {...register('notes')}
                rows={2}
                className="w-full px-4 py-3 text-base bg-background border-2 border-subdued/40 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                placeholder={t('notes_placeholder')}
              />
            </div>

            {/* Advance Payment Section */}
            {availableAdvance > 0 && (
              <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-green-800 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> {t('advance_payment_available')}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-700"><TkSymbol />{availableAdvance.toLocaleString()}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useAdvancePayment}
                        onChange={(e) => setUseAdvancePayment(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                </div>

                {useAdvancePayment && (
                  <div className="space-y-3">
                    <div className="p-3 bg-white border border-green-300 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">{t('total_available_advance')}</span>
                        <span className="font-bold text-green-700"><TkSymbol />{availableAdvance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-green-700">{t('amount_to_apply')}</span>
                        <span className="font-bold text-green-700">
                          <TkSymbol />{Math.min(availableAdvance, totalAmount).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-2">
                        <span className="text-green-700">{t('renter_pays_now')}</span>
                        <div className="flex items-center gap-1">
                          <TkSymbol />
                          <input
                            type="number"
                            min="0"
                            max={amountAfterAdvance}
                            step="0.01"
                            value={renterPaidRemaining}
                            onChange={(e) => setRenterPaidRemaining(e.target.value)}
                            className="w-24 px-2 py-1 border border-subdued/30 rounded text-right text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Amenities Editor Section */}
            <div className="border border-subdued/20 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-text flex items-center gap-2">
                  <Coins className="w-4 h-4" /> {t('service_charges_amenities')}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAmenitiesEditor(!showAmenitiesEditor)}
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    {showAmenitiesEditor ? t('hide_editor') : t('edit_charges')}
                  </button>
                  {showAmenitiesEditor && (
                    <button
                      type="button"
                      onClick={handleAddAmenity}
                      className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                    >
                      <Plus className="w-4 h-4" /> {t('add')}
                    </button>
                  )}
                </div>
              </div>

              {showAmenitiesEditor ? (
                <div className="space-y-3">
                  {amenities.map((amenity, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={amenity.name}
                          onChange={(e) => handleAmenityChange(index, 'name', e.target.value)}
                          className={`w-full px-3 py-2 border border-subdued/30 rounded focus:ring-1 focus:ring-primary/50 focus:border-primary outline-none ${
                            !amenity.name ? 'bg-gray-100 text-gray-500' : ''
                          }`}
                          placeholder={t('amenity_name')}
                        />
                      </div>
                      <div className="w-32">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued"><TkSymbol /></span>
                          <input
                            type="number"
                            value={amenity.charge}
                            onChange={(e) => handleAmenityChange(index, 'charge', e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-subdued/30 rounded focus:ring-1 focus:ring-primary/50 focus:border-primary outline-none"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAmenity(index)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {amenities.length === 0 && (
                    <div className="text-center py-4 text-subdued">
                      {t('no_amenities_found')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {amenities.map((amenity, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-subdued">{amenity.name}</span>
                      <span className="font-medium"><TkSymbol />{parseFloat(amenity.charge || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              )}

              {amenities.length > 0 && (
                <div className="pt-4 border-t border-subdued/20">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-text">{t('amenities_total')}</span>
                    <span className="font-bold text-primary"><TkSymbol />{amenitiesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              <div className="text-sm text-subdued mt-4">
                <p className="mb-1">{t('amenities_note_one')}</p>
                <p>{t('amenities_note_two')}</p>
              </div>
            </div>

            {/* Total Amount Breakdown */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-3">{t('payment_breakdown')}</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">{t('base_rent_row')}</span>
                  <span><TkSymbol />{parseFloat(paidAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {amenitiesTotal > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700">{t('amenities_charges_row')}</span>
                    <span className="text-blue-700">+<TkSymbol />{amenitiesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                {lateFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-700">{t('late_fee_row')}</span>
                    <span className="text-yellow-700">+<TkSymbol />{lateFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                {useAdvancePayment && (
                  <>
                    <div className="flex justify-between items-center border-t border-gray-300 pt-2 mt-2">
                      <span className="text-green-700">{t('total_before_advance')}</span>
                      <span className="font-bold text-green-700"><TkSymbol />{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">{t('advance_payment_applied')}</span>
                      <span className="font-bold text-green-700">-<TkSymbol />{Math.min(availableAdvance, totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}

                {/* Guarding against the easy mistake: the amount field opens at the full rent,
                    so on a bill that is nearly settled the landlord would record the whole
                    month again unless something says otherwise. */}
                {plan.mode === 'settles-existing' && plan.owed > 0 && totalAmount - plan.owed > 0.5 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 mt-2">
                    <p className="text-base text-amber-900">
                      {t('only_amount_owed_note', { amount: `৳${plan.owed.toLocaleString()}`, month: planMonthLabel })}
                    </p>
                    <button
                      type="button"
                      onClick={() => setValue(
                        'paid_amount',
                        Math.max(0, Number((plan.owed - amenitiesTotal - lateFee).toFixed(2))),
                        { shouldDirty: true }
                      )}
                      className="mt-1.5 text-base font-semibold text-primary hover:underline"
                    >
                      {t('charge_only_what_is_owed')}
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-gray-300 pt-2 mt-2">
                  <span className="text-lg font-bold text-gray-900">
                    {useAdvancePayment ? t('amount_to_pay_now') : t('total_amount_row')}
                  </span>
                  <span className={`font-bold text-2xl ${
                    useAdvancePayment && amountAfterAdvance === 0
                      ? 'text-green-700'
                      : 'text-gray-900'
                  }`}>
                    <TkSymbol />{useAdvancePayment
                      ? amountAfterAdvance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Next Payment Toggle */}
            <div className="bg-surface border border-subdued/20 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-base font-semibold text-text">{t('create_next_month_bill')}</p>
                  <p className="text-sm text-subdued">
                    {nextMonthLabel
                      ? t('next_bill_waiting_for', { month: nextMonthLabel })
                      : t('next_bill_waiting_generic')}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...register('calculate_next_payment')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-subdued/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Send PDF Receipt toggle */}
            <div className="bg-surface border border-subdued/20 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-text">{t('email_receipt_to_renter')}</p>
                <p className="text-sm text-subdued">
                  {!renter?.email
                    ? t('renter_has_no_email')
                    : paymentStatus === 'pending'
                      ? t('receipt_after_paid')
                      : t('receipt_preview_then_send', { email: renter.email })}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...register('send_pdf_attachment')}
                  className="sr-only peer"
                  disabled={!renter?.email || paymentStatus === 'pending'}
                />
                <div className={`w-11 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary ${
                  (!renter?.email || paymentStatus === 'pending') ? 'opacity-40 bg-subdued/30' : 'bg-subdued/30'
                }`}></div>
              </label>
            </div>

            {/* Late Fee Warning */}
            {lateFee > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-medium text-yellow-800">{t('late_fee_applied')}</p>
                      <p className="font-bold text-yellow-800"><TkSymbol />{lateFee.toFixed(2)}</p>
                    </div>
                    <p className="text-sm text-yellow-700">
                      {t('payment_is_days_late', { days: Math.ceil((new Date(paidDate) - new Date(flat.rent_due_date)) / (1000 * 60 * 60 * 24)) })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-subdued/20">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-base border-2 border-subdued/40 rounded-lg hover:bg-subdued/10 transition-colors"
                disabled={isSubmitting}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 text-base font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('recording_payment')}
                  </span>
                ) : paymentStatus === 'pending' ? (
                  <>{t('create_month_bill', { month: planMonthLabel ?? '' })} (<TkSymbol />{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</>
                ) : (
                  <>
                    {t('record_payment_amount')} (<TkSymbol />
                    {useAdvancePayment
                      ? amountAfterAdvance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    })
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <InvoicePreviewModal
        open={previewOpen}
        pdfBase64={invoicePdfBase64}
        renterName={renter?.name}
        onConfirm={handleConfirmSend}
        onSkip={handleSkipReceipt}
        isSending={isSendingReceipt}
      />
    </>
  );
};

export default RecordPaymentModal;
