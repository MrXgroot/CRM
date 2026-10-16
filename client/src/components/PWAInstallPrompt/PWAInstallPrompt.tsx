import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallPromptProps {
  className?: string;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ className = '' }) => {
  const { isInstallable, isInstalled, installPWA } = usePWAInstall();
  const [show, setShow] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  if (isInstalled || !isInstallable || !show) {
    return null;
  }

  // Removed mobile check - show on all devices
  // const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  // if (!isMobile) return null;

  const handleDismiss = () => {
    setShow(false);
    const event = new CustomEvent('pwa-prompt-dismissed');
    window.dispatchEvent(event);
  };

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await installPWA();
      if (success) {
        // Installation was successful, component will hide automatically
        setShow(false);
      } else {
        // Installation failed or was dismissed
        setIsInstalling(false);
      }
    } catch (error) {
      console.error('Installation error:', error);
      setIsInstalling(false);
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 p-4 ${className}`}>
      <div className="bg-white border-t border-gray-200 rounded-t-2xl shadow-2xl animate-slide-up max-w-md mx-auto">
        <div className="p-4 text-center">
          {/* Text on top */}
          <div className="mb-3">
            <p className="text-gray-900 font-medium text-sm">Install App</p>
            <p className="text-gray-500 text-xs mt-1">Add to home screen for quick access</p>
          </div>
          
          {/* Buttons below */}
          <div className="flex items-center space-x-3 justify-center">
            <button
              onClick={handleDismiss}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Later
            </button>
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {isInstalling ? 'Installing...' : 'Install'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
