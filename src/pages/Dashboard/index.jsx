import React from 'react';
import { useAuth } from '../../hooks';
import SystemDashboard from '../../components/dashboard/SystemDashboard';
import HouseOwnerComponent from '../../components/houseowner/Dashboard';

const Dashboard = () => {
  const { isWebOwner, isHouseOwner, isCaretaker, isStaff } = useAuth();

  return (
    <>
      {
        (isWebOwner || isStaff) && <SystemDashboard />
      }
      {
        (isHouseOwner || isCaretaker) && <HouseOwnerComponent />
      }
    </>
  );
};

export default Dashboard;