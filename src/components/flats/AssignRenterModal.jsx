// components/flats/AssignRenterModal.jsx
import React, { useState } from 'react';
import { Search, X, User } from 'lucide-react';
import { useAssignRenterMutation } from '../../store/api/flatApi';
import { useGetAvailableRentersQuery } from '../../store/api/renterApi'; // Fixed import
import { format } from 'date-fns';
import { toast } from 'react-toastify'; // Add toast

const AssignRenterModal = ({ open, onClose, flat }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRenter, setSelectedRenter] = useState(null);

  // Fixed: Use the correct query and pass params as object
  const { 
    data: response, 
    isLoading, 
    refetch 
  } = useGetAvailableRentersQuery(
    { 
      houseId: flat?.house_id,
      search: searchTerm 
    }, 
    { 
      skip: !flat || !open,
      refetchOnMountOrArgChange: true 
    }
  );

  // Extract renters from response - handle different response structures
  const availableRenters = response?.data || response || [];

  const [assignRenter, { isLoading: isAssigning }] = useAssignRenterMutation();

  // Filter renters client-side if backend doesn't support search param
  const filteredRenters = availableRenters.filter(renter =>
    renter.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    renter.phone?.includes(searchTerm) ||
    renter.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    renter.nid?.includes(searchTerm)
  );

  const calculateNextDueDate = () => {
    if (!flat || !selectedRenter) return null;
    
    const today = new Date();
    let dueDate = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      flat.should_pay_rent_day
    );
    
    if (today.getDate() > flat.should_pay_rent_day) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    
    return dueDate;
  };

  const handleAssign = async () => {
    if (!selectedRenter || !flat) return;
    
    try {
      await assignRenter({
        flatId: flat.id,
        renterId: selectedRenter.id
      }).unwrap();
      
      toast.success(`Renter "${selectedRenter.name}" assigned to flat successfully`);
      onClose();
      setSelectedRenter(null);
      setSearchTerm('');
    } catch (error) {
      console.error('Failed to assign renter:', error);
      toast.error(`Failed to assign renter: ${error?.data?.error || error.message}`);
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing available renters...');
  };

  const nextDueDate = calculateNextDueDate();

  if (!open || !flat) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-subdued/20 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text">Assign Renter to Flat</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-subdued/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Flat Details */}
          <div className="bg-subdued/5 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-medium text-text">Flat Details</h3>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="text-sm text-primary hover:text-primary/80 disabled:opacity-50"
              >
                Refresh List
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-subdued">Name</p>
                <p className="font-medium">{flat.number ? `Flat ${flat.number}` : flat.name}</p>
              </div>
              <div>
                <p className="text-sm text-subdued">Monthly Rent</p>
                <p className="font-bold">${flat.rent_amount?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-subdued">Rent Due Day</p>
                <p>Day {flat.should_pay_rent_day}</p>
              </div>
              <div>
                <p className="text-sm text-subdued">Late Fee</p>
                <p>{flat.late_fee_percentage || 5}%</p>
              </div>
            </div>
          </div>

          {/* Renter Search */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Search Renter
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                placeholder="Type name, phone, email, or NID..."
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-subdued hover:text-text"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Renter List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                <p className="text-sm text-subdued">Loading available renters...</p>
              </div>
            ) : filteredRenters.length === 0 ? (
              <div className="text-center py-8 text-subdued">
                <User className="mx-auto mb-3 text-subdued/50" size={48} />
                <p className="mb-2">
                  {searchTerm ? 'No renters found matching your search' : 'No available renters found'}
                </p>
                <p className="text-sm">
                  {searchTerm ? 'Try a different search term' : 'All renters are currently assigned or no renters exist'}
                </p>
              </div>
            ) : (
              filteredRenters.map((renter) => (
                <div
                  key={renter.id}
                  onClick={() => setSelectedRenter(renter)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedRenter?.id === renter.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-subdued/20 hover:bg-subdued/5 hover:border-subdued/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="text-primary" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-text truncate">{renter.name}</p>
                        {renter.status === 'inactive' && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 mt-1">
                        {renter.phone && (
                          <span className="text-sm text-subdued truncate">
                            📱 {renter.phone}
                          </span>
                        )}
                        {renter.email && (
                          <span className="text-sm text-subdued truncate">
                            ✉️ {renter.email}
                          </span>
                        )}
                        {renter.nid && (
                          <span className="text-xs text-subdued truncate">
                            🆔 NID: {renter.nid}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Selected Renter Info */}
          {selectedRenter && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-in fade-in">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-blue-800">Selected Renter</h4>
                <button
                  onClick={() => setSelectedRenter(null)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="text-blue-600" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-blue-900 truncate">{selectedRenter.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedRenter.phone && (
                      <span className="text-sm text-blue-700">
                        📱 {selectedRenter.phone}
                      </span>
                    )}
                    {selectedRenter.email && (
                      <span className="text-sm text-blue-700">
                        ✉️ {selectedRenter.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {nextDueDate && (
                <div className="mt-3 p-3 bg-white rounded border border-blue-100">
                  <p className="text-sm text-blue-800">
                    First rent payment will be due on{' '}
                    <span className="font-bold">
                      {format(nextDueDate, 'dd MMM yyyy')}
                    </span>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Amount: <span className="font-semibold">${flat.rent_amount?.toLocaleString()}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-subdued/20">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-subdued/30 rounded-lg hover:bg-subdued/10 transition-colors"
              disabled={isAssigning}
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedRenter || isAssigning}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isAssigning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Assigning...
                </>
              ) : (
                'Assign Renter'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignRenterModal;