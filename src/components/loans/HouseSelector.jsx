import React, { useState, useMemo } from 'react';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { ChevronDown, Loader2, Check, Building, BookUser } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import debounce from 'lodash/debounce';
import { useAuth } from '../../hooks';
import { useGetHousesQuery, useGetManagedOwnersQuery } from '../../store/api/houseApi';

/**
 * Dedicated house selector for Loans (and other) pages.
 * - House owner: simple dropdown (their houses, limit 100).
 * - Admin (staff/web_owner/developer): filter by owner + searchable house dropdown using GET /houses.
 */
const HouseSelector = ({ value, onChange, label, className = '', placeholder }) => {
  const { t } = useTranslation();
  const { isHouseOwner } = useAuth();

  const [adminOwnerId, setAdminOwnerId] = useState('');
  const [debouncedOwnerSearch, setDebouncedOwnerSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const debouncedSetOwnerSearch = useMemo(
    () => debounce((v) => setDebouncedOwnerSearch(v), 400),
    []
  );
  const debouncedSetSearch = useMemo(
    () => debounce((v) => setDebouncedSearch(v), 400),
    []
  );

  const handleOwnerSearchChange = (e) => debouncedSetOwnerSearch(e.target.value);
  const handleHouseSearchChange = (e) => debouncedSetSearch(e.target.value);

  // —— House owner: simple list
  const { data: ownerHousesData } = useGetHousesQuery(
    { page: 1, limit: 100 },
    { skip: !isHouseOwner }
  );
  const ownerHouses = ownerHousesData?.data || [];

  // —— Admin: managed owners with search
  const { data: ownersData, isLoading: ownersLoading } = useGetManagedOwnersQuery(
    { search: debouncedOwnerSearch || '', limit: 50, page: 1 },
    { skip: isHouseOwner }
  );
  const owners = useMemo(() => ownersData?.data || [], [ownersData?.data]);

  // —— Admin: houses with filters
  const { data: adminHousesData, isLoading: adminHousesLoading } = useGetHousesQuery(
    {
      page: 1,
      limit: 50,
      search: debouncedSearch || undefined,
      ownerId: adminOwnerId || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    { skip: isHouseOwner }
  );
  const adminHouses = useMemo(() => adminHousesData?.data || [], [adminHousesData?.data]);

  const selectedHouseId = value === undefined || value === null ? '' : String(value);

  // Resolve selected house for display (admin combobox)
  const selectedHouse = useMemo(() => {
    if (!selectedHouseId) return null;
    return adminHouses.find((h) => String(h.id) === selectedHouseId) || null;
  }, [selectedHouseId, adminHouses]);

  const selectedOwner = useMemo(() => {
    if (!adminOwnerId) return null;
    return owners.find((o) => String(o.id) === adminOwnerId) || null;
  }, [adminOwnerId, owners]);

  const displayLabel = label ?? t('select_house') ?? 'Select House';

  // —— House owner: simple dropdown
  if (isHouseOwner) {
    return (
      <div className={className}>
        {displayLabel && (
          <label className="block text-sm font-medium text-gray-700 mb-1">{displayLabel}</label>
        )}
        <select
          value={selectedHouseId}
          onChange={(e) => onChange(e.target.value)}
          className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 bg-white"
        >
          <option value="">{t('select_house') || 'Select house'}</option>
          {ownerHouses.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name || h.address || `House #${h.id}`}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // —— Admin: filter row + searchable combobox
  return (
    <div className={`space-y-3 ${className}`}>
      {displayLabel && (
        <label className="block text-sm font-medium text-gray-700">{displayLabel}</label>
      )}

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Searchable house owner dropdown */}
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {t('house_owners') || 'House Owner'}
          </label>
          <Combobox
            value={selectedOwner}
            onChange={(owner) => setAdminOwnerId(owner ? String(owner.id) : '')}
          >
            <div className="relative">
              <div className="relative w-full">
                <ComboboxInput
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 bg-white text-sm"
                  placeholder={t('search_owners_placeholder') || 'Search by name or email...'}
                  displayValue={(owner) =>
                    owner ? owner.name || owner.email || `#${owner.id}` : ''
                  }
                  onChange={handleOwnerSearchChange}
                />
                <ComboboxButton className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                  <ChevronDown className="h-5 w-5" />
                </ComboboxButton>
              </div>
              <ComboboxOptions className="absolute z-50 mt-1 w-full max-h-60 bg-white border border-gray-200 rounded-lg shadow-lg overflow-auto">
                {ownersLoading ? (
                  <div className="flex items-center justify-center py-6 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : owners.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-500 text-sm">
                    {t('no_owners_found') || 'No owners found'}
                  </div>
                ) : (
                  owners.map((owner) => (
                    <ComboboxOption
                      key={owner.id}
                      value={owner}
                      className={({ active }) =>
                        `px-4 py-2.5 cursor-pointer text-sm ${active ? 'bg-primary/10 text-primary' : 'text-gray-900'}`
                      }
                    >
                      {({ selected }) => (
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <BookUser className="h-4 w-4 text-gray-400 shrink-0" />
                            <div className="min-w-0">
                              <div className={`font-medium truncate ${selected ? 'text-primary' : ''}`}>
                                {owner.name || owner.email || `#${owner.id}`}
                              </div>
                              {owner.email && owner.name && (
                                <div className="text-xs text-gray-500 truncate">{owner.email}</div>
                              )}
                            </div>
                          </div>
                          {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </div>
                      )}
                    </ComboboxOption>
                  ))
                )}
              </ComboboxOptions>
            </div>
          </Combobox>
        </div>

        {/* Searchable house dropdown */}
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {t('house') || 'House'}
          </label>
          <Combobox
            value={selectedHouse}
            onChange={(house) => onChange(house ? String(house.id) : '')}
          >
            <div className="relative">
              <div className="relative w-full">
                <ComboboxInput
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 bg-white text-sm"
                  placeholder={placeholder ?? (t('search_houses_placeholder') ?? 'Search by name or address...')}
                  displayValue={(house) =>
                    house ? house.name || house.address || `House #${house.id}` : ''
                  }
                  onChange={handleHouseSearchChange}
                />
                <ComboboxButton className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                  <ChevronDown className="h-5 w-5" />
                </ComboboxButton>
              </div>
              <ComboboxOptions className="absolute z-50 mt-1 w-full max-h-60 bg-white border border-gray-200 rounded-lg shadow-lg overflow-auto">
                {adminHousesLoading ? (
                  <div className="flex items-center justify-center py-6 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : adminHouses.length === 0 ? (
                  <div className="px-4 py-6 text-center text-gray-500 text-sm">
                    {t('no_properties_found') || 'No properties found'}
                  </div>
                ) : (
                  adminHouses.map((house) => (
                    <ComboboxOption
                      key={house.id}
                      value={house}
                      className={({ active }) =>
                        `px-4 py-2.5 cursor-pointer text-sm ${active ? 'bg-primary/10 text-primary' : 'text-gray-900'}`
                      }
                    >
                      {({ selected }) => (
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Building className="h-4 w-4 text-gray-400 shrink-0" />
                            <div className="min-w-0">
                              <div className={`font-medium truncate ${selected ? 'text-primary' : ''}`}>
                                {house.name || house.address || `House #${house.id}`}
                              </div>
                              {house.address && house.name && (
                                <div className="text-xs text-gray-500 truncate">{house.address}</div>
                              )}
                            </div>
                          </div>
                          {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </div>
                      )}
                    </ComboboxOption>
                  ))
                )}
              </ComboboxOptions>
            </div>
          </Combobox>
        </div>
      </div>
    </div>
  );
};

export default HouseSelector;
