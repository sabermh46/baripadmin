import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import InvoicePreviewModal from '../common/InvoicePreviewModal';
import { useSendAdvanceReceiptMutation } from '../../store/api/flatApi';
import { generateAdvanceReceiptPdf } from '../../utils/advanceReceiptPdf';
import apiErrorMessage from '../../utils/apiError';

/**
 * Offer the renter a receipt for advance payments that have just been recorded.
 *
 * Takes a QUEUE rather than one advance, because the two places an advance can be created
 * differ: the Advance tab records one at a time, while assigning a renter can take several
 * deposits in a single submit. Showing them one after another keeps a strict 1:1 between an
 * advance row, the document the renter receives and the email log it produces - which is what
 * the history table later reads. One combined receipt for three advances would have nothing
 * sensible to link back to.
 *
 * Sending is optional throughout: skipping moves to the next, and an empty queue renders
 * nothing.
 *
 * @param {Array}    advances  advance rows to offer receipts for; [] or null renders nothing
 * @param {object}   flat
 * @param {object}   house
 * @param {object}   renter
 * @param {Function} onDone    called once the queue is exhausted or abandoned
 */
const AdvanceReceiptSender = ({ advances, flat, house, renter, onDone }) => {
  const { t } = useTranslation();
  const [sendAdvanceReceipt, { isLoading: isSending }] = useSendAdvanceReceiptMutation();

  const [index, setIndex] = useState(0);
  const [pdfBase64, setPdfBase64] = useState(null);

  const queue = advances ?? [];
  const current = queue[index] ?? null;

  /** The receipt's own data, kept apart so a note can be folded in and the PDF regenerated. */
  const receiptData = useCallback((advance) => ({
    renterName: renter?.name || 'N/A',
    houseName: house?.name || 'N/A',
    houseAddress: house?.address || null,
    ownerName: house?.owner?.name || null,
    ownerEmail: house?.owner?.email || null,
    ownerPhone: house?.owner?.phone || null,
    flatNumber: flat?.number ?? flat?.name ?? 'N/A',
    amount: advance.paid_amount ?? advance.amount,
    remainingAmount: advance.remaining_amount,
    paymentDate: advance.payment_date,
    paymentMethod: advance.payment_method,
    transactionId: advance.transaction_id,
    advanceId: advance.id,
    note: advance.notes || null,
  }), [flat, house, renter]);

  const goToNext = useCallback(() => {
    setPdfBase64(null);
    setIndex((i) => {
      const next = i + 1;
      if (next >= queue.length) {
        onDone?.();
        return 0;
      }
      return next;
    });
  }, [queue.length, onDone]);

  // Restart whenever a new queue arrives, so a second creation does not resume half way
  // through the previous one.
  useEffect(() => {
    setIndex(0);
  }, [advances]);

  useEffect(() => {
    let cancelled = false;
    if (!current) {
      setPdfBase64(null);
      return undefined;
    }

    (async () => {
      try {
        const base64 = await generateAdvanceReceiptPdf(receiptData(current));
        if (!cancelled) setPdfBase64(base64);
      } catch (err) {
        console.error('Advance receipt PDF failed', err);
        if (cancelled) return;
        // Not fatal: the advance is recorded either way, and the owner can resend later.
        toast.warn(t('toast_pdf_failed') || 'Could not build the receipt PDF.');
        setPdfBase64(null);
        goToNext();
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, receiptData]);

  const handleConfirm = async (note, channels = ['email']) => {
    try {
      const payload = note
        ? await generateAdvanceReceiptPdf({ ...receiptData(current), note })
        : pdfBase64;

      const response = await sendAdvanceReceipt({
        flatId: flat?.id,
        advanceId: current.id,
        pdfBase64: payload,
        channels,
      }).unwrap();

      toast.success(t('advance_receipt_sent') || 'Advance receipt sent');

      // Reported on its own: the email may well have gone even when the SMS did not, and one
      // green toast for both would hide that.
      const sms = response?.channels?.sms;
      if (sms && !sms.ok) {
        toast.warn(sms.message || 'The SMS could not be sent.');
      } else if (sms?.ok) {
        toast.success(`SMS sent (${sms.segments} SMS used).`);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to send the advance receipt'));
    } finally {
      goToNext();
    }
  };

  if (!current || !pdfBase64) return null;

  return (
    <InvoicePreviewModal
      open
      pdfBase64={pdfBase64}
      renterName={renter?.name}
      renterPhone={renter?.phone}
      houseOwnerId={house?.owner?.id}
      onConfirm={handleConfirm}
      onSkip={goToNext}
      isSending={isSending}
    />
  );
};

export default AdvanceReceiptSender;
