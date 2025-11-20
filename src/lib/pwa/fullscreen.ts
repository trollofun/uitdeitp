/**
 * Fullscreen API Utilities
 *
 * Cross-platform fullscreen control for kiosk mode
 * Handles iOS quirks (doesn't respect manifest display: fullscreen)
 */

export interface FullscreenState {
  isFullscreen: boolean;
  isSupported: boolean;
  isIOS: boolean;
  isPWA: boolean;
}

/**
 * Check if device is iOS (iPad/iPhone)
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

/**
 * Check if app is running as installed PWA
 */
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;

  // Check display mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;

  // Check iOS standalone mode
  const isIOSStandalone = (window.navigator as any).standalone === true;

  return isStandalone || isFullscreen || isIOSStandalone;
}

/**
 * Check if fullscreen is supported
 */
export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;

  return !!(
    document.fullscreenEnabled ||
    (document as any).webkitFullscreenEnabled ||
    (document as any).mozFullScreenEnabled ||
    (document as any).msFullscreenEnabled
  );
}

/**
 * Check if currently in fullscreen mode
 */
export function isFullscreen(): boolean {
  if (typeof document === 'undefined') return false;

  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullScreenElement
  );
}

/**
 * Get fullscreen state
 */
export function getFullscreenState(): FullscreenState {
  return {
    isFullscreen: isFullscreen(),
    isSupported: isFullscreenSupported(),
    isIOS: isIOS(),
    isPWA: isPWA()
  };
}

/**
 * Request fullscreen mode (cross-browser)
 */
export async function requestFullscreen(element?: HTMLElement): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  const elem = element || document.documentElement;

  try {
    // Standard API
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
      return true;
    }

    // Safari/WebKit
    if ((elem as any).webkitRequestFullscreen) {
      await (elem as any).webkitRequestFullscreen();
      return true;
    }

    // Firefox
    if ((elem as any).mozRequestFullScreen) {
      await (elem as any).mozRequestFullScreen();
      return true;
    }

    // IE/Edge
    if ((elem as any).msRequestFullscreen) {
      await (elem as any).msRequestFullscreen();
      return true;
    }

    console.warn('[Fullscreen] API not supported');
    return false;

  } catch (error) {
    console.error('[Fullscreen] Request failed:', error);
    return false;
  }
}

/**
 * Exit fullscreen mode
 */
export async function exitFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  try {
    // Standard API
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return true;
    }

    // Safari/WebKit
    if ((document as any).webkitExitFullscreen) {
      await (document as any).webkitExitFullscreen();
      return true;
    }

    // Firefox
    if ((document as any).mozCancelFullScreen) {
      await (document as any).mozCancelFullScreen();
      return true;
    }

    // IE/Edge
    if ((document as any).msExitFullscreen) {
      await (document as any).msExitFullscreen();
      return true;
    }

    return false;

  } catch (error) {
    console.error('[Fullscreen] Exit failed:', error);
    return false;
  }
}

/**
 * Toggle fullscreen mode
 */
export async function toggleFullscreen(): Promise<boolean> {
  if (isFullscreen()) {
    return await exitFullscreen();
  } else {
    return await requestFullscreen();
  }
}

/**
 * Auto-enter fullscreen for kiosk mode
 * iOS workaround: must be triggered by user interaction
 */
export function setupAutoFullscreen(options?: {
  delay?: number;
  requireUserGesture?: boolean;
}): () => void {
  const { delay = 500, requireUserGesture = true } = options || {};

  if (typeof window === 'undefined') {
    return () => {};
  }

  // Check if already in fullscreen (PWA mode)
  if (isPWA()) {
    console.log('[Fullscreen] Already in PWA standalone mode');
    return () => {};
  }

  let attempted = false;

  const attemptFullscreen = async () => {
    if (attempted) return;
    attempted = true;

    // Wait for delay
    await new Promise((resolve) => setTimeout(resolve, delay));

    const success = await requestFullscreen();
    if (success) {
      console.log('[Fullscreen] Auto-entered fullscreen mode');
    } else {
      console.warn('[Fullscreen] Auto-fullscreen failed (user gesture may be required)');
    }
  };

  // Auto-trigger fullscreen
  if (!requireUserGesture) {
    attemptFullscreen();
  }

  // Fallback: trigger on first user interaction
  const handleInteraction = () => {
    attemptFullscreen();
    cleanup();
  };

  const events = ['click', 'touchstart', 'keydown'];
  events.forEach((event) => {
    document.addEventListener(event, handleInteraction, { once: true });
  });

  // Cleanup function
  const cleanup = () => {
    events.forEach((event) => {
      document.removeEventListener(event, handleInteraction);
    });
  };

  return cleanup;
}

/**
 * Listen for fullscreen changes
 */
export function onFullscreenChange(callback: (isFullscreen: boolean) => void): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  const handleChange = () => {
    callback(isFullscreen());
  };

  // Listen for all fullscreen change events
  const events = [
    'fullscreenchange',
    'webkitfullscreenchange',
    'mozfullscreenchange',
    'MSFullscreenChange'
  ];

  events.forEach((event) => {
    document.addEventListener(event, handleChange);
  });

  // Cleanup function
  return () => {
    events.forEach((event) => {
      document.removeEventListener(event, handleChange);
    });
  };
}

/**
 * Prevent exit from fullscreen (for kiosk lock-in)
 * WARNING: Use with caution - can trap users
 */
export function preventFullscreenExit(enabled: boolean): () => void {
  if (typeof document === 'undefined' || !enabled) {
    return () => {};
  }

  const handleFullscreenChange = () => {
    if (!isFullscreen()) {
      console.warn('[Fullscreen] Exit detected, re-entering...');
      requestFullscreen();
    }
  };

  const events = [
    'fullscreenchange',
    'webkitfullscreenchange',
    'mozfullscreenchange',
    'MSFullscreenChange'
  ];

  events.forEach((event) => {
    document.addEventListener(event, handleFullscreenChange);
  });

  // Cleanup function
  return () => {
    events.forEach((event) => {
      document.removeEventListener(event, handleFullscreenChange);
    });
  };
}

/**
 * Lock screen orientation (for tablets)
 */
export async function lockOrientation(orientation: 'landscape' | 'portrait' | 'any'): Promise<boolean> {
  if (typeof window === 'undefined' || !('screen' in window)) {
    return false;
  }

  try {
    const screen = window.screen as any;

    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock(orientation);
      console.log('[Orientation] Locked to:', orientation);
      return true;
    }

    console.warn('[Orientation] Lock API not supported');
    return false;

  } catch (error) {
    console.error('[Orientation] Lock failed:', error);
    return false;
  }
}

/**
 * Unlock screen orientation
 */
export function unlockOrientation(): void {
  if (typeof window === 'undefined' || !('screen' in window)) {
    return;
  }

  try {
    const screen = window.screen as any;

    if (screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
      console.log('[Orientation] Unlocked');
    }
  } catch (error) {
    console.error('[Orientation] Unlock failed:', error);
  }
}
