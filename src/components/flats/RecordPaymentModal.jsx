import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle, DollarSign, Calendar, Plus, Trash2, CreditCard, Shield } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useRecordPaymentMutation } from '../../store/api/flatApi';
import { toast } from 'react-toastify';
import TkSymbol from '../common/TkSymbol';

const paymentSchema = z.object({
  paid_amount: z.coerce.number().positive('Amount must be positive'),
  payment_method: z.string().min(1, 'Payment method is required'),
  transaction_id: z.string().optional(),
  notes: z.string().optional(),
  paid_date: z.string().default(() => format(new Date(), 'yyyy-MM-dd')),
  status: z.enum(['pending', 'paid', 'overdue', 'partial', 'cancelled']).default('paid'),
  calculate_next_payment: z.boolean().default(true),
  use_advance_payment: z.boolean().default(false),
});

const RecordPaymentModal = ({ open, onClose, flat, renter, advancePayments = [] }) => {
  const [lateFee, setLateFee] = useState(0);
  const [amenities, setAmenities] = useState([]);
  const [showAmenitiesEditor, setShowAmenitiesEditor] = useState(false);
  const [useAdvancePayment, setUseAdvancePayment] = useState(false);
  const [availableAdvance, setAvailableAdvance] = useState(0);

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
    }
  });

  const [recordPayment] = useRecordPaymentMutation();

  const paidDate = watch('paid_date');
  const paidAmount = watch('paid_amount') || 0;
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

  const onSubmit = async (formData) => {
    try {
      // Build payload as expected by backend (excluding flatId)
      const paymentData = {
        ...formData,
        paid_amount: totalAmount,                       // total amount for this payment
        amenities: amenities.filter(a => a.name.trim()),
        base_rent: parseFloat(paidAmount) || 0,
        amenities_total: amenitiesTotal,
        late_fee: lateFee,
        use_advance_payment: useAdvancePayment,
        // No advance_payment_id – backend uses oldest available advance
      };

      // Pass flatId as separate parameter (adjust if your mutation signature differs)
      const response = await recordPayment({ flatId: flat.id, ...paymentData }).unwrap();

      toast.success(
        useAdvancePayment
          ? `Payment recorded successfully. ৳ ${Math.min(availableAdvance, totalAmount).toLocaleString()} applied from advance payment.`
          : response.message || 'Payment recorded successfully.'
      );

      onClose();
      reset();
      setAmenities([]);
      setLateFee(0);
      setShowAmenitiesEditor(false);
      setUseAdvancePayment(false);
    } catch (error) {
      console.error('Failed to record payment:', error);
      toast.error(`Failed to record payment: ${error?.data?.error || error.message}`);
    }
  };

  if (!open || !flat) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface/30 backdrop-blur-sm border-b z-50 border-subdued/20 p-4 ">
          <div className="flex items-center justify-between">
            <h2 className="text-sm md:text-xl font-bold text-text">Record Rent Payment</h2>
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
            {/* Base Rent Amount */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Base Rent Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued">
                  <TkSymbol />
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
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="mobile_banking">Mobile Banking</option>
                <option value="other">Other</option>
              </select>
              {errors.payment_method && (
                <p className="mt-1 text-sm text-red-600">{errors.payment_method.message}</p>
              )}
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">Payment Status</label>
              <select
                {...register('status')}
                className="w-full px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="partial">Partial</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
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

          {/* Advance Payment Section – simplified */}
          {availableAdvance > 0 && (
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-green-800 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Advance Payment Available
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
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </div>
              
              {useAdvancePayment && (
                <div className="space-y-3">
                  <div className="p-3 bg-white border border-green-300 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Total Available Advance:</span>
                      <span className="font-bold">${availableAdvance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-green-700">Amount to Apply:</span>
                      <span className="font-bold">
                        ${Math.min(availableAdvance, totalAmount).toLocaleString()}
                      </span>
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
                <DollarSign className="w-4 h-4" /> Service Charges & Amenities
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAmenitiesEditor(!showAmenitiesEditor)}
                  className="text-sm text-primary hover:text-primary/80"
                >
                  {showAmenitiesEditor ? 'Hide Editor' : 'Edit Charges'}
                </button>
                {showAmenitiesEditor && (
                  <button
                    type="button"
                    onClick={handleAddAmenity}
                    className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                  >
                    <Plus className="w-4 h-4" /> Add
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
                        placeholder="Amenity name"
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
                    No amenities found. Add amenities to include in this payment.
                  </div>
                )}
              </div>
            ) : (
              // Show read-only amenities summary
              <div className="space-y-2">
                {amenities.map((amenity, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-subdued">{amenity.name}</span>
                    <span className="font-medium">${parseFloat(amenity.charge || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Amenities Total */}
            {amenities.length > 0 && (
              <div className="pt-4 border-t border-subdued/20">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-text">Amenities Total:</span>
                  <span className="font-bold text-primary"><TkSymbol />{amenitiesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
            
            <div className="text-sm text-subdued mt-4">
              <p className="mb-1">Note: Modify charges if different from standard for this payment only.</p>
              <p>The base amenities will remain unchanged for future payments.</p>
            </div>
          </div>

          {/* Total Amount Breakdown */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-3">Payment Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Base Rent:</span>
                <span><TkSymbol />{parseFloat(paidAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              {amenitiesTotal > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Amenities Charges:</span>
                  <span className="text-blue-700">+<TkSymbol />{amenitiesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              
              {lateFee > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-yellow-700">Late Fee:</span>
                  <span className="text-yellow-700">+<TkSymbol />{lateFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              
              {/* Advance Payment Application */}
              {useAdvancePayment && (
                <>
                  <div className="flex justify-between items-center border-t border-gray-300 pt-2 mt-2">
                    <span className="text-green-700">Total Before Advance:</span>
                    <span className="font-bold text-green-700"><TkSymbol />{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-green-700">Advance Payment Applied:</span>
                    <span className="font-bold text-green-700">-<TkSymbol />{Math.min(availableAdvance, totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}
              
              <div className="flex justify-between items-center border-t border-gray-300 pt-2 mt-2">
                <span className="font-bold text-gray-900">
                  {useAdvancePayment ? 'Amount to Pay Now:' : 'Total Amount:'}
                </span>
                <span className={`font-bold text-lg ${
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
                <p className="text-sm font-medium text-text">Schedule Next Payment</p>
                <p className="text-xs text-subdued">Create invoice for next month</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                {...register('calculate_next_payment')} 
                className="sr-only peer" 
                defaultChecked
              />
              <div className="w-11 h-6 bg-subdued/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Late Fee Warning */}
          {lateFee > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-medium text-yellow-800">Late Fee Applied</p>
                    <p className="font-bold text-yellow-800"><TkSymbol />{lateFee.toFixed(2)}</p>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Payment is {Math.ceil((new Date(paidDate) - new Date(flat.rent_due_date)) / (1000 * 60 * 60 * 24))} days late
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
              className="px-6 py-2 border border-subdued/30 rounded-lg hover:bg-subdued/10 transition-colors"
              disabled={isSubmitting}
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
                  Recording Payment...
                </span>
              ) : (
                <>
                  Record Payment (<TkSymbol />
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
  );
};

export default RecordPaymentModal;