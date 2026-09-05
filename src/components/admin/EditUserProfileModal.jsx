import React, { useState } from 'react';
import { X, Loader2, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useUpdateUserMutation } from '../../store/api/authApi';
import { apiErrorMessage } from '../../utils/apiError';

/**
 * Edit a user's profile, as an admin.
 *
 * Shared rather than living beside one page: it is reachable from the house-owner LIST and
 * from the detail page, and "I could not find the edit button" is what happens when an
 * action only exists on the screen the author happened to be looking at.
 *
 * Deliberately narrow — name, email, phone, status, language. Role is not here: moving
 * someone between roles changes what they can see, and folding that into a form used to fix
 * a typo is how an account ends up with permissions nobody chose. Password is not here
 * either; an admin who sets one knows it, which is what the reset link avoids.
 *
 * The email field carries a warning because it is not just a contact detail — it is the
 * login identifier, and every receipt and password reset goes to it.
 */

const Field = ({ label, hint, error, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
    {children}
    {error ? (
      <p className="mt-1 text-xs text-red-600 flex items-start gap-1.5">
        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
        <span>{error}</span>
      </p>
    ) : hint ? (
      <p className="mt-1 text-[11px] text-gray-400">{hint}</p>
    ) : null}
  </div>
);

const inputClass = (invalid) =>
  `w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors ${
    invalid
      ? 'border-red-300 bg-red-50 focus:border-red-400'
      : 'border-gray-200 focus:border-orange-300 focus:ring-2 focus:ring-orange-100'
  }`;

const EditProfileModalBody = ({ profile, onClose, isSelf }) => {
  const [updateUser, { isLoading }] = useUpdateUserMutation();
  const [form, setForm] = useState({
    name: profile.name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    status: profile.status || 'active',
    locale: profile.locale || 'en',
  });
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const emailChanged = form.email.trim() !== (profile.email || '');

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await updateUser({
        userId: profile.id,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        status: form.status,
        locale: form.locale,
      }).unwrap();

      const changed = res?.data?.changed ?? [];
      toast.success(changed.length ? `Saved — updated ${changed.join(', ')}.` : 'No changes to save.');
      // No refresh callback needed: the mutation invalidates ManagedUsers, which is what
      // feeds this page, so the parent refetches on its own. The section's onSuccess hook
      // only acts on the 'houses' section and would have been a silent no-op here.
      onClose();
    } catch (err) {
      // 409s from the duplicate-email and duplicate-phone guards are the common case, and
      // they are worth showing in the form rather than a toast that vanishes.
      setError(apiErrorMessage(err, 'Could not save the profile.'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <form onSubmit={submit} className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Edit profile</h3>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Full name">
            <input value={form.name} onChange={set('name')} required maxLength={150} className={inputClass(false)} />
          </Field>

          <Field
            label="Email"
            hint={emailChanged ? undefined : 'Used to sign in, and where receipts and password resets are sent.'}
            error={emailChanged ? 'Changing this changes how they sign in. They will need to use the new address.' : undefined}
          >
            <input type="email" value={form.email} onChange={set('email')} required className={inputClass(false)} />
          </Field>

          <Field label="Phone" hint="Used for SMS. Leave blank to remove it.">
            <input value={form.phone} onChange={set('phone')} maxLength={50} className={inputClass(false)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Status"
              hint={isSelf ? 'You cannot change your own status.' : 'Inactive accounts cannot sign in.'}
            >
              <select value={form.status} onChange={set('status')} disabled={isSelf} className={`${inputClass(false)} disabled:bg-gray-50`}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </Field>

            <Field label="Language">
              <select value={form.locale} onChange={set('locale')} className={inputClass(false)}>
                <option value="en">English</option>
                <option value="bn">বাংলা</option>
              </select>
            </Field>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white bg-primary hover:bg-primary/90 disabled:opacity-40"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save changes
          </button>
        </div>
      </form>
    </div>
  );
};

/**
 * Mounted only while open, so the form seeds from the profile at mount rather than syncing
 * props into state with an effect — the pattern the rest of this codebase settled on.
 */
const EditUserProfileModal = ({ open, ...rest }) => (open ? <EditProfileModalBody {...rest} /> : null);

export default EditUserProfileModal;
