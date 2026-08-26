import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight, Home, Mail, Phone, Plus,
} from 'lucide-react';
import Modal from '../../../../components/common/Modal';
import HoverCard from '../../../../components/common/HoverCard';
import CreateHouseFormContent from '../../../../components/admin/house/CreateHouseFormContent';
import { formatCurrency } from '../../../../utils/format';

const money = (n) => formatCurrency(Number(n ?? 0));
const date = (d) => {
  if (!d) return '–';
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString();
};

/** One label/value line inside a hover card. */
const Fact = ({ label, value, tone = 'text-gray-900' }) => (
  <div className="flex items-baseline justify-between gap-3 text-xs">
    <span className="text-gray-500 shrink-0">{label}</span>
    <span className={`font-medium text-right truncate ${tone}`}>{value}</span>
  </div>
);

const CardLink = ({ to, children }) => (
  <Link
    to={to}
    className="mt-2.5 flex items-center justify-center gap-1 rounded-lg bg-primary/10 px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
  >
    {children}
    <ArrowUpRight className="h-3.5 w-3.5" />
  </Link>
);

const StatusPill = ({ status }) => {
  const tone = status === 'active'
    ? 'bg-green-50 text-green-700'
    : status === 'inactive'
      ? 'bg-gray-100 text-gray-600'
      : 'bg-amber-50 text-amber-700';
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${tone}`}>{status}</span>;
};

const FlatCard = ({ flat, house }) => (
  <>
    <div className="flex items-baseline justify-between gap-2 mb-2">
      <p className="font-semibold text-gray-900 truncate">{flat.name || `Flat ${flat.id}`}</p>
      {flat.number && <span className="text-[11px] font-mono text-gray-400 shrink-0">#{flat.number}</span>}
    </div>
    <div className="space-y-1">
      <Fact label="House" value={house?.name || '–'} />
      <Fact label="Floor" value={flat.floor ?? '–'} />
      <Fact label="Monthly rent" value={money(flat.rent_amount)} />
      <Fact
        label="Occupancy"
        value={flat.renterName || 'Vacant'}
        tone={flat.renterName ? 'text-gray-900' : 'text-gray-400'}
      />
      <Fact
        label="Outstanding"
        value={money(flat.outstanding)}
        tone={flat.outstanding > 0 ? 'text-red-600' : 'text-gray-900'}
      />
      {flat.unsettledCount > 0 && (
        <Fact
          label="Unpaid invoices"
          value={flat.overdueCount > 0 ? `${flat.unsettledCount} (${flat.overdueCount} overdue)` : flat.unsettledCount}
          tone={flat.overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}
        />
      )}
      <Fact label="Next payment" value={date(flat.nextPaymentDate)} />
      <Fact label="Last paid" value={date(flat.lastPaidDate)} />
    </div>
    <CardLink to={`/flats/${flat.id}`}>View flat</CardLink>
  </>
);

const RenterCard = ({ flat, house }) => (
  <>
    <div className="flex items-center justify-between gap-2 mb-2">
      <p className="font-semibold text-gray-900 truncate">{flat.renterName}</p>
      {flat.renterStatus && <StatusPill status={flat.renterStatus} />}
    </div>
    <div className="space-y-1">
      {flat.renterPhone && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Phone className="h-3 w-3 shrink-0 text-gray-400" />
          <span className="truncate">{flat.renterPhone}</span>
        </div>
      )}
      {flat.renterEmail && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Mail className="h-3 w-3 shrink-0 text-gray-400" />
          <span className="truncate">{flat.renterEmail}</span>
        </div>
      )}
      {!flat.renterPhone && !flat.renterEmail && (
        <p className="text-xs text-gray-400">No contact details on file</p>
      )}
      <div className="pt-1 space-y-1 border-t border-gray-100 mt-1.5">
        <Fact label="Lives in" value={`${flat.name || `Flat ${flat.id}`}${flat.number ? ` · #${flat.number}` : ''}`} />
        <Fact label="House" value={house?.name || '–'} />
        <Fact label="Rent" value={money(flat.rent_amount)} />
        <Fact
          label="Owes"
          value={money(flat.outstanding)}
          tone={flat.outstanding > 0 ? 'text-red-600' : 'text-gray-900'}
        />
      </div>
    </div>
    {/* The renter has no page of its own — /renters opens the list and `view` pops the
        matching renter's modal, which is the convention the flat overview already uses. */}
    <CardLink to={`/renters?view=${flat.renterId}`}>View renter</CardLink>
  </>
);

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
            const occupied = house.occupiedFlats ?? houseFlats.filter((f) => f.renterId).length;
            const vacant = house.vacantFlats ?? houseFlats.length - occupied;

            return (
              <div key={house.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/houses/${house.id}`}
                      className="font-medium text-gray-900 hover:text-primary hover:underline"
                    >
                      {house.name || 'Unnamed'}
                    </Link>
                    <div className="text-sm text-gray-500 mt-1">{house.address || '–'}</div>
                  </div>
                  {!house.active && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-gray-100 text-gray-600">
                      Inactive
                    </span>
                  )}
                </div>

                {/* The numbers someone opens this page to find, without having to add up a
                    column of flats themselves. */}
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Flats', value: house.flatCount ?? houseFlats.length },
                    { label: 'Occupied', value: `${occupied} / ${vacant} vacant` },
                    { label: 'Monthly rent', value: money(house.monthlyRent ?? houseFlats.reduce((n, f) => n + Number(f.rent_amount || 0), 0)) },
                    {
                      label: 'Outstanding',
                      value: money(house.outstanding),
                      tone: house.outstanding > 0 ? 'text-red-600' : 'text-gray-900',
                    },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg bg-gray-50 px-2.5 py-2 min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">{s.label}</p>
                      <p className={`text-sm font-semibold truncate ${s.tone || 'text-gray-900'}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {houseFlats.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-100">
                          <th className="py-1.5 pr-3 font-medium">Flat</th>
                          <th className="py-1.5 pr-3 font-medium">Floor</th>
                          <th className="py-1.5 pr-3 font-medium">Rent</th>
                          <th className="py-1.5 pr-3 font-medium">Renter</th>
                          <th className="py-1.5 font-medium text-right">Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {houseFlats.map((flat) => (
                          <tr key={flat.id} className="border-b border-gray-50 last:border-0">
                            <td className="py-2 pr-3">
                              <HoverCard
                                ariaLabel={`Details for ${flat.name || `flat ${flat.id}`}`}
                                card={<FlatCard flat={flat} house={house} />}
                                className="font-medium text-gray-900"
                              >
                                {flat.name || flat.number || flat.id}
                                {flat.number && <span className="ml-1.5 text-xs font-mono text-gray-400">#{flat.number}</span>}
                              </HoverCard>
                            </td>
                            <td className="py-2 pr-3 text-gray-600">{flat.floor ?? '–'}</td>
                            <td className="py-2 pr-3 text-gray-700 tabular-nums">{money(flat.rent_amount)}</td>
                            <td className="py-2 pr-3">
                              {/* renterId, not renterName: a flat can carry a name with no id
                                  behind it, and a card whose only purpose is a link needs the
                                  id to build one. */}
                              {flat.renterId ? (
                                <HoverCard
                                  ariaLabel={`Details for ${flat.renterName}`}
                                  card={<RenterCard flat={flat} house={house} />}
                                  className="text-green-700"
                                >
                                  {flat.renterName}
                                </HoverCard>
                              ) : flat.renterName ? (
                                <span className="text-green-700">{flat.renterName}</span>
                              ) : (
                                <span className="text-gray-400">Vacant</span>
                              )}
                            </td>
                            <td className={`py-2 text-right tabular-nums ${flat.outstanding > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                              {money(flat.outstanding)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
