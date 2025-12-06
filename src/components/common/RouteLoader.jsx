import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';


// Your custom loader component
export function LoaderMinimal({ strokeColor = "#f9873c" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
      <div className="w-[120px] h-[60px]">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150">
          <path
            fill="none"
            stroke={strokeColor}
            strokeWidth="15"
            strokeLinecap="round"
            strokeDasharray="300 385"
            strokeDashoffset="0"
            d="M275 75c0 31-27 50-50 50-58 0-92-100-150-100-28 0-50 22-50 50s23 50 50 50c58 0 92-100 150-100 24 0 50 19 50 50Z"
          >
            <animate
              attributeName="stroke-dashoffset"
              calcMode="spline"
              dur="2s"
              values="685;-685"
              keySplines="0 0 1 1"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      </div>
    </div>
  );
}

const RouteLoader = () => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomLoader, setShowCustomLoader] = useState(false);
  const [minimumTimer, setMinimumTimer] = useState(null);

  useEffect(() => {
    // Start loading when route changes
    const startLoading = () => {
      setIsLoading(true);
      setShowCustomLoader(true);
      
      // Start minimum 300ms timer
      const timer = setTimeout(() => {
        setMinimumTimer(true);
      }, 300);
      
      return timer;
    };

    // Finish loading
    // const finishLoading = () => {
    //   if (minimumTimer) {
    //     setIsLoading(false);
    //     setShowCustomLoader(false);
    //     setMinimumTimer(null);
    //   } else {
    //     // Wait for the minimum timer
    //     const timer = setTimeout(() => {
    //       setIsLoading(false);
    //       setShowCustomLoader(false);
    //     }, 300);
    //     return timer;
    //   }
    // };

    // Start NProgress
    NProgress.start();
    
    // Start our custom loader
    const startTimer = startLoading();
    
    // Simulate minimum 300ms loading time
    const minimumTimer = setTimeout(() => {
      setMinimumTimer(true);
    }, 300);

    // Finish loading after a small delay to ensure smooth transition
    const finishTimer = setTimeout(() => {
      NProgress.done();
      setIsLoading(false);
      setShowCustomLoader(false);
    }, 400);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(minimumTimer);
      clearTimeout(finishTimer);
      NProgress.done();
      setIsLoading(false);
      setShowCustomLoader(false);
    };
  }, [location.pathname, minimumTimer]);

  // Option 1: Use only your custom loader
  // return showCustomLoader ? <LoaderMinimal strokeColor="#f9873c" /> : null;

  // Option 2: Use both NProgress bar and your custom loader
  return (
    <>
      {showCustomLoader && <LoaderMinimal strokeColor="#f9873c" />}
    </>
  );
};

export default RouteLoader;