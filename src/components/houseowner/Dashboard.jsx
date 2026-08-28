// components/dashboard/HouseOwnerComponent.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from "../../hooks";
import StatsCardGrid from "./StatsCardGrid";
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
import { RefreshCcw as RefreshIcon } from 'lucide-react';
import { 
  useGetHouseOwnerDashboardDataQuery,
  useRefreshDashboardDataMutation
} from '../../store/api/houseOwnerAnalyticsApi';
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


  const [refreshDashboard, { isLoading: isRefreshing }] = useRefreshDashboardDataMutation();

  // Refresh data
  const handleRefresh = async () => {
    try {
      await refreshDashboard().unwrap();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
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
      value: summary?.totalHouses ?? 0, 
      icon: HomeIcon,
      subtext: t('n_active_inactive', { active: summary?.activeHouses ?? 0, inactive: summary?.inactiveHouses ?? 0 }),
      // Every card hands the modal the same three collections; `cardFor` decides which of
      // them it renders and how. Houses carry their flats, so the flats card needs them too.
      hover: { cardFor: "houses", houses }
    },
    { 
      label: t('total_flats'), 
      value: summary?.totalFlats ?? 0, 
      icon: Flats,
      subtext: t('n_occupied_vacant', { occupied: summary?.occupiedFlats ?? 0, vacant: summary?.vacantFlats ?? 0 }),
      
      hover: { cardFor: "flats", houses }
    },
    { 
      label: t('active_renters'), 
      value: summary?.totalRenters ?? 0, 
      icon: Renters,
      subtext: t('n_active_inactive', { active: summary?.activeRenters ?? 0, inactive: summary?.inactiveRenters ?? 0 }),
      hover: { cardFor: "renters", renters }
    },
    { 
      label: t('active_caretakers'), 
      value: summary?.assignedCaretakers ?? 0, 
      icon: CareTaker,
      subtext: t('assigned_to_your_houses'),
      hover: { cardFor: "caretakers", caretakers }
    },
  ];

  // Fix for: "Uncaught TypeError: can't access property toLocaleString"
  const profitStats = [
    {
      label: t('monthly_rent'),
      value: `৳ ${(summary?.monthlyRentCollection ?? 0).toLocaleString()}`,
      trend: (summary?.monthlyRentCollection ?? 0) > 0 ? 'up' : 'neutral',
      change: t('current_month')
    },
    {
      label: t('monthly_expenses'),
      value: `৳ ${(summary?.monthlyExpenses ?? 0).toLocaleString()}`,
      trend: (summary?.monthlyExpenses ?? 0) > 0 ? 'down' : 'neutral',
      change: t('current_month')
    },
    {
      label: t('monthly_profit'),
      value: `৳ ${(summary?.monthlyProfit ?? 0).toLocaleString()}`,
      trend: (summary?.monthlyProfit ?? 0) > 0 ? 'up' : (summary?.monthlyProfit ?? 0) < 0 ? 'down' : 'neutral',
      change: t('occupancy_percent', { percent: summary?.occupancyRate ?? 0 })
    }
  ];

  return (
    <div className="">
      {isStale && <StaleDataNotice isOffline={isOffline} savedAt={savedAt} />}

      {/* Welcome Header with Refresh */}
      <div className="flex justify-between items-center">
        <div className="">
          <h2 className="text-sm text-slate-700 font-semibold ">
            {t('welcome_back')}, {" "}
            <span className={`text-base ${isBengali ? 'font-hind-siliguri' : 'font-mooli'} text-primary`}>{user?.name || 'User'}</span>
          </h2>
        </div>
        
        <Btn
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Btn>
      </div>

      {/* Stats Grid */}
      <StatsCardGrid stats={stats} />

      <div className='flex flex-col mt-4'>
        {/* Profit Stats */}
        <div className="grid grid-cols-3 gap-2">
          {profitStats.map((stat, index) => (
            <div key={index} className={`bg-white rounded-lg p-2 border-2 border-gray-300 ${index === 0 ? 'rounded-tl-xl rounded-bl-xl' : ''} ${index === profitStats.length -1 ? 'rounded-tr-xl rounded-br-xl' : ''}`}>
              <p className="text-xs text-center text-gray-600 mb-1">{stat.label}</p>
              <div className="flex items-center justify-center md:justify-between flex-col gap-4">
                <p className="text-sm text-primary md:text-xl font-bold">{stat.value}</p>
                <span className={`px-2 py-1 text-xs font-genos text-center rounded-xl ${
                  stat.trend === 'up' ? 'bg-green-100 text-green-800' :
                  stat.trend === 'down' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Rent Collection Progress */}
        <RentCollectionProgress
          month={selectedMonth}
          year={selectedYear}
          houses={currentMonthHouses}
          onMonthChange={handleMonthChange}
          maxDate={maxDate}
        />
      </div>


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