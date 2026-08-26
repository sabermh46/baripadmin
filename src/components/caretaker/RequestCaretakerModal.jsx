import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Info, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import { useGetHousesQuery } from '../../store/api/houseApi';
import { useCreateUserApprovalMutation } from '../../store/api/userApprovalApi';
import { apiErrorMessage } from '../../utils/apiError';
import { showMessageInLanguage } from '../../utils/showMessageInLanguage';

/**
 * The permissions a house owner can ask for on a caretaker's behalf.
 *
 * A deliberately short list, not the full caretaker catalogue. An owner is choosing what a
 * person may do in their building, not administering a permission matrix — and the admin can
 * still narrow it at approval. Anything outside AppFeeBillingService's allowed keys is
 * dropped server-side regardless.
 */
const ASKABLE = [
  { key: 'flats.view', labelKey: 'perm_see_flats' },
  { key: 'renters.view', labelKey: 'perm_see_renters' },
  { key: 'payments.view', labelKey: 'perm_see_payments' },
  { key: 'payments.create', labelKey: 'perm_record_payments' },
  { key: 'notices.create', labelKey: 'perm_post_notices' },
  { key: 'maintenance.create', labelKey: 'perm_log_maintenance' },
];

const inputClass =
  'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none';

/**
 * A house owner asking for a caretaker account.
 *
 * They cannot create one: POST /auth/create-user is role:web_owner,staff, because a caretaker
 * account carries credentials and access to somebody's property. The Caretakers page used to
 * show owners an "Add caretaker" button anyway — they hold `caretakers.create` — and the form
 * behind it answered 403 with no explanation. This is the step that was missing.
 */
const RequestCaretakerModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [createRequest, { isLoading }] = useCreateUserApprovalMutation();
  const { data: housesData } = useGetHousesQuery({ page: 1, limit: 100 }, { skip: !isOpen });

  const [form, setForm] = useState({ name: '', email: '', phone: '', houseId: '', note: '' });
  const [permissions, setPermissions] = useState(['flats.view', 'renters.view']);

  const houses = housesData?.data ?? [];
  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await createRequest({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        houseId: form.houseId ? Number(form.houseId) : undefined,
        permissions,
        note: form.note.trim() || undefined,
      }).unwrap();
      toast.success(t('caretaker_request_sent'));
      setForm({ name: '', email: '', phone: '', houseId: '', note: '' });
      setPermissions(['flats.view', 'renters.view']);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, t('failed_to_send_request'))));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('request_a_caretaker')} size="md">
      <form onSubmit={submit} className="space-y-4">
        <p className="flex items-start gap-2 text-xs text-blue-900 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          <Info className="h-4 w-4 mt-px shrink-0 text-blue-500" />
          {t('caretaker_request_explainer')}
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-gray-700 mb-1">{t('name')}</span>
            <input type="text" required value={form.name} onChange={set('name')} className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-700 mb-1">{t('email')}</span>
            <input type="email" required value={form.email} onChange={set('email')} className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-700 mb-1">{t('phone')}</span>
            <input type="tel" value={form.phone} onChange={set('phone')} className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-700 mb-1">{t('house')}</span>
            <select value={form.houseId} onChange={set('houseId')} className={inputClass}>
              <option value="">{t('select_a_house')}</option>
              {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </label>
        </div>

        <div>
          <span className="block text-xs font-medium text-gray-700 mb-1.5">{t('what_should_they_be_able_to_do')}</span>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {ASKABLE.map(({ key, labelKey }) => (
              <label
                key={key}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 cursor-pointer text-xs transition-colors ${
                  permissions.includes(key) ? 'border-primary/40 bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={permissions.includes(key)}
                  onChange={(e) =>
                    setPermissions((prev) => (e.target.checked ? [...prev, key] : prev.filter((x) => x !== key)))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40"
                />
                {t(labelKey)}
              </label>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">{t('admin_may_narrow_permissions')}</p>
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-gray-700 mb-1">
            {t('notes')} <span className="text-gray-400 font-normal">· {t('optional')}</span>
          </span>
          <textarea rows={2} value={form.note} onChange={set('note')} className={inputClass} placeholder={t('anything_the_admin_should_know')} />
        </label>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('send_request')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RequestCaretakerModal;
