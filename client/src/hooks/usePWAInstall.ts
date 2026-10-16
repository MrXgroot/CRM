import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      // Check if running in standalone mode (PWA)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Check if running as PWA on iOS
      const isIOSPWA = (window.navigator as any).standalone === true;
      // Check if app was installed via beforeinstallprompt
      const wasInstalled = localStorage.getItem('pwa-installed') === 'true';

      setIsInstalled(isStandalone || isIOSPWA || wasInstalled);
    };

    checkInstalled();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa-installed', 'true');
    };

    // Listen for prompt dismissal
    const handlePromptDismissed = () => {
      setIsDismissed(true);
      setIsInstallable(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-prompt-dismissed', handlePromptDismissed);

    // Check for iOS PWA capability
    const checkIOSInstallable = () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      const isInstalled = localStorage.getItem('pwa-installed') === 'true';

      // iOS Safari can install PWAs, but doesn't fire beforeinstallprompt
      if (isIOS && isSafari && !isInWebAppiOS && !isInstalled) {
        setIsInstallable(true);
      }
    };

    checkIOSInstallable();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-prompt-dismissed', handlePromptDismissed);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) {
      // Check if it's iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      if (isIOS && isSafari) {
        // For iOS Safari, show better instructions
        const message = 'To install this app:\n\n1. Tap the share button (⬆️) at the bottom\n2. Select "Add to Home Screen"\n3. Tap "Add" to confirm';
        alert(message);
      } else {
        // For other browsers that don't support PWA install
        console.log('PWA installation not available in this browser');
      }
      return false;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        localStorage.setItem('pwa-installed', 'true');
        // Clear the deferred prompt
        setDeferredPrompt(null);
        setIsInstallable(false);
        return true;
      } else {
        // User dismissed the prompt
        setIsDismissed(true);
        setIsInstallable(false);
        return false;
      }
    } catch (error) {
      console.error('Error during PWA installation:', error);
      return false;
    }
  };

  return {
    isInstallable: isInstallable && !isDismissed,
    isInstalled,
    installPWA
  };
};