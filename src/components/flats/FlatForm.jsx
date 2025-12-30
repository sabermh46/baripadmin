// components/flats/FlatForm.jsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import {
  useCreateFlatMutation,
  useUpdateFlatMutation
} from '../../store/api/flatApi';
import { toast } from 'react-toastify';

const flatSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  number: z.string().optional(),
  rent_amount: z.coerce.number().positive('Rent amount must be positive'),
  should_pay_rent_day: z.coerce.number().min(1).max(31, 'Day must be between 1-31'),
  late_fee_percentage: z.coerce.number().min(0).max(100).default(5),
  metadata: z.string().optional(),
});

const FlatForm = ({ open, onClose, houseId, flat }) => {
  const isEdit = !!flat;
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(flatSchema),
    defaultValues: {
      name: '',
      number: '',
      rent_amount: '',
      should_pay_rent_day: 10,
      late_fee_percentage: 5,
      metadata: '',
    }
  });

  const [createFlat] = useCreateFlatMutation();
  const [updateFlat] = useUpdateFlatMutation();

useEffect(() => {
    if (flat) {
      reset({
        name: flat.name ?? '',
        number: flat.number ?? '',
        rent_amount: flat.rent_amount ?? '',
        // Use ?? to allow 0 or other falsy but valid numbers
        should_pay_rent_day: flat.should_pay_rent_day ?? 10,
        late_fee_percentage: flat.late_fee_percentage ?? 5,
        metadata: flat.metadata ?? '',
      });
    } else {
      // It's good practice to reset to empty/defaults when not editing
      reset({
        name: '',
        number: '',
        rent_amount: '',
        should_pay_rent_day: 10,
        late_fee_percentage: 5,
        metadata: '',
      });
    }
  }, [flat, reset]);

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await updateFlat({ id: flat.id, ...data }).unwrap();
      } else {
        await createFlat({ houseId, ...data }).unwrap();
      }
      toast.success(`Flat ${isEdit ? 'updated' : 'created'} successfully`);
      onClose();
      reset();
    } catch (error) {
      toast.error(`Failded to save flat: ${error?.data?.error || error.message}`);
      console.error('Failed to save flat:', error);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-subdued/20 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text">
              {isEdit ? 'Edit Flat' : 'Add New Flat'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-subdued/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Flat Name *
              </label>
              <input
                {...register('name')}
                className="w-full px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                placeholder="Enter flat name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Flat Number
              </label>
              <input
                {...register('number')}
                className="w-full px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                placeholder="e.g., 101"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Monthly Rent *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued">
                  $
                </span>
                <input
                  {...register('rent_amount')}
                  type="number"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                  placeholder="0.00"
                />
              </div>
              {errors.rent_amount && (
                <p className="mt-1 text-sm text-red-600">{errors.rent_amount.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Rent Due Day (1-31) *
              </label>
              <input
                {...register('should_pay_rent_day')}
                type="number"
                min="1"
                max="31"
                className="w-full px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              />
              {errors.should_pay_rent_day && (
                <p className="mt-1 text-sm text-red-600">{errors.should_pay_rent_day.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Late Fee Percentage
              </label>
              <div className="relative">
                <input
                  {...register('late_fee_percentage')}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-full pr-10 pl-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-subdued">
                  %
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Additional Notes
            </label>
            <textarea
              {...register('metadata')}
              rows={3}
              className="w-full px-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
              placeholder="Any additional information about the flat..."
            />
          </div>

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
                  {isEdit ? 'Updating...' : 'Creating...'}
                </span>
              ) : isEdit ? (
                'Update Flat'
              ) : (
                'Create Flat'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FlatForm;