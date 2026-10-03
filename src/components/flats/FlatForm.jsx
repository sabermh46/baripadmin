// components/flats/FlatForm.jsx
import React, { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import {
  useCreateFlatMutation,
  useUpdateFlatMutation
} from '../../store/api/flatApi';
import { toast } from 'react-toastify';
import { apiErrorMessage } from '../../utils/apiError';
import TkSymbol from '../common/TkSymbol';
import { MAX_FLOOR, MAX_POSITION, composeFlatNumber, parseFlatPosition } from '../../utils/flatPosition';

// An emptied number input is "not given", not 0: floor 0 is the ground floor.
const optionalInt = (min, max, message) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number({ error: message }).int(message).min(min, message).max(max, message).optional()
  );

const flatSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  // The flat number, asked as its two parts: the floor, and the flat's place on that floor.
  // The server composes the number from them (floor 1, flat 1 → "101"), so it is written the
  // same way every time and the building view can place the flat.
  floor: optionalInt(0, MAX_FLOOR, `Floor must be 0 to ${MAX_FLOOR}`),
  unit: optionalInt(1, MAX_POSITION, `Flat must be 1 to ${MAX_POSITION}`),
  rent_amount: z.coerce.number().positive('Rent amount must be positive'),
  // Capped at 28 to match the server, which rejects 29-31 outright: those days do not
  // exist in every month, and update() clamps the stored value with min(day, 28) anyway.
  should_pay_rent_day: z.coerce.number().min(1).max(28, 'Day must be between 1 and 28'),
  late_fee_percentage: z.coerce.number().min(0).max(100).default(5),
  // `metadata` is deliberately absent.
  //
  // It was declared here as z.string() while the API casts it to an array, so every flat
  // (all of them carry at least `metadata: {}`, most carry `amenities`) failed validation
  // with "Expected string, received object". Nothing rendered a metadata input, so the
  // error had nowhere to appear: handleSubmit simply refused to call onSubmit and Update
  // Flat looked like a dead button. The server would have rejected the empty string too.
  //
  // This form does not edit metadata, so it must not send it — the server merges what it
  // is given over the existing value, and amenities live in there.
}).superRefine((v, ctx) => {
  if ((v.floor === undefined) !== (v.unit === undefined)) {
    ctx.addIssue({ code: 'custom', path: [v.floor === undefined ? 'floor' : 'unit'], message: 'Enter both the floor and the flat' });
  }
});

const FlatForm = ({ open, onClose, houseId, flat }) => {
  const isEdit = !!flat;
  
  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(flatSchema),
    defaultValues: {
      name: '',
      floor: '',
      unit: '',
      rent_amount: '',
      should_pay_rent_day: 10,
      late_fee_percentage: 5,
    }
  });

  // The flat's current place, when its number names one. A number that does not ("A1") is
  // kept as it is unless a floor and flat are entered to replace it.
  const initialPlace = useMemo(() => (flat ? parseFlatPosition(flat.number) : null), [flat]);

  const [createFlat] = useCreateFlatMutation();
  const [updateFlat] = useUpdateFlatMutation();

useEffect(() => {
    if (flat) {
      reset({
        name: flat.name ?? '',
        floor: initialPlace?.floor ?? '',
        unit: initialPlace?.position ?? '',
        rent_amount: flat.rent_amount ?? '',
        // Use ?? to allow 0 or other falsy but valid numbers
        should_pay_rent_day: flat.should_pay_rent_day ?? 10,
        late_fee_percentage: flat.late_fee_percentage ?? 5,
      });
    } else {
      // It's good practice to reset to empty/defaults when not editing
      reset({
        name: '',
        floor: '',
        unit: '',
        rent_amount: '',
        should_pay_rent_day: 10,
        late_fee_percentage: 0,
      });
    }
  }, [flat, initialPlace, reset]);

  const [floorValue, unitValue] = useWatch({ control, name: ['floor', 'unit'] });
  const preview = useMemo(() => {
    const f = floorValue === '' ? NaN : Number(floorValue);
    const u = unitValue === '' ? NaN : Number(unitValue);
    if (!Number.isInteger(f) || !Number.isInteger(u) || f < 0 || f > MAX_FLOOR || u < 1 || u > MAX_POSITION) return null;
    // Unchanged: show the number as it stands ("3B" stays "3B"; it is not rewritten as 302).
    if (initialPlace && f === initialPlace.floor && u === initialPlace.position) return flat.number;
    return composeFlatNumber(f, u);
  }, [floorValue, unitValue, initialPlace, flat]);

  /**
   * Every field the form actually draws. react-hook-form blocks submission on any schema
   * error, so a schema key with no corresponding input produces a silent refusal — which is
   * precisely how the metadata bug above presented. If that ever happens again, say so
   * instead of leaving the user clicking a button that does nothing.
   */
  const RENDERED_FIELDS = ['name', 'floor', 'unit', 'rent_amount', 'should_pay_rent_day', 'late_fee_percentage'];

  const onInvalid = (formErrors) => {
    const hidden = Object.keys(formErrors).filter((k) => !RENDERED_FIELDS.includes(k));
    if (hidden.length) {
      toast.error(`Cannot save: ${hidden.join(', ')} failed validation but is not shown on this form.`);
    }
  };

  const onSubmit = async ({ floor, unit, ...data }) => {
    const hasPlace = floor !== undefined && unit !== undefined;
    // The server cannot take a number away, so emptying both fields would save "nothing
    // changed" while looking like it removed the number. Say so instead.
    if (initialPlace && !hasPlace) {
      setError('unit', { type: 'manual', message: 'Enter the floor and the flat' });
      return;
    }
    // Sent only when they change. Untouched, the number is left exactly as written.
    const unchanged = initialPlace && floor === initialPlace.floor && unit === initialPlace.position;
    const payload = hasPlace && !unchanged ? { ...data, floor, unit } : data;

    try {
      if (isEdit) {
        await updateFlat({ id: flat.id, ...payload }).unwrap();
      } else {
        await createFlat({ houseId, ...payload }).unwrap();
      }
      toast.success(`Flat ${isEdit ? 'updated' : 'created'} successfully`);
      onClose();
      reset();
    } catch (error) {
      // 409: another flat in this house already has that floor and flat. Shown at the field
      // as well as in the toast, since that is the thing to change.
      if (error?.status === 409) setError('unit', { type: 'server', message: apiErrorMessage(error) });
      toast.error(apiErrorMessage(error));
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

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="p-6 space-y-6">
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
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="block text-sm font-medium text-text">Flat Number</span>
                {preview && (
                  <span className="text-xs text-subdued">
                    = <span className="font-semibold text-text">{preview}</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="relative block">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-subdued">Floor</span>
                  <input
                    {...register('floor')}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max={MAX_FLOOR}
                    aria-label="Floor"
                    className={`pl-14 pr-3 ${errors.floor ? 'border-red-400' : ''} w-full py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none`}
                    placeholder="1"
                  />
                </label>
                <label className="relative block">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-subdued">Flat</span>
                  <input
                    {...register('unit')}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max={MAX_POSITION}
                    aria-label="Flat on the floor"
                    className={`pl-12 pr-3 ${errors.unit ? 'border-red-400' : ''} w-full py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none`}
                    placeholder="01"
                  />
                </label>
              </div>
              {errors.floor || errors.unit ? (
                <p className="mt-1 text-sm text-red-600">{(errors.floor || errors.unit).message}</p>
              ) : isEdit && flat?.number && !initialPlace ? (
                <p className="mt-1 text-xs text-subdued">
                  Now <span className="font-medium text-text">{flat.number}</span>. Enter a floor and flat to replace it, or leave both empty to keep it.
                </p>
              ) : (
                <p className="mt-1 text-xs text-subdued">Floor 1, flat 1 makes 101. Floor 0 is the ground floor.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Monthly Rent *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued">
                  <TkSymbol />
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
                Rent Due Day (1-28) *
              </label>
              <input
                {...register('should_pay_rent_day')}
                type="number"
                min="1"
                max="28"
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