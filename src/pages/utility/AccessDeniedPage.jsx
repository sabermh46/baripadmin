import { Link } from "react-router-dom";
import { useAuth } from "../../hooks";

// pages/utility/AccessDeniedPage.jsx
const AccessDeniedPage = ({message = "You don't have permission to access this page."}) => {
  const { user } = useAuth();
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center p-8 max-w-md">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          {message}
          {user?.role?.slug && ` Your role: ${user.role.slug}`}
        </p>
        <div className="space-y-3">
          {/* Link, not <a href> — an anchor here reloaded the whole bundle and dropped the
              cache just to move between two routes the app already has mounted. */}
          <Link to="/dashboard" className="block px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark">
            Go to Dashboard
          </Link>
          <button 
            onClick={() => window.history.back()}
            className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;