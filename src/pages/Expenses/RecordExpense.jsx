import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { 
  Building, 
  Calendar, 
  DollarSign, 
  FileText, 
  CreditCard, 
  Tag,
  Upload,
  Loader2,
  Check,
  ChevronDown
} from 'lucide-react';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions, Listbox } from '@headlessui/react';
import { z } from 'zod';
import { useRecordExpenseMutation } from '../../store/api/reportApi';
import { useGetHousesQuery } from '../../store/api/houseApi';

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

const RecordExpenseForm = ({ onSuccess = () => {} }) => {
  const [houseSearch, setHouseSearch] = useState('');
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(expenseCategories[0]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(paymentMethods[0]);
  // Fetch houses
  const { data: housesData, isLoading: housesLoading } = useGetHousesQuery({
    page: 1,
    limit: 50,
    ...(houseSearch ? { search: houseSearch } : {}),
  });

  const houses = housesData?.data || [];
  console.log(houses);
  

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
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      category: 'maintenance',
      payment_method: 'cash',
    },
  });
  

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
        house_id: selectedHouse?.id || formData.house_id,
      };

      await recordExpense(expenseData).unwrap();
      
      toast.success('Expense recorded successfully!');
      reset();
      onSuccess();
      setSelectedHouse(null);
      setSelectedCategory(expenseCategories[0]);
      setSelectedPaymentMethod(paymentMethods[0]);
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to record expense');
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
        {/* House Selection */}
        {
          houses && (
            <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            <Building className="inline-block w-4 h-4 mr-2 text-orange-500" />
            Select Property
          </label>
          
          <Combobox
            value={selectedHouse}
            onChange={(house) => {
              setSelectedHouse(house);
              setValue('house_id', house?.id);
            }}
          >
            <div className="relative">
              <div className="relative w-full">
                <ComboboxInput
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-200 outline-none transition"
                  placeholder="Type to search properties..."
                  // This is crucial for the display
                  displayValue={(house) => house?.name || ''} 
                  onChange={(e) => setHouseSearch(e.target.value)}
                />
                <ComboboxButton className="absolute right-3 top-3.5">
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                </ComboboxButton>
              </div>
              
              {/* 3. SHOW OPTIONS IMMEDIATELY */}
              <ComboboxOptions className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto">
                {housesLoading ? (
                  <div className="px-4 py-6 text-center text-gray-500">
                    <Loader2 className="animate-spin h-5 w-5 mx-auto mb-2" />
                    Loading...
                  </div>
                ) : houses.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-500">No properties found</div>
                ) : (
                  houses.map((house) => (
                    <ComboboxOption
                      key={house.id}
                      value={house}
                      className={({ active }) =>
                        `px-4 py-3 cursor-pointer ${active ? 'bg-orange-50 text-orange-700' : 'text-gray-900'}`
                      }
                    >
                      {({ selected }) => (
                        <div className="flex justify-between items-center">
                          <div>
                            <div className={`font-medium ${selected ? 'text-orange-600' : ''}`}>{house.name}</div>
                            <div className="text-xs opacity-70">{house.address}</div>
                          </div>
                          {selected && <Check className="h-4 w-4 text-orange-600" />}
                        </div>
                      )}
                    </ComboboxOption>
                  ))
                )}
              </ComboboxOptions>
            </div>
          </Combobox>
          {errors.house_id && <p className="text-xs text-red-500 font-medium">{errors.house_id.message}</p>}
        </div>
          )
        }

        {/* Amount and Date Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <DollarSign className="inline-block w-4 h-4 mr-2" />
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                $
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

export default RecordExpenseForm;