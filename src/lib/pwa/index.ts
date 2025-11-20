/**
 * PWA Utilities - Main Export
 */

export {
  registerServiceWorker,
  unregisterServiceWorker,
  isServiceWorkerActive,
  clearAllCaches
} from './register-sw';

export {
  isIOS,
  isPWA,
  isFullscreenSupported,
  isFullscreen,
  getFullscreenState,
  requestFullscreen,
  exitFullscreen,
  toggleFullscreen,
  setupAutoFullscreen,
  onFullscreenChange,
  preventFullscreenExit,
  lockOrientation,
  unlockOrientation,
  type FullscreenState
} from './fullscreen';
