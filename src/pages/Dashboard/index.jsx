import React from 'react';
import { useAuth } from '../../hooks';

const Dashboard = () => {
  const { user, isWebOwner, isHouseOwner, isStaff, isCaretaker } = useAuth();

  return (
    <div>
      <h1>Welcome, {user?.name || 'User'}! 👋</h1>
      <p className="subtitle">Here's what's happening with your properties.</p>
      
      <div className="dashboard-grid">
        {/* Role-specific cards */}
        {isWebOwner && (
          <>
            <div className="card">
              <h3>📈 System Overview</h3>
              <p>Total Users: 0</p>
              <p>Total Houses: 0</p>
              <p>Active Notices: 0</p>
            </div>
            <div className="card">
              <h3>⚙️ Quick Settings</h3>
              <button className="button button-outline">Manage Users</button>
              <button className="button button-outline">System Settings</button>
            </div>
          </>
        )}
         
        {isHouseOwner && (
          <>
            <div className="card">
              <h3>🏠 My Properties</h3>
              <p>Total Houses: 0</p>
              <p>Occupied Flats: 0/0</p>
              <button className="button button-primary">View Properties</button>
            </div>
            <div className="card">
              <h3>💰 Rent Status</h3>
              <p>Collected This Month: $0</p>
              <p>Pending: $0</p>
              <button className="button button-outline">View Details</button>
            </div>
          </>
        )}
        
        {isCaretaker && (
          <div className="card">
            <h3>📋 Assigned Tasks</h3>
            <p>Pending Tasks: 0</p>
            <p>Completed Today: 0</p>
            <button className="button button-primary">View Tasks</button>
          </div>
        )}
        
        {/* Common cards for all roles */}
        <div className="card">
          <h3>📢 Recent Notices</h3>
          <p>No notices yet</p>
          <button className="button button-outline">View All</button>
        </div>
        
        <div className="card">
          <h3>🔔 Notifications</h3>
          <p>No new notifications</p>
          <button className="button button-outline">See All</button>
        </div>
        
        {user?.needsPasswordSetup && (
          <div className="card alert-card">
            <h3>⚠️ Setup Required</h3>
            <p>Please set a password for your account to enable email login.</p>
            <button className="button button-primary">Set Password</button>
          </div>
        )}
      </div>
      
      <style>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 30px;
        }
        
        .card {
          padding: 24px;
          border-radius: 12px;
          background-color: var(--surface);
          box-shadow: var(--shadow);
        }
        
        .card h3 {
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .card p {
          margin-bottom: 12px;
          color: var(--text-secondary);
        }
        
        .card button {
          margin-top: 16px;
        }
        
        .alert-card {
          border-left: 4px solid var(--warning);
          grid-column: 1 / -1;
        }
        
        .subtitle {
          color: var(--text-secondary);
          margin-bottom: 30px;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;