import React from 'react';
import { useAuth } from '../../hooks';
import WebOwnerDashboard from './WebOwnerDashboard';

const Dashboard = () => {
  const { user, isWebOwner, isHouseOwner, isCaretaker, isStaff } = useAuth();

  return (
    <>
      {
        isWebOwner && <WebOwnerDashboard />
      }
      {
        isHouseOwner && <h2>House Owner Dashboard - Welcome, {user?.name}!</h2>
      }
      {
        isCaretaker && <h2>Caretaker Dashboard - Welcome, {user?.name}!</h2>
      }
      {
        isStaff && <h2>Staff Dashboard - Welcome, {user?.name}!</h2>
      }
    </>
  );
};

export default Dashboard;