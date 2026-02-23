import React, { useState, useEffect } from 'react';
import { Search, X, User, DollarSign, Plus, Trash2, Calendar, CreditCard, FileText, RefreshCcw, Phone, Mail, Check } from 'lucide-react';
import { useAssignRenterMutation } from '../../store/api/flatApi';
import { useGetAvailableRentersQuery } from '../../store/api/renterApi';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import Btn from '../common/Button';

const AssignRenterModal = ({ open, onClose, flat, houseinfo = null, onSuccess = () => {} }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRenter, setSelectedRenter] = useState(null);
  const [amenities, setAmenities] = useState([]);
  const [showAmenitiesEditor, setShowAmenitiesEditor] = useState(false);
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [advancePayments, setAdvancePayments] = useState([]);
  const [showAdvancePaymentForm, setShowAdvancePaymentForm] = useState(false);
  const [currentAdvancePayment, setCurrentAdvancePayment] = useState({
    amount: '',
    paid_amount: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'cash',
    transaction_id: '',
    notes: '',
    description: '',
    for_months: 0
  });

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

  // Extract renters from response
  const availableRenters = response?.data || response || [];

  const [assignRenter, { isLoading: isAssigning }] = useAssignRenterMutation();

  // Initialize amenities from house metadata
  useEffect(() => {
    if (houseinfo?.metadata && open) {
      let houseMetadata = {};
      try {
        houseMetadata = typeof houseinfo.metadata === 'string'
          ? JSON.parse(houseinfo.metadata)
          : houseinfo.metadata || {};
      } catch (e) {
        console.error("Error parsing house metadata:", e);
      }
      
      const houseAmenities = houseMetadata.amenities || [];
      if (Array.isArray(houseAmenities) && houseAmenities.length > 0) {
        const formattedAmenities = houseAmenities.map(amenity => {
          if (typeof amenity === 'string') {
            return { name: amenity, charge: 0 };
          }
          return {
            name: amenity.name || '',
            charge: parseFloat(amenity.charge) || 0
          };
        });
        setAmenities(formattedAmenities);
        setShowAmenitiesEditor(true);
      }
    }
  }, [houseinfo, open]);

  // Set default next payment date
  useEffect(() => {
    // 1. Ensure flat, open, AND the specific property exist
    if (flat && open && flat.should_pay_rent_day) {
      const today = new Date();
      const dayOfMonth = parseInt(flat.should_pay_rent_day, 10);

      // 2. Create the date safely
      let dueDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);

      // 3. Logic: If today is already past the rent day, move to next month
      if (today.getDate() > dayOfMonth) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }

      // 4. Final check before formatting
      if (!isNaN(dueDate.getTime())) {
        setNextPaymentDate(format(dueDate, 'yyyy-MM-dd'));
      } else {
        console.error("Generated an invalid date:", dueDate);
      }
    }
  }, [flat, open]);

  // Filter renters client-side
  const filteredRenters = availableRenters.filter(renter =>
    renter.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    renter.phone?.includes(searchTerm) ||
    renter.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    renter.nid?.includes(searchTerm)
  );

  // Calculate totals
  const baseRent = parseFloat(flat?.rent_amount) || 0;
  const totalAmenitiesCharge = amenities.reduce(
    (sum, amenity) => sum + (parseFloat(amenity.charge) || 0), 
    0
  );
  const totalRent = baseRent + totalAmenitiesCharge;
  const totalAdvance = advancePayments.reduce(
    (sum, payment) => sum + (parseFloat(payment.amount) || 0), 
    0
  );

  // Handle amenities changes
  const handleAddAmenity = () => {
    setAmenities([...amenities, { name: '', charge: 0 }]);
  };

  const handleRemoveAmenity = (index) => {
    const updated = amenities.filter((_, i) => i !== index);
    setAmenities(updated);
  };

  const handleAmenityChange = (index, field, value) => {
    const updated = [...amenities];
    if (field === 'charge') {
      updated[index][field] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setAmenities(updated);
  };

  // Handle advance payment changes
  const handleAdvancePaymentChange = (field, value) => {
    setCurrentAdvancePayment(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddAdvancePayment = () => {
    // Validate
    if (!currentAdvancePayment.amount || parseFloat(currentAdvancePayment.amount) <= 0) {
      toast.error('Please enter a valid advance amount');
      return;
    }

    const newPayment = {
      ...currentAdvancePayment,
      amount: parseFloat(currentAdvancePayment.amount),
      paid_amount: parseFloat(currentAdvancePayment.paid_amount || currentAdvancePayment.amount),
      id: Date.now() // Temporary ID for UI
    };

    setAdvancePayments([...advancePayments, newPayment]);
    
    // Reset form
    setCurrentAdvancePayment({
      amount: '',
      paid_amount: '',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'cash',
      transaction_id: '',
      notes: '',
      description: '',
      for_months: 0
    });
    
    setShowAdvancePaymentForm(false);
    toast.success('Advance payment added');
  };

  const handleRemoveAdvancePayment = (index) => {
    const updated = advancePayments.filter((_, i) => i !== index);
    setAdvancePayments(updated);
  };

  const handleAssign = async () => {
    if (!selectedRenter || !flat) return;
    
    // Validate amenities
    const invalidAmenities = amenities.filter(a => 
      !a.name || !a.name.trim() || a.charge === undefined || a.charge === null
    );
    
    if (invalidAmenities.length > 0) {
      toast.error('Please provide valid name and charge for all amenities');
      return;
    }

    // Validate next payment date
    if (!nextPaymentDate) {
      toast.error('Please select next payment date');
      return;
    }

    try {
      await assignRenter({
        flatId: flat.id,
        renterId: selectedRenter.id,
        amenities: amenities.filter(a => a.name.trim()),
        next_payment_date: nextPaymentDate,
        advance_payments: advancePayments.map(payment => ({
          amount: payment.amount,
          paid_amount: payment.paid_amount,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
          transaction_id: payment.transaction_id,
          notes: payment.notes,
          description: payment.description,
          for_months: payment.for_months
        }))
      }).unwrap();
      
      const successMessage = advancePayments.length > 0
        ? `Renter "${selectedRenter.name}" assigned successfully with ${advancePayments.length} advance payment(s) totaling $${totalAdvance.toLocaleString()}`
        : `Renter "${selectedRenter.name}" assigned successfully`;
      
      toast.success(successMessage);
      onSuccess?.();
      onClose();
      setSelectedRenter(null);
      setSearchTerm('');
      setAmenities([]);
      setShowAmenitiesEditor(false);
      setAdvancePayments([]);
      setNextPaymentDate('');
    } catch (error) {
      console.error('Failed to assign renter:', error);
      toast.error(`Failed to assign renter: ${error?.data?.error || error.message}`);
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing available renters...');
  };

  if (!open || !flat) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface/20 backdrop-blur-sm border-b border-subdued/20 p-4 z-50">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-xl font-bold text-text">Assign Renter to Flat</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-subdued/10 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-1 space-y-4">
          {/* Flat Details & Rent Summary */}
          <div className="p-3">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-medium text-text">Flat Details</h3>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="text-sm text-primary hover:text-primary/80 disabled:opacity-50"
              >
                <RefreshCcw size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-subdued">Name</p>
                <p className="font-medium">{flat.name}</p>
              </div>
              <div>
                <p className="text-sm text-subdued">Flat Number</p>
                <p>{flat.number}</p>
              </div>
              <div>
                <p className="text-sm text-subdued">Base Rent</p>
                <p className="font-bold">${baseRent.toLocaleString()}</p>
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
            
            {/* Next Payment Date Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text mb-2">
                First Payment Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued" size={20} />
                <input
                  type="date"
                  value={nextPaymentDate}
                  onChange={(e) => setNextPaymentDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-subdued/30 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
            </div>
            
            {/* Rent Summary */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-text mb-2">Rent Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-subdued">Base Rent:</span>
                  <span className="font-medium">${baseRent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-subdued">Amenities Charge:</span>
                  <span className="font-medium">${totalAmenitiesCharge.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-bold text-text">Total Monthly Rent:</span>
                  <span className="font-bold text-primary text-lg">${totalRent.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Advance Payments Section */}
          <div className="p-3 m-2 bg-slate-200 rounded-lg">
            <div className="flex justify-between items-center flex-wrap mb-4">
              <h4 className="font-medium text-sm md:text-lg text-text flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Advance Payments
              </h4>
              <Btn
                onClick={() => setShowAdvancePaymentForm(!showAdvancePaymentForm)}
                type="outline"
                disabled={!selectedRenter}
              >
                <Plus className="w-4 h-4" />
              </Btn>
            </div>
            
            {!selectedRenter ? (
              <div className="text-center py-4 text-subdued">
                Select a renter first to add advance payments
              </div>
            ) : (
              <>
                {/* Advance Payment Form */}
                {showAdvancePaymentForm && (
                  <div className="mb-6 p-2 px-3 bg-surface rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="font-medium text-primary">New Advance Payment</h5>
                      <button
                        onClick={() => setShowAdvancePaymentForm(false)}
                        className="text-subdued hover:text-text"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-text mb-1">
                          Amount *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued">$</span>
                          <input
                            type="number"
                            value={currentAdvancePayment.amount}
                            onChange={(e) => handleAdvancePaymentChange('amount', e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-subdued/30 rounded focus:ring-1 focus:ring-primary/50 focus:border-primary outline-none"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-text mb-1">
                          Paid Amount *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued">$</span>
                          <input
                            type="number"
                            value={currentAdvancePayment.paid_amount || currentAdvancePayment.amount}
                            onChange={(e) => handleAdvancePaymentChange('paid_amount', e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-subdued/30 rounded focus:ring-1 focus:ring-primary/50 focus:border-primary outline-none"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-text mb-1">
                          Payment Date *
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued" size={16} />
                          <input
                            type="date"
                            value={currentAdvancePayment.payment_date}
                            onChange={(e) => handleAdvancePaymentChange('payment_date', e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-subdued/30 rounded focus:ring-1 focus:ring-primary/50 focus:border-primary outline-none"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-text mb-1">
                          Payment Method *
                        </label>
                        <select
                          value={currentAdvancePayment.payment_method}
                          onChange={(e) => handleAdvancePaymentChange('payment_method', e.target.value)}
                          className="w-full px-3 py-2 border border-subdued/30 rounded focus:ring-1 focus:ring-primary/50 focus:border-primary outline-none"
                        >
                          <option value="cash">Cash</option>
                          <option value="bank">Bank Transfer</option>
                          <option value="mobile_banking">Mobile Banking</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-text mb-1">
                          Transaction ID
                        </label>
                        <input
                          type="text"
                          value={currentAdvancePayment.transaction_id}
                          onChange={(e) => handleAdvancePaymentChange('transaction_id', e.target.value)}
                          className="w-full px-3 py-2 border border-subdued/30 rounded focus:ring-1 focus:ring-primary/50 focus:border-primary outline-none"
                          placeholder="TRX-123456"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-text mb-1">
                          For Months
                        </label>
                        <input
                          type="number"
                          value={currentAdvancePayment.for_months}
                          onChange={(e) => handleAdvancePaymentChange('for_months', e.target.value)}
                          className="w-full px-3 py-2 border border-subdued/30 rounded focus:ring-1 focus:ring-primary/50 focus:border-primary outline-none"
                          placeholder="0"
                          min="0"
                          step="1"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-text mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={currentAdvancePayment.description}
                          onChange={(e) => handleAdvancePaymentChange('description', e.target.value)}
                          className="w-full px-3 py-2 border border-subdued/30 rounded focus:ring-1 focus:ring-primary/50 focus:border-primary outline-none"
                          placeholder="e.g., Security deposit, Advance for 2 months"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-text mb-1">
                          Notes
                        </label>
                        <textarea
                          value={currentAdvancePayment.notes}
                          onChange={(e) => handleAdvancePaymentChange('notes', e.target.value)}
                          className="w-full px-3 py-2 border border-subdued/30 rounded focus:ring-1 focus:ring-primary/50 focus:border-primary outline-none"
                          placeholder="Additional notes..."
                          rows="2"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => setShowAdvancePaymentForm(false)}
                        className="px-4 py-2 text-sm border border-subdued/30 rounded hover:bg-subdued/10"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddAdvancePayment}
                        className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90"
                      >
                        Add Payment
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Advance Payments List */}
                {advancePayments.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h5 className="font-medium text-text">Added Advance Payments</h5>
                      <span className="text-sm font-bold text-primary">
                        Total: ${totalAdvance.toLocaleString()}
                      </span>
                    </div>
                    
                    {advancePayments.map((payment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <DollarSign className="text-green-600" size={16} />
                            </div>
                            <div>
                              <p className="font-medium">
                                ${payment.amount.toLocaleString()}
                                {payment.description && (
                                  <span className="text-sm font-normal text-subdued ml-2">
                                    - {payment.description}
                                  </span>
                                )}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <span className="text-xs text-subdued">
                                  {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                                </span>
                                <span className="text-xs text-subdued">
                                  • {payment.payment_method}
                                </span>
                                {payment.transaction_id && (
                                  <span className="text-xs text-subdued">
                                    • {payment.transaction_id}
                                  </span>
                                )}
                                {payment.for_months > 0 && (
                                  <span className="text-xs text-green-600 font-medium">
                                    • For {payment.for_months} month(s)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveAdvancePayment(index)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    
                    {/* Example: Show how many months of rent are covered */}
                    {totalAdvance > 0 && totalRent > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700">
                          <FileText className="w-4 h-4" />
                          <span className="font-medium">Advance Payment Analysis:</span>
                        </div>
                        <p className="text-sm text-blue-600 mt-1">
                          Total advance of ${totalAdvance.toLocaleString()} covers approximately{' '}
                          <span className="font-bold">
                            {(totalAdvance / totalRent).toFixed(1)} months
                          </span>{' '}
                          of rent (${totalRent.toLocaleString()}/month)
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-subdued">
                    <CreditCard className="mx-auto mb-2 text-subdued/50" size={24} />
                    <p>No advance payments added yet</p>
                    <p className="text-sm mt-1">
                      Add advance payments like security deposit or prepaid rent
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Renter Search */}
          <div className='p-2'>
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
          <div className="space-y-2 max-h-70 bg-slate-200 m-2 p-3 rounded-lg overflow-y-auto">
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
                  onClick={() => {
                    setSelectedRenter(renter);
                    setShowAmenitiesEditor(true);
                  }}
                  className={`p-1 rounded-lg cursor-pointer transition-all relative ${
                    selectedRenter?.id === renter.id
                      ? 'bg-primary text-white'
                      : 'bg-surface'
                  }`}
                >
                  {
                    selectedRenter?.id === renter.id ? (
                      <div className="absolute top-2 right-2 bg-white/20 p-1 rounded-full">
                        <Check size={16} className="text-white" />
                      </div>
                    ) : null
                  }
                  <div className="px-2 py-1 overflow-clip">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-medium truncate">{renter.name}</p>
                        {renter.status === 'inactive' && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 mt-1">
                        {renter.phone && (
                          <span className="text-sm flex gap-1 items-center truncate">
                            <Phone size={14} /> {renter.phone}
                          </span>
                        )}
                        {renter.email && (
                          <span className="text-sm flex gap-1 items-center truncate">
                            <Mail size={14} /> {renter.email}
                          </span>
                        )}
                        {renter.nid && (
                          <span className="text-xs truncate">
                            NID: {renter.nid}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Amenities Editor */}
          {selectedRenter && showAmenitiesEditor && (
            <div className="border rounded-lg p-4 animate-in fade-in">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-text flex flex-wrap items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Service Charges & Amenities
                </h4>
                <Btn
                  onClick={handleAddAmenity}
                  type="outline"
                >
                  <Plus className="w-4 h-4" />
                </Btn>
              </div>
              
              <div className="space-y-3">
                {amenities.map((amenity, index) => (
                  <div key={index} className="flex gap-3 flex-wrap items-center border border-primary/60 p-2 rounded-lg">
                    <div className="flex-1 min-w-32">
                      <input
                        type="text"
                        value={amenity.name}
                        onChange={(e) => handleAmenityChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-subdued/30 rounded focus:ring-1 focus:ring-primary/50 focus:border-primary outline-none"
                        placeholder="Amenity name"
                      />
                    </div>
                    <div className='flex gap-2'>
                      <div className="flex-1 min-w-32">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-subdued">$</span>
                        <input
                          type="number"
                          value={amenity.charge}
                          onChange={(e) => handleAmenityChange(index, 'charge', e.target.value)}
                          className="w-full pl-8 pr-3 py-2 border border-subdued/30 rounded focus:ring-1 focus:ring-primary/50 focus:border-primary outline-none"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </div>
                    <Btn
                      type="button"
                      onClick={() => handleRemoveAmenity(index)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Btn>
                    </div>
                  </div>
                ))}
                
                {amenities.length === 0 && (
                  <div className="text-center py-4 text-subdued">
                    No amenities added. Add house amenities or custom charges.
                  </div>
                )}
                
                {/* Total Summary */}
                {amenities.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-subdued">Amenities Total:</span>
                      <span className="font-bold">${totalAmenitiesCharge.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-subdued mt-4">
                <p className="mb-1">Note: These charges will be added to the base rent for this flat.</p>
                <p>You can modify the default house amenities or add custom charges.</p>
              </div>
            </div>
          )}

          {/* Selected Renter Info */}
          {selectedRenter && (
            <div className="bg-orange-50 border border-primary-200 rounded-lg p-4 animate-in fade-in">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-primary-800">Selected Renter</h4>
                <button
                  onClick={() => {
                    setSelectedRenter(null);
                    setShowAmenitiesEditor(false);
                    setAdvancePayments([]);
                    setShowAdvancePaymentForm(false);
                  }}
                  className="text-primary-600 hover:text-primary-800"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="text-primary-600" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-primary-900 truncate">{selectedRenter.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedRenter.phone && (
                      <span className="text-sm text-primary-700">
                        📱 {selectedRenter.phone}
                      </span>
                    )}
                    {selectedRenter.email && (
                      <span className="text-sm text-primary-700">
                        ✉️ {selectedRenter.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Summary */}
              <div className="mt-4 space-y-3">
                {nextPaymentDate && (
                  <div className="p-3 bg-white rounded border border-primary-100">
                    <div className="flex items-center gap-2 text-primary-800 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">First Payment Date:</span>
                      <span className="ml-auto font-bold">
                        {format(new Date(nextPaymentDate), 'dd MMM yyyy')}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Base Rent:</span>
                        <span className="font-medium">${baseRent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Amenities:</span>
                        <span className="font-medium">${totalAmenitiesCharge.toLocaleString()}</span>
                      </div>
                      {advancePayments.length > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Advance Payments:</span>
                          <span className="font-medium">${totalAdvance.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold border-t pt-1">
                        <span>Total Monthly Rent:</span>
                        <span className="text-primary">${totalRent.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 py-4 px-4 border-t border-subdued/20">
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
              className="px-4 py-2 bg-primary text-sm md:text-lg text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              {isAssigning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Assigning...
                </>
              ) : (
                <span className="flex flex-col md:flex-row">
                  Assign Renter
                  {totalAdvance > 0 && (
                    <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">
                      +${totalAdvance.toLocaleString()} <span className='hidden md:static'>advance</span>
                    </span>
                  )}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignRenterModal;