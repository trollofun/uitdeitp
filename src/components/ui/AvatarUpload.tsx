'use client';

import { useState, useRef } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { Button } from './Button';
import { Upload, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  currentUrl?: string | null;
  userName?: string;
  onUpload: (file: File) => Promise<string>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
  xl: 'h-40 w-40',
};

export function AvatarUpload({
  currentUrl,
  userName,
  onUpload,
  size = 'lg',
  className,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Te rog selectează un fișier imagine (JPG, PNG)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Fișierul este prea mare. Maxim 2MB.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Resize image to 200x200
      const resizedFile = await resizeImage(file, 200, 200);

      // Upload to Supabase Storage
      const url = await onUpload(resizedFile);

      // Update preview
      setPreviewUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la încărcarea imaginii');
    } finally {
      setIsUploading(false);
    }
  };

  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], file.name, { type: 'image/jpeg' }));
              } else {
                reject(new Error('Failed to resize image'));
              }
            },
            'image/jpeg',
            0.9
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const getInitials = () => {
    if (!userName) return 'U';
    return userName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className="relative group">
        <Avatar className={cn(sizeMap[size], 'ring-4 ring-background')}>
          <AvatarImage src={previewUrl || undefined} alt={userName} />
          <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
            {getInitials()}
          </AvatarFallback>
        </Avatar>

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-full',
            'bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity',
            'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring',
            'disabled:cursor-not-allowed'
          )}
          aria-label="Încarcă avatar"
        >
          <Upload className="h-6 w-6 text-white" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Selectează fișier avatar"
        />
      </div>

      <div className="text-center space-y-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Se încarcă...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Schimbă avatar
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">JPG, PNG. Max 2MB.</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
