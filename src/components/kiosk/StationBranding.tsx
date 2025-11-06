'use client';

import React from 'react';
import { cn } from '@/components/lib/utils';

export interface StationBrandingData {
  id: string;
  name: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tagline?: string;
}

interface StationBrandingProps {
  station: StationBrandingData;
  className?: string;
  showTagline?: boolean;
}

export function StationBranding({ station, className, showTagline = true }: StationBrandingProps) {
  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      {station.logo && (
        <div className="mb-6">
          <img
            src={station.logo}
            alt={station.name}
            className="h-32 w-auto object-contain drop-shadow-lg"
          />
        </div>
      )}

      <h1
        className="text-5xl font-extrabold mb-3"
        style={{ color: station.primaryColor || '#1e40af' }}
      >
        {station.name}
      </h1>

      {showTagline && station.tagline && (
        <p
          className="text-2xl font-medium"
          style={{ color: station.secondaryColor || '#6b7280' }}
        >
          {station.tagline}
        </p>
      )}
    </div>
  );
}

interface BrandedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  brandColor?: string;
  children: React.ReactNode;
}

export function BrandedButton({ brandColor, children, className, ...props }: BrandedButtonProps) {
  return (
    <button
      className={cn(
        'px-8 py-6 rounded-2xl text-2xl font-bold text-white shadow-2xl',
        'active:scale-95 transition-all duration-200',
        'hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      style={{
        backgroundColor: brandColor || '#2563eb',
      }}
      {...props}
    >
      {children}
    </button>
  );
}
