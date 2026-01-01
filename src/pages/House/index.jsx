import React, { useState } from 'react';
import { useAuth } from '../../hooks';
import AllHouses from '../Admin/house/AllHouses';
import HouseOwnerHouses from '../../components/houseowner/HouseOwnerHouses';

const HousesPage = () => {
  const { isWebOwner, isHouseOwner, isCaretaker, isStaff } = useAuth();
  const [houses, setHouses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      <AllHouses />
    </>
  );
};

export default HousesPage;