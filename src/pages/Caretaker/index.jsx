import React from 'react';
import { Navigate } from 'react-router-dom';
import CaretakerList from '../../components/caretaker/caretakerList';
import { useAuth } from '../../hooks';

/**
 * /caretakers means different things to different people.
 *
 * An admin or a house owner is looking at a list of caretakers. A caretaker is not — the
 * backend scopes that list to their own single row, so they would land on a directory
 * containing only themselves, one click away from the page they actually wanted. Send them
 * straight to their own record, which is where their assignments and permissions live.
 */
const CareTakerPage = () => {
  const { user, isCaretaker } = useAuth();

  if (isCaretaker && user?.id) {
    return <Navigate to={`/caretakers/${user.id}/details`} replace />;
  }

  return <CaretakerList />;
};

export default CareTakerPage;
