// components/dashboard/HouseOwnerComponent.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from "../../hooks";
import StatsCardGrid from "./StatsCardGrid";
import RentCollectionProgress from "./RentCollectionProgress";
import UpcomingPayments from "./UpcomingPayment.jsx";
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

const HouseOwnerComponent = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Use RTK Query hooks
  const { 
    data: dashboardData, 
    isLoading, 
    refetch 
  } = useGetHouseOwnerDashboardDataQuery(undefined, {
    pollingInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

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
    
    // Extract data for the selected month from each house's monthly data
    Object.keys(rentProgress).forEach(houseId => {
      const houseMonthsData = rentProgress[houseId];
      const currentMonthData = houseMonthsData.find(
        data => data.month === selectedMonth && data.year === selectedYear
      );
      
      if (currentMonthData) {
        houses.push({
          ...currentMonthData,
          totalFlats: currentMonthData.total_flat || 0, // Rename for consistency
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

  if (isLoading || !dashboardData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { summary, rentCollectionProgress, currentMonthRentCollection, upcomingPayments, charts, houses } = dashboardData;

  // Format stats for StatsCardGrid
  const stats = [
    { 
      label: "Total Houses", 
      value: summary.totalHouses, 
      icon: HomeIcon,
      subtext: `${summary.activeHouses} active, ${summary.inactiveHouses} inactive`
    },
    { 
      label: "Total Flats", 
      value: summary.totalFlats, 
      icon: Flats,
      subtext: `${summary.occupiedFlats} occupied, ${summary.vacantFlats} vacant`
    },
    { 
      label: "Active Renters", 
      value: summary.totalRenters, 
      icon: Renters,
      subtext: `${summary.activeRenters} active, ${summary.inactiveRenters} inactive`
    },
    { 
      label: "Caretakers", 
      value: summary.assignedCaretakers, 
      icon: CareTaker,
      subtext: "Assigned to your houses"
    },
  ];

  // Calculate profit stats
  const profitStats = [
    {
      label: "Monthly Rent",
      value: `$${summary.monthlyRentCollection.toLocaleString()}`,
      trend: summary.monthlyRentCollection > 0 ? 'up' : 'neutral',
      change: "Current month"
    },
    {
      label: "Expenses",
      value: `$${summary.monthlyExpenses.toLocaleString()}`,
      trend: summary.monthlyExpenses > 0 ? 'down' : 'neutral',
      change: "Current month"
    },
    {
      label: "Monthly Profit",
      value: `$${summary.monthlyProfit.toLocaleString()}`,
      trend: summary.monthlyProfit > 0 ? 'up' : summary.monthlyProfit < 0 ? 'down' : 'neutral',
      change: `Occupancy: ${summary.occupancyRate}%`
    }
  ];

  return (
    <div className="">
      {/* Welcome Header with Refresh */}
      <div className="flex justify-between items-center">
        <div className="">
          <h2 className="text-sm text-slate-700 font-semibold ">
            Welcome back, {" "}
            <span className="text-base font-mooli text-primary">{user?.name}</span>
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


      <UpcomingPayments payments={upcomingPayments} />
      
      {/* Recent Houses */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 mt-4">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Your Houses</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {houses.slice(0, 6).map((house) => (
            <Link to={`/houses/${house.id}`}  key={house.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
              <h4 className="font-bold text-gray-800">{house.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{house.address}</p>
              <div className="flex items-center justify-between mt-3">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  house.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {house.active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-sm text-gray-700">{house.flatCount} flats</span>
              </div>
            </Link>
          ))}
        </div>
      </div>


      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Monthly Rent Collection</h3>
          <MonthlyChart data={charts.monthlyRentCollection} />
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <OccupancyChart data={charts.flatOccupancy} />
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <ExpenseChart data={charts.expenseBreakdown} />
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <CollectionByHouseChart data={charts.rentCollectionByHouse} />
        </div>
      </div>

      
    </div>
  );
};

export default HouseOwnerComponent;