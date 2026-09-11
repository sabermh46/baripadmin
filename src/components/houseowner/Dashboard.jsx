// components/dashboard/HouseOwnerComponent.jsx
import React, { useState, useMemo } from 'react';
import { useAuth } from "../../hooks";
import StatsCardGrid from "./StatsCardGrid";
import DashboardBanner from "./DashboardBanner";
import FinancialSummary from "./FinancialSummary";
import RentCollectionProgress from "./RentCollectionProgress";
import UpcomingPayments from "./UpcomingPayment.jsx";
import OverduePayments from "./OverduePayments.jsx";
import QuickActions from "./QuickActions.jsx";
import DashboardSkeleton from "./DashboardSkeleton.jsx";
import StaleDataNotice from "../common/StaleDataNotice";
import useOfflineFallback from "../../hooks/useOfflineFallback";
import { UPCOMING_MODES, readUpcomingMode } from "../../utils/upcomingMode";
import MonthlyChart from "./charts/MonthlyChart";
import OccupancyChart from "./charts/OccupancyChart";
import ExpenseChart from "./charts/ExpenseChart";
import CollectionByHouseChart from "./charts/CollectionByHouseChart";

import HomeIcon from "../../assets/icons/houses.svg";
import Flats from "../../assets/icons/flats.svg";
import Renters from "../../assets/icons/renter.svg";
import CareTaker from "../../assets/icons/caretaker.svg";
import { Link } from "react-router-dom";
import { CalendarDays, RefreshCcw as RefreshIcon } from 'lucide-react';
import { useGetHouseOwnerDashboardDataQuery } from '../../store/api/houseOwnerAnalyticsApi';
import Btn from '../common/Button';
import { useTranslation } from 'react-i18next';

const HouseOwnerComponent = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { t, i18n } = useTranslation();
  const isBengali = i18n.language?.startsWith('bn');
  // Use RTK Query hooks
  const dashboardQuery = useGetHouseOwnerDashboardDataQuery(undefined, {
    pollingInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  /**
   * Keyed per user: a saved dashboard is one household's finances, and the next person
   * to sign in on a shared phone must not be shown it.
   */
  const {
    data: dashboardData,
    isStale,
    isOffline,
    savedAt,
    showSkeleton,
  } = useOfflineFallback(`ho-dashboard:${user?.id ?? 'anon'}`, dashboardQuery);


  /**
   * Refetch the dashboard directly.
   *
   * This used to POST /refresh-dashboard and let `invalidatesTags` trigger the GET, which
   * meant one click cost two requests returning the identical payload. There is no
   * server-side cache for that POST to clear — getDashboard() reads live — so the GET was
   * always the entire operation.
   *
   * `isFetching`, not `isLoading`: the latter is only true when there is no data yet, so the
   * spinner would never appear on a refresh of an already-loaded screen.
   */
  const isRefreshing = dashboardQuery.isFetching;

  const handleRefresh = async () => {
    // `refetch()` resolves with { data, error } rather than rejecting, so the failure is read
    // off the result instead of caught. Avoids depending on `.unwrap()` being present on the
    // hook's refetch result, and cannot leave an unhandled rejection either way — the error
    // itself is already on the query, which is what renders the retry state below.
    const result = await dashboardQuery.refetch();

    if (result?.error) {
      console.error('Error refreshing dashboard:', result.error);
    }
  };

  // Extract current month data for RentCollectionProgress
  const currentMonthHouses = useMemo(() => {
    if (!dashboardData?.rentCollectionProgress) return [];
    
    const rentProgress = dashboardData.rentCollectionProgress;
    const houses = [];
    
    Object.keys(rentProgress).forEach(houseId => {
      const houseMonthsData = rentProgress[houseId];
      // Ensure houseMonthsData is an array before calling .find()
      const currentMonthData = Array.isArray(houseMonthsData) 
        ? houseMonthsData.find(data => data.month === selectedMonth && data.year === selectedYear)
        : null;
      
      if (currentMonthData) {
        houses.push({
          ...currentMonthData,
          totalFlats: currentMonthData.total_flat || 0,
          rentCollected: currentMonthData.rent_collected || 0
        });
      }
    });
    
    return houses;
  }, [dashboardData, selectedMonth, selectedYear]);

  // Get max date (latest month available)
  const maxDate = useMemo(() => {
    if (!dashboardData?.currentMonth || !dashboardData?.currentYear) {
      return { 
        month: new Date().getMonth() + 1, 
        year: new Date().getFullYear() 
      };
    }
    return { 
      month: dashboardData.currentMonth, 
      year: dashboardData.currentYear 
    };
  }, [dashboardData]);

  // The month the summary figures describe. Formatted through the app's language rather
  // than the browser's, so it does not read "September" beside a page of Bengali.
  const summaryMonthLabel = useMemo(
    () =>
      new Date(
        dashboardData?.currentYear ?? new Date().getFullYear(),
        (dashboardData?.currentMonth ?? new Date().getMonth() + 1) - 1
      ).toLocaleString(i18n.language || undefined, { month: 'long', year: 'numeric' }),
    [dashboardData?.currentMonth, dashboardData?.currentYear, i18n.language]
  );

  // Handle month change
  const handleMonthChange = (month, year) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  // `|| !dashboardData`, not `isLoading` alone.
  //
  // The RTK Query cache is persisted (store/index.js whitelists 'api'), so on any reload
  // where the persisted entry survives, isLoading is FALSE — a revalidation sets isFetching,
  // not isLoading. Gating on isLoading alone made this skeleton unreachable for every
  // returning visitor, which is most of them.
  // showSkeleton comes from useOfflineFallback, which knows the difference between "still
  // waiting" and "nothing is coming". Gating on isLoading alone was wrong twice over: the RTK
  // cache is persisted, so isLoading is false for every returning visitor; and a request that
  // hangs while offline never resolves, so the skeleton would have stayed up indefinitely
  // with a perfectly good saved copy sitting unused.
  if (showSkeleton) {
    return <DashboardSkeleton />;
  }

  // Reached only when there is nothing live AND nothing saved — a first visit with no
  // connection. An explanation and a retry, rather than an empty page.
  if (!dashboardData) {
    return (
      <div className="py-16 text-center">
        <p className="text-subdued">{isOffline ? t('offline_no_saved_data') : t('could_not_load_dashboard')}</p>
        <Btn onClick={handleRefresh} className="mt-3">{t('try_again')}</Btn>
      </div>
    );
  }

  // Safe destructuring with default values to prevent "cannot destructure property of undefined"
  const {
    summary = {},
    upcomingPayments = [],
    upcomingPaymentsThisMonth: upcomingThisMonth = [],
    overduePayments = [],
    charts = {},
    houses = [],
    renters = [],
    caretakers = []
  } = dashboardData || {};

  // Which list the owner has the Upcoming section set to decides the section order below,
  // so the rule follows what is actually on their screen rather than the default definition.
  const hasUpcoming = (readUpcomingMode() === UPCOMING_MODES.MONTH ? upcomingThisMonth : upcomingPayments).length > 0;

  // Format stats for StatsCardGrid with fallbacks
  const stats = [
    { 
      label: t('total_properties'), 
      shortLabel: t('stat_houses_short'),
      value: summary?.totalHouses ?? 0, 
      icon: HomeIcon,
      subtext: t('n_active_inactive', { active: summary?.activeHouses ?? 0, inactive: summary?.inactiveHouses ?? 0 }),
      // Every card hands the modal the same three collections; `cardFor` decides which of
      // them it renders and how. Houses carry their flats, so the flats card needs them too.
      hover: { cardFor: "houses", houses }
    },
    { 
      label: t('total_flats'), 
      shortLabel: t('stat_flats_short'),
      value: summary?.totalFlats ?? 0, 
      icon: Flats,
      subtext: t('n_occupied_vacant', { occupied: summary?.occupiedFlats ?? 0, vacant: summary?.vacantFlats ?? 0 }),
      
      hover: { cardFor: "flats", houses }
    },
    { 
      label: t('active_renters'), 
      shortLabel: t('stat_renters_short'),
      value: summary?.totalRenters ?? 0, 
      icon: Renters,
      subtext: t('n_active_inactive', { active: summary?.activeRenters ?? 0, inactive: summary?.inactiveRenters ?? 0 }),
      hover: { cardFor: "renters", renters }
    },
    { 
      label: t('active_caretakers'), 
      shortLabel: t('stat_caretakers_short'),
      value: summary?.assignedCaretakers ?? 0, 
      icon: CareTaker,
      subtext: t('assigned_to_your_houses'),
      hover: { cardFor: "caretakers", caretakers }
    },
  ];

  return (
    <div className="">
      {isStale && <StaleDataNotice isOffline={isOffline} savedAt={savedAt} />}

      <DashboardBanner name={user?.name || 'User'} />

      {/* Summary. The month chip is a label rather than a picker: this endpoint takes no
          month parameter and answers for the current one, so a dropdown would be a control
          that cannot do what it says. Refresh sits here because it is the only thing on the
          band that acts, and the banner above is deliberately all chrome. */}
      <section className="mt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className={`min-w-0 truncate text-base font-bold text-slate-900 sm:text-lg ${isBengali ? 'font-hind-siliguri' : 'font-mooli'}`}>
            {t('summary_heading')}
          </h2>

          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] font-medium text-slate-600 sm:text-xs">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="whitespace-nowrap">{summaryMonthLabel}</span>
            </span>

            <Btn
              onClick={handleRefresh}
              disabled={isRefreshing}
              title={t('refresh')}
              aria-label={t('refresh')}
              className="flex items-center gap-2"
            >
              <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Btn>
          </div>
        </div>

        <StatsCardGrid stats={stats} />
      </section>

      <FinancialSummary
        rent={summary?.monthlyRentCollection ?? 0}
        expenses={summary?.monthlyExpenses ?? 0}
        profit={summary?.monthlyProfit ?? 0}
        expectedRent={summary?.expectedMonthlyRent}
        occupancyRate={summary?.occupancyRate}
      />

      <RentCollectionProgress
        month={selectedMonth}
        year={selectedYear}
        houses={currentMonthHouses}
        onMonthChange={handleMonthChange}
        maxDate={maxDate}
      />


      {/* Order depends on whether there is anything to act on.
          Rent that is actually coming in outranks a row of shortcuts, so when the upcoming
          list has entries it goes first and the shortcuts sit under it. With nothing due,
          an empty "no upcoming payments" panel at the top of the dashboard is dead space —
          the shortcuts take that position instead.

          Evaluated against whichever list the owner has the section set to, so the rule
          follows what they are actually looking at rather than the default definition. */}
      {hasUpcoming ? (
        <>
          <UpcomingPayments payments={upcomingPayments} paymentsThisMonth={upcomingThisMonth} />
          <QuickActions houses={houses} />
        </>
      ) : (
        <>
          <QuickActions houses={houses} />
          <UpcomingPayments payments={upcomingPayments} paymentsThisMonth={upcomingThisMonth} />
        </>
      )}
      <OverduePayments payments={overduePayments} />
      
      {/* Recent Houses */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 mt-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4">{t('your_houses')}</h3>
        {houses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {houses.slice(0, 6).map((house) => (
              <Link to={`/houses/${house.id}`}  key={house.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
                <h4 className="font-bold text-gray-800">{house.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{house.address}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    house.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {house.active ? t('active') : t('inactive')}
                  </span>
                  <span className="text-sm text-gray-700">{house.flatCount || 0} {t('flats')}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">{t('no_houses_found')}</p>
        )}
      </div>


      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <MonthlyChart data={charts?.monthlyRentCollection || []} />
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <OccupancyChart data={charts?.flatOccupancy || []} />
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <ExpenseChart data={charts?.expenseBreakdown || []} />
        </div>
        
      </div>
    </div>
  );
};

export default HouseOwnerComponent;