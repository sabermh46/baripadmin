import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks';
import { clearDeferredPrompt } from '../store/slices/uiSlice';

const InstallPrompt = () => {
  const dispatch = useAppDispatch();
  const { deferredPrompt } = useAppSelector(state => state.ui);
  const [isVisible, setIsVisible] = useState(true);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    dispatch(clearDeferredPrompt());
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  if (!deferredPrompt || !isVisible) return null;
  if (localStorage.getItem('installPromptDismissed') === 'true') return null;

  return (
    <div className="install-prompt">
      <div className="install-content">
        <div className="install-icon">📱</div>
        <div className="install-text">
          <h4>Install Barip App</h4>
          <p>Install the app for a better experience with offline access</p>
        </div>
        <div className="install-actions">
          <button onClick={handleInstall} className="button button-primary">
            Install
          </button>
          <button onClick={handleDismiss} className="button button-outline">
            Later
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .install-prompt {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 500px;
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          z-index: 1000;
          animation: slideUp 0.3s ease;
        }
        
        .install-content {
          display: flex;
          align-items: center;
          padding: 16px;
          gap: 16px;
        }
        
        .install-icon {
          font-size: 32px;
        }
        
        .install-text {
          flex: 1;
        }
        
        .install-text h4 {
          margin-bottom: 4px;
        }
        
        .install-text p {
          color: #666;
          font-size: 14px;
        }
        
        .install-actions {
          display: flex;
          gap: 8px;
        }
        
        @keyframes slideUp {
          from {
            transform: translate(-50%, 100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        
        @media (max-width: 600px) {
          .install-content {
            flex-direction: column;
            text-align: center;
          }
          
          .install-actions {
            width: 100%;
          }
          
          .install-actions button {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default InstallPrompt;