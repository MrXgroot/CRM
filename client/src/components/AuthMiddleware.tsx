import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useMaster } from "../contexts/MasterContext"; // 💡 Import useMaster
import { useEffect, useState } from "react";

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, pageAccess } = useAuth();
  const { isOfflineEnabled } = useMaster(); // 💡 Get isOfflineEnabled from MasterContext
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine); // 💡 Track online status

  // 💡 Update online status when it changes (necessary for a reactive check)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // checkuser have access to this page
  const currentPath = location.pathname;
  const hasAccess = user.is_superadmin === 1 || ['/', '/profile', '/changePassword'].includes(currentPath) || (currentPath === '/crm/support' && user.is_admin === 1) || pageAccess.some(page => page.url === currentPath);

  if (!hasAccess && currentPath !== '/login') {
    return (
      <div className="h-[90vh] w-100 flex items-center justify-center py-10">
        You have no access to this page.
      </div>
    );
  } 

 // == Check if page works in offline here
  if (!isOnline && !isOfflineEnabled(currentPath)) {
    return (
      <div className="h-[90vh] w-100 flex items-center justify-center py-10">
        <div className="text-center p-8 bg-yellow-100 border border-yellow-400 rounded-lg shadow-md">
          <p className="text-xl font-bold text-yellow-800 mb-2">Service Unavailable</p>
          <p className="text-gray-700">This page does not support offline mode and requires an internet connection to view its content.</p>
          <p className="text-sm text-gray-500 mt-2">Please check your internet connection and try again.</p>
        </div>
      </div>
    );
  }
    
  // --- 4. Render Child ---
  return children;
}
