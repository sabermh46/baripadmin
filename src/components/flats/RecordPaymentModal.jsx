// components/flats/RecordPaymentModal.jsx
import React, { useState, useEffect } from 'react';
import { X, AlertCircle, DollarSign, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useRecordPaymentMutation } from '../../store/api/flatApi';

const paymentSchema = z.object({
  paid_amount: z.coerce.number().positive('Amount must be positive'),
  payment_method: z.string().min(1, 'Payment method is required'),
  transaction_id: z.string().optional(),
  notes: z.string().optional(),
  paid_date: z.string().default(() => format(new Date(), 'yyyy-MM-dd')),
});

const RecordPaymentModal = ({ open, onClose, flat, renter }) => {
  const [lateFee, setLateFee] = useState(0);
  
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paid_amount: flat?.rent_amount || '',
      payment_method: '',
      transaction_id: '',
      notes: '',
      paid_date: format(new Date(), 'yyyy-MM-dd'),
    }
  });

  const [recordPayment] = useRecordPaymentMutation();

  const paidDate = watch('paid_date');
  const paidAmount = watch('paid_amount') || 0;

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
    const dailyLateFee = (flat.rent_amount * (flat.late_fee_percentage || 5)) / 100 / 30;
    const fee = Math.round(dailyLateFee * daysLate * 100) / 100;
    
    setLateFee(fee);
  }, [paidDate, flat]);

  const totalAmount = parseFloat(paidAmount) + lateFee;

  const onSubmit = async (data) => {
    try {
      await recordPayment({
        flatId: flat.id,
        ...data,
        paid_amount: totalAmount
      }).unwrap();
      onClose();
      reset();
    } catch (error) {
      console.error('Failed to record payment:', error);
    }
  };

  if (!open || !flat) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-subdued/20 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text">Record Rent Payment</h2>
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
          <div className="space-y-2">
            <p className="text-sm text-subdued">Renter: {renter.name}</p>
            <p className="text-sm text-subdued">Flat: {flat.number ? `Flat ${flat.number}` : flat.name}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Payment Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued">
                  $
                </span>
                <input
                  {...register('paid_amount')}
                  type="number"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                />
              </div>
              {errors.paid_amount && (
                <p className="mt-1 text-sm text-red-600">{errors.paid_amount.message}</p>
              )}
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Payment Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued" size={20} />
                <input
                  {...register('paid_date')}
                  type="date"
                  className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Payment Method *
              </label>
              <select
                {...register('payment_method')}
                className="w-full px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              >
                <option value="">Select method</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="mobile_banking">Mobile Banking</option>
                <option value="other">Other</option>
              </select>
              {errors.payment_method && (
                <p className="mt-1 text-sm text-red-600">{errors.payment_method.message}</p>
              )}
            </div>

            {/* Transaction ID */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Transaction ID
              </label>
              <input
                {...register('transaction_id')}
                className="w-full px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              placeholder="Additional notes..."
            />
          </div>

          {/* Late Fee Warning */}
          {lateFee > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-medium text-yellow-800">Late Fee Applied</p>
                    <p className="font-bold text-yellow-800">${lateFee.toFixed(2)}</p>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Payment is {Math.ceil((new Date(paidDate) - new Date(flat.rent_due_date)) / (1000 * 60 * 60 * 24))} days late
                  </p>
                  <div className="mt-2 pt-2 border-t border-yellow-200">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-yellow-800">Total Payment:</p>
                      <p className="font-bold text-lg text-yellow-800">
                        ${totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-subdued/20">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-subdued/30 rounded-lg hover:bg-subdued/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Recording...
                </span>
              ) : (
                'Record Payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordPaymentModal;