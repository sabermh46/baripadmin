import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import { appLogo } from '../assets';
import NotificationIcon from './notifications/NotificationIcon';
import SideNav from './layout/SideNav';
import { Menu, X } from 'lucide-react';
import LanguageSwitcher from './common/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { useAdminPendingAppFee } from '../hooks/useAdminPendingAppFee';
import { addDays, format } from 'date-fns';

const Layout = () => {
  const { user, isHouseOwner, isCaretaker } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pendingPayment } = useAdminPendingAppFee();


  const loseAccessDate = pendingPayment
    ? addDays(new Date(pendingPayment.start_date), pendingPayment.subscription_days + pendingPayment.offset_days)
    : null;





  return (
    <div className="flex min-h-screen max-w-full overflow-x-clip">
      {/* Sidebar */}
      <div className="hidden md:flex md:sticky top-0 w-64 bg-surface border-r border-gray-200 flex-col py-5 max-h-screen">
        <nav className="flex-1">
          <SideNav />
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-background overflow-auto relative pt-16">

        <header className="h-16 bg-surface/30 border-b border-gray-200 flex items-center justify-between fixed w-full left-0 right-0 top-0 backdrop-blur-[3px] z-40 px-4">
          
          
          <div className={`flex gap-2 items-center`}>
            <Link to="/" className='flex items-center text-xl font-bold font-oswald gap-3 text-primary'>
              <img src={appLogo} className={`h-10`} alt="App Logo" />
              <p className=" leading-[100%]">{t('bari_porichalona')} <br /> 
              <span className='text-xs font-thin text-gray-500 font-mooli'>({user?.role?.name || 'User'})</span></p>
            </Link>
          </div>
          <div className='flex gap-3'>
            <div className="flex items-center gap-4">
              <div className='hidden md:block'>
                <LanguageSwitcher />
              </div>
              <NotificationIcon />
            </div>
          <button
            className="md:hidden bg-transparent border-none text-2xl cursor-pointer"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {
              !isMobileMenuOpen ?
                  <Menu className='text-slate-700' />
                  : <X className='text-slate-700' />
            }
            
          </button>
          </div>
        </header>

        {/* Subscription warning bar for house_owner / caretaker on warning day */}
        {pendingPayment && (isHouseOwner || isCaretaker) && (
          <div className="fixed max-w-[90%] w-100 mx-auto top-6 z-50 left-0 right-0 bg-red-200 rounded-2xl border border-amber-200">
            <div className="max-w-5xl mx-auto px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-xs sm:text-sm text-amber-900">
                <span className="font-semibold">Your subscription has been overdue.</span>{' '}
                You'll lose access at {loseAccessDate ? format(loseAccessDate, 'dd MMM yyyy') : ''}.
              </div>
              <button
                type="button"
                onClick={() => navigate('/app-fee')}
                className="self-start sm:self-auto px-3 py-1 bg-amber-600 text-white text-xs rounded-md hover:bg-amber-700"
              >
                View app fee
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 p-4 max-w-full overflow-x-clip relative">
          <Outlet />
        </div>
      </main>

      {/* Mobile Menu */}
      
        <div className={`fixed md:hidden inset-0 bg-black/25 z-30 duration-300 ${ isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none' }`}
        onClick={()=>setIsMobileMenuOpen(false)}>
          <div onClick={(e)=>e.stopPropagation()} className={`md:hidden max-w-80 w-[80%] !min-w-[250px] bg-surface z-50 py-5 flex flex-col gap-2 shadow-2xl ${ isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full' }  fixed top-0 left-0 h-full w-full duration-300 transition-transform`}>
            <SideNav isMobileMenuOpen={isMobileMenuOpen} onClicked={setIsMobileMenuOpen} />
          </div>
        </div>
      

    </div>
  );
};

export default Layout;