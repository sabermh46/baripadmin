import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Archive, ArchiveRestore, ArrowLeft, MapPin, User } from 'lucide-react';
import { useGetArchivedHousesQuery, useRestoreHouseMutation } from '../../../store/api/houseApi';
import { apiErrorMessage } from '../../../utils/apiError';
import ConfirmationModal from '../../common/ConfirmationModal';
import { ContentLoader } from '../../common/RouteLoader';

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return '—';
  }
};

/**
 * Archived houses, and the way back.
 *
 * Deleting a house has soft-deleted it for a while — a house anchors flats, renters, rent
 * history, expenses and caretaker assignments, so removing the row would strand all of it.
 * But nothing in the interface listed what had been archived, and nothing called the restore
 * endpoint, so an archived house was simply gone as far as anyone using the app could tell:
 * its owner showed up on the dashboard as having no house, with no way to find out why or
 * undo it.
 */
const ArchivedHouses = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [toRestore, setToRestore] = useState(null);

  const { data, isLoading, refetch } = useGetArchivedHousesQuery({ limit: 50 });
  const [restoreHouse, { isLoading: isRestoring }] = useRestoreHouseMutation();

  const houses = data?.data ?? [];

  const handleRestore = async () => {
    try {
      await restoreHouse(toRestore.id).unwrap();
      toast.success(t('house_restored', { name: toRestore.name }));
      setToRestore(null);
      refetch();
    } catch (err) {
      toast.error(apiErrorMessage(err, t('failed_to_restore_house')));
    }
  };

  if (isLoading) return <ContentLoader />;

  return (
    <div className="space-y-4 max-w-5xl">
      <button
        type="button"
        onClick={() => navigate('/houses')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back_to_houses')}
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('archived_houses')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('archived_houses_hint')}</p>
      </div>

      {houses.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-2xl py-14 text-center bg-white">
          <Archive className="h-7 w-7 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{t('no_archived_houses')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {houses.map((house) => (
            <div
              key={house.id}
              className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-center gap-4"
            >
              <span className="shrink-0 p-2 rounded-lg bg-gray-100 text-gray-500">
                <Archive className="h-4 w-4" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 truncate">{house.name}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                  {house.address && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {house.address}
                    </span>
                  )}
                  {house.owner?.name && (
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {house.owner.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[11px] uppercase tracking-wider text-gray-400">{t('archived_on')}</p>
                <p className="text-sm text-gray-700">{fmtDate(house.deletedAt ?? house.deleted_at)}</p>
              </div>

              <button
                type="button"
                onClick={() => setToRestore(house)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90"
              >
                <ArchiveRestore className="h-4 w-4" />
                {t('restore')}
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!toRestore}
        onClose={() => setToRestore(null)}
        onConfirm={handleRestore}
        title={t('restore_house')}
        message={t('restore_house_confirm', { name: toRestore?.name ?? '' })}
        confirmText={t('restore')}
        isLoading={isRestoring}
        variant="info"
      />
    </div>
  );
};

export default ArchivedHouses;
