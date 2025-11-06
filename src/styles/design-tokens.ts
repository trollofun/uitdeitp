/**
 * Design Tokens - Gestalt-Compliant Design System
 *
 * This file implements Gestalt principles:
 * - Similarity: Consistent values across all components
 * - Simplicity: Limited, purposeful color palette
 * - Proximity: Rhythmic spacing system based on 8px grid
 *
 * All components MUST use these tokens for visual consistency.
 */

/**
 * Color System
 *
 * Gestalt Principle: SIMILARITY & SIMPLICITY
 * - Maximum 3 colors per screen/component
 * - Consistent semantic meaning across application
 * - Strong contrast ratios for accessibility (Figure/Ground principle)
 */
export const colors = {
  // Primary brand color (Blue) - Used for actions, links, focus states
  primary: {
    50: '#eff6ff',   // Backgrounds, hover states
    100: '#dbeafe',  // Subtle backgrounds
    200: '#bfdbfe',  // Borders, dividers
    300: '#93c5fd',  // Disabled states
    400: '#60a5fa',  // Hover states
    500: '#3b82f6',  // Default actions
    600: '#2563eb',  // Primary buttons, links
    700: '#1d4ed8',  // Active states
    800: '#1e40af',  // Dark mode primary
    900: '#1e3a8a',  // Text on light backgrounds
  },

  // Success color (Green) - Positive feedback, completion states
  success: {
    50: '#f0fdf4',   // Success backgrounds
    100: '#dcfce7',  // Success alerts
    500: '#22c55e',  // Success icons
    600: '#16a34a',  // Success text
    700: '#15803d',  // Success buttons
  },

  // Warning color (Orange) - Caution, important notices
  warning: {
    50: '#fff7ed',   // Warning backgrounds
    100: '#ffedd5',  // Warning alerts
    400: '#fb923c',  // Warning icons
    500: '#f97316',  // Warning text
    600: '#ea580c',  // Warning buttons
  },

  // Error color (Red) - Destructive actions, errors
  error: {
    50: '#fef2f2',   // Error backgrounds
    100: '#fee2e2',  // Error alerts
    500: '#ef4444',  // Error icons
    600: '#dc2626',  // Error text
    700: '#b91c1c',  // Error buttons
  },

  // Neutral colors (Gray) - Text, borders, backgrounds
  // Gestalt Principle: FIGURE/GROUND - Clear hierarchy
  neutral: {
    0: '#ffffff',    // Pure white backgrounds
    50: '#f9fafb',   // Subtle backgrounds
    100: '#f3f4f6',  // Card backgrounds
    200: '#e5e7eb',  // Borders, dividers
    300: '#d1d5db',  // Disabled text
    400: '#9ca3af',  // Placeholder text
    500: '#6b7280',  // Secondary text
    600: '#4b5563',  // Body text
    700: '#374151',  // Emphasis text
    800: '#1f2937',  // Headings
    900: '#111827',  // Primary text
    950: '#030712',  // Maximum contrast
  },
} as const;

/**
 * Typography System
 *
 * Gestalt Principle: CONTINUITY & HIERARCHY
 * - Perfect Fourth scale (1.333) for visual harmony
 * - Consistent line heights for reading rhythm
 * - Limited weight variations for clarity
 */
export const typography = {
  // Font families
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
    mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
    display: ['Cal Sans', 'Inter', 'sans-serif'], // Optional display font for heroes
  },

  // Font sizes (Perfect Fourth scale: 1.333)
  // Gestalt Principle: SIMILARITY - Rhythmic progression
  fontSize: {
    xs: '12px',      // Fine print, timestamps
    small: '13px',   // Captions, labels
    base: '16px',    // Body text (baseline)
    medium: '20px',  // Card titles, buttons
    large: '27px',   // Section headers
    xl: '36px',      // Page titles
    huge: '48px',    // Hero headlines
    mega: '64px',    // Landing page heroes
  },

  // Line heights - Optimized for readability
  // Gestalt Principle: CONTINUITY - Visual flow
  lineHeight: {
    none: 1,         // Icons, single-line headings
    tight: 1.2,      // Multi-line headings
    snug: 1.375,     // Short paragraphs
    normal: 1.5,     // Default body text
    relaxed: 1.625,  // Long-form content
    loose: 1.8,      // Maximum readability
  },

  // Font weights - Limited for consistency
  // Gestalt Principle: SIMPLICITY
  fontWeight: {
    regular: 400,    // Body text
    medium: 500,     // Emphasis
    semibold: 600,   // Subheadings
    bold: 700,       // Headings, buttons
    extrabold: 800,  // Hero text (use sparingly)
  },

  // Letter spacing - Subtle adjustments
  letterSpacing: {
    tighter: '-0.05em',  // Large headings
    tight: '-0.025em',   // Headings
    normal: '0',         // Default
    wide: '0.025em',     // All-caps labels
    wider: '0.05em',     // Loose all-caps
  },
} as const;

/**
 * Spacing System
 *
 * Gestalt Principle: PROXIMITY & RHYTHM
 * - 8px-based grid system for visual harmony
 * - Consistent gaps create natural groupings
 * - Doubles at each step for clear hierarchy
 */
export const spacing = {
  0: '0px',        // No space
  px: '1px',       // Borders, dividers
  0.5: '2px',      // Minimal adjustments
  1: '4px',        // Tight spacing
  2: '8px',        // Base unit (proximity)
  3: '12px',       // Compact spacing
  4: '16px',       // Standard spacing
  5: '20px',       // Comfortable spacing
  6: '24px',       // Loose spacing
  8: '32px',       // Section spacing
  10: '40px',      // Large gaps
  12: '48px',      // Extra large gaps
  16: '64px',      // Section dividers
  20: '80px',      // Major sections
  24: '96px',      // Page sections
  32: '128px',     // Hero sections
} as const;

/**
 * Border Radius System
 *
 * Gestalt Principle: SIMILARITY & CONTINUITY
 * - Consistent curves create visual harmony
 * - Larger elements = larger radius
 */
export const radius = {
  none: '0px',       // Sharp corners (rare)
  sm: '4px',         // Small elements (badges, tags)
  md: '8px',         // Default (buttons, inputs, cards)
  lg: '12px',        // Large cards, modals
  xl: '16px',        // Hero sections
  '2xl': '24px',     // Major containers
  full: '9999px',    // Pills, avatars, rounded buttons
} as const;

/**
 * Shadow System
 *
 * Gestalt Principle: FIGURE/GROUND & DEPTH
 * - Subtle elevation creates hierarchy
 * - Consistent shadows for similar elements
 * - Never mix shadow sizes on same component
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',                                    // Subtle borders
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // Cards
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // Modals
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', // Popovers
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',                           // Overlays
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',                          // Pressed states
} as const;

/**
 * Animation Durations
 *
 * Gestalt Principle: CONTINUITY
 * - Consistent timing creates smooth transitions
 * - Faster for small changes, slower for major changes
 */
export const duration = {
  instant: '0ms',      // No animation
  fast: '100ms',       // Micro-interactions (hover)
  normal: '200ms',     // Default transitions
  slow: '300ms',       // Enter/exit animations
  slower: '500ms',     // Major state changes
} as const;

/**
 * Animation Easing
 *
 * Gestalt Principle: CONTINUITY
 * - Natural, physics-based motion
 */
export const easing = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',           // Accelerating
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',          // Decelerating (default)
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',      // Smooth both ends
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',    // Bouncy (use sparingly)
} as const;

/**
 * Z-Index Scale
 *
 * Gestalt Principle: FIGURE/GROUND
 * - Clear stacking hierarchy
 * - Never use arbitrary z-index values
 */
export const zIndex = {
  base: 0,           // Default layer
  dropdown: 1000,    // Dropdowns, tooltips
  sticky: 1100,      // Sticky headers
  fixed: 1200,       // Fixed elements
  overlay: 1300,     // Modal overlays
  modal: 1400,       // Modal content
  popover: 1500,     // Popovers above modals
  toast: 1600,       // Toast notifications
  tooltip: 1700,     // Tooltips (highest)
} as const;

/**
 * Breakpoints
 *
 * Mobile-first responsive design
 */
export const breakpoints = {
  sm: '640px',    // Mobile landscape
  md: '768px',    // Tablet
  lg: '1024px',   // Desktop
  xl: '1280px',   // Large desktop
  '2xl': '1536px', // Extra large
} as const;

/**
 * Container Max Widths
 *
 * Gestalt Principle: CONTINUITY & SIMPLICITY
 * - Consistent content widths across breakpoints
 */
export const containerMaxWidth = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Icon Sizes
 *
 * Gestalt Principle: SIMILARITY
 * - Consistent sizing for optical alignment
 */
export const iconSize = {
  xs: '12px',
  sm: '16px',
  md: '20px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
} as const;

/**
 * Common Component Heights
 *
 * Gestalt Principle: SIMILARITY
 * - Consistent touch targets (min 44px)
 * - Aligned with spacing system
 */
export const height = {
  input: '48px',      // Standard input height
  button: '48px',     // Standard button height
  buttonSm: '36px',   // Small button
  buttonLg: '56px',   // Large button
  header: '64px',     // Header/navbar
  hero: '600px',      // Hero section
} as const;

/**
 * Border Widths
 *
 * Gestalt Principle: SIMILARITY
 * - Consistent border weights
 */
export const borderWidth = {
  none: '0px',
  thin: '1px',     // Default borders
  medium: '2px',   // Focus states
  thick: '4px',    // Emphasis borders
} as const;

/**
 * Opacity Scale
 *
 * Gestalt Principle: FIGURE/GROUND
 * - Consistent transparency levels
 */
export const opacity = {
  0: '0',
  10: '0.1',
  20: '0.2',
  30: '0.3',
  40: '0.4',
  50: '0.5',
  60: '0.6',
  70: '0.7',
  80: '0.8',
  90: '0.9',
  100: '1',
} as const;

// Type exports for TypeScript
export type ColorShade = keyof typeof colors.primary;
export type FontSize = keyof typeof typography.fontSize;
export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radius;
export type Shadow = keyof typeof shadows;
