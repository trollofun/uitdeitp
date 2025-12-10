'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/Input';
import { ImagePlus } from 'lucide-react';

interface BrandingEditorProps {
  logoUrl: string;
  primaryColor: string;
  stationName: string;
  onLogoChange: (url: string) => void;
  onColorChange: (color: string) => void;
  errors?: {
    logo_url?: string;
    primary_color?: string;
  };
}

const colorPresets = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

export function BrandingEditor({
  logoUrl,
  primaryColor,
  stationName,
  onLogoChange,
  onColorChange,
  errors,
}: BrandingEditorProps) {
  const [logoPreview, setLogoPreview] = useState(logoUrl);

  const handleLogoUrlChange = (url: string) => {
    setLogoPreview(url);
    onLogoChange(url);
  };

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium mb-2">Logo Stație</label>
        <div className="flex items-start gap-4">
          {/* Logo Preview */}
          <div
            className="w-32 h-32 rounded-xl flex items-center justify-center overflow-hidden border-2"
            style={{ backgroundColor: primaryColor }}
          >
            {logoPreview ? (
              <Image
                src={logoPreview}
                alt="Logo preview"
                width={128}
                height={128}
                className="object-contain"
              />
            ) : (
              <div className="text-center text-white">
                <ImagePlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <span className="text-2xl font-bold">
                  {stationName.charAt(0).toUpperCase() || 'S'}
                </span>
              </div>
            )}
          </div>

          {/* Logo URL Input */}
          <div className="flex-1">
            <Input
              value={logoUrl}
              onChange={(e) => handleLogoUrlChange(e.target.value)}
              placeholder="https://example.com/logo.png"
              error={errors?.logo_url}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Introdu URL-ul imaginii logo (PNG sau JPG recomandat)
            </p>
          </div>
        </div>
      </div>

      {/* Primary Color */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Culoare Primară <span className="text-error">*</span>
        </label>
        <div className="space-y-4">
          {/* Color Input */}
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="h-12 w-12 rounded-lg border cursor-pointer"
            />
            <Input
              value={primaryColor}
              onChange={(e) => onColorChange(e.target.value)}
              placeholder="#3B82F6"
              className="max-w-xs"
              error={errors?.primary_color}
            />
          </div>

          {/* Color Presets */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Culori predefinite:</p>
            <div className="flex items-center gap-2 flex-wrap">
              {colorPresets.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onColorChange(color)}
                  className="h-10 w-10 rounded-lg border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: primaryColor === color ? '#000' : 'transparent',
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div>
        <label className="block text-sm font-medium mb-2">Preview Kiosk</label>
        <div className="rounded-xl overflow-hidden border">
          <div
            className="h-32 flex items-center justify-center"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="text-center text-white">
              {logoPreview ? (
                <Image
                  src={logoPreview}
                  alt="Logo preview"
                  width={80}
                  height={80}
                  className="mx-auto object-contain"
                />
              ) : (
                <div className="text-4xl font-bold">
                  {stationName.charAt(0).toUpperCase() || 'S'}
                </div>
              )}
              <p className="mt-2 text-lg font-semibold">{stationName || 'Nume Stație'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
