import React from 'react';
import { useAuth } from '../../hooks';
import AdminsAppFeePage from './AdminsAppFeePage';
import CustomersAppFeePage from './CustomersAppFeePage';

const AppFeePage = () => {
  const { isWebOwner, isStaff } = useAuth();
  return (isWebOwner || isStaff) ? <AdminsAppFeePage /> : <CustomersAppFeePage />;
};

export default AppFeePage;
