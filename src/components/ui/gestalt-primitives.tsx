/**
 * Gestalt Primitives - Reusable UI Components
 *
 * This file implements core UI primitives following Gestalt principles:
 * - SIMILARITY: All buttons same shape, all cards same shadow
 * - SIMPLICITY: Maximum 3 colors per component
 * - PROXIMITY: Related elements grouped with tight spacing
 * - CONTINUITY: Smooth transitions, consistent interactions
 * - FIGURE/GROUND: Strong contrast between content and background
 *
 * All components MUST use design tokens from design-tokens.ts
 */

import React from 'react';
import { colors, typography, spacing, radius, shadows, duration, easing, borderWidth } from '@/styles/design-tokens';

/* ========================================
   TYPE DEFINITIONS
   ======================================== */

type ButtonVariant = 'solid' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';
type CardVariant = 'default' | 'interactive' | 'elevated';
type InputVariant = 'default' | 'error' | 'success';

/* ========================================
   GESTALT BUTTON COMPONENT

   Gestalt Principles:
   - SIMILARITY: Consistent shape, size, padding across variants
   - SIMPLICITY: Only 3 variants, clear visual hierarchy
   - PROXIMITY: Icon and text properly spaced
   - CONTINUITY: Smooth hover/focus transitions
   ======================================== */

interface GestaltButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant (Gestalt: SIMILARITY - consistent patterns) */
  variant?: ButtonVariant;
  /** Size variant (Gestalt: SIMILARITY - consistent sizing) */
  size?: ButtonSize;
  /** Optional icon to display before text (Gestalt: PROXIMITY) */
  icon?: React.ReactNode;
  /** Full width button */
  fullWidth?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Children content */
  children: React.ReactNode;
}

/**
 * GestaltButton - Primary interactive element
 *
 * Gestalt Compliance:
 * - SIMILARITY: All buttons share same border radius, padding rhythm
 * - FIGURE/GROUND: Strong contrast in all variants
 * - SIMPLICITY: Limited to 3 variants for clarity
 * - CONTINUITY: Smooth 200ms transitions on all states
 *
 * @example
 * <GestaltButton variant="solid" size="md" icon={<Icon />}>
 *   Click Me
 * </GestaltButton>
 */
export const GestaltButton = React.forwardRef<HTMLButtonElement, GestaltButtonProps>(
  (
    {
      variant = 'solid',
      size = 'md',
      icon,
      fullWidth = false,
      loading = false,
      disabled = false,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    /* ========================================
       GESTALT PRINCIPLE: SIMILARITY
       Consistent base styles across all variants
       ======================================== */
    const baseStyles: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: typography.fontFamily.sans.join(', '),
      fontWeight: typography.fontWeight.semibold,
      borderRadius: radius.md,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      transition: `all ${duration.normal} ${easing.easeOut}`,
      border: 'none',
      outline: 'none',
      position: 'relative',
      width: fullWidth ? '100%' : 'auto',
      opacity: disabled ? 0.5 : 1,
      textDecoration: 'none',
      userSelect: 'none',
      whiteSpace: 'nowrap',
    };

    /* ========================================
       GESTALT PRINCIPLE: SIMILARITY
       Size variants - consistent height progression
       ======================================== */
    const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
      sm: {
        height: '36px',
        padding: `0 ${spacing[4]}`,
        fontSize: typography.fontSize.small,
        gap: spacing[2], // Icon spacing
      },
      md: {
        height: '48px',
        padding: `0 ${spacing[6]}`,
        fontSize: typography.fontSize.base,
        gap: spacing[3], // Icon spacing
      },
      lg: {
        height: '56px',
        padding: `0 ${spacing[8]}`,
        fontSize: typography.fontSize.medium,
        gap: spacing[4], // Icon spacing
      },
    };

    /* ========================================
       GESTALT PRINCIPLE: FIGURE/GROUND
       Strong contrast between button and background

       GESTALT PRINCIPLE: SIMPLICITY
       Only 3 variants - solid, outline, ghost
       ======================================== */
    const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
      // Solid: Maximum contrast, primary action
      solid: {
        backgroundColor: colors.primary[600],
        color: colors.neutral[0],
        boxShadow: shadows.sm,
      },
      // Outline: Secondary action, clear boundary
      outline: {
        backgroundColor: 'transparent',
        color: colors.primary[600],
        border: `${borderWidth.thin} solid ${colors.primary[600]}`,
      },
      // Ghost: Tertiary action, minimal visual weight
      ghost: {
        backgroundColor: 'transparent',
        color: colors.primary[600],
      },
    };

    /* ========================================
       GESTALT PRINCIPLE: CONTINUITY
       Smooth hover state transitions
       ======================================== */
    const [isHovered, setIsHovered] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    const hoverStyles: Record<ButtonVariant, React.CSSProperties> = {
      solid: {
        backgroundColor: colors.primary[700],
        transform: 'translateY(-1px)',
        boxShadow: shadows.md,
      },
      outline: {
        backgroundColor: colors.primary[50],
        borderColor: colors.primary[700],
        color: colors.primary[700],
      },
      ghost: {
        backgroundColor: colors.primary[50],
        color: colors.primary[700],
      },
    };

    /* ========================================
       GESTALT PRINCIPLE: FIGURE/GROUND
       Clear focus state for accessibility
       ======================================== */
    const focusStyles: React.CSSProperties = {
      outline: `${borderWidth.medium} solid ${colors.primary[600]}`,
      outlineOffset: '2px',
    };

    const combinedStyles: React.CSSProperties = {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(isHovered && !disabled && !loading ? hoverStyles[variant] : {}),
      ...(isFocused && !disabled ? focusStyles : {}),
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={combinedStyles}
        className={className}
        {...props}
      >
        {/* Gestalt Principle: PROXIMITY - Icon and text grouped */}
        {loading && (
          <svg
            style={{
              animation: 'spin 1s linear infinite',
              width: size === 'sm' ? '16px' : size === 'md' ? '20px' : '24px',
              height: size === 'sm' ? '16px' : size === 'md' ? '20px' : '24px',
            }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              style={{ opacity: 0.25 }}
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              style={{ opacity: 0.75 }}
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && icon}
        {children}
      </button>
    );
  }
);

GestaltButton.displayName = 'GestaltButton';

/* ========================================
   GESTALT CARD COMPONENT

   Gestalt Principles:
   - SIMILARITY: Consistent shadow, radius, padding
   - FIGURE/GROUND: Clear separation from background
   - PROXIMITY: Content grouped with consistent spacing
   - SIMPLICITY: Clean, minimal design
   ======================================== */

interface GestaltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant (Gestalt: SIMILARITY) */
  variant?: CardVariant;
  /** Optional hover effect (Gestalt: CONTINUITY) */
  hoverable?: boolean;
  /** Children content */
  children: React.ReactNode;
}

/**
 * GestaltCard - Container component for grouped content
 *
 * Gestalt Compliance:
 * - PROXIMITY: Internal padding creates visual grouping
 * - FIGURE/GROUND: Shadow creates depth and separation
 * - SIMILARITY: All cards share same border radius and spacing
 * - CONTINUITY: Smooth hover transitions
 *
 * @example
 * <GestaltCard variant="interactive" hoverable>
 *   <h3>Card Title</h3>
 *   <p>Card content goes here</p>
 * </GestaltCard>
 */
export const GestaltCard = React.forwardRef<HTMLDivElement, GestaltCardProps>(
  ({ variant = 'default', hoverable = false, children, className = '', ...props }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false);

    /* ========================================
       GESTALT PRINCIPLE: SIMILARITY
       Consistent base styles for all cards
       ======================================== */
    const baseStyles: React.CSSProperties = {
      backgroundColor: colors.neutral[0],
      borderRadius: radius.lg,
      padding: spacing[6],
      transition: `all ${duration.normal} ${easing.easeOut}`,
    };

    /* ========================================
       GESTALT PRINCIPLE: FIGURE/GROUND
       Different elevation levels for hierarchy
       ======================================== */
    const variantStyles: Record<CardVariant, React.CSSProperties> = {
      // Default: Subtle shadow, static
      default: {
        boxShadow: shadows.sm,
        border: `${borderWidth.thin} solid ${colors.neutral[200]}`,
      },
      // Interactive: Hover effect, clickable feel
      interactive: {
        boxShadow: shadows.md,
        cursor: hoverable ? 'pointer' : 'default',
        border: `${borderWidth.thin} solid ${colors.neutral[200]}`,
      },
      // Elevated: Strong shadow, prominent
      elevated: {
        boxShadow: shadows.lg,
        border: 'none',
      },
    };

    /* ========================================
       GESTALT PRINCIPLE: CONTINUITY
       Smooth hover transitions
       ======================================== */
    const hoverStyles: React.CSSProperties = hoverable
      ? {
          transform: 'translateY(-4px)',
          boxShadow: shadows.xl,
          borderColor: colors.primary[200],
        }
      : {};

    const combinedStyles: React.CSSProperties = {
      ...baseStyles,
      ...variantStyles[variant],
      ...(isHovered ? hoverStyles : {}),
    };

    return (
      <div
        ref={ref}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={combinedStyles}
        className={className}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GestaltCard.displayName = 'GestaltCard';

/* ========================================
   GESTALT INPUT COMPONENT

   Gestalt Principles:
   - SIMILARITY: Consistent height (48px), padding, radius
   - FIGURE/GROUND: Clear border, strong focus state
   - PROXIMITY: Label and input grouped
   - CONTINUITY: Smooth focus transitions
   ======================================== */

interface GestaltInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Input variant (Gestalt: FIGURE/GROUND - color-coded states) */
  variant?: InputVariant;
  /** Optional label (Gestalt: PROXIMITY) */
  label?: string;
  /** Optional helper text */
  helperText?: string;
  /** Optional error message */
  errorMessage?: string;
  /** Full width input */
  fullWidth?: boolean;
}

/**
 * GestaltInput - Form input component
 *
 * Gestalt Compliance:
 * - SIMILARITY: All inputs have same height, padding, radius
 * - FIGURE/GROUND: Strong border, clear focus state
 * - PROXIMITY: Label, input, and helper text grouped with tight spacing
 * - CONTINUITY: Smooth 200ms focus transitions
 * - SIMPLICITY: Clean, minimal design
 *
 * @example
 * <GestaltInput
 *   label="Email Address"
 *   type="email"
 *   placeholder="you@example.com"
 *   helperText="We'll never share your email"
 * />
 */
export const GestaltInput = React.forwardRef<HTMLInputElement, GestaltInputProps>(
  (
    {
      variant = 'default',
      label,
      helperText,
      errorMessage,
      fullWidth = true,
      className = '',
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);

    /* ========================================
       GESTALT PRINCIPLE: SIMILARITY
       Consistent input dimensions
       ======================================== */
    const inputStyles: React.CSSProperties = {
      width: fullWidth ? '100%' : 'auto',
      height: '48px', // Consistent touch target
      padding: `0 ${spacing[4]}`,
      fontFamily: typography.fontFamily.sans.join(', '),
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.regular,
      lineHeight: typography.lineHeight.normal,
      color: colors.neutral[900],
      backgroundColor: colors.neutral[0],
      border: `${borderWidth.thin} solid ${colors.neutral[300]}`,
      borderRadius: radius.md,
      transition: `all ${duration.normal} ${easing.easeOut}`,
      outline: 'none',
    };

    /* ========================================
       GESTALT PRINCIPLE: FIGURE/GROUND
       State-based color coding
       ======================================== */
    const variantStyles: Record<InputVariant, React.CSSProperties> = {
      default: {
        borderColor: colors.neutral[300],
      },
      error: {
        borderColor: colors.error[500],
        backgroundColor: colors.error[50],
      },
      success: {
        borderColor: colors.success[500],
        backgroundColor: colors.success[50],
      },
    };

    /* ========================================
       GESTALT PRINCIPLE: FIGURE/GROUND
       Strong focus state for accessibility
       ======================================== */
    const focusStyles: React.CSSProperties = {
      borderColor: colors.primary[600],
      boxShadow: `0 0 0 3px ${colors.primary[100]}`,
    };

    const combinedInputStyles: React.CSSProperties = {
      ...inputStyles,
      ...variantStyles[variant],
      ...(isFocused ? focusStyles : {}),
    };

    /* ========================================
       GESTALT PRINCIPLE: PROXIMITY
       Label and input grouped with tight spacing
       ======================================== */
    const labelStyles: React.CSSProperties = {
      display: 'block',
      marginBottom: spacing[2],
      fontSize: typography.fontSize.small,
      fontWeight: typography.fontWeight.medium,
      color: colors.neutral[700],
    };

    const helperTextStyles: React.CSSProperties = {
      marginTop: spacing[2],
      fontSize: typography.fontSize.small,
      color: errorMessage ? colors.error[600] : colors.neutral[600],
    };

    const containerStyles: React.CSSProperties = {
      width: fullWidth ? '100%' : 'auto',
    };

    return (
      <div style={containerStyles}>
        {/* Gestalt Principle: PROXIMITY - Label close to input */}
        {label && <label style={labelStyles}>{label}</label>}

        <input
          ref={ref}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={combinedInputStyles}
          className={className}
          {...props}
        />

        {/* Gestalt Principle: PROXIMITY - Helper text close to input */}
        {(helperText || errorMessage) && (
          <div style={helperTextStyles}>{errorMessage || helperText}</div>
        )}
      </div>
    );
  }
);

GestaltInput.displayName = 'GestaltInput';

/* ========================================
   SPIN ANIMATION
   Required for loading button state
   ======================================== */
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `;
  document.head.appendChild(style);
}

/* ========================================
   TYPE EXPORTS
   ======================================== */
export type {
  GestaltButtonProps,
  GestaltCardProps,
  GestaltInputProps,
  ButtonVariant,
  ButtonSize,
  CardVariant,
  InputVariant,
};
