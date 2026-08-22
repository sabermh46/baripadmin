import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, Plus } from 'lucide-react';
import Modal from '../../../../components/common/Modal';
import CreateHouseFormContent from '../../../../components/admin/house/CreateHouseFormContent';

const HousesSection = ({ houses = [], archivedHouses = [], flats = [], ownerId, ownerName, onSuccess }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const flatByHouseId = React.useMemo(() => {
    const map = {};
    (flats || []).forEach((f) => {
      const hid = f.house_id ?? f.houseId;
      if (hid) {
        if (!map[hid]) map[hid] = [];
        map[hid].push(f);
      }
    });
    return map;
  }, [flats]);

  // There used to be an effect here firing onSuccess({section:'houses'}) whenever `houses`
  // or `flats` changed. The parent answers that by refetching the owner — so the effect
  // announced "the data changed", the parent fetched, the fetch changed the data, and the
  // effect fired again. An unbounded refetch loop, and eventually an uncaught "Cannot
  // refetch a query that has not been started yet" that took the whole page white.
  //
  // onSuccess means "a house was actually created" and is raised from the modal below,
  // which is the only moment the owner genuinely needs reloading.

  return (
    <section className="bg-surface rounded-xl border border-subdued/20 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
          <Home className="h-4 w-4" />
          Houses ({houses?.length ?? 0})
        </h3>
        {ownerId && (
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create new house
          </button>
        )}
      </div>
      <div className="space-y-3">
        {/* An archived house is not "no houses assigned" — it is a house one click away from
            coming back, and this is the page someone opens to find out what happened to it. */}
        {archivedHouses.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-900">
              {archivedHouses.length === 1 ? '1 archived house' : `${archivedHouses.length} archived houses`}
            </p>
            <ul className="mt-1 space-y-0.5">
              {archivedHouses.map((h) => (
                <li key={h.id} className="text-xs text-amber-800">
                  {h.name}
                  {h.deletedAt ? ` · archived ${new Date(h.deletedAt).toLocaleDateString()}` : ''}
                </li>
              ))}
            </ul>
            <Link to="/houses/archived" className="inline-block mt-1.5 text-xs font-semibold text-amber-900 underline">
              Restore from archived houses
            </Link>
          </div>
        )}

        {!houses?.length ? (
          <p className="text-sm text-gray-500 py-2">
            {archivedHouses.length > 0 ? 'No active houses' : 'No houses assigned'}
          </p>
        ) : (
          houses.map((house) => {
            const houseFlats = house.flats ?? flatByHouseId[house.id] ?? [];
            return (
              <div
                key={house.id}
                className="border border-gray-200 rounded-lg p-4 bg-white"
              >
                <div className="font-medium text-gray-900">{house.name || 'Unnamed'}</div>
                <div className="text-sm text-gray-500 mt-1">{house.address || '–'}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {house.flatCount ?? houseFlats.length} flats ·{' '}
                  {house.active ? 'Active' : 'Inactive'}
                </div>
                {houseFlats.length > 0 && (
                  <div className="mt-3 pl-3 border-l-2 border-gray-100 space-y-2">
                    <div className="text-xs font-medium text-gray-600 uppercase">Flats</div>
                    {houseFlats.map((flat) => (
                      <div
                        key={flat.id}
                        className="text-sm text-gray-700 flex flex-wrap items-center gap-x-3 gap-y-1"
                      >
                        <span className="font-medium">{flat.name || flat.number || flat.id}</span>
                        {flat.number && <span className="text-gray-500">#{flat.number}</span>}
                        {flat.rent_amount != null && (
                          <span>Rent: {Number(flat.rent_amount).toLocaleString()}</span>
                        )}
                        {flat.renterName ? (
                          <span className="text-green-700">
                            Renter: {flat.renterName} ({flat.renterStatus || '–'})
                          </span>
                        ) : (
                          <span className="text-gray-400">Vacant</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Property"
        subtitle={ownerName ? `Creating house for ${ownerName}` : undefined}
        size="xl"
      >
        <CreateHouseFormContent
          ownerId={ownerId}
          ownerName={ownerName}
          onSuccess={() => onSuccess?.({ section: 'houses' })}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </Modal>
    </section>
  );
};

export default HousesSection;
