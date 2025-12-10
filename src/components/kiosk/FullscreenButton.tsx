'use client';

/**
 * Fullscreen Toggle Button
 *
 * Manual fullscreen control for users who dismissed auto-fullscreen
 * or when auto-fullscreen fails (user gesture required)
 */

import { useState, useEffect } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import {
  isFullscreen,
  toggleFullscreen,
  onFullscreenChange,
  isPWA
} from '@/lib/pwa';

interface FullscreenButtonProps {
  className?: string;
  primaryColor?: string;
  showLabel?: boolean;
}

export function FullscreenButton({
  className = '',
  primaryColor = '#3B82F6',
  showLabel = false
}: FullscreenButtonProps) {
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [isInPWA, setIsInPWA] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsFullscreenMode(isFullscreen());
    setIsInPWA(isPWA());

    // Listen for fullscreen changes
    const cleanup = onFullscreenChange((fullscreen) => {
      setIsFullscreenMode(fullscreen);
    });

    return cleanup;
  }, []);

  const handleToggle = async () => {
    const success = await toggleFullscreen();
    if (!success) {
      console.warn('[Fullscreen] Toggle failed');
    }
  };

  // Don't show in PWA standalone mode (already fullscreen)
  if (isInPWA) {
    return null;
  }

  return (
    <button
      onClick={handleToggle}
      className={`p-3 rounded-xl flex items-center gap-2 transition-all hover:opacity-80 ${className}`}
      style={{ backgroundColor: `${primaryColor}15` }}
      title={isFullscreenMode ? 'Ieși din fullscreen' : 'Activează fullscreen'}
      aria-label={isFullscreenMode ? 'Ieși din fullscreen' : 'Activează fullscreen'}
    >
      {isFullscreenMode ? (
        <>
          <Minimize className="w-5 h-5" style={{ color: primaryColor }} />
          {showLabel && <span style={{ color: primaryColor }}>Minimizează</span>}
        </>
      ) : (
        <>
          <Maximize className="w-5 h-5" style={{ color: primaryColor }} />
          {showLabel && <span style={{ color: primaryColor }}>Fullscreen</span>}
        </>
      )}
    </button>
  );
}
