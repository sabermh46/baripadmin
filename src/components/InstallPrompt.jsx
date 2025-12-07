import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks';
import { clearDeferredPrompt } from '../store/slices/uiSlice';
import { globalDeferredPrompt } from '../App';


const InstallPrompt = () => {
  const dispatch = useAppDispatch();
  // 1. Read the boolean FLAG from Redux (to control visibility)
  const isPromptAvailable = useAppSelector(state => state.ui.deferredPrompt); 
  const [isVisible, setIsVisible] = useState(true);

  const handleInstall = async () => {
    // 2. Use the global variable for the actual prompt object
    const promptEvent = globalDeferredPrompt; 
    
    if (!promptEvent) {
        console.error("Install prompt event object is missing.");
        return;
    }
    
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // 3. Clear the global variable and the Redux flag
    globalDeferredPrompt = null; 
    dispatch(clearDeferredPrompt()); // This clears the Redux boolean flag
    setIsVisible(false);
  };

  const handleDismiss = () => {
    // 4. Clear the global variable and the Redux flag upon dismissal as well
    globalDeferredPrompt = null;
    dispatch(clearDeferredPrompt());
    setIsVisible(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  // 5. Check visibility using the Redux flag instead of the object itself
  if (!isPromptAvailable || !isVisible) return null;
  if (localStorage.getItem('installPromptDismissed') === 'true') return null;if (localStorage.getItem('installPromptDismissed') === 'true') return null;

 return (
        <div 
            className="
                fixed bottom-5 left-1/2 -translate-x-1/2 
                w-[90%] max-w-lg bg-white 
                rounded-xl shadow-2xl z-1000 
                transition-all duration-300 ease-out
            "
        >
            <div 
                className="
                    flex items-center p-4 gap-4 
                    sm:flex-row sm:text-left 
                    flex-col text-center
                "
            >
                <div 
                    // .install-icon: font-size: 32px
                    className="text-3xl"
                >
                    📱
                </div>
                
                <div 
                    className="flex-1"
                >
                    <h4 
                        className="mb-1 font-semibold text-lg"
                    >
                        Install Barip App
                    </h4>
                    <p 
                        className="text-sm text-gray-600"
                    >
                        Install the app for a better experience with offline access
                    </p>
                </div>
                
                <div 
                    className="flex gap-2 w-full sm:w-auto"
                >
                    <button 
                        onClick={handleInstall} 
                        className="
                            flex-1 px-4 py-2 rounded-lg text-white 
                            bg-blue-600 hover:bg-blue-700 
                            font-medium transition-colors
                        "
                    >
                        Install
                    </button>
                    <button 
                        onClick={handleDismiss} 
                        className="
                            flex-1 px-4 py-2 rounded-lg font-medium 
                            text-blue-600 border border-blue-600 
                            hover:bg-blue-50 transition-colors
                        "
                    >
                        Later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPrompt;