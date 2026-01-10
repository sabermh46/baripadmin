// components/flats/ApplyAdvancePaymentModal.jsx
import React, { useState, useEffect } from 'react';
import { X, DollarSign, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { useApplyAdvancePaymentMutation } from '../../store/api/flatApi';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const ApplyAdvancePaymentModal = ({ 
  open, 
  onClose, 
  flat, 
  renter, 
  pendingPayments = [], 
  advancePayments = [],
  selectedAdvancePayment = null 
}) => {
  const [selectedRentPayment, setSelectedRentPayment] = useState('');
  const [selectedAdvance, setSelectedAdvance] = useState('');
  const [amountToApply, setAmountToApply] = useState('');
  const [availableAdvance, setAvailableAdvance] = useState(0);
  
  const [applyAdvancePayment, { isLoading }] = useApplyAdvancePaymentMutation();

  // Initialize selections
  useEffect(() => {
    if (open && pendingPayments.length > 0) {
      setSelectedRentPayment(pendingPayments[0].id);
    }
    
    if (open && advancePayments.length > 0) {
      const firstAvailable = selectedAdvancePayment || advancePayments.find(p => parseFloat(p.remaining_amount) > 0);
      if (firstAvailable) {
        setSelectedAdvance(firstAvailable.id);
        setAvailableAdvance(parseFloat(firstAvailable.remaining_amount) || 0);
      }
    }
  }, [open, pendingPayments, advancePayments, selectedAdvancePayment]);

  // Update amount to apply when selections change
  useEffect(() => {
    if (selectedRentPayment && selectedAdvance) {
      const rentPayment = pendingPayments.find(p => p.id === selectedRentPayment);
      const advancePayment = advancePayments.find(p => p.id === selectedAdvance);
      
      if (rentPayment && advancePayment) {
        const rentDue = parseFloat(rentPayment.amount) - (parseFloat(rentPayment.paid_amount) || 0);
        const advanceAvailable = parseFloat(advancePayment.remaining_amount);
        
        // Auto-set amount to the minimum of rent due and available advance
        const amount = Math.min(rentDue, advanceAvailable);
        setAmountToApply(amount.toFixed(2));
      }
    }
  }, [selectedRentPayment, selectedAdvance, pendingPayments, advancePayments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedRentPayment || !selectedAdvance || !amountToApply || parseFloat(amountToApply) <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await applyAdvancePayment({
        flatId: flat.id,
        advance_payment_id: selectedAdvance,
        rent_payment_id: selectedRentPayment,
        amount: parseFloat(amountToApply)
      }).unwrap();
      
      toast.success(`Successfully applied $${parseFloat(amountToApply).toLocaleString()} from advance payment`);
      onClose();
    } catch (error) {
      console.error('Failed to apply advance payment:', error);
      toast.error(`Failed to apply advance payment: ${error?.data?.error || error.message}`);
    }
  };

  if (!open || !flat) return null;

  const selectedRentPaymentObj = pendingPayments.find(p => p.id === selectedRentPayment);
  const selectedAdvancePaymentObj = advancePayments.find(p => p.id === selectedAdvance);
  
  const rentDue = selectedRentPaymentObj 
    ? parseFloat(selectedRentPaymentObj.amount) - (parseFloat(selectedRentPaymentObj.paid_amount) || 0)
    : 0;
  
  const advanceAvailable = selectedAdvancePaymentObj 
    ? parseFloat(selectedAdvancePaymentObj.remaining_amount)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-subdued/20 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text flex items-center gap-2">
              <Shield className="text-green-600" size={20} />
              Apply Advance Payment
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-subdued/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Info Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="font-medium text-blue-800">Apply advance payment to cover rent</p>
                <p className="text-sm text-blue-700">
                  This will deduct from the available advance and apply it to the selected rent payment
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Select Rent Payment */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Select Rent Payment *
              </label>
              <select
                value={selectedRentPayment}
                onChange={(e) => setSelectedRentPayment(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              >
                <option value="">Select payment</option>
                {pendingPayments.map(payment => (
                  <option key={payment.id} value={payment.id}>
                    {payment.due_date ? format(new Date(payment.due_date), 'dd MMM yyyy') : 'No date'} - 
                    Due: ${(parseFloat(payment.amount) - (parseFloat(payment.paid_amount) || 0)).toLocaleString()}
                    {payment.status === 'overdue' && ' (OVERDUE)'}
                  </option>
                ))}
              </select>
              
              {selectedRentPaymentObj && (
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Due Date:</span>
                      <span className="font-medium">
                        {format(new Date(selectedRentPaymentObj.due_date), 'dd MMM yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Total Amount:</span>
                      <span className="font-medium">${selectedRentPaymentObj.amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Already Paid:</span>
                      <span className="font-medium">${(parseFloat(selectedRentPaymentObj.paid_amount) || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-1">
                      <span className="font-bold text-gray-900">Amount Due:</span>
                      <span className="font-bold text-red-600">${rentDue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Select Advance Payment */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Select Advance Payment *
              </label>
              <select
                value={selectedAdvance}
                onChange={(e) => {
                  setSelectedAdvance(e.target.value);
                  const selected = advancePayments.find(p => p.id === e.target.value);
                  if (selected) {
                    setAvailableAdvance(parseFloat(selected.remaining_amount));
                  }
                }}
                className="w-full px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              >
                <option value="">Select advance payment</option>
                {advancePayments
                  .filter(p => parseFloat(p.remaining_amount) > 0)
                  .map(payment => (
                    <option key={payment.id} value={payment.id}>
                      ${payment.remaining_amount?.toLocaleString()} available 
                      (Paid: {format(new Date(payment.payment_date), 'dd MMM yyyy')})
                    </option>
                  ))}
              </select>
              
              {selectedAdvancePaymentObj && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Original Amount:</span>
                      <span className="font-medium">${selectedAdvancePaymentObj.amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Paid Amount:</span>
                      <span className="font-medium">${selectedAdvancePaymentObj.paid_amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-1">
                      <span className="font-bold text-green-800">Available:</span>
                      <span className="font-bold text-green-800">${advanceAvailable.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Amount to Apply */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Amount to Apply *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued">
                $
              </span>
              <input
                type="number"
                value={amountToApply}
                onChange={(e) => setAmountToApply(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                step="0.01"
                min="0"
                max={Math.min(rentDue, advanceAvailable)}
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-between text-sm text-subdued mt-2">
              <span>Rent due: ${rentDue.toLocaleString()}</span>
              <span>Advance available: ${advanceAvailable.toLocaleString()}</span>
            </div>
          </div>

          {/* Calculation Preview */}
          {(selectedRentPayment && selectedAdvance) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-3">Calculation Preview</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Current Rent Due:</span>
                  <span className="font-medium">${rentDue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-700">Advance to Apply:</span>
                  <span className="font-bold text-green-700">
                    -${(parseFloat(amountToApply) || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-300 pt-2 mt-2">
                  <span className="font-bold text-gray-900">New Rent Due:</span>
                  <span className={`font-bold text-lg ${
                    (rentDue - (parseFloat(amountToApply) || 0)) === 0 
                      ? 'text-green-700' 
                      : 'text-gray-900'
                  }`}>
                    ${(rentDue - (parseFloat(amountToApply) || 0)).toLocaleString()}
                  </span>
                </div>
                
                {/* Status indicators */}
                <div className="mt-4 space-y-2">
                  {(parseFloat(amountToApply) || 0) >= rentDue && (
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle size={16} />
                      <span className="text-sm">This will fully pay the selected rent payment</span>
                    </div>
                  )}
                  
                  {(parseFloat(amountToApply) || 0) < rentDue && (
                    <div className="flex items-center gap-2 text-yellow-700">
                      <AlertCircle size={16} />
                      <span className="text-sm">Rent payment will remain partially paid</span>
                    </div>
                  )}
                  
                  {(parseFloat(amountToApply) || 0) >= advanceAvailable && (
                    <div className="flex items-center gap-2 text-blue-700">
                      <Shield size={16} />
                      <span className="text-sm">This will use all available advance</span>
                    </div>
                  )}
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
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedRentPayment || !selectedAdvance || !amountToApply || isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Applying...
                </>
              ) : (
                <>
                  <Shield size={16} />
                  Apply Advance Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyAdvancePaymentModal;