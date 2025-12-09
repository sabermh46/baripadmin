import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  useRegisterMutation,
  useValidateTokenMutation,
  useGetPublicRegistrationStatusQuery 
} from '../../store/api/authApi';
import { useAppDispatch } from '../../hooks';
import { setCredentials } from '../../store/slices/authSlice';
import TextField from '../../components/common/TextField';
import SmartForm from '../../components/common/SmartForm';
import GoogleButton from '../../components/common/GoogleButton';
import { buildingShade } from '../../assets';
import { ChevronLeft, CheckCircle, XCircle, Clock } from 'lucide-react';

const SignupPage = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenValid, setTokenValid] = useState(false);
  const [checkingToken, setCheckingToken] = useState(false);
  const [publicRegistrationEnabled, setPublicRegistrationEnabled] = useState(false);
  
  const [registerMutation, { isLoading }] = useRegisterMutation();
  const [validateToken] = useValidateTokenMutation();
  const { data: publicRegStatus } = useGetPublicRegistrationStatusQuery();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  // Set public registration status
  useEffect(() => {
    if (publicRegStatus) {
      setPublicRegistrationEnabled(publicRegStatus.publicRegistrationEnabled);
    }
  }, [publicRegStatus]);

  // Validate token when component mounts or email changes
  useEffect(() => {
    const validateRegistrationToken = async () => {
      if (!token) return;

      setCheckingToken(true);
      try {
        const result = await validateToken({ token }).unwrap();
        if (result.valid) {
          setTokenInfo(result.token);
          setTokenValid(true);
        }
      } catch (err) {
        setTokenValid(false);
        console.error('Token validation failed:', err);
      } finally {
        setCheckingToken(false);
      }
    };

    validateRegistrationToken();
  }, [token, validateToken]);

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
      disabled: tokenInfo?.email ? true : false, // Disable if token has specific email
      value: tokenInfo?.email || '',
      validate: (val) => {
        if (!val) {
          return 'Email is required';
        }
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
        if (val === '') {
          return '';
        }
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
    },
    {
      component: TextField,
      name: 'confirmPassword',
      label: 'Confirm Password *',
      isPassword: true,
      placeholder: 'Confirm your password',
      validate: (val, formData) => {
        if (!val) {
          return 'Please confirm your password';
        }
        if (val !== formData.password) {
          return 'Passwords do not match';
        }
        return '';
      },
    }
  ];

  const handleSubmit = async (formData) => {
    setError('');
    
    // Check if token is required but not provided
    if (!token && !publicRegistrationEnabled) {
      setError('Public registration is disabled. Please use an invitation link.');
      return;
    }

    // Check if token is invalid
    if (token && !tokenValid && checkingToken) {
      setError('Please wait while we validate your invitation token');
      return;
    }

    if (token && !tokenValid) {
      setError('Invalid or expired invitation token. Please request a new one.');
      return;
    }

    // Prepare data for registration
    const registrationData = {
      ...formData,
      token: token || undefined
    };

    try {
      const result = await registerMutation(registrationData).unwrap();
      dispatch(setCredentials(result));
      
      // Redirect with success message
      navigate('/dashboard', {
        state: {
          welcomeMessage: `Welcome ${result.user.name}!`,
          ...(tokenInfo && { role: tokenInfo.roleSlug })
        }
      });
    } catch (err) {
      setError(err?.data?.error || 'Registration failed');
    }
  };

  const googleAuth = () => {
    // Include token in Google auth if present
    const googleAuthUrl = token 
      ? `${import.meta.env.VITE_APP_API_URL}/auth/google?token=${token}`
      : `${import.meta.env.VITE_APP_API_URL}/auth/google`;
    
    window.open(googleAuthUrl, "_self");
  };

  // Render token status badge
  const renderTokenStatus = () => {
    if (!token) {
      if (!publicRegistrationEnabled) {
        return (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <XCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-yellow-800 font-medium">Invitation Required</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Public registration is disabled. You need an invitation link to sign up.
            </p>
            <p className="text-xs text-yellow-600 mt-2">
              If you have an account, <Link to="/login" className="font-medium hover:underline">login here</Link>.
            </p>
          </div>
        );
      }
      return null;
    }

    if (checkingToken) {
      return (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-blue-600 mr-2 animate-pulse" />
            <span className="text-blue-800 font-medium">Validating Invitation...</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Please wait while we validate your invitation token.
          </p>
        </div>
      );
    }

    if (tokenValid) {
      return (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800 font-medium">Valid Invitation</span>
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-green-700">
              You're registering as a{' '}
              <span className="font-semibold capitalize">
                {tokenInfo?.roleSlug?.replace('_', ' ') || 'user'}
              </span>
            </p>
            {tokenInfo?.createdBy && (
              <p className="text-xs text-green-600">
                Invited by: {tokenInfo.createdBy.name} ({tokenInfo.createdBy.email})
              </p>
            )}
            {tokenInfo?.email && (
              <p className="text-xs text-green-600">
                Email locked to: {tokenInfo.email}
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800 font-medium">Invalid Invitation</span>
        </div>
        <p className="text-sm text-red-700 mt-1">
          Your invitation token is invalid or has expired.
        </p>
        <p className="text-xs text-red-600 mt-2">
          Please request a new invitation link or{' '}
          <Link to="/login" className="font-medium hover:underline">login if you have an account</Link>.
        </p>
      </div>
    );
  };

  // Modify header based on token status
  const getHeader = () => {
    if (token) {
      return tokenValid ? 'Accept Invitation' : 'Invalid Invitation';
    }
    return 'Sign Up';
  };

  // Get subheader text
  const getSubheader = () => {
    if (token && tokenValid && tokenInfo) {
      return `You've been invited to join as ${tokenInfo.roleSlug.replace('_', ' ')}`;
    }
    if (!token && !publicRegistrationEnabled) {
      return 'Invitation required to register';
    }
    return 'Create your account';
  };

  return (
    <div className="flex flex-col pt-8 items-center bg-background bg-cover bg-center relative overflow-x-clip min-h-screen px-4">
      <Link to="/" className="fixed z-40 h-10 top-6 left-6 font-bold text-slate-400 flex items-center gap-2 hover:underline cursor-pointer">
        <ChevronLeft /> <span>Back To Home</span>
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
        {renderTokenStatus()}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center">
            {getHeader()}
          </h1>
          <p className="text-sm text-gray-600 text-center mt-1">
            {getSubheader()}
          </p>
        </div>

        <SmartForm 
          logoVisible 
          header={getHeader()}
          fields={fields}
          onSubmit={handleSubmit}
          submitText={isLoading ? 'Creating Account...' : 'Create Account'}
          submitDisabled={
            isLoading || 
            (token && !tokenValid) || 
            (!token && !publicRegistrationEnabled)
          }
        />

        {error && (
          <div className="mt-4 p-3 border border-red-300 rounded-lg bg-red-50">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {(!token && publicRegistrationEnabled) && (
          <div className="mt-4 p-3 border border-blue-100 rounded-lg bg-blue-50">
            <p className="text-blue-700 text-sm text-center">
              By creating an account, you'll be registered as a{' '}
              <span className="font-medium">Flat Renter</span>
            </p>
          </div>
        )}

        <p className='text-sm mt-6 text-center text-gray-600'>
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Log in here
          </Link>
        </p>

        <div className="text-center my-4 text-gray-500 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <span className="relative bg-white px-4 text-sm">or continue with</span>
        </div>

        <GoogleButton 
          onClick={googleAuth}
          disabled={!token && !publicRegistrationEnabled}
          title={
            !token && !publicRegistrationEnabled 
              ? "Requires invitation" 
              : "Sign up with Google"
          }
        />
      </div>
    </div>
  );
};

export default SignupPage;