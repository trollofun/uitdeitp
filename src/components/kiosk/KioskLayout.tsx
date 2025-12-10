'use client';

/**
 * Kiosk Layout Component
 *
 * Wrapper with station branding and full-screen design
 */

import { ReactNode } from 'react';
import Image from 'next/image';

export interface StationConfig {
  id: string;
  station_name: string;
  station_slug: string;
  station_phone: string | null;
  station_email: string | null;
  logo_url: string | null;
  primary_color: string;
  address: string | null;
  city: string | null;
  kiosk_enabled: boolean;
  owner_id: string;
}

interface KioskLayoutProps {
  children: ReactNode;
  station: StationConfig;
  showHeader?: boolean;
}

export function KioskLayout({
  children,
  station,
  showHeader = true
}: KioskLayoutProps) {
  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100"
      style={{
        // Apply station primary color as accent
        ['--station-primary' as any]: station.primary_color
      }}
    >
      {showHeader && (
        <header className="bg-white shadow-sm py-6 px-8 border-b-4" style={{ borderBottomColor: station.primary_color }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              {station.logo_url && (
                <div className="relative w-16 h-16 flex-shrink-0">
                  <Image
                    src={station.logo_url}
                    alt={station.station_name}
                    fill
                    className="object-contain"
                  />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {station.station_name}
                </h1>
                {station.city && (
                  <p className="text-sm text-gray-600">{station.city}</p>
                )}
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-600">Kiosk Automat</p>
              <p className="text-lg font-semibold" style={{ color: station.primary_color }}>
                Reminder ITP
              </p>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          {children}
        </div>
      </main>

      <footer className="bg-white border-t py-4 px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-gray-600">
          <div>
            {station.station_phone && (
              <p>Contact: {station.station_phone}</p>
            )}
          </div>
          <div>
            <p>uitdeITP © {new Date().getFullYear()}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
