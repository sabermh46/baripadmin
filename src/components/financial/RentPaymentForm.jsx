// components/financial/RentPaymentForm.jsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  DollarSign, Calendar, CreditCard, Receipt, 
  Upload, X, CheckCircle, AlertCircle 
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useRecordRentPaymentMutation } from '../../store/api/financialApi';

const paymentMethodOptions = [
  { value: 'cash', label: 'Cash', icon: DollarSign },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
  { value: 'check', label: 'Check', icon: '📄' },
  { value: 'mobile_payment', label: 'Mobile Payment', icon: '📱' },
  { value: 'other', label: 'Other', icon: '🔧' },
];

const paymentStatusOptions = [
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800' },
  { value: 'partial', label: 'Partial', color: 'bg-blue-100 text-blue-800' },
];

const rentPaymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  paidAmount: z.coerce.number().min(0, 'Paid amount must be positive'),
  dueDate: z.string().min(1, 'Due date is required'),
  paidDate: z.string().optional(),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  transactionId: z.string().optional(),
  status: z.enum(['paid', 'pending', 'overdue', 'partial']).default('paid'),
  lateFeeAmount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  receiptFile: z.any().optional(),
  calculateNextPayment: z.boolean().default(true),
});

const RentPaymentForm = ({ open, onClose, flat, renter }) => {
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  console.log(flat);
  
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(rentPaymentSchema),
    defaultValues: {
      amount: flat?.rent_amount || 0,
      paidAmount: flat?.rent_amount || 0,
      dueDate: new Date().toISOString().split('T')[0],
      paidDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      status: 'paid',
      lateFeeAmount: 0,
      notes: '',
      calculateNextPayment: true,
    }
  });

  const [recordPayment, { isLoading }] = useRecordRentPaymentMutation();

  const amount = watch('amount');
  const paidAmount = watch('paidAmount');
  const lateFeeAmount = watch('lateFeeAmount');
  const paymentMethod = watch('paymentMethod');
  const status = watch('status');

  const calculateLateFee = () => {
    if (!flat || !amount) return;
    
    const dueDate = new Date(watch('dueDate'));
    const paidDate = new Date(watch('paidDate') || new Date());
    const daysLate = Math.max(0, Math.ceil((paidDate - dueDate) / (1000 * 60 * 60 * 24)));
    
    if (daysLate > 0 && flat.late_fee_percentage) {
      const lateFee = (amount * flat.late_fee_percentage / 100) * daysLate;
      setValue('lateFeeAmount', parseFloat(lateFee.toFixed(2)));
    } else {
      setValue('lateFeeAmount', 0);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      
      // Append all form data
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
          if (key === 'receiptFile' && receiptFile) {
            formData.append('receipt', receiptFile);
          } else if (key === 'calculateNextPayment') {
            // Map the camelCase form key to the snake_case backend key
            formData.append('calculate_next_payment', data[key]);
          } else if (key !== 'receiptFile') {
            formData.append(key, data[key]);
          }
        }
      });

      // Add flat and renter info
      formData.append('flatId', flat.id);
      formData.append('renterId', renter.id);
      formData.append('houseId', flat.house_id);

      await recordPayment(formData).unwrap();
      
      toast.success('Rent payment recorded successfully!');
      onClose();
      reset();
      setReceiptFile(null);
      setReceiptPreview(null);
    } catch (error) {
      toast.error(`Failed to record payment: ${error?.data?.error || error.message}`);
      console.error('Payment recording error:', error);
    }
  };

  const totalAmount = parseFloat(amount || 0) + parseFloat(lateFeeAmount || 0);
  const balanceDue = totalAmount - parseFloat(paidAmount || 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400">
        <div className="sticky top-0 bg-surface border-b border-subdued/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text">Record Rent Payment</h2>
              <p className="text-sm text-subdued mt-1">
                Flat: {flat?.number ? `Flat ${flat.number}` : flat?.name}
                {renter && ` • Renter: ${renter.name}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-subdued/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Amount Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Rent Amount *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued" size={20} />
                <input
                  {...register('amount')}
                  type="number"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Amount Paid *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued" size={20} />
                <input
                  {...register('paidAmount')}
                  type="number"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                  placeholder="0.00"
                />
              </div>
              {errors.paidAmount && (
                <p className="mt-1 text-sm text-red-600">{errors.paidAmount.message}</p>
              )}
            </div>
          </div>

          {/* Dates Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Due Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued" size={20} />
                <input
                  {...register('dueDate')}
                  type="date"
                  className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                />
              </div>
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600">{errors.dueDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Payment Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued" size={20} />
                <input
                  {...register('paidDate')}
                  type="date"
                  className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setValue('paidDate', new Date().toISOString().split('T')[0])}
                className="text-xs text-primary mt-1 hover:underline"
              >
                Set to today
              </button>
            </div>
          </div>

          {/* Payment Method & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Payment Method *
              </label>
              <select
                {...register('paymentMethod')}
                className="w-full px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              >
                {paymentMethodOptions.map(method => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
              {errors.paymentMethod && (
                <p className="mt-1 text-sm text-red-600">{errors.paymentMethod.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Payment Status
              </label>
              <select
                {...register('status')}
                className="w-full px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              >
                {paymentStatusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Late Fee Calculation */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-yellow-800 flex items-center gap-2">
                <AlertCircle size={18} />
                Late Fee Calculation
              </h3>
              <button
                type="button"
                onClick={calculateLateFee}
                disabled={isCalculating}
                className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200 disabled:opacity-50"
              >
                Calculate
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-yellow-700 mb-1">
                  Late Fee Percentage
                </label>
                <input
                  value={`${flat?.late_fee_percentage || 0}%`}
                  disabled
                  className="w-full px-3 py-2 bg-white border border-yellow-300 rounded text-yellow-800"
                />
              </div>
              
              <div>
                <label className="block text-sm text-yellow-700 mb-1">
                  Late Fee Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-600" size={16} />
                  <input
                    {...register('lateFeeAmount')}
                    type="number"
                    step="0.01"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-yellow-300 rounded text-yellow-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Transaction ID (Optional)
              </label>
              <input
                {...register('transactionId')}
                className="w-full px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                placeholder="e.g., TXN123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Total Amount
              </label>
              <div className="p-3 bg-subdued/5 rounded-lg border border-subdued/20">
                <p className="text-2xl font-bold text-text">
                  ${totalAmount.toFixed(2)}
                </p>
                <p className="text-sm text-subdued">
                  Rent: ${parseFloat(amount || 0).toFixed(2)} + Late Fee: ${lateFeeAmount}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-subdued/20 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Calendar size={20} />
                </div>
                <div>
                <p className="text-sm font-medium text-text">Schedule Next Payment</p>
                <p className="text-xs text-subdued">Automatically create next month's pending invoice</p>
                </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
                <input 
                type="checkbox" 
                {...register('calculateNextPayment')} 
                className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-subdued/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Balance Due */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-800">Balance Due</p>
                <p className={`text-2xl font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${Math.abs(balanceDue).toFixed(2)}
                  {balanceDue > 0 ? ' (Due)' : balanceDue < 0 ? ' (Overpaid)' : ' (Paid in full)'}
                </p>
              </div>
              {balanceDue === 0 && (
                <CheckCircle className="text-green-600" size={32} />
              )}
            </div>
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Upload Receipt (Optional)
            </label>
            {receiptPreview ? (
              <div className="relative">
                <div className="border-2 border-dashed border-green-300 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Receipt className="text-green-600" />
                      <span className="font-medium text-green-800">
                        {receiptFile?.name || 'Receipt uploaded'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  {receiptFile?.type?.startsWith('image/') && (
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="max-h-32 mx-auto rounded border"
                    />
                  )}
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-subdued/30 rounded-lg cursor-pointer bg-background hover:bg-subdued/5 transition-colors">
                <div className="flex flex-col items-center justify-center">
                  <Upload className="w-8 h-8 mb-2 text-subdued" />
                  <p className="text-sm text-subdued">Upload payment receipt</p>
                  <p className="text-xs text-subdued mt-1">PNG, JPG, PDF up to 5MB</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Notes (Optional)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              placeholder="Any additional notes about this payment..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-subdued/20">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-subdued/30 rounded-lg hover:bg-subdued/10 transition-colors"
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {(isSubmitting || isLoading) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Recording...
                </>
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

export default RentPaymentForm;