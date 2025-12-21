import { useDispatch, useSelector } from 'react-redux';
// We only need the runtime imports in JS
// import type { RootState, AppDispatch } from '../store'; 

export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector; // No need for TypedUseSelectorHook in JS

// Auth hook
export const 
useAuth = () => {
  const { user, isAuthenticated, isLoading } = useAppSelector(state => state.auth);

  

  const hasPermission = (permissionKey) => {
    if (!user) return false;
    
    // Web owner has all permissions
    if (user.role?.slug === 'web_owner' || user.role?.slug === 'developer') {
      return true;
    }
    
    // Check user's permissions array
    return user.permissions.includes(permissionKey);
  };
  
  const isRole = (roleSlug) => {
    return user?.role?.slug === roleSlug;
  };
  
  return {
    user,
    isAuthenticated,
    isLoading,
    hasPermission,
    isRole,
    isDeveloper: isRole('developer'),
    isWebOwner: isRole('web_owner'),
    isStaff: isRole('staff'),
    isHouseOwner: isRole('house_owner'),
    isCaretaker: isRole('caretaker'),
  };
};

// API hook for making calls
export const useApiCall = () => {
  const dispatch = useAppDispatch();
  
  const call = async (
    apiCall,
    options
  ) => {
    if (options?.showLoading) {
      // dispatch(setLoading(true)); // Assuming setLoading is imported if used
    }
    
    try {
      const data = await apiCall;
      options?.onSuccess?.(data);
      return { data, error: null };
    } catch (error) { // No need for ': any'
      console.error('API call error:', error);
      options?.onError?.(error);
      return { data: null, error };
    } finally {
      if (options?.showLoading) {
        // dispatch(setLoading(false)); // Assuming setLoading is imported if used
      }
    }
  };
  
  return { call };
};