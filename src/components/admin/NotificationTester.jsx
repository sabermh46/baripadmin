// src/components/admin/NotificationTester.jsx

import React, { useState } from 'react';
import axios from 'axios';
import { useAppSelector } from '../../hooks';
import { toast } from 'react-toastify';

const NotificationTester = () => {
  const { user } = useAppSelector(state => state.auth);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const token = localStorage.getItem('accessToken');

  const sendTestNotification = async (endpoint, data) => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_APP_API_URL}${endpoint}`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      toast.success('Test notification sent!');
      setTestResults(response.data);
      return response.data;
    } catch (error) {
      toast.error('Failed to send test notification');
      console.error('Test error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const testEndpoints = [
    {
      name: 'Send to Myself',
      endpoint: '/push/test',
      data: { notificationId: 1 },
      description: 'Send a test notification to yourself'
    },
    {
      name: 'Send to All WEB_OWNERs',
      endpoint: '/test/send-to-web-owner',
      data: { notificationId: 2 },
      description: 'Send test notification to all WEB_OWNER users',
      requires: 'WEB_OWNER'
    },
    {
      name: 'Send to HOUSE_OWNER Role',
      endpoint: '/test/send-to-role',
      data: { roleSlug: 'HOUSE_OWNER', notificationId: 3 },
      description: 'Send test notification to HOUSE_OWNER role',
      requires: ['WEB_OWNER', 'STAFF']
    },
    {
      name: 'Send All Tests to Me',
      endpoint: '/test/send-all-to-me',
      description: 'Send all test notifications to yourself'
    }
  ];

  // Check if user has required role
  const hasPermission = (requires) => {
    if (!requires) return true;
    if (!user || !user.role) return false;
    
    const requiredRoles = Array.isArray(requires) ? requires : [requires];
    return requiredRoles.includes(user.role.slug);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 max-w-[280px] md:max-w-full overflow-x-hidden">
      <h3 className="text-lg font-semibold mb-4">Push Notification Tester</h3>
      <p className="text-gray-600 mb-6">
        Use these buttons to test push notifications. Make sure you've subscribed to notifications first.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {testEndpoints.map((test, index) => (
          <button
            key={index}
            onClick={() => sendTestNotification(test.endpoint, test.data || {})}
            disabled={loading || !hasPermission(test.requires)}
            className={`p-4 rounded-lg border ${
              hasPermission(test.requires)
                ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700'
                : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
            } transition-colors duration-200`}
          >
            <div className="font-medium">{test.name}</div>
            <div className="text-sm mt-1">{test.description}</div>
            {test.requires && !hasPermission(test.requires) && (
              <div className="text-xs text-red-500 mt-1">
                Requires: {Array.isArray(test.requires) ? test.requires.join(', ') : test.requires}
              </div>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Sending notification...</p>
        </div>
      )}

      {testResults && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Test Results:</h4>
          <pre className="text-sm bg-gray-800 text-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(testResults, null, 2)}
          </pre>
          <button
            onClick={() => setTestResults(null)}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear Results
          </button>
        </div>
      )}

      <div className="mt-6 border-t pt-4">
        <h4 className="font-medium mb-2">Current User Info:</h4>
        <div className="text-sm text-gray-600">
          <p>ID: {user?.id}</p>
          <p>Email: {user?.email}</p>
          <p>Role: <span className="font-semibold">{user?.role?.slug || 'No role'}</span></p>
          <p>Name: {user?.name || 'Not set'}</p>
        </div>
      </div>
    </div>
  );
};

export default NotificationTester;