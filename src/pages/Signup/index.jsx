import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegisterMutation } from '../../store/api/authApi';
import { useAppDispatch } from '../../hooks';
import { setCredentials } from '../../store/slices/authSlice';
import TextField from '../../components/common/TextField';
import SmartForm from '../../components/common/SmartForm';
import GoogleButton from '../../components/common/GoogleButton';
import { buildingShade } from '../../assets';
import { ChevronLeft } from 'lucide-react';

const SignupPage = () => {

  const [error, setError] = useState('');
  const [registerMutation, { isLoading }] = useRegisterMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const fields = [
    {
      component: TextField,
      name: 'name',
      label: 'Full Name *',
      placeholder: 'Enter your full name',
      hint: '',
      validate: (val) => (!val ? 'Full Name is required' : ''),
    },
    {
      component: TextField,
      name: 'email',
      label: 'Email *',
      placeholder: 'Enter your email',
      hint: '',
      validate: (val) => {
        if (!val) {
          return 'Email is required';
        }
        // Basic email format regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
          return 'Please enter a valid email address';
        }
        return '';
      },
    },
    {
      component: TextField,
      name: 'phone',
      label: 'Phone (Optional)',
      placeholder: 'Enter your 11-digit phone number',
      hint: '',
      validate: (val) => {
        // Allow empty string since it is (Optional)
        if (val === '') {
          return '';
        }
        // Check if the input contains only digits and is exactly 11 characters long
        const phoneRegex = /^\d{11}$/;
        if (!phoneRegex.test(val)) {
          return 'Phone number must be exactly 11 digits';
        }
        return '';
      },
    },
    {
      component: TextField,
      name: 'password',
      label: 'Password *',
      isPassword: true,
      placeholder: 'Create a strong password',
      validate: (val) => {
        if (!val) {
          return 'Password is required';
        }
        if (val.length < 8) {
          return 'Password must be at least 8 characters long';
        }
        // Check for complexity
        if (!/[A-Z]/.test(val)) {
          return 'Password must contain at least one uppercase letter';
        }
        if (!/[a-z]/.test(val)) {
          return 'Password must contain at least one lowercase letter';
        }
        if (!/[0-9]/.test(val)) {
          return 'Password must contain at least one number';
        }
        return '';
      },
    }
  ];

  const handleSubmit = async (formData) => {
    setError('');
    
    try {
      const result = await registerMutation(formData).unwrap();
      dispatch(setCredentials(result));
      navigate('/dashboard');
    } catch (err) {
      setError(err?.data?.error || 'Registration failed');
    }
  };

  const googleAuth = () => {
    window.open(
      `${import.meta.env.VITE_APP_API_URL}/auth/google`,
      "_self"
    );
  };

  return (
    <div className="flex flex-col pt-8 items-center bg-background bg-cover bg-center relative overflow-x-clip min-h-screen px-4">
          
          <Link to="/" className="fixed z-40 h-10 top-6 left-6 font-bold text-slate-400 flex items-center gap-2 hover:underline cursor-pointer">
            <ChevronLeft  /> <span>Back To Home</span>
          </Link>

          {/* Background image */}
          <div className="absolute md:pl-50">
            <img
              className="w-[600px] max-w-none translate-x-20 -translate-y-10 md:translate-x-0 md:translate-y-0"
              src={buildingShade}
              alt="Building"
            />
          </div>
    
          {/* CARD */}
          <div className="w-full max-w-md p-6 z-10">
            <SmartForm logoVisible header={'Sign Up'} fields={fields} onSubmit={handleSubmit} />

            {error && <div className="text-red-500 mt-3 p-3 border border-red-500 rounded-lg bg-red-100">{error}</div>}
            
            
            <p className='text-sm mt-4 text-center'>
              Already have an account?{' '} <br />
              <Link to="/login" className="text-primary hover:underline ">Log in here</Link>
            </p>

            <div className="text-center my-4 text-slate-500">
              <span>or continue with</span>
            </div>


            <GoogleButton onClick={googleAuth} />
          </div>
        
        
      </div>
  );
};

export default SignupPage;