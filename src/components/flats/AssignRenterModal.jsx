import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import TkSymbol from '../common/TkSymbol';
import { Search, X, User, Coins, Plus, Trash2, Calendar, CreditCard, FileText, RefreshCcw, Phone, Mail, Check, Loader2 } from 'lucide-react';
import { useAssignRenterMutation } from '../../store/api/flatApi';
import { useGetAvailableRentersQuery } from '../../store/api/renterApi';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { apiErrorMessage } from '../../utils/apiError';

/**
 * One numbered stage of the assignment.
 *
 * WHY NUMBERED STAGES
 * -------------------
 * This screen asks for four separate decisions, and the old layout ran them
 * together as one undifferentiated scroll — worse, in an order that put a
 * disabled "Advance Payments" panel ABOVE the renter list it depended on, so
 * the first thing an owner read was an instruction to do something the page
 * had not yet offered them. Numbering makes the sequence explicit and the
 * order now follows the dependency rather than fighting it.
 *
 * WHY LOCKED STAGES COLLAPSE INSTEAD OF DISABLING
 * ----------------------------------------------
 * A locked stage keeps its heading and says in a short sentence what it is
 * waiting for, then hides its controls. The owner can still see the whole job
 * ahead of them — four things, in this order — without facing three panels of
 * greyed-out inputs. Hiding the stages entirely would be worse: the screen
 * would grow as they worked and they could not tell how much was left.
 */
const Step = ({ index, title, hint, locked, lockedHint, optional, done, children }) => {
  const { t } = useTranslation();

  return (
    <section
      className={`rounded-2xl border transition-colors ${
        locked ? 'border-subdued/15 bg-surface/40' : 'border-subdued/25 bg-surface'
      }`}
    >
      <div className="flex items-start gap-2.5 p-3">
        {/* The step number doubles as the progress marker: it turns into a tick
            once the stage is satisfied, so "where am I" is answerable at a
            glance without reading anything. */}
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${
            done ? 'bg-green-600 text-white' : locked ? 'bg-subdued/20 text-subdued' : 'bg-primary text-white'
          }`}
          aria-hidden="true"
        >
          {done ? <Check size={16} /> : index}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className={`text-base font-bold ${locked ? 'text-subdued' : 'text-text'}`}>
            <span className="sr-only">{t('step_n', { n: index })}: </span>
            {title}
            {optional && (
              <span className="ml-2 align-middle text-xs font-medium uppercase tracking-wide text-subdued">
                {t('optional')}
              </span>
            )}
          </h3>
          {(locked ? lockedHint : hint) && (
            <p className="mt-0.5 text-xs leading-snug text-subdued">{locked ? lockedHint : hint}</p>
          )}
        </div>
      </div>

      {!locked && <div className="px-3 pb-3">{children}</div>}
    </section>
  );
};

const AssignRenterModal = ({ open, onClose, flat, houseinfo = null, onSuccess = () => {} }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRenter, setSelectedRenter] = useState(null);
  const [amenities, setAmenities] = useState([]);
  const [showAmenitiesEditor, setShowAmenitiesEditor] = useState(false);
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [advancePayments, setAdvancePayments] = useState([]);
  const [showAdvancePaymentForm, setShowAdvancePaymentForm] = useState(false);
  /**
   * "There are none" is a different answer from "I have not looked yet", and until now the
   * screen could not tell them apart: an owner who scrolled straight past the charges looked
   * exactly like one who had decided the rent is the base rent alone. These two flags are how
   * a deliberate "no" gets recorded, which is what lets the Assign button wait for all four
   * stages instead of just the renter.
   */
  const [chargesConfirmed, setChargesConfirmed] = useState(false);
  const [advanceConfirmed, setAdvanceConfirmed] = useState(false);
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  /**
   * null means untouched, so the field shows the flat's current fee without an effect to seed
   * it — and, unlike a '' default, clearing the box to retype leaves it empty instead of
   * snapping back to the old number under the owner's fingers.
   */
  const [lateFee, setLateFee] = useState(null);
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

  const lateFeeValue = lateFee ?? String(flat?.late_fee_percentage ?? 5);

  /**
   * What each stage needs before its tick turns green. A charge with a blank name does not
   * count as finished — handleAssign rejects those anyway, so the tick would otherwise promise
   * something the submit would refuse.
   */
  const steps = {
    renter: !!selectedRenter,
    // Both of these carry values the owner never typed - the house's amenities are copied in
    // from its metadata, and the date and late fee arrive prefilled - so completing on the
    // presence of a value would tick them green before anyone had read them. They need a
    // deliberate confirmation, and editing afterwards withdraws it (see the handlers below).
    charges: chargesConfirmed && amenities.every((a) => a.name?.trim()),
    terms: termsConfirmed && !!nextPaymentDate && lateFeeValue !== '' && parseFloat(lateFeeValue) >= 0,
    advance: advancePayments.length > 0 || advanceConfirmed,
  };
  const readyToAssign = Object.values(steps).every(Boolean);

  /** Clears the renter and everything decided about them. */
  const clearRenter = () => {
    setSelectedRenter(null);
    setShowAmenitiesEditor(false);
    setAdvancePayments([]);
    setShowAdvancePaymentForm(false);
    setChargesConfirmed(false);
    setAdvanceConfirmed(false);
    setTermsConfirmed(false);
  };

  // Handle amenities changes
  const handleAddAmenity = () => {
    setAmenities([...amenities, { name: '', charge: 0 }]);
    setChargesConfirmed(false);
  };

  const handleRemoveAmenity = (index) => {
    const updated = amenities.filter((_, i) => i !== index);
    setAmenities(updated);
    setChargesConfirmed(false);
  };

  const handleAmenityChange = (index, field, value) => {
    const updated = [...amenities];
    if (field === 'charge') {
      updated[index][field] = parseFloat(value) || 0;
    } else {
      updated[index][field] = value;
    }
    setAmenities(updated);
    setChargesConfirmed(false);
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
      toast.error(t('enter_a_valid_advance_amount'));
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
    toast.success(t('advance_payment_added'));
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
      toast.error(t('every_charge_needs_a_name_and_amount'));
      return;
    }

    // Validate next payment date
    if (!nextPaymentDate) {
      toast.error(t('choose_the_first_payment_date'));
      return;
    }

    try {
      const response = await assignRenter({
        flatId: flat.id,
        renterId: selectedRenter.id,
        amenities: amenities.filter(a => a.name.trim()),
        next_payment_date: nextPaymentDate,
        late_fee_percentage: parseFloat(lateFeeValue),
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
        ? t('renter_assigned_with_advance', {
            name: selectedRenter.name,
            count: advancePayments.length,
            total: totalAdvance.toLocaleString(),
          })
        : t('renter_assigned', { name: selectedRenter.name });

      toast.success(successMessage);
      // The ids let the caller offer a receipt for each deposit taken at assignment.
      onSuccess?.(response?.created_advance_ids ?? response?.data?.created_advance_ids ?? []);
      onClose();
      setSelectedRenter(null);
      setSearchTerm('');
      setAmenities([]);
      setShowAmenitiesEditor(false);
      setAdvancePayments([]);
      setNextPaymentDate('');
      setChargesConfirmed(false);
      setAdvanceConfirmed(false);
      setTermsConfirmed(false);
      setLateFee(null);
    } catch (error) {
      console.error('Failed to assign renter:', error);
      toast.error(apiErrorMessage(error, t('could_not_assign_the_renter')));
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.info(t('refreshing_available_renters'));
  };

  if (!open || !flat) return null;

  const methodLabel = (value) => ({
    cash: t('cash'),
    bank: t('bank_transfer'),
    mobile_banking: t('mobile_banking'),
    other: t('other'),
  }[value] || value);

  const monthsCovered = totalRent > 0 ? totalAdvance / totalRent : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 sm:p-4">
      <div className="flex h-full w-full flex-col bg-surface sm:h-auto sm:max-h-[92dvh] sm:max-w-3xl sm:rounded-2xl sm:shadow-xl">

        {/* ── Header ───────────────────────────────────────────────────────
            Opaque, not the old `bg-surface/20 backdrop-blur-sm`: at 20% the
            title sat on top of whatever scrolled underneath it, which is hard
            to read at the best of times and worse for older eyes. */}
        <div className="shrink-0 border-b border-subdued/20 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-text sm:text-xl">
                {t('assign_renter_to_flat')}
              </h2>
              <p className="mt-0.5 truncate text-sm text-subdued">
                {flat.name}
                {flat.number && !String(flat.name ?? '').includes(String(flat.number))
                  ? ` · ${flat.number}`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('close')}
              className="-mr-1 grid size-11 shrink-0 place-items-center rounded-lg transition-colors hover:bg-subdued/10"
            >
              <X size={22} />
            </button>
          </div>

          {/* The flat's fixed terms. These are facts to read, not decisions to
              make, so they sit as context under the title rather than as a
              numbered step competing with the four that need a decision. */}
          {/* `rent_due_day` is the whole sentence "Due on day {{day}}", so using it as a bare
              label printed the placeholder itself to the screen. It takes the short label here
              and the day goes in the value beside it. */}
          <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 rounded-xl bg-background px-3 py-2">
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-subdued">{t('base_rent')}</dt>
              <dd className="whitespace-nowrap text-sm font-bold text-text"><TkSymbol />{baseRent.toLocaleString()}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-subdued">{t('due_day')}</dt>
              <dd className="whitespace-nowrap text-sm font-medium text-text">{t('day_of_month', { day: flat.should_pay_rent_day })}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-subdued">{t('late_fee')}</dt>
              <dd className="whitespace-nowrap text-sm font-medium text-text">{flat.late_fee_percentage || 5}%</dd>
            </div>
          </dl>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-background px-3 py-3 sm:px-6 sm:py-4">

          {/* ── Step 1 · Choose the renter ───────────────────────────────
              First, because every other step depends on it. It used to sit
              fourth, below an Advance Payments panel that greeted the owner
              with "Select a renter first" — telling them to do something they
              had not yet been given the chance to do. */}
          <Step index={1} title={t('choose_renter')} hint={t('choose_renter_hint')} done={steps.renter}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subdued" size={20} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label={t('search_renter')}
                  className="min-h-12 w-full rounded-lg border border-subdued/30 bg-surface pl-11 pr-11 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                  placeholder={t('search_renter_placeholder')}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    aria-label={t('clear')}
                    className="absolute right-0 top-0 grid h-full w-11 place-items-center text-subdued hover:text-text"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              {/* Was a bare circular-arrow icon with no label or tooltip. */}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-subdued/30 bg-surface px-4 text-sm font-medium text-text transition-colors hover:bg-subdued/10 disabled:opacity-50"
              >
                <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
                {t('refresh')}
              </button>
            </div>

            {/* A real radiogroup. These were <div onClick>: not focusable, not
                announced as choices, not reachable without a mouse. */}
            <div
              role="radiogroup"
              aria-label={t('choose_renter')}
              className="mt-3 max-h-80 space-y-2 overflow-y-auto"
            >
              {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10">
                  <Loader2 className="animate-spin text-primary" size={28} />
                  <p className="text-sm text-subdued">{t('loading_available_renters')}</p>
                </div>
              ) : filteredRenters.length === 0 ? (
                <div className="rounded-xl border border-dashed border-subdued/30 px-4 py-10 text-center">
                  <User className="mx-auto mb-3 text-subdued/40" size={40} />
                  <p className="text-base font-medium text-text">
                    {searchTerm ? t('no_renters_match_search') : t('no_available_renters')}
                  </p>
                  <p className="mt-1 text-sm text-subdued">
                    {searchTerm ? t('try_a_different_search') : t('all_renters_assigned_hint')}
                  </p>
                </div>
              ) : (
                filteredRenters.map((renter) => {
                  const picked = selectedRenter?.id === renter.id;
                  return (
                    <button
                      key={renter.id}
                      type="button"
                      role="radio"
                      aria-checked={picked}
                      onClick={() => {
                        setSelectedRenter(renter);
                        setShowAmenitiesEditor(true);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-xl border-2 p-2.5 text-left transition-colors ${
                        picked
                          ? 'border-primary bg-primary/10'
                          : 'border-subdued/20 bg-surface hover:border-subdued/40 hover:bg-subdued/5'
                      }`}
                    >
                      {/* Selection used to flood the row with solid primary and
                          set every line to white, dropping the phone number and
                          email to poor contrast on orange. A border plus a tint
                          reads as clearly and keeps the details legible. */}
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-full text-base font-bold ${
                          picked ? 'bg-primary text-white' : 'bg-subdued/15 text-subdued'
                        }`}
                      >
                        {picked ? <Check size={20} /> : (renter.name?.trim()?.[0] || '?')}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-base font-semibold text-text">{renter.name}</span>
                          {renter.status === 'inactive' && (
                            <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                              {t('inactive')}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 flex flex-col gap-0.5 text-sm text-subdued">
                          {renter.phone && (
                            <span className="flex items-center gap-1.5 truncate">
                              <Phone size={14} className="shrink-0" /> {renter.phone}
                            </span>
                          )}
                          {renter.email && (
                            <span className="flex items-center gap-1.5 truncate">
                              <Mail size={14} className="shrink-0" /> {renter.email}
                            </span>
                          )}
                          {renter.nid && (
                            <span className="truncate">{t('nid')}: {renter.nid}</span>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </Step>

          {/* ── Step 2 · Monthly charges ───────────────────────────────
              One list that adds up, rather than an editor and a separate breakdown card
              restating the same three numbers. The base rent is the first line because it is
              the line everything else is added to, and the total sits at the foot of the same
              column of figures it is the sum of. */}
          <Step
            index={2}
            title={t('monthly_charges')}
            hint={t('monthly_charges_hint')}
            locked={!selectedRenter || !showAmenitiesEditor}
            lockedHint={t('choose_a_renter_first')}
            done={steps.charges}
          >
            <div className="overflow-hidden rounded-xl border border-subdued/25">
              {/* Read-only: the base rent belongs to the flat, not to this tenancy. */}
              <div className="flex items-center justify-between gap-2 bg-background px-3 py-2">
                <span className="min-w-0 text-sm font-medium text-text">{t('monthly_rent_payment')}</span>
                <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-text">
                  <TkSymbol />{baseRent.toLocaleString()}
                </span>
              </div>

              {amenities.map((amenity, index) => (
                /* Wraps rather than sharing one line at a fixed split. The name box used to
                     take whatever was left after a `w-28` amount field, and since the font-size
                     preference scales every rem, "larger" grew that field to 140px and left the
                     name with nothing at 320px wide. Both halves now claim a basis and drop to
                     their own line when the row cannot hold them. */
                <div key={index} className="flex flex-wrap items-center gap-2 border-t border-subdued/15 px-3 py-2">
                  {/* Placeholders rather than a label above every field: at two fields per row
                      the labels tripled the height of the list for words the boxes already say. */}
                  <input
                    type="text"
                    value={amenity.name}
                    onChange={(e) => handleAmenityChange(index, 'name', e.target.value)}
                    aria-label={t('charge_name')}
                    className="min-h-11 min-w-0 flex-1 basis-32 rounded-lg border border-subdued/30 bg-surface px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                    placeholder={t('charge_name_placeholder')}
                  />
                  <div className="flex min-w-0 flex-1 basis-32 items-center gap-1.5">
                  <div className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-subdued"><TkSymbol /></span>
                    <input
                      type="number"
                      value={amenity.charge}
                      onChange={(e) => handleAmenityChange(index, 'charge', e.target.value)}
                      aria-label={t('amount')}
                      className="min-h-11 w-full rounded-lg border border-subdued/30 bg-surface pl-7 pr-2 text-right text-sm tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                      placeholder="0"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAmenity(index)}
                    aria-label={`${t('remove')} ${amenity.name || t('charge_name')}`}
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                  </div>
                </div>
              ))}

              <div className="border-t border-subdued/15 p-2">
                <button
                  type="button"
                  onClick={handleAddAmenity}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/40 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                >
                  <Plus size={18} />
                  {t('add_service_charge')}
                </button>
              </div>

              {/* `whitespace-nowrap` on the figure: without it the ৳ and the digits broke
                  across two lines once the label had taken the width. */}
              <div className="flex items-center justify-between gap-2 border-t-2 border-primary/25 bg-primary/5 px-3 py-2.5">
                <span className="min-w-0 text-sm font-bold leading-snug text-text">{t('total_monthly_rent')}</span>
                <span className="shrink-0 whitespace-nowrap text-xl font-bold tabular-nums text-primary">
                  <TkSymbol />{totalRent.toLocaleString()}
                </span>
              </div>
            </div>

            {/* When the list is empty this button is how an owner with no service charges says
                so; when it is not, it is how they agree to what the house metadata filled in. */}
            {!steps.charges && (
              <button
                type="button"
                onClick={() => setChargesConfirmed(true)}
                disabled={!amenities.every((a) => a.name?.trim())}
                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-subdued/30 px-4 text-sm font-medium text-text transition-colors hover:bg-subdued/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={18} />
                {amenities.length === 0 ? t('no_monthly_charge') : t('confirm_charges')}
              </button>
            )}

            <p className="mt-2 text-xs leading-snug text-subdued">{t('amenities_note')}</p>
          </Step>

          {/* ── Step 3 · Payment terms ───────────────────────────────────
              The late fee lives here now rather than only in the flat form. It is part of the
              terms being agreed with this renter, the owner is looking straight at it two
              inches higher up in the header, and sending them to a different screen to change
              a number they are already reading is how a form earns its reputation. */}
          <Step
            index={3}
            title={t('payment_terms')}
            hint={t('payment_terms_hint')}
            locked={!selectedRenter}
            lockedHint={t('choose_a_renter_first')}
            done={steps.terms}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-text">
                  {t('first_payment_date')}
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subdued" size={20} />
                  {/* Today used to be the floor, which made it impossible to record a tenancy
                      that began earlier in the year — the common case when a renter is entered
                      into the system after they have already moved in. */}
                  <input
                    type="date"
                    value={nextPaymentDate}
                    onChange={(e) => { setNextPaymentDate(e.target.value); setTermsConfirmed(false); }}
                    className="min-h-12 w-full rounded-lg border border-subdued/30 bg-surface pl-11 pr-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                    min={`${new Date().getFullYear()}-01-01`}
                  />
                </div>
                <p className="mt-1 text-xs text-subdued">{t('first_payment_date_hint')}</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text">
                  {t('late_fee')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={lateFeeValue}
                    onChange={(e) => { setLateFee(e.target.value); setTermsConfirmed(false); }}
                    className="min-h-12 w-full rounded-lg border border-subdued/30 bg-surface px-3 pr-9 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                    placeholder="0"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subdued">%</span>
                </div>
                <p className="mt-1 text-xs text-subdued">{t('late_fee_hint')}</p>
              </div>
            </div>

            {/* Both fields arrive prefilled - the date from the flat's rent day, the fee from
                the flat itself - so without this the stage would tick green having been
                scrolled past rather than read. */}
            {!steps.terms && (
              <button
                type="button"
                onClick={() => setTermsConfirmed(true)}
                disabled={!nextPaymentDate || lateFeeValue === '' || !(parseFloat(lateFeeValue) >= 0)}
                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-subdued/30 px-4 text-sm font-medium text-text transition-colors hover:bg-subdued/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={18} />
                {t('confirm_terms')}
              </button>
            )}
          </Step>

          {/* ── Step 4 · Advance payment ─────────────────────────────── */}
          <Step
            index={4}
            title={t('advance_payments')}
            hint={t('advance_payments_hint')}
            optional
            locked={!selectedRenter}
            lockedHint={t('choose_a_renter_first')}
            done={steps.advance}
          >
            {advancePayments.length > 0 && (
              <div className="mb-3 space-y-2">
                {advancePayments.map((payment, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-xl border border-subdued/20 bg-background p-3"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-green-100 text-green-700">
                      <Coins size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-text">
                        <TkSymbol />{payment.amount.toLocaleString()}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-subdued">
                        <span>{format(new Date(payment.payment_date), 'dd MMM yyyy')}</span>
                        <span aria-hidden>·</span>
                        <span>{methodLabel(payment.payment_method)}</span>
                        {payment.transaction_id && (
                          <>
                            <span aria-hidden>·</span>
                            <span className="truncate">{payment.transaction_id}</span>
                          </>
                        )}
                      </p>
                      {payment.description && (
                        <p className="mt-0.5 truncate text-sm text-subdued">{payment.description}</p>
                      )}
                      {payment.for_months > 0 && (
                        <p className="mt-0.5 text-sm font-medium text-green-700">
                          {t('covers_n_months', { count: Number(payment.for_months) })}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAdvancePayment(index)}
                      aria-label={t('remove')}
                      className="grid size-11 shrink-0 place-items-center rounded-lg text-red-600 transition-colors hover:bg-red-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}

                <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3">
                  <span className="text-sm font-medium text-green-900">{t('total_advance')}</span>
                  <span className="text-lg font-bold text-green-700">
                    <TkSymbol />{totalAdvance.toLocaleString()}
                  </span>
                </div>

                {totalAdvance > 0 && totalRent > 0 && (
                  <p className="flex items-start gap-2 px-1 text-sm text-subdued">
                    <FileText size={16} className="mt-0.5 shrink-0" />
                    {t('advance_covers_months', {
                      months: monthsCovered.toFixed(1),
                      rent: totalRent.toLocaleString(),
                    })}
                  </p>
                )}
              </div>
            )}

            {advancePayments.length === 0 && advanceConfirmed && !showAdvancePaymentForm && (
              <p className="mb-2 flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-5 text-sm font-medium text-green-800">
                <Check size={16} className="shrink-0" />
                {t('no_advance_payment_confirmed')}
              </p>
            )}

            {!showAdvancePaymentForm ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowAdvancePaymentForm(true)}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/40 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                >
                  <Plus size={18} />
                  {advancePayments.length ? t('add_another_advance') : t('add_advance_payment')}
                </button>
                {/* Most tenancies take no advance at all, so "none" has to be one tap rather
                    than the absence of an action the owner cannot know they have completed. */}
                {advancePayments.length === 0 && !advanceConfirmed && (
                  <button
                    type="button"
                    onClick={() => setAdvanceConfirmed(true)}
                    className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-subdued/30 px-4 text-sm font-medium text-text transition-colors hover:bg-subdued/10"
                  >
                    <Check size={18} />
                    {t('no_advance_payment')}
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-subdued/25 bg-background p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-base font-semibold text-text">{t('new_advance_payment')}</h4>
                  <button
                    type="button"
                    onClick={() => setShowAdvancePaymentForm(false)}
                    aria-label={t('close')}
                    className="grid size-9 place-items-center rounded-lg text-subdued transition-colors hover:bg-subdued/10 hover:text-text"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* "Amount" and "Paid Amount" sat side by side with nothing
                      to say how they differ. Both now say what they mean. */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-text">
                      {t('agreed_advance_amount')} <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subdued"><TkSymbol /></span>
                      <input
                        type="number"
                        value={currentAdvancePayment.amount}
                        onChange={(e) => handleAdvancePaymentChange('amount', e.target.value)}
                        className="min-h-11 w-full rounded-lg border border-subdued/30 bg-surface pl-9 pr-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                        placeholder="0"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <p className="mt-1 text-xs text-subdued">{t('agreed_advance_amount_hint')}</p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-text">
                      {t('amount_received_now')} <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subdued"><TkSymbol /></span>
                      <input
                        type="number"
                        value={currentAdvancePayment.paid_amount || currentAdvancePayment.amount}
                        onChange={(e) => handleAdvancePaymentChange('paid_amount', e.target.value)}
                        className="min-h-11 w-full rounded-lg border border-subdued/30 bg-surface pl-9 pr-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                        placeholder="0"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <p className="mt-1 text-xs text-subdued">{t('amount_received_now_hint')}</p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-text">
                      {t('payment_date')} <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subdued" size={18} />
                      <input
                        type="date"
                        value={currentAdvancePayment.payment_date}
                        onChange={(e) => handleAdvancePaymentChange('payment_date', e.target.value)}
                        className="min-h-11 w-full rounded-lg border border-subdued/30 bg-surface pl-10 pr-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-text">
                      {t('payment_method')} <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={currentAdvancePayment.payment_method}
                      onChange={(e) => handleAdvancePaymentChange('payment_method', e.target.value)}
                      className="min-h-11 w-full rounded-lg border border-subdued/30 bg-surface px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="cash">{t('cash')}</option>
                      <option value="bank">{t('bank_transfer')}</option>
                      <option value="mobile_banking">{t('mobile_banking')}</option>
                      <option value="other">{t('other')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-text">
                      {t('transaction_id')}
                    </label>
                    <input
                      type="text"
                      value={currentAdvancePayment.transaction_id}
                      onChange={(e) => handleAdvancePaymentChange('transaction_id', e.target.value)}
                      className="min-h-11 w-full rounded-lg border border-subdued/30 bg-surface px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                      placeholder={t('transaction_id_placeholder')}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-text">
                      {t('months_covered')}
                    </label>
                    <input
                      type="number"
                      value={currentAdvancePayment.for_months}
                      onChange={(e) => handleAdvancePaymentChange('for_months', e.target.value)}
                      className="min-h-11 w-full rounded-lg border border-subdued/30 bg-surface px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                      placeholder="0"
                      min="0"
                      step="1"
                    />
                    <p className="mt-1 text-xs text-subdued">{t('months_covered_hint')}</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-text">
                      {t('description')}
                    </label>
                    <input
                      type="text"
                      value={currentAdvancePayment.description}
                      onChange={(e) => handleAdvancePaymentChange('description', e.target.value)}
                      className="min-h-11 w-full rounded-lg border border-subdued/30 bg-surface px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                      placeholder={t('advance_description_placeholder')}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-text">
                      {t('notes')}
                    </label>
                    <textarea
                      value={currentAdvancePayment.notes}
                      onChange={(e) => handleAdvancePaymentChange('notes', e.target.value)}
                      className="w-full rounded-lg border border-subdued/30 bg-surface px-3 py-2 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
                      placeholder={t('additional_notes')}
                      rows="2"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAdvancePaymentForm(false)}
                    className="min-h-11 rounded-lg border border-subdued/30 px-5 text-base font-medium text-text transition-colors hover:bg-subdued/10"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAdvancePayment}
                    className="min-h-11 rounded-lg bg-primary px-5 text-base font-medium text-white transition-colors hover:bg-primary/90"
                  >
                    {t('add_payment')}
                  </button>
                </div>
              </div>
            )}
          </Step>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────
            The running total travels with the button, so the owner can see what
            they are committing to at the moment they commit to it rather than
            scrolling back up to check. */}
        <div className="shrink-0 border-t border-subdued/20 bg-surface px-4 py-3 sm:rounded-b-2xl sm:px-6">
          {selectedRenter && (
            <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-text">
                <User size={15} className="text-subdued" />
                {selectedRenter.name}
                <button
                  type="button"
                  onClick={clearRenter}
                  className="rounded px-1.5 py-0.5 text-sm font-medium text-primary underline-offset-2 hover:underline"
                >
                  {t('change')}
                </button>
              </span>
              <span className="text-subdued">
                {t('total_monthly_rent')}:{' '}
                <span className="font-bold text-text"><TkSymbol />{totalRent.toLocaleString()}</span>
              </span>
              {totalAdvance > 0 && (
                <span className="text-subdued">
                  {t('advance')}:{' '}
                  <span className="font-bold text-green-700"><TkSymbol />{totalAdvance.toLocaleString()}</span>
                </span>
              )}
            </div>
          )}

          {/* One line on a phone: Cancel takes only the width its word needs and Assign takes
              the rest, so the action they came for is the wide one under the thumb. Stacked,
              Assign sat above Cancel and pushed the primary action away from the thumb while
              burning a whole row on the escape hatch. */}
          <div className="flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isAssigning}
              className="min-h-12 shrink-0 rounded-lg border border-subdued/30 px-5 text-base font-medium text-text transition-colors hover:bg-subdued/10 disabled:opacity-50"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={!readyToAssign || isAssigning}
              aria-busy={isAssigning}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-base font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              {isAssigning && <Loader2 size={18} className="animate-spin" />}
              {isAssigning ? t('assigning') : t('assign_renter')}
            </button>
          </div>

          {/* Names the stage that is still open, rather than leaving a greyed button and no
              account of what it is waiting for. */}
          {!readyToAssign && (
            <p className="mt-2 text-center text-sm text-subdued sm:text-right">
              {!steps.renter
                ? t('choose_a_renter_first')
                : !steps.charges
                  ? t('confirm_monthly_charges')
                  : !steps.terms
                    ? t('confirm_payment_terms')
                    : t('confirm_advance_payment')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignRenterModal;
