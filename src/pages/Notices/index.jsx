import React, { useState } from 'react';
import { useAuth } from '../../hooks';

const NoticesPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [isCreating, setIsCreating] = useState(false);

  const mockNotices = [
    {
      id: 1,
      title: 'Water Supply Maintenance',
      content: 'Water supply will be shut down on Saturday for maintenance',
      type: 'maintenance',
      priority: 'high',
      createdAt: '2024-01-15',
      author: 'Admin',
    },
    {
      id: 2,
      title: 'Monthly Rent Collection',
      content: 'Please pay your rent by 5th of next month',
      type: 'rent',
      priority: 'normal',
      createdAt: '2024-01-10',
      author: 'Manager',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>📢 Notice Board</h1>
        <button 
          className="button button-primary"
          onClick={() => setIsCreating(true)}
        >
          + Create Notice
        </button>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Notices
        </button>
        <button 
          className={`tab ${activeTab === 'my' ? 'active' : ''}`}
          onClick={() => setActiveTab('my')}
        >
          My Notices
        </button>
        <button 
          className={`tab ${activeTab === 'important' ? 'active' : ''}`}
          onClick={() => setActiveTab('important')}
        >
          Important
        </button>
      </div>

      <div className="notices-list">
        {mockNotices.map(notice => (
          <div key={notice.id} className="card notice-card">
            <div className="notice-header">
              <div>
                <h3>{notice.title}</h3>
                <div className="notice-meta">
                  <span className="notice-type">{notice.type}</span>
                  <span className="notice-date">{notice.createdAt}</span>
                  <span className="notice-author">By {notice.author}</span>
                </div>
              </div>
              <span className={`priority-badge ${notice.priority}`}>
                {notice.priority}
              </span>
            </div>
            <p className="notice-content">{notice.content}</p>
            <div className="notice-actions">
              <button className="button button-outline">Edit</button>
              <button className="button button-outline">Delete</button>
              <button className="button button-outline">Send Reminder</button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Notice Modal */}
      {isCreating && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Notice</h3>
              <button onClick={() => setIsCreating(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title</label>
                <input type="text" placeholder="Enter notice title" />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea rows={4} placeholder="Enter notice content"></textarea>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="form-group">
                <label>Send To</label>
                <div className="checkbox-group">
                  <label>
                    <input type="checkbox" /> All Houses
                  </label>
                  <label>
                    <input type="checkbox" /> Specific Houses
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="button button-outline"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </button>
              <button className="button button-primary">
                Publish Notice
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .tab {
          padding: 12px 24px;
          background: none;
          border: none;
          cursor: pointer;
          position: relative;
          color: #666;
        }
        
        .tab.active {
          color: #3b82f6;
          font-weight: 500;
        }
        
        .tab.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #3b82f6;
        }
        
        .notices-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .notice-card {
          padding: 20px;
        }
        
        .notice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        
        .notice-meta {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          font-size: 14px;
          color: #666;
        }
        
        .notice-type {
          text-transform: capitalize;
          background-color: #f3f4f6;
          padding: 2px 8px;
          border-radius: 4px;
        }
        
        .priority-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          text-transform: uppercase;
        }
        
        .priority-badge.high {
          background-color: #fee2e2;
          color: #dc2626;
        }
        
        .priority-badge.normal {
          background-color: #dbeafe;
          color: #1d4ed8;
        }
        
        .notice-content {
          margin-bottom: 16px;
          line-height: 1.6;
        }
        
        .notice-actions {
          display: flex;
          gap: 8px;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal {
          background-color: white;
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .modal-header button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
        }
        
        .modal-body {
          padding: 20px;
        }
        
        .modal-footer {
          padding: 20px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
        }
        
        .checkbox-group {
          display: flex;
          gap: 20px;
        }
        
        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </div>
  );
};

export default NoticesPage;