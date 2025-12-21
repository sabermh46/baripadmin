import React, { useState } from 'react';
import { useAuth } from '../../hooks';
import AllHouses from '../Admin/house/AllHouses';

const HousesPage = () => {
  const { user, isWebOwner, isHouseOwner, isCaretaker, isStaff } = useAuth();
  const [houses, setHouses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      {
        isHouseOwner && <HouseOwnerHouses />
      }
      {
        isWebOwner && <AllHouses />
      }
    </>
  );
};

export default HousesPage;