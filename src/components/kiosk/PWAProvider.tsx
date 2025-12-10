'use client';

/**
 * PWA Provider Component
 *
 * Initializes PWA features:
 * - Service worker registration
 * - Auto-fullscreen on load
 * - Install prompt handling
 */

import { useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { registerServiceWorker, setupAutoFullscreen } from '@/lib/pwa';
import { InstallPrompt } from './InstallPrompt';
import { FullscreenButton } from './FullscreenButton';

interface PWAProviderProps {
  children: ReactNode;
}

interface StationData {
  name: string;
  primary_color: string;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const params = useParams();
  const stationSlug = params?.station_slug as string | undefined;
  const [stationData, setStationData] = useState<StationData | null>(null);

  useEffect(() => {
    // Register service worker
    registerServiceWorker().then((registration) => {
      if (registration) {
        console.log('[PWA] Service worker registered successfully');
      }
    });

    // Setup auto-fullscreen (with user gesture fallback)
    const cleanup = setupAutoFullscreen({
      delay: 1000, // Wait 1 second after page load
      requireUserGesture: false // Try immediately, fallback to user gesture
    });

    return cleanup;
  }, []);

  useEffect(() => {
    // Fetch station data for branded install prompt
    if (stationSlug) {
      fetch(`/api/kiosk/station/${stationSlug}`)
        .then((res) => res.json())
        .then((data) => {
          setStationData({
            name: data.station_name || 'uitdeITP',
            primary_color: data.primary_color || '#3B82F6'
          });
        })
        .catch((error) => {
          console.error('[PWA] Failed to fetch station data:', error);
        });
    }
  }, [stationSlug]);

  // Add dynamic manifest link for station-specific branding
  useEffect(() => {
    if (!stationSlug) return;

    // Check if manifest link already exists
    const existingManifest = document.querySelector('link[rel="manifest"]');

    // Update to dynamic station manifest
    const manifestLink = existingManifest || document.createElement('link');
    manifestLink.setAttribute('rel', 'manifest');
    manifestLink.setAttribute('href', `/api/kiosk/station/${stationSlug}/manifest`);

    if (!existingManifest) {
      document.head.appendChild(manifestLink);
    }

    return () => {
      // Cleanup if needed (don't remove, just reset to default)
      if (!existingManifest && manifestLink.parentNode) {
        manifestLink.setAttribute('href', '/manifest.json');
      }
    };
  }, [stationSlug]);

  return (
    <>
      {children}

      {/* Install prompt (auto-shows on Android Chrome/Edge) */}
      <InstallPrompt
        stationName={stationData?.name}
        primaryColor={stationData?.primary_color}
        autoShow={true}
      />

      {/* Fullscreen toggle button (bottom-right corner) */}
      <div className="fixed bottom-4 right-4 z-40">
        <FullscreenButton
          primaryColor={stationData?.primary_color}
          showLabel={false}
        />
      </div>
    </>
  );
}
