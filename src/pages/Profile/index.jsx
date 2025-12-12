import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks';
import { useSetPasswordMutation, useLinkGoogleAccountMutation } from '../../store/api/authApi';
import push from '../../services/push';
import NotificationTester from '../../components/admin/NotificationTester';
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
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <h1 className="text-4xl font-extrabold text-gray-800 mb-8 border-b-4 border-indigo-500 pb-2 inline-block">
          ⚙️ Profile Settings
        </h1>

        {/* Profile Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Personal Information Card */}
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition duration-300 md:col-span-2 lg:col-span-1">
            <h3 className="text-xl font-bold text-indigo-600 mb-4 flex items-center">
              <span className="mr-2 text-2xl">👤</span> Personal Information
            </h3>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <strong className="text-gray-600 font-medium">Name:</strong> 
              <span className="text-gray-800 font-semibold">{user?.name || 'Not set'}</span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <strong className="text-gray-600 font-medium">Email:</strong> 
              <span className="text-gray-800 font-semibold">{user?.email}</span>
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
            <h3 className="text-xl font-bold text-indigo-600 mb-4 flex items-center">
              <span className="mr-2 text-2xl">🔐</span> Security
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
            {user?.needsPasswordSetup && (!user.passwordHash || !user.googleId) && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-700 mb-3">Set Password</h4>
                <form onSubmit={handleSetPassword} className="space-y-4">
                  <input
                    type="password"
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150"
                  />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150"
                  />
                  <button 
                    type="submit" 
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition duration-300 shadow-md"
                  >
                    Set Password
                  </button>
                </form>
              </div>
            )}
            
            {/* Message Display (Conditional) */}
            {message && (
              <div className="mt-4 p-3 bg-blue-100 text-blue-800 rounded-lg font-medium text-sm">
                {message}
              </div>
            )}
          </div>

          {/* Account Linking Card */}
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition duration-300 md:col-span-3 lg:col-span-1">
            <h3 className="text-xl font-bold text-indigo-600 mb-4 flex items-center">
              <span className="mr-2 text-2xl">🔗</span> Account Linking
            </h3>
            <p className="text-gray-500 mb-6">Connect external services for fast, secure login.</p>
            
            <div className="flex flex-col space-y-4">
              {!user?.googleId ? (
                <button 
                  onClick={handleLinkGoogle} 
                  className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 bg-white hover:bg-gray-50 transition duration-300 shadow-sm"
                >
                  <span className="text-lg mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15h-3v-3h3v-2c0-3.23 1.99-5 4.65-5 1.25 0 2.29.09 2.6.14v3.2h-1.85c-1.84 0-2.2.88-2.2 2.17V12h3.29l-.53 3h-2.76v6.75C18.44 21.05 22 17.02 22 12z" fill="#4285F4"/>
                      <path d="M12.016 2.016c-5.52 0-10 4.48-10 10 0 4.84 3.44 8.87 8 9.8v-6.75h-3.29l.53-3H12V7h3.65c.31.05 1.35.14 2.6.14 2.66 0 4.65 1.77 4.65 5v3h-3.29v3h3.29V12c0-5.52-4.48-10-10-10z" fill="#4285F4" opacity=".8"/>
                    </svg>
                  </span> 
                  Link Google Account
                </button>
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

      <NotificationTester />
      
    </div>
  );
};

export default ProfilePage;