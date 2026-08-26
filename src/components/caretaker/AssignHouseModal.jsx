import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import { useGetHousesQuery } from '../../store/api/houseApi';
import { useAssignCaretakerToHouseMutation } from '../../store/api/caretakerApi';
import { apiErrorMessage } from '../../utils/apiError';
import { showMessageInLanguage } from '../../utils/showMessageInLanguage';

/** The same short list the request form offers, in the same plain wording. */
const ASKABLE = [
  { key: 'flats.view', labelKey: 'perm_see_flats' },
  { key: 'renters.view', labelKey: 'perm_see_renters' },
  { key: 'payments.view', labelKey: 'perm_see_payments' },
  { key: 'payments.create', labelKey: 'perm_record_payments' },
  { key: 'notices.create', labelKey: 'perm_post_notices' },
  { key: 'maintenance.create', labelKey: 'perm_log_maintenance' },
];

const input =
  'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none';

/**
 * Put a caretaker on a house.
 *
 * POST /caretakers/{id}/assign and its RTK mutation have both existed all along; what did not
 * exist was anywhere to press. The "No active assignments" empty state linked to
 * /caretakers/:id/assign — a route with no entry in AppRoutes and no component behind it — so
 * the one action that resolves that empty state fell through to the catch-all.
 *
 * This matters most right after a caretaker is created: the account exists and the owner has
 * been told about it, but until it is placed on a house it can do nothing.
 */
const AssignHouseModal = ({ caretakerId, caretakerName, isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [assign, { isLoading }] = useAssignCaretakerToHouseMutation();
  const { data: housesData } = useGetHousesQuery({ page: 1, limit: 100 }, { skip: !isOpen });

  const [houseId, setHouseId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [permissions, setPermissions] = useState(['flats.view', 'renters.view']);

  const houses = housesData?.data ?? [];

  const submit = async (e) => {
    e.preventDefault();
    if (!houseId) return toast.error(t('select_a_house'));

    try {
      await assign({
        caretakerId,
        houseId: Number(houseId),
        permissions,
        expiresAt: expiresAt || undefined,
      }).unwrap();
      toast.success(t('caretaker_assigned_to_house'));
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(showMessageInLanguage(apiErrorMessage(err, t('failed_to_assign_caretaker'))));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('assign_to_a_house')} subtitle={caretakerName} size="md">
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="block text-xs font-medium text-gray-700 mb-1">{t('house')}</span>
          <select value={houseId} onChange={(e) => setHouseId(e.target.value)} className={input} required>
            <option value="">{t('select_a_house')}</option>
            {houses.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </label>

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
        </div>

        <label className="block">
          <span className="block text-xs font-medium text-gray-700 mb-1">
            {t('access_until')} <span className="text-gray-400 font-normal">· {t('optional')}</span>
          </span>
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={input} />
          <span className="block text-[11px] text-gray-400 mt-1">{t('access_until_hint')}</span>
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
            {t('assign')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignHouseModal;
