import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import InvoicePreviewModal from '../common/InvoicePreviewModal';
import { useSendAdvanceDeductionNoticeMutation } from '../../store/api/flatApi';
import { generateAdvanceDeductionPdf } from '../../utils/advanceDeductionPdf';
import apiErrorMessage from '../../utils/apiError';

/**
 * Tell the renter about one deduction from their advance, through the same preview-then-send
 * flow as every other document the app sends.
 *
 * One deduction at a time rather than a queue: this is reached from a row's Send button, and
 * the notice names a single amount, month and resulting balance. Re-sending is expected - the
 * history counts how many times it has gone out.
 *
 * @param {object}   advance  the advance the deduction belongs to
 * @param {object}   entry    the AdvanceLedgerService history entry
 * @param {object}   flat
 * @param {object}   house
 * @param {object}   renter
 * @param {Function} onDone   called after sending, skipping, or a failure to build the PDF
 */
const AdvanceDeductionSender = ({ advance, entry, flat, house, renter, onDone }) => {
  const { t } = useTranslation();
  const [sendNotice, { isLoading: isSending }] = useSendAdvanceDeductionNoticeMutation();
  const [pdfBase64, setPdfBase64] = useState(null);

  const noticeData = {
    renterName: entry?.renter_name || renter?.name || 'N/A',
    houseName: house?.name || 'N/A',
    houseAddress: house?.address || null,
    ownerName: house?.owner?.name || null,
    ownerEmail: house?.owner?.email || null,
    ownerPhone: house?.owner?.phone || null,
    flatNumber: flat?.number ?? flat?.name ?? 'N/A',
    deductedAmount: entry?.deducted_amount,
    remainingAfter: entry?.remaining_after,
    advanceTotal: advance?.paid_amount ?? advance?.amount,
    forMonth: entry?.for_month,
    date: entry?.date,
    advanceId: advance?.id,
  };

  useEffect(() => {
    let cancelled = false;
    if (!entry || !advance) {
      setPdfBase64(null);
      return undefined;
    }

    (async () => {
      try {
        const base64 = await generateAdvanceDeductionPdf(noticeData);
        if (!cancelled) setPdfBase64(base64);
      } catch (err) {
        console.error('Advance deduction PDF failed', err);
        if (cancelled) return;
        toast.warn(t('toast_pdf_failed') || 'Could not build the notice PDF.');
        onDone?.();
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id, advance?.id]);

  const handleConfirm = async (note, channels = ['email']) => {
    try {
      const payload = note
        ? await generateAdvanceDeductionPdf({ ...noticeData, note })
        : pdfBase64;

      const response = await sendNotice({
        flatId: flat?.id,
        advanceId: advance.id,
        entryId: entry.id,
        pdfBase64: payload,
        channels,
      }).unwrap();

      toast.success(t('deduction_notice_sent') || 'Deduction notice sent');

      // Reported separately: the email may have gone even when the SMS did not.
      const sms = response?.channels?.sms;
      if (sms && !sms.ok) {
        toast.warn(sms.message || 'The SMS could not be sent.');
      } else if (sms?.ok) {
        toast.success(`SMS sent (${sms.segments} SMS used).`);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to send the notice'));
    } finally {
      onDone?.();
    }
  };

  if (!entry || !pdfBase64) return null;

  return (
    <InvoicePreviewModal
      open
      pdfBase64={pdfBase64}
      renterName={entry.renter_name || renter?.name}
      renterPhone={renter?.phone}
      houseOwnerId={house?.owner?.id}
      onConfirm={handleConfirm}
      onSkip={onDone}
      isSending={isSending}
    />
  );
};

export default AdvanceDeductionSender;
