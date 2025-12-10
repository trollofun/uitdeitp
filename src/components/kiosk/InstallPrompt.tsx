'use client';

/**
 * PWA Install Prompt Component
 *
 * Displays banner encouraging users to install the PWA
 * Handles beforeinstallprompt event (Android Chrome/Edge)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptProps {
  stationName?: string;
  primaryColor?: string;
  autoShow?: boolean;
}

export function InstallPrompt({
  stationName = 'uitdeITP',
  primaryColor = '#3B82F6',
  autoShow = true
}: InstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (PWA mode)
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isPWA) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed prompt before (localStorage)
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    // Don't show if dismissed within last week
    if (dismissedTime && Date.now() - dismissedTime < oneWeek) {
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent default mini-infobar (Chrome mobile)
      e.preventDefault();

      console.log('[PWA] Install prompt available');
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Auto-show after delay
      if (autoShow) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000); // Show after 3 seconds
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('[PWA] App installed successfully');
      setIsInstalled(true);
      setShowPrompt(false);
      localStorage.removeItem('pwa-install-dismissed');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [autoShow]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      console.warn('[PWA] No install prompt available');
      return;
    }

    try {
      // Show install prompt
      await deferredPrompt.prompt();

      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;

      console.log('[PWA] User choice:', outcome);

      if (outcome === 'accepted') {
        console.log('[PWA] Install accepted');
      } else {
        console.log('[PWA] Install dismissed');
      }

      // Clear prompt
      setDeferredPrompt(null);
      setShowPrompt(false);

    } catch (error) {
      console.error('[PWA] Install failed:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if installed or no prompt available
  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl p-6 border-2"
          style={{ borderColor: primaryColor }}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Închide"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {/* Icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <Smartphone className="w-8 h-8" style={{ color: primaryColor }} />
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Instalează Aplicația
          </h3>

          {/* Description */}
          <p className="text-gray-600 mb-4">
            Adaugă <strong>{stationName} Kiosk</strong> pe ecranul principal pentru acces rapid și experiență optimizată.
          </p>

          {/* Benefits */}
          <ul className="space-y-2 mb-4 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Funcționează fullscreen (fără browser)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Lansare instantanee de pe ecranul principal</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Experiență optimizată pentru tablete</span>
            </li>
          </ul>

          {/* Install button */}
          <button
            onClick={handleInstall}
            className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
            style={{ backgroundColor: primaryColor }}
          >
            <Download className="w-5 h-5" />
            <span>Instalează Acum</span>
          </button>

          {/* Dismiss link */}
          <button
            onClick={handleDismiss}
            className="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Poate mai târziu
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
