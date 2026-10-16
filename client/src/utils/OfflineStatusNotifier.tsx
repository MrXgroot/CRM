// OfflineStatusNotifier.tsx

import { useEffect, useState } from 'react';
import { CustomToast } from '../utils/CustomToast'; // Adjust path as needed
import { syncOfflineRequests } from './offlineDB'; // Import the sync function

export function OfflineStatusNotifier() {
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showCustomToast = (message: string) => {
        setToastMessage(message);
    };

    const clearCustomToast = () => {
        setToastMessage(null);
    };

    const handleOnline = () => {
        showCustomToast('Back Online! Initiating data sync...');
        syncOfflineRequests();
    };

    const handleOffline = () => {
        showCustomToast('Running in Offline mode. Data will be synced when you are back online.');
    }

    useEffect(() => {
        if (!navigator.onLine) {
            showCustomToast('Currently in Offline mode.');
        }

        // Listen for status changes
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            // Cleanup: remove both listeners
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline); 
        };
    }, []); 


    return (
        <>
            {/* JSX Rendering */}
            {toastMessage && (
                <CustomToast
                    message={toastMessage} 
                    onClose={clearCustomToast} 
                    duration={3000} // Set a duration
                />
            )}
        </>
    );
}
