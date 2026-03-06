import React, { useEffect } from 'react';
import { Home } from 'lucide-react';

const HousesSection = ({ houses = [], flats = [], onSuccess }) => {
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

  useEffect(() => {
    if (onSuccess) onSuccess({ section: 'houses', data: { houses, flats } });
  }, [houses, flats, onSuccess]);

  return (
    <section className="bg-surface rounded-xl border border-subdued/20 p-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-3">
        <Home className="h-4 w-4" />
        Houses ({houses?.length ?? 0})
      </h3>
      <div className="space-y-3">
        {!houses?.length ? (
          <p className="text-sm text-gray-500 py-2">No houses assigned</p>
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
    </section>
  );
};

export default HousesSection;
