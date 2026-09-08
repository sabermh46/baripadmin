import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
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
  ChevronDown,
} from 'lucide-react';
import { Listbox } from '@headlessui/react';
import { z } from 'zod';
import { useRecordExpenseMutation, useUpdateExpenseMutation } from '../../store/api/reportApi';
import HouseSelector from '../../components/common/HouseSelector';
import useDefaultHouse from '../../hooks/useDefaultHouse';
import TkSymbol from '../../components/common/TkSymbol';

/**
 * Categories and payment methods carry a translation key rather than a finished label, so the
 * dropdowns follow the language switcher like the rest of the app. The `value` is what the
 * database enum accepts and must not be translated.
 */
const expenseCategories = [
  { value: 'maintenance', key: 'maintenance', icon: '🔧' },
  { value: 'utility', key: 'utility', icon: '💡' },
  { value: 'repair', key: 'repair', icon: '🛠️' },
  { value: 'tax', key: 'tax', icon: '💰' },
  { value: 'salary', key: 'salary', icon: '👨‍💼' },
  { value: 'loan', key: 'loan', icon: '🏦' },
  { value: 'other', key: 'other', icon: '📝' },
];

const paymentMethods = [
  { value: 'cash', key: 'cash', icon: '💵' },
  { value: 'bank', key: 'bank', icon: '🏦' },
  { value: 'mobile_banking', key: 'mobile_banking', icon: '📱' },
  { value: 'other', key: 'other', icon: '💳' },
];

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

const inputClass =
  'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 '
  + 'focus:ring-primary-500 focus:border-primary-500 outline-none transition';

const labelClass = 'flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5';

const RecordExpenseFormFields = ({
  onSuccess = () => {},
  onCancel,
  defaultHouseId,
  expense = null,
}) => {
  const { t } = useTranslation();
  const isEdit = Boolean(expense);

  const findBy = (list, value, fallbackIndex = 0) =>
    list.find((item) => item.value === value) || list[fallbackIndex];

  const [selectedCategory, setSelectedCategory] = useState(
    findBy(expenseCategories, expense?.category),
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    findBy(paymentMethods, expense?.payment_method),
  );

  const [recordExpense, { isLoading: isRecording }] = useRecordExpenseMutation();
  const [updateExpense, { isLoading: isUpdating }] = useUpdateExpenseMutation();
  const isLoading = isRecording || isUpdating;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      // Seeded at mount, which is why the wrapper below waits for the houses query and then
      // mounts this keyed on the result. Setting it from an effect once the query resolved
      // would leave a window where the picker showed a house that the form had not
      // registered — and zod would refuse to submit with "House selection is required"
      // while a house was plainly selected on screen.
      house_id: expense?.house_id ?? (defaultHouseId ? Number(defaultHouseId) : undefined),
      // An edit prefills from the row; a new expense defaults to today. `amount` is kept
      // absolute here because the stored value for a loan is negative (see the note below
      // the amount field) and showing a minus sign in the input would invite double-negation.
      expense_date: expense?.expense_date || format(new Date(), 'yyyy-MM-dd'),
      amount: expense ? Math.abs(Number(expense.amount)) : 0,
      category: expense?.category || 'maintenance',
      payment_method: expense?.payment_method || 'cash',
      description: expense?.description || '',
      receipt_url: expense?.receipt_url || '',
    },
  });

  const houseId = watch('house_id');
  const category = watch('category');
  const description = watch('description');

  const onSubmit = async (formData) => {
    try {
      let finalAmount = formData.amount;
      if (formData.category === 'loan') {
        finalAmount = -Math.abs(formData.amount);
      }

      // The mutation takes the house id as `houseId` and interpolates it into the URL, but
      // the form field is `house_id`. Spreading formData straight through left houseId
      // undefined and produced POST /houses/undefined/expenses — which cannot match any
      // route, since the backend constrains that segment with whereNumber.
      const { house_id: selectedHouseId, ...rest } = formData;

      const payload = { houseId: selectedHouseId, ...rest, amount: finalAmount };

      if (isEdit) {
        await updateExpense({ ...payload, expenseId: expense.id }).unwrap();
        toast.success(t('expense_updated'));
      } else {
        await recordExpense(payload).unwrap();
        toast.success(t('expense_recorded'));
        // Keeps the house — recording several expenses against one property in a row is the
        // normal case, and a bare reset() would drop it back to nothing.
        reset({
          house_id: selectedHouseId,
          expense_date: format(new Date(), 'yyyy-MM-dd'),
          amount: 0,
          category: 'maintenance',
          payment_method: 'cash',
          description: '',
          receipt_url: '',
        });
        setSelectedCategory(expenseCategories[0]);
        setSelectedPaymentMethod(paymentMethods[0]);
      }

      onSuccess();
    } catch (error) {
      toast.error(apiErrorMessage(
        error,
        isEdit ? t('failed_to_update_expense') : t('failed_to_record_expense'),
      ));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Property */}
      <div>
        <label className={labelClass}>
          <Building className="w-4 h-4 text-primary" />
          {t('select_property')}
        </label>
        <HouseSelector
          label={null}
          value={houseId ? String(houseId) : ''}
          onChange={(id) => setValue('house_id', id ? Number(id) : undefined, { shouldValidate: true })}
        />
        {errors.house_id && <p className="mt-1 text-xs text-red-600">{errors.house_id.message}</p>}
      </div>

      {/* Amount + date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            <Banknote className="w-4 h-4 text-gray-400" />
            {t('amount')}
          </label>
          <div className="relative">
            {/* Taka, not a dollar sign. Every other amount in the app renders through
                TkSymbol; this form was the one place asking for expenses in dollars. */}
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              <TkSymbol />
            </span>
            <input
              type="number"
              step="0.01"
              className={`${inputClass} pl-9`}
              placeholder="0.00"
              // The field defaults to 0 so zod always sees a number; selecting on focus means
              // typing replaces it rather than producing "0500".
              onFocus={(e) => e.target.select()}
              {...register('amount', { valueAsNumber: true })}
            />
          </div>
          {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
          {category === 'loan' && (
            <p className="mt-1 text-xs text-amber-600">{t('loan_negative_note')}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>
            <Calendar className="w-4 h-4 text-gray-400" />
            {t('expense_date')}
          </label>
          <input type="date" className={inputClass} {...register('expense_date')} />
          {errors.expense_date && (
            <p className="mt-1 text-xs text-red-600">{errors.expense_date.message}</p>
          )}
        </div>
      </div>

      {/* Category + payment method */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            <Tag className="w-4 h-4 text-gray-400" />
            {t('category')}
          </label>
          <Listbox
            value={selectedCategory}
            onChange={(cat) => {
              setSelectedCategory(cat);
              setValue('category', cat.value, { shouldValidate: true });
            }}
          >
            <div className="relative">
              <Listbox.Button className={`${inputClass} text-left pr-9`}>
                <span className="flex items-center gap-2">
                  <span>{selectedCategory.icon}</span>
                  <span>{t(selectedCategory.key)}</span>
                </span>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </Listbox.Button>
              <Listbox.Options className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto py-1">
                {expenseCategories.map((cat) => (
                  <Listbox.Option
                    key={cat.value}
                    value={cat}
                    className={({ active }) =>
                      `px-3 py-2 cursor-pointer flex items-center gap-2 text-sm ${
                        active ? 'bg-primary/10 text-primary' : 'text-gray-900'
                      }`
                    }
                  >
                    {({ selected }) => (
                      <>
                        <span>{cat.icon}</span>
                        <span className="flex-1">{t(cat.key)}</span>
                        {selected && <Check className="h-4 w-4 text-primary" />}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
          <input type="hidden" {...register('category')} />
          {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>}
        </div>

        <div>
          <label className={labelClass}>
            <CreditCard className="w-4 h-4 text-gray-400" />
            {t('payment_method')}
          </label>
          <Listbox
            value={selectedPaymentMethod}
            onChange={(method) => {
              setSelectedPaymentMethod(method);
              setValue('payment_method', method.value, { shouldValidate: true });
            }}
          >
            <div className="relative">
              <Listbox.Button className={`${inputClass} text-left pr-9`}>
                <span className="flex items-center gap-2">
                  <span>{selectedPaymentMethod.icon}</span>
                  <span>{t(selectedPaymentMethod.key)}</span>
                </span>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </Listbox.Button>
              <Listbox.Options className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto py-1">
                {paymentMethods.map((method) => (
                  <Listbox.Option
                    key={method.value}
                    value={method}
                    className={({ active }) =>
                      `px-3 py-2 cursor-pointer flex items-center gap-2 text-sm ${
                        active ? 'bg-primary/10 text-primary' : 'text-gray-900'
                      }`
                    }
                  >
                    {({ selected }) => (
                      <>
                        <span>{method.icon}</span>
                        <span className="flex-1">{t(method.key)}</span>
                        {selected && <Check className="h-4 w-4 text-primary" />}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
          <input type="hidden" {...register('payment_method')} />
          {errors.payment_method && (
            <p className="mt-1 text-xs text-red-600">{errors.payment_method.message}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>
          <FileText className="w-4 h-4 text-gray-400" />
          {t('description')}
        </label>
        <textarea
          rows={2}
          className={`${inputClass} resize-none`}
          placeholder={t('description_placeholder')}
          {...register('description')}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{errors.description
            ? <span className="text-red-600">{errors.description.message}</span>
            : t('description_hint')}</span>
          <span>{description?.length || 0}/500</span>
        </div>
      </div>

      {/* Receipt URL */}
      <div>
        <label className={labelClass}>
          <Upload className="w-4 h-4 text-gray-400" />
          {t('receipt_url_optional')}
        </label>
        <input
          type="url"
          className={inputClass}
          placeholder="https://example.com/receipt.jpg"
          {...register('receipt_url')}
        />
        {errors.receipt_url
          ? <p className="mt-1 text-xs text-red-600">{errors.receipt_url.message}</p>
          : <p className="mt-1 text-xs text-gray-500">{t('receipt_url_hint')}</p>}
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-gray-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2.5 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            {t('cancel')}
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2.5 text-sm bg-primary text-white font-semibold rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="animate-spin h-4 w-4" />}
          {isLoading
            ? (isEdit ? t('saving') : t('recording'))
            : (isEdit ? t('update_expense') : t('record_expense'))}
        </button>
      </div>
    </form>
  );
};

/**
 * Mount gate, so the form's defaultValues can carry the owner's house.
 *
 * react-hook-form reads defaultValues once at mount and the house list arrives from a query,
 * so the form has to be mounted after the answer is known and remounted if it changes. Same
 * shape as RenterForm's gate.
 *
 * The key also carries the expense id, so opening Edit on a different row re-seeds the fields
 * instead of showing the previously edited values.
 */
const RecordExpenseForm = (props) => {
  const { t } = useTranslation();
  const { defaultHouseId, isReady } = useDefaultHouse();

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        <Loader2 className="animate-spin h-4 w-4 mr-2" />
        {t('loading_properties')}
      </div>
    );
  }

  return (
    <RecordExpenseFormFields
      key={props.expense?.id || defaultHouseId || 'none'}
      defaultHouseId={defaultHouseId}
      {...props}
    />
  );
};

export default RecordExpenseForm;
