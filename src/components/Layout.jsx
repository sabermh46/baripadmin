import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../hooks';
import { appLogo } from '../assets';
import NotificationIcon from './notifications/NotificationIcon';
import SideNav from './layout/SideNav';
import { Menu, X } from 'lucide-react';

const Layout = () => {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  





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
              <p className=" leading-[100%]">Bari Porichalona <br /> 
              <span className='text-xs font-thin text-gray-500 font-mooli'>({user?.role?.name || 'User'})</span></p>
            </Link>
          </div>
          <div className='flex gap-3'>
            <div className="flex items-center gap-4">
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

        <div className="flex-1 p-4 overflow-y-auto max-w-full overflow-x-clip relative">
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