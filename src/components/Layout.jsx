import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import { useLogoutMutation } from '../store/api/authApi';
import { useAppDispatch } from '../hooks';
import { logout as logoutAction } from '../store/slices/authSlice';
import { appLogo } from '../assets';
import usePushNotifications from '../hooks/usePushNotifications';
import NotificationIcon from './notifications/NotificationIcon';

const Layout = () => {
  const { user, isWebOwner, isHouseOwner, isStaff, isCaretaker } = useAuth();
  const [logoutMutation] = useLogoutMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { unsubscribe } = usePushNotifications();

  
  
  const handleLogout = async () => {
    try {
      await unsubscribe();
      await logoutMutation().unwrap();
      dispatch(logoutAction());
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/houses', label: 'Houses', icon: '🏠', roles: ['web_owner', 'house_owner'] },
    { path: '/notices', label: 'Notices', icon: '📢', roles: ['web_owner', 'staff', 'house_owner'] },
    { path: '/profile', label: 'Profile', icon: '👤' },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    if (!user?.role?.slug) return false;
    return item.roles.includes(user.role.slug);
  });



  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="hidden md:flex md:sticky top-0 w-64 bg-surface border-r border-gray-200 flex-col py-5 max-h-screen">
        <div className="px-5 pb-5 border-b border-gray-200 mb-5 flex flex-col items-center">
          <h2 className="mb-2 text-xl font-bold">
            <img src={appLogo} alt="" />
          </h2>
          <p className="bg-primary text-white px-3 py-1 text-xs rounded-full inline-block">
            {user?.role?.name || 'User'}
          </p>
        </div>
        <nav className="flex-1">
          {filteredNavItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-5 py-3 text-text hover:bg-primary duration-300 transition-colors aria-[current=page]:bg-primary aria-[current=page]:text-white"
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}

          {isWebOwner && (
            <Link
              to="/settings"
              className="flex items-center gap-3 px-5 py-3 text-text hover:bg-primary duration-300 transition-colors"
            >
              <span className="text-xl">⚙️</span>
              <span>Settings</span>
            </Link>
          )}
        </nav>

        <div className="px-5 pt-5 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4 max-w-max">
            <div className="min-w-10 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold overflow-clip">
              <img src={user?.avatarUrl} alt={user?.name} className="w-full h-full object-cover" />
            </div>
            <div className='w-45'>
              <p className="line-clamp-1 text-ellipsis overflow-hidden font-medium" title={user?.name}>{user?.name || 'User'}</p>
              <p className="line-clamp-1 text-ellipsis overflow-hidden text-xs text-subdued" title={user?.email}>{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 bg-red-500 text-white border-none rounded-lg cursor-pointer hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-background">
        <header className="h-16 bg-surface/30 border-b border-gray-200 flex items-center justify-between px-5 sticky top-0 backdrop-blur-[3px]">
          <button
            className="md:hidden bg-transparent border-none text-2xl cursor-pointer"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            ☰
          </button>
          <div className="flex items-center gap-4">
            <NotificationIcon />
          </div>
        </header>

        <div className="flex-1 p-5 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-surface z-50 p-5 flex flex-col gap-2">
          <h2 className="mb-4 text-xl font-bold">Menu</h2>
          {filteredNavItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className="py-4 flex items-center gap-3 text-text border-b border-gray-200 hover:bg-background transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="mt-auto py-4 bg-red-500 text-white border-none rounded-lg cursor-pointer hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      )}

    </div>
  );
};

export default Layout;