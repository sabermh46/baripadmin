import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useGetManagedUsersQuery } from '../../../store/api/authApi';
import ProfileSection from './sections/ProfileSection';
import HousesSection from './sections/HousesSection';
import AppFeePaymentsSection from './sections/AppFeePaymentsSection';
import IncomeSection from './sections/IncomeSection';
import ExpensesSection from './sections/ExpensesSection';
import LoansSection from './sections/LoansSection';
import LoanPaymentsSection from './sections/LoanPaymentsSection';

// Module-level so the identity is stable across renders and across sections.
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});

const HouseOwnerDetailPage = () => {
  const { ownerId } = useParams();
  const navigate = useNavigate();

  const { data: users, isLoading, error, refetch } = useGetManagedUsersQuery(
    { role: 'house_owner', expand: 'dna', userId: ownerId },
    { skip: !ownerId }
  );

  const owner = users?.[0] ?? null;

  const handleSectionSuccess = useCallback(
    (payload) => {
      if (payload?.section !== 'houses') return;
      try {
        // refetch() throws outright if the query was never started — which happens whenever
        // this ran while `skip` was on, or after the section had unsubscribed. An uncaught
        // throw from a child's callback unmounts the tree, so a reload that could not happen
        // took the page white instead of being a no-op.
        refetch();
      } catch {
        /* nothing subscribed to refetch; the next mount fetches fresh anyway */
      }
    },
    [refetch]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !owner) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/admin/house-owners')}
          className="flex items-center gap-2 text-subdued hover:text-text"
        >
          <ArrowLeft size={18} />
          Back to House Owners
        </button>
        <div className="bg-surface rounded-xl border border-subdued/20 p-6 text-center text-subdued">
          {error ? 'Failed to load owner.' : 'House owner not found.'}
        </div>
      </div>
    );
  }

  // `dna.houses ?? []` builds a brand-new array on every render whenever the key is absent,
  // and each section keys a useEffect on the value it is handed — so an absent section
  // re-ran its effect forever. Frozen empties are shared, so an absent key is a stable
  // reference and the effects settle.
  const dna = owner.dna || {};
  const profile = dna.profile || owner;
  const houses = dna.houses ?? EMPTY_ARRAY;
  const archivedHouses = dna.archivedHouses ?? EMPTY_ARRAY;
  const flats = dna.flats ?? EMPTY_ARRAY;
  const appFeePayments = dna.appFeePayments ?? EMPTY_ARRAY;
  const income = dna.income ?? EMPTY_OBJECT;
  const expenses = dna.expenses ?? EMPTY_ARRAY;
  const loans = dna.loans ?? EMPTY_ARRAY;
  const loanPayments = dna.loanPayments ?? EMPTY_ARRAY;

  return (
    <div className="space-y-6 bg-background min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/house-owners')}
            className="p-2 rounded-lg border border-subdued/30 hover:bg-surface transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text">{owner.name || 'House Owner'}</h1>
            <p className="text-subdued text-sm">Full profile and related data</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <ProfileSection profile={profile} user={owner} onSuccess={handleSectionSuccess} />
        <HousesSection
          houses={houses}
          archivedHouses={archivedHouses}
          flats={flats}
          ownerId={ownerId}
          ownerName={owner?.name}
          onSuccess={handleSectionSuccess}
        />
        <AppFeePaymentsSection appFeePayments={appFeePayments} onSuccess={handleSectionSuccess} />
        <IncomeSection income={income} onSuccess={handleSectionSuccess} />
        <ExpensesSection expenses={expenses} onSuccess={handleSectionSuccess} />
        <LoansSection loans={loans} onSuccess={handleSectionSuccess} />
        <LoanPaymentsSection loanPayments={loanPayments} onSuccess={handleSectionSuccess} />
      </div>
    </div>
  );
};

export default HouseOwnerDetailPage;
