// components/flats/AssignRenterModal.jsx
import React, { useState } from 'react';
import { Search, X, User } from 'lucide-react';
import { useAssignRenterMutation } from '../../store/api/flatApi';
import { useGetAvailableRentersQuery } from '../../store/api/flatApi';
import { format } from 'date-fns';

const AssignRenterModal = ({ open, onClose, flat }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRenter, setSelectedRenter] = useState(null);

  const { data: availableRenters = [], isLoading } = useGetAvailableRentersQuery(
    flat?.house_id,
    { skip: !flat || !open }
  );

  const [assignRenter, { isLoading: isAssigning }] = useAssignRenterMutation();

  const filteredRenters = availableRenters.filter(renter =>
    renter.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    renter.phone?.includes(searchTerm) ||
    renter.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
      onClose();
      setSelectedRenter(null);
      setSearchTerm('');
    } catch (error) {
      console.error('Failed to assign renter:', error);
    }
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
            <h3 className="font-medium text-text mb-3">Flat Details</h3>
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
                placeholder="Type name, phone, or email..."
              />
            </div>
          </div>

          {/* Renter List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredRenters.length === 0 ? (
              <div className="text-center py-8 text-subdued">
                {searchTerm ? 'No renters found matching your search' : 'No available renters found'}
              </div>
            ) : (
              filteredRenters.map((renter) => (
                <div
                  key={renter.id}
                  onClick={() => setSelectedRenter(renter)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedRenter?.id === renter.id
                      ? 'border-primary bg-primary/5'
                      : 'border-subdued/20 hover:bg-subdued/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="text-primary" size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-text">{renter.name}</p>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {renter.phone && (
                          <span className="text-sm text-subdued">{renter.phone}</span>
                        )}
                        {renter.email && (
                          <span className="text-sm text-subdued">{renter.email}</span>
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Selected Renter</h4>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="text-blue-600" size={24} />
                </div>
                <div>
                  <p className="font-bold text-blue-900">{selectedRenter.name}</p>
                  <p className="text-sm text-blue-700">
                    {selectedRenter.phone && `Phone: ${selectedRenter.phone}`}
                    {selectedRenter.email && ` • Email: ${selectedRenter.email}`}
                  </p>
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
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-subdued/20">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-subdued/30 rounded-lg hover:bg-subdued/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedRenter || isAssigning}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAssigning ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Assigning...
                </span>
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