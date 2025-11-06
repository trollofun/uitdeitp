'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/auth/input';
import { Label } from '@/components/auth/label';
import { MapPin, Loader2 } from 'lucide-react';

interface LocationPickerProps {
  onLocationChange?: (location: { city: string; country: string }) => void;
  defaultCity?: string;
  defaultCountry?: string;
}

export function LocationPicker({
  onLocationChange,
  defaultCity = '',
  defaultCountry = ''
}: LocationPickerProps) {
  const [city, setCity] = useState(defaultCity);
  const [country, setCountry] = useState(defaultCountry);
  const [detecting, setDetecting] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);

  // Auto-detect location on mount
  useEffect(() => {
    if (!defaultCity && !defaultCountry && !manualOverride) {
      detectLocation();
    }
  }, [defaultCity, defaultCountry, manualOverride]);

  // Notify parent of location changes
  useEffect(() => {
    if (city && country) {
      onLocationChange?.({ city, country });
    }
  }, [city, country, onLocationChange]);

  async function detectLocation() {
    setDetecting(true);

    try {
      // Use ipapi.co for geolocation (free tier: 1000 requests/day)
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();

      if (data.city && data.country_name) {
        setCity(data.city);
        setCountry(data.country_name);
      } else {
        // Fallback to Romania
        setCity('București');
        setCountry('România');
      }
    } catch (error) {
      console.error('Location detection failed:', error);
      // Fallback to Romania
      setCity('București');
      setCountry('România');
    } finally {
      setDetecting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Locație</span>
        </div>
        {!manualOverride && !detecting && (
          <button
            type="button"
            onClick={() => setManualOverride(true)}
            className="text-xs text-blue-600 hover:underline"
          >
            Modifică manual
          </button>
        )}
      </div>

      {detecting ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Detectare locație...</span>
        </div>
      ) : manualOverride ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">Oraș</Label>
            <Input
              id="city"
              name="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="București"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Țară</Label>
            <Input
              id="country"
              name="country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="România"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-3 text-sm">
          <p className="text-gray-700">
            <span className="font-medium">{city}</span>
            {city && country && ', '}
            <span className="font-medium">{country}</span>
          </p>
        </div>
      )}
    </div>
  );
}
