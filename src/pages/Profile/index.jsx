import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks';
import { useSetPasswordMutation, useLinkGoogleAccountMutation } from '../../store/api/authApi';
import push from '../../services/push';
import NotificationTester from '../../components/admin/NotificationTester';
import Btn from '../../components/common/Button';
import GoogleButton from '../../components/common/GoogleButton';
const ProfilePage = () => {
  const { user } = useAuth();
  const [setPasswordMutation] = useSetPasswordMutation();
  const [linkGoogleMutation] = useLinkGoogleAccountMutation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
   const [pushStatus, setPushStatus] = useState('checking');
   const [testResult, setTestResult] = useState(null);

  
  const checkPushStatus = async () => {
    if (!push.isSupported) {
      setPushStatus('unsupported');
      return;
    }

    const permission = Notification.permission;
    if (permission === 'denied') {
      setPushStatus('blocked');
    } else if (permission === 'granted') {
      // Check if subscribed
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setPushStatus(subscription ? 'subscribed' : 'not_subscribed');
    } else {
      setPushStatus('pending');
    }
  };
  

  const handleSubscribe = async () => {
    setPushStatus('subscribing');
    const result = await push.subscribeUser();
    await checkPushStatus();
  };

  const handleUnsubscribe = async () => {
    setPushStatus('unsubscribing');
    await push.unsubscribeUser();
    await checkPushStatus();
  };

  const handleTest = async () => {
    setTestResult(null);
    const result = await push.sendTest();
    setTestResult(result);
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }
    
    try {
      await setPasswordMutation({ password }).unwrap();
      setMessage('Password set successfully!');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage(error?.data?.error || 'Failed to set password');
    }
  };

  const handleLinkGoogle = () => {
    window.open(
      `${import.meta.env.VITE_APP_API_URL}/auth/google?link=true`,
      "_self"
    );
  };

  

  useEffect(() => {
    const cps = async () => {
      checkPushStatus();
    }
    cps()
  }, []);

  return (
    <div className="min-h-screen">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <h1 className="text-base md:text-xl font-semibold text-slate-600 mb-8 pb-2 inline-block">
          Profile Settings
        </h1>

        {/* Profile Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Personal Information Card */}
          <div className="bg-white max-w-full p-3 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition duration-300 md:col-span-2 lg:col-span-1">
            <h3 className="text-4base md:text-xl font-bold text-primary-600 mb-4 flex items-center">
              <span className="mr-2 text-base md:text-2xl">👤</span> Personal Information
            </h3>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <strong className="text-gray-600 font-medium">Name:</strong> 
              <span className="text-gray-800 font-semibold">{user?.name || 'Not set'}</span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <strong className="text-gray-600 font-medium">Email:</strong> 
              <span className="text-gray-800 font-semibold whitespace-pre-wrap break-all text-right">{user?.email}</span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <strong className="text-gray-600 font-medium">Role:</strong> 
              <span className="text-gray-800 font-semibold">{user?.role?.name}</span>
            </div>
            
            <div className="flex justify-between items-center py-3 last:border-b-0">
              <strong className="text-gray-600 font-medium">Account Created:</strong> 
              <span className="text-gray-800 font-semibold">{new Date(user?.createdAt || '').toLocaleDateString()}</span>
            </div>
          </div>

          {/* Security Card */}
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition duration-300 md:col-span-1 lg:col-span-1">
            <h3 className="text-base md:text-xl font-bold text-primary-600 mb-4 flex items-center">
              <span className="mr-2 text-base md:text-2xl">🔐</span> Security
            </h3>
            
            {/* Password Status */}
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <strong className="text-gray-600 font-medium">Password:</strong>
              {!user?.needsPasswordSetup ? (
                <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                  ✅ Set
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded-full">
                  ⚠️ Not Set
                </span>
              )}
            </div>
            
            {/* Google Account Status */}
            <div className="flex justify-between items-center py-3 last:border-b-0">
              <strong className="text-gray-600 font-medium">Google Account:</strong>
              {user?.googleId ? (
                <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                  ✅ Linked
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded-full">
                  ⚠️ Not Linked
                </span>
              )}
            </div>
            
            {/* Set Password Form (Conditional) */}
            {user?.needsPasswordSetup && (!user.passwordHash || !user.googleId) ? (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-700 mb-3">Set Password</h4>
                <form onSubmit={handleSetPassword} className="space-y-4">
                  <input
                    type="password"
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition duration-150"
                  />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition duration-150"
                  />
                  <button 
                    type="submit" 
                    className="w-full bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 transition duration-300 shadow-md"
                  >
                    Set Password
                  </button>
                </form>
              </div>)
              : null
            }


            {
              !user?.needsPasswordSetup &&
              (<Btn href={'/change-password'}>
                Change Password
              </Btn>)
            }
            
            
          </div>

          {/* Account Linking Card */}
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition duration-300 md:col-span-3 lg:col-span-1">
            <h3 className="text-base md:text-xl font-bold text-primary-600 mb-4 flex items-center">
              <span className="mr-2 text-base md:text-2xl">🔗</span> Account Linking
            </h3>
            <p className="text-gray-500 mb-6">Connect external services for fast, secure login.</p>
            
            <div className="flex flex-col space-y-4">
              {!user?.googleId ? (
                <GoogleButton onClick={handleLinkGoogle} />
              ) : (
                <button 
                  className="flex items-center justify-center w-full px-4 py-2 border border-green-400 rounded-lg font-semibold text-green-700 bg-green-50 transition duration-300 cursor-default" 
                  disabled
                >
                  ✅ Google Account Linked
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* <NotificationTester /> */}
      
    </div>
  );
};

export default ProfilePage;