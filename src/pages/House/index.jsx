import React, { useState } from 'react';
import { useAuth } from '../../hooks';

const HousesPage = () => {
  const { user } = useAuth();
  const [houses, setHouses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // This will be populated from API later
  const mockHouses = [
    { id: 1, name: 'Green Valley Apartments', address: '123 Main St', flats: 20, occupied: 15 },
    { id: 2, name: 'Sunshine Residency', address: '456 Oak Ave', flats: 12, occupied: 10 },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>🏠 Houses Management</h1>
        <button className="button button-primary">
          + Add New House
        </button>
      </div>

      <div className="houses-grid">
        {mockHouses.map(house => (
          <div key={house.id} className="card house-card">
            <div className="house-header">
              <h3>{house.name}</h3>
              <span className="status-badge active">Active</span>
            </div>
            <p className="house-address">{house.address}</p>
            <div className="house-stats">
              <div className="stat">
                <span className="stat-label">Total Flats</span>
                <span className="stat-value">{house.flats}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Occupied</span>
                <span className="stat-value">{house.occupied}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Vacant</span>
                <span className="stat-value">{house.flats - house.occupied}</span>
              </div>
            </div>
            <div className="house-actions">
              <button className="button button-outline">View Details</button>
              <button className="button button-outline">Manage Flats</button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        
        .houses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }
        
        .house-card {
          padding: 20px;
        }
        
        .house-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .status-badge.active {
          background-color: #d1fae5;
          color: #065f46;
        }
        
        .house-address {
          color: #666;
          margin-bottom: 20px;
        }
        
        .house-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        
        .stat {
          text-align: center;
        }
        
        .stat-label {
          display: block;
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }
        
        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: bold;
          color: #3b82f6;
        }
        
        .house-actions {
          display: flex;
          gap: 10px;
        }
        
        .house-actions button {
          flex: 1;
        }
      `}</style>
    </div>
  );
};

export default HousesPage;