import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../hooks';
import { setCredentials } from '../../store/slices/authSlice';
import { useGoogleLoginQuery } from '../../store/api/authApi';

const AuthSuccess = () => {
  const { data, error, isLoading } = useGoogleLoginQuery();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (data && !data.error) {
      console.log(data);
      
      dispatch(setCredentials(data));
      navigate('/dashboard');
    } else if (error) {
      navigate('/login');
    }
  }, [data, error, dispatch, navigate]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Authenticating...</p>
      </div>
    );
  }

  return null;
};

export default AuthSuccess;