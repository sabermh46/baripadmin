import React from 'react';
import { useAuth } from '../../hooks';
import SystemDashboard from '../../components/dashboard/SystemDashboard';
import HouseOwnerComponent from '../../components/houseowner/Dashboard';

const Dashboard = () => {
  const { user, isWebOwner, isHouseOwner, isCaretaker, isStaff } = useAuth();

  return (
    <>
      {
        isWebOwner && <SystemDashboard />
      }
      {
        isHouseOwner && <HouseOwnerComponent />
      }
      {
        isCaretaker && <h2>Caretaker Dashboard - Welcome, {user?.name}!</h2>
      }
      {
        isStaff && <SystemDashboard />
      }
    </>
  );
};

export default Dashboard;