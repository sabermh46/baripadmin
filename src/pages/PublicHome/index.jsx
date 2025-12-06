import React, {useEffect} from 'react';
import { Link, Links, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks';
import { appLogo } from '../../assets';
import Btn from '../../components/common/Button';
import { toast } from 'react-toastify';

const PublicHome = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/signup'); 
    }
  };
  
  useEffect(() => {
    toast("Welcome to Bari Porichalona! Manage your house rents with ease.", { type: "info", autoClose: 5000 });

  }, [])
  
  return (
    <div className="min-h-screen from-gray-50 to-white">
      {/* Navigation Bar */}
      <nav className="sticky top-0 bg-white shadow-md z-50 py-4">

        <div className="max-w-7xl mx-auto px-5 flex justify-between items-center">


          <Link to={'/'} className="flex items-center gap-2">
            <img src={appLogo} alt="Barip Logo" className="h-full w-auto max-h-12 p-0" />
            <h1 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-primary-400 to-red-400 font-oswald">
                Bari Porichalona
            </h1>
          </Link>


          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-gray-600 font-medium hover:text-primary transition-colors">
                Home
            </Link>
            <Link to="/#features" className="text-gray-600 font-medium hover:text-primary transition-colors">
                Features
            </Link>
            <Link to="/#pricing" className="text-gray-600 font-medium hover:text-primary transition-colors">
                Pricing
            </Link>
            <Link to="/#contact" className="text-gray-600 font-medium hover:text-primary transition-colors">
                Contact
            </Link>
          </div>


          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-gray-600 font-medium hidden sm:inline">
                    Hello, {user?.name?.split(' ')[0] || 'User'}!
                </span>
                <Link 
                    to="/dashboard" 
                    className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors shadow-md"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Btn type="outline" href="/login">
                  Login
                </Btn>
                <Btn type="primary" href="/signup">
                  Sign Up
                </Btn>

                
              </>
            )}
          </div>


        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto mt-16 md:mt-24 px-5 grid grid-cols-1 md:grid-cols-2 gap-16 items-center text-center md:text-left">
        <div className="hero-content">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-gray-900 leading-tight">
            Simplify Your <span className="text-primary">House Rent</span> Management
          </h1>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            From rent collection to maintenance requests, manage everything in one place.
            Designed for house owners, caretakers, and tenants.
          </p>
          <div className="flex justify-center md:justify-start gap-4 mb-12">
            <button 
                onClick={handleGetStarted} 
                className="px-8 py-3 text-lg font-semibold bg-primary text-white rounded-xl hover:bg-primary-600 transition-colors shadow-lg shadow-primary-200/50"
            >
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
            </button>
            <Link 
                to="/#demo" 
                className="px-8 py-3 text-lg font-semibold text-primary border-2 border-primary rounded-xl hover:bg-primary-50 transition-colors"
            >
              Watch Demo
            </Link>
          </div>
          <div className="flex justify-center md:justify-start gap-10">
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold text-primary">100+</span>
              <span className="text-sm text-gray-600 mt-1">Properties Managed</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold text-primary">₹10M+</span>
              <span className="text-sm text-gray-600 mt-1">Rent Processed</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold text-primary">500+</span>
              <span className="text-sm text-gray-600 mt-1">Happy Users</span>
            </div>
          </div>
        </div>
        <div className="relative h-96 hidden md:block">
          {/* Dashboard preview graphic */}
          <div className="absolute p-5 bg-white rounded-xl shadow-2xl font-semibold transition-all duration-300 hover:scale-105" style={{ top: '0', left: '0', width: '200px', height: '150px' }}>
                📊 Dashboard
            </div>
          <div className="absolute p-5 bg-white rounded-xl shadow-2xl font-semibold transition-all duration-300 hover:scale-105" style={{ top: '80px', right: '0', width: '180px', height: '120px' }}>
                🏠 Houses
            </div>
          <div className="absolute p-5 bg-white rounded-xl shadow-2xl font-semibold transition-all duration-300 hover:scale-105" style={{ bottom: '40px', left: '40px', width: '220px', height: '140px' }}>
                💰 Rent
            </div>
          <div className="absolute p-5 bg-white rounded-xl shadow-2xl font-semibold transition-all duration-300 hover:scale-105" style={{ bottom: '0', right: '60px', width: '160px', height: '100px' }}>
                📢 Notices
            </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto my-24 px-5">
        <h2 className="text-center text-3xl md:text-4xl font-extrabold mb-16 text-gray-900">
            Everything You Need in One Platform
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="p-8 bg-white rounded-2xl shadow-xl transition-all duration-200 hover:shadow-2xl hover:scale-[1.02]">
            <div className="text-5xl mb-5">🏠</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">House & Flat Management</h3>
            <p className="text-gray-600 leading-relaxed">Manage multiple properties, track occupancy, and organize flats efficiently.</p>
          </div>
          <div className="p-8 bg-white rounded-2xl shadow-xl transition-all duration-200 hover:shadow-2xl hover:scale-[1.02]">
            <div className="text-5xl mb-5">💰</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Rent Collection</h3>
            <p className="text-gray-600 leading-relaxed">Automated rent reminders, payment tracking, and late fee calculations.</p>
          </div>
          <div className="p-8 bg-white rounded-2xl shadow-xl transition-all duration-200 hover:shadow-2xl hover:scale-[1.02]">
            <div className="text-5xl mb-5">📢</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Notice Board</h3>
            <p className="text-gray-600 leading-relaxed">Send announcements, maintenance alerts, and important notices instantly.</p>
          </div>
          <div className="p-8 bg-white rounded-2xl shadow-xl transition-all duration-200 hover:shadow-2xl hover:scale-[1.02]">
            <div className="text-5xl mb-5">🔐</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Role-Based Access</h3>
            <p className="text-gray-600 leading-relaxed">Different dashboards for owners, caretakers, and staff with appropriate permissions.</p>
          </div>
          <div className="p-8 bg-white rounded-2xl shadow-xl transition-all duration-200 hover:shadow-2xl hover:scale-[1.02]">
            <div className="text-5xl mb-5">📱</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">PWA & Mobile Ready</h3>
            <p className="text-gray-600 leading-relaxed">Install as an app, works offline, and sends push notifications.</p>
          </div>
          <div className="p-8 bg-white rounded-2xl shadow-xl transition-all duration-200 hover:shadow-2xl hover:scale-[1.02]">
            <div className="text-5xl mb-5">📊</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Analytics & Reports</h3>
            <p className="text-gray-600 leading-relaxed">Track performance, generate financial reports, and get insights.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto my-24 px-5">
        <h2 className="text-center text-3xl md:text-4xl font-extrabold mb-16 text-gray-900">How Barip Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-5 shadow-lg shadow-primary-200/50">1</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Sign Up</h3>
            <p className="text-gray-600 leading-relaxed">Create your account as owner, caretaker, or staff. Use email or Google to register.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-5 shadow-lg shadow-primary-200/50">2</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Add Your Properties</h3>
            <p className="text-gray-600 leading-relaxed">Add houses, flats, and tenant information to the system.</p>
            </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-5 shadow-lg shadow-primary-200/50">3</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Manage & Collect</h3>
            <p className="text-gray-600 leading-relaxed">Send rent reminders, track payments, and manage maintenance requests.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-5 shadow-lg shadow-primary-200/50">4</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Stay Updated</h3>
            <p className="text-gray-600 leading-relaxed">Get notifications, view reports, and manage everything from your dashboard.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-primary to-primary-700 text-white py-20 px-5 text-center my-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-5">Ready to Simplify Your Rent Management?</h2>
          <p className="text-xl opacity-90 mb-8">Join hundreds of property owners who trust Barip for their management needs.</p>
          <button 
                onClick={handleGetStarted} 
                className="px-10 py-4 bg-white text-primary font-bold text-lg rounded-xl hover:bg-gray-100 transition-colors shadow-2xl"
            >
            {isAuthenticated ? 'Go to Dashboard →' : 'Start Free Trial →'}
          </button>
          <p className="mt-4 text-sm opacity-80">No credit card required • Free 14-day trial</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-10 mt-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 border-b border-gray-700 pb-10 mb-8">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🏠</span>
                <h2 className="text-xl font-bold">Barip</h2>
              </div>
              <p className="text-gray-400 text-sm">Simplifying house rent management since 2024</p>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-5 text-gray-100">Product</h3>
              <Link to="/#features" className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">Features</Link>
              <Link to="/#pricing" className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">Pricing</Link>
              <Link to="/#demo" className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">Demo</Link>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-5 text-gray-100">Company</h3>
              <Link to="/about" className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">About Us</Link>
              <Link to="/contact" className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">Contact</Link>
              <Link to="/privacy" className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">Privacy Policy</Link>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-5 text-gray-100">Connect</h3>
              <a href="mailto:support@barip.com" className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">Email: support@barip.com</a>
              <a href="tel:+911234567890" className="text-gray-400 text-sm hover:text-white mb-3 transition-colors">Phone: +91 12345 67890</a>
            </div>
          </div>
          <div className="text-center pt-5">
            <p className="text-gray-500 text-sm">© 2024 Barip. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicHome;