import { use, useState } from "react";
import StatsCardGrid from "./StatsCardGrid";
import RentCollectionProgress from "./RentCollectionProgress";
import { generateYearlyRentData } from "./calc.jsx";

import HomeIcon from "../../assets/icons/houses.svg";
import Flats from "../../assets/icons/flats.svg";
import Renters from "../../assets/icons/renter.svg";
import CareTaker from "../../assets/icons/caretaker.svg";
import { useAuth } from "../../hooks/index.js";
import UpcomingPayments from "./UpcomingPayment.jsx";

const HouseOwnerComponent = () => {
    const { user } = useAuth();
  const stats = [
    { label: "Total Houses", value: 4, icon: HomeIcon },
    { label: "Total Flats", value: 18, icon: Flats },
    { label: "Active Renters", value: 176, icon: Renters },
    { label: "Caretakers", value: 20, icon: CareTaker },
  ];

  const baseHouses = [
    { name: "Nikunja", total_flat: 16 },
    { name: "Proshanti", total_flat: 10 },
    { name: "Kuhelika", total_flat: 10 },
    { name: "Eva Mansion", total_flat: 8 },
  ];

  // CREATE YEARLY RANDOM DATA
  const yearlyRentData = generateYearlyRentData(baseHouses);

  // SELECTED MONTH (default: November)
  const [selectedMonth, setSelectedMonth] = useState(11);
  const [monthHouses, setMonthHouses] = useState(yearlyRentData[11]);

  // HANDLE MONTH CHANGE
  const handleLeft = () => {
    const newMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    setSelectedMonth(newMonth);
    setMonthHouses(yearlyRentData[newMonth]);
  };

  const handleRight = () => {
    const newMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
    setSelectedMonth(newMonth);
    setMonthHouses(yearlyRentData[newMonth]);
  };

  return (
    <>
    <div className="bg-primary/10 px-4 py-2 rounded-xl ring ring-primary/30">
          <h2 className="text-sm text-slate-700 font-semibold text-primary">
            Welcome back, <br />
            <span className="text-base font-mooli text-primary">{ user?.name }</span>
          </h2>
        </div>
      <StatsCardGrid stats={stats} />

      <RentCollectionProgress
        month={selectedMonth}
        houses={monthHouses}
        onMLeftClick={handleLeft}
        onMRightClick={handleRight}
      />

      <UpcomingPayments />
    </>
  );
};

export default HouseOwnerComponent;
