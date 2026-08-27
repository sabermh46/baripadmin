import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { apiErrorMessage } from '../../utils/apiError';
import { 
  Building, 
  Calendar, 
  Banknote, 
  FileText, 
  CreditCard, 
  Tag,
  Upload,
  Loader2,
  Check,
  ChevronDown
} from 'lucide-react';
import { Listbox } from '@headlessui/react';
import { z } from 'zod';
import { useRecordExpenseMutation } from '../../store/api/reportApi';
import HouseSelector from '../../components/common/HouseSelector';
import useDefaultHouse from '../../hooks/useDefaultHouse';
import TkSymbol from '../../components/common/TkSymbol';

// Define categories and payment methods
const expenseCategories = [
  { value: 'maintenance', label: 'Maintenance', icon: '🔧' },
  { value: 'utility', label: 'Utility Bill', icon: '💡' },
  { value: 'repair', label: 'Repair', icon: '🛠️' },
  { value: 'tax', label: 'Tax', icon: '💰' },
  { value: 'salary', label: 'Salary', icon: '👨‍💼' },
  { value: 'loan', label: 'Loan (Money Taken)', icon: '🏦' },
  { value: 'other', label: 'Other', icon: '📝' }
];

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'bank', label: 'Bank Transfer', icon: '🏦' },
  { value: 'mobile_banking', label: 'Mobile Banking', icon: '📱' },
  { value: 'other', label: 'Other', icon: '💳' }
];

// Create validation schema
const expenseSchema = z.object({
  house_id: z.number().int().min(1, 'House selection is required'),
  category: z.string().min(1, 'Category is required'),
  amount: z.number()
    .positive('Amount must be positive')
    .min(1, 'Amount must be at least 1'),
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description cannot exceed 500 characters'),
  expense_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid date is required',
  }),
  payment_method: z.string().min(1, 'Payment method is required'),
  receipt_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

const RecordExpenseFormFields = ({ onSuccess = () => {}, defaultHouseId }) => {
  const [selectedCategory, setSelectedCategory] = useState(expenseCategories[0]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(paymentMethods[0]);

  // Record expense mutation
  const [recordExpense, { isLoading }] = useRecordExpenseMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      // Seeded at mount, which is why the wrapper below waits for the houses query and then
      // mounts this keyed on the result. Setting it from an effect once the query resolved
      // would leave a window where the picker showed a house that the form had not
      // registered — and zod would refuse to submit with "House selection is required"
      // while a house was plainly selected on screen.
      house_id: defaultHouseId ? Number(defaultHouseId) : undefined,
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      category: 'maintenance',
      payment_method: 'cash',
    },
  });

  const houseId = watch('house_id');

  const onSubmit = async (formData) => {
    try {
      // Check if category is loan, then make amount negative
      let finalAmount = formData.amount;
      if (formData.category === 'loan') {
        finalAmount = -Math.abs(formData.amount);
      }

      const expenseData = {
        ...formData,
        amount: finalAmount,
      };

      await recordExpense(expenseData).unwrap();

      toast.success('Expense recorded successfully!');
      // Keeps the house — recording several expenses against one property in a row is the
      // normal case, and reset() would otherwise drop it back to nothing.
      reset({
        house_id: formData.house_id,
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        amount: 0,
        category: 'maintenance',
        payment_method: 'cash',
      });
      onSuccess();
      setSelectedCategory(expenseCategories[0]);
      setSelectedPaymentMethod(paymentMethods[0]);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to record expense'));
      console.error('Expense recording error:', error);
    }
  };

  
  

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Record New Expense</h1>
        <p className="text-gray-600 mt-2">Track and manage property expenses efficiently</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* House Selection.
            Was a bespoke search-as-you-type combobox that fed every keystroke straight into
            GET /houses with no debounce — a request and a loading spinner per letter — and
            that offered an owner with two properties a search box to find them in. Worse for
            an admin: it searched every house on the platform with no way to narrow by owner,
            so "Block A" returned Block A from four different customers, indistinguishable.

            HouseSelector is the component that already solves both: a plain dropdown for an
            owner, and a debounced owner filter + house search for an admin. */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            <Building className="inline-block w-4 h-4 mr-2 text-orange-500" />
            Select Property
          </label>

          <HouseSelector
            label={null}
            value={houseId ? String(houseId) : ''}
            onChange={(id) => setValue('house_id', id ? Number(id) : undefined, { shouldValidate: true })}
          />
          {errors.house_id && <p className="text-xs text-red-500 font-medium">{errors.house_id.message}</p>}
        </div>

        {/* Amount and Date Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Banknote className="inline-block w-4 h-4 mr-2" />
              Amount
            </label>
            <div className="relative">
              {/* Taka, not a dollar sign. Every other amount in the app renders through
                  TkSymbol; this form was the one place asking for expenses in dollars. */}
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                <TkSymbol />
              </span>
              <input
                type="number"
                step="0.01"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                placeholder="0.00"
                {...register('amount', { valueAsNumber: true })}
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
            )}
            {watch('category') === 'loan' && (
              <p className="text-amber-600 text-sm mt-1">
                ⓘ This amount will be recorded as negative (loan received)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Calendar className="inline-block w-4 h-4 mr-2" />
              Expense Date
            </label>
            <input
              type="date"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              {...register('expense_date')}
            />
            {errors.expense_date && (
              <p className="mt-1 text-sm text-red-600">{errors.expense_date.message}</p>
            )}
          </div>
        </div>

        {/* Category and Payment Method Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Tag className="inline-block w-4 h-4 mr-2" />
              Category
            </label>
            <Listbox
              value={selectedCategory}
              onChange={(cat) => {
                setSelectedCategory(cat);
                setValue('category', cat.value);
              }}
            >
              <div className="relative">
                <Listbox.Button className="relative w-full px-4 py-3 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{selectedCategory.icon}</span>
                    <span>{selectedCategory.label}</span>
                  </span>
                  <ChevronDown className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" />
                </Listbox.Button>
                <Listbox.Options className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {expenseCategories.map((category) => (
                    <Listbox.Option
                      key={category.value}
                      value={category}
                      className={({ active }) =>
                        `px-4 py-3 cursor-pointer flex items-center gap-3 ${active ? 'bg-primary-50 text-primary-700' : 'text-gray-900'}`
                      }
                    >
                      {({ selected }) => (
                        <>
                          <span className="text-lg">{category.icon}</span>
                          <span className="flex-1">{category.label}</span>
                          {selected && <Check className="h-5 w-5 text-primary-600" />}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>
            <input type="hidden" {...register('category')} />
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <CreditCard className="inline-block w-4 h-4 mr-2" />
              Payment Method
            </label>
            <Listbox
              value={selectedPaymentMethod}
              onChange={(method) => {
                setSelectedPaymentMethod(method);
                setValue('payment_method', method.value);
              }}
            >
              <div className="relative">
                <Listbox.Button className="relative w-full px-4 py-3 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{selectedPaymentMethod.icon}</span>
                    <span>{selectedPaymentMethod.label}</span>
                  </span>
                  <ChevronDown className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" />
                </Listbox.Button>
                <Listbox.Options className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {paymentMethods.map((method) => (
                    <Listbox.Option
                      key={method.value}
                      value={method}
                      className={({ active }) =>
                        `px-4 py-3 cursor-pointer flex items-center gap-3 ${active ? 'bg-primary-50 text-primary-700' : 'text-gray-900'}`
                      }
                    >
                      {({ selected }) => (
                        <>
                          <span className="text-lg">{method.icon}</span>
                          <span className="flex-1">{method.label}</span>
                          {selected && <Check className="h-5 w-5 text-primary-600" />}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>
            <input type="hidden" {...register('payment_method')} />
            {errors.payment_method && (
              <p className="mt-1 text-sm text-red-600">{errors.payment_method.message}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            <FileText className="inline-block w-4 h-4 mr-2" />
            Description
          </label>
          <textarea
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition resize-none"
            placeholder="Enter expense details, notes, or any relevant information..."
            {...register('description')}
          />
          <div className="flex justify-between text-sm text-gray-500">
            <span>Add clear details for future reference</span>
            <span>{watch('description')?.length || 0}/500</span>
          </div>
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* Receipt URL (Optional) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            <Upload className="inline-block w-4 h-4 mr-2" />
            Receipt URL (Optional)
          </label>
          <input
            type="url"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            placeholder="https://example.com/receipt.jpg"
            {...register('receipt_url')}
          />
          <p className="text-sm text-gray-500">Link to uploaded receipt or document</p>
          {errors.receipt_url && (
            <p className="mt-1 text-sm text-red-600">{errors.receipt_url.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Recording Expense...
              </>
            ) : (
              'Record Expense'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

/**
 * Mount gate, so the form's defaultValues can carry the owner's house.
 *
 * react-hook-form reads defaultValues once at mount and the house list arrives from a query,
 * so the form has to be mounted after the answer is known and remounted if it changes. Same
 * shape as RenterForm's gate.
 */
const RecordExpenseForm = (props) => {
  const { defaultHouseId, isReady } = useDefaultHouse();

  if (!isReady) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6 flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="animate-spin h-5 w-5 mr-2" />
        Loading properties...
      </div>
    );
  }

  return <RecordExpenseFormFields key={defaultHouseId || 'none'} defaultHouseId={defaultHouseId} {...props} />;
};

export default RecordExpenseForm;