import React, { useState } from 'react';
import { useAuth } from '../../hooks';

const SettingsPage = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    allowSignup: true,
    maintenanceMode: false,
    enableNotifications: true,
    enableEmails: true,
    rentReminderDays: 3,
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      alert('Settings saved successfully!');
    }, 1000);
  };

  return (
    <div>
      <h1>⚙️ System Settings</h1>
      <p className="subtitle">Manage system-wide configurations</p>

      <div className="settings-grid">
        <div className="card">
          <h3>🛡️ Security Settings</h3>
          
          <div className="setting-item">
            <div className="setting-info">
              <h4>Allow Public Signup</h4>
              <p>Allow new users to register through signup page</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.allowSignup}
                onChange={() => handleToggle('allowSignup')}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h4>Maintenance Mode</h4>
              <p>Put the system under maintenance (only admins can access)</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={() => handleToggle('maintenanceMode')}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="card">
          <h3>🔔 Notification Settings</h3>
          
          <div className="setting-item">
            <div className="setting-info">
              <h4>Push Notifications</h4>
              <p>Send browser push notifications for important updates</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={() => handleToggle('enableNotifications')}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h4>Email Notifications</h4>
              <p>Send email notifications for rent reminders and notices</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.enableEmails}
                onChange={() => handleToggle('enableEmails')}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="card">
          <h3>💰 Rent Settings</h3>
          
          <div className="setting-item">
            <div className="setting-info">
              <h4>Rent Reminder Days</h4>
              <p>Send reminder notification days before rent is due</p>
            </div>
            <div className="number-input">
              <button 
                onClick={() => setSettings(prev => ({ 
                  ...prev, 
                  rentReminderDays: Math.max(1, prev.rentReminderDays - 1) 
                }))}
              >
                -
              </button>
              <span>{settings.rentReminderDays} days</span>
              <button 
                onClick={() => setSettings(prev => ({ 
                  ...prev, 
                  rentReminderDays: prev.rentReminderDays + 1 
                }))}
              >
                +
              </button>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h4>Late Fee Percentage</h4>
              <p>Percentage charged as late fee for overdue rent</p>
            </div>
            <div className="percentage-input">
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                defaultValue="5"
              />
              <span>5%</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>👥 User Management</h3>
          
          <div className="setting-item">
            <div className="setting-info">
              <h4>Default User Role</h4>
              <p>Default role assigned to new users during signup</p>
            </div>
            <select className="role-select" defaultValue="house_owner">
              <option value="house_owner">House Owner</option>
              <option value="caretaker">Caretaker</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          <button className="button button-outline" style={{ width: '100%', marginTop: '16px' }}>
            Manage All Users
          </button>
        </div>
      </div>

      <div className="save-actions">
        <button 
          className="button button-outline"
          onClick={() => setSettings({
            allowSignup: true,
            maintenanceMode: false,
            enableNotifications: true,
            enableEmails: true,
            rentReminderDays: 3,
          })}
        >
          Reset to Default
        </button>
        <button 
          className="button button-primary"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <style jsx>{`
        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }
        
        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .setting-item:last-child {
          border-bottom: none;
        }
        
        .setting-info h4 {
          margin-bottom: 4px;
        }
        
        .setting-info p {
          color: #666;
          font-size: 14px;
        }
        
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
        }
        
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 34px;
        }
        
        .slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        
        input:checked + .slider {
          background-color: #3b82f6;
        }
        
        input:checked + .slider:before {
          transform: translateX(26px);
        }
        
        .number-input {
          display: flex;
          align-items: center;
          gap: 12px;
          background-color: #f3f4f6;
          padding: 8px 12px;
          border-radius: 8px;
        }
        
        .number-input button {
          width: 32px;
          height: 32px;
          border: none;
          background-color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .percentage-input {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .percentage-input input {
          flex: 1;
        }
        
        .role-select {
          padding: 8px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background-color: white;
        }
        
        .save-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 30px;
          padding-top: 30px;
          border-top: 2px solid #e5e7eb;
        }
        
        .subtitle {
          color: #666;
          margin-bottom: 30px;
        }
      `}</style>
    </div>
  );
};

export default SettingsPage;