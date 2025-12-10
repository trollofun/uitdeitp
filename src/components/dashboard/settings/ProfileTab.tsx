'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { AvatarUpload } from '@/components/ui/AvatarUpload';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { useToast } from '@/hooks/useToast';
import { MapPin, Phone, Mail, Loader2, Info } from 'lucide-react';
import { PhoneVerificationModal } from '@/components/dashboard/modals/PhoneVerificationModal';
import { detectUserLocation } from '@/lib/services/geolocation';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  phone_verified: boolean;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  use_manual_location: boolean;
}

const countries = [
  { value: 'RO', label: 'România' },
  { value: 'MD', label: 'Republica Moldova' },
  { value: 'IT', label: 'Italia' },
  { value: 'ES', label: 'Spania' },
  { value: 'DE', label: 'Germania' },
  { value: 'FR', label: 'Franța' },
  { value: 'UK', label: 'Regatul Unit' },
];

const cities = {
  RO: [
    'București',
    'Alba',
    'Arad',
    'Argeș',
    'Bacău',
    'Bihor',
    'Bistrița-Năsăud',
    'Botoșani',
    'Brăila',
    'Brașov',
    'Buzău',
    'Călărași',
    'Caraș-Severin',
    'Cluj',
    'Constanța',
    'Covasna',
    'Dâmbovița',
    'Dolj',
    'Galați',
    'Giurgiu',
    'Gorj',
    'Harghita',
    'Hunedoara',
    'Ialomița',
    'Iași',
    'Ilfov',
    'Maramureș',
    'Mehedinți',
    'Mureș',
    'Neamț',
    'Olt',
    'Prahova',
    'Sălaj',
    'Satu Mare',
    'Sibiu',
    'Suceava',
    'Teleorman',
    'Timiș',
    'Tulcea',
    'Vâlcea',
    'Vaslui',
    'Vrancea',
  ],
  MD: ['Chișinău', 'Bălți', 'Tiraspol', 'Bender', 'Cahul'],
  IT: ['Roma', 'Milano', 'Napoli', 'Torino', 'Palermo'],
  ES: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza'],
  DE: ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt'],
  FR: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice'],
  UK: ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool'],
};

export function ProfileTab() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [detectionSource, setDetectionSource] = useState<string | null>(null);
  const { toast } = useToast();

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/profile');
      const data = await response.json();

      if (data.success) {
        setProfile(data.data);

        // Auto-detect location if not set and not using manual location
        if (!data.data.city && !data.data.use_manual_location) {
          await autoDetectLocation(data.data);
        }
      } else {
        toast({
          title: 'Eroare',
          description: 'Nu s-a putut încărca profilul',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Eroare',
        description: 'Eroare de conexiune',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const autoDetectLocation = async (currentProfile: UserProfile) => {
    setDetectingLocation(true);

    try {
      const result = await detectUserLocation();

      // Update profile with detected location
      await saveProfile({
        city: result.county, // Use county (județ) instead of city for better granularity
        country: 'RO', // Store country code
      });

      // Update local state
      setProfile({
        ...currentProfile,
        city: result.county,
        country: 'RO',
      });

      // Store detection source for display
      const sourceLabels: Record<string, string> = {
        ipgeo: 'IPGeoLocation',
        ipinfo: 'IPInfo',
        ipapi: 'ipapi.co',
        cache: 'Cache',
        manual: 'Default',
      };
      setDetectionSource(sourceLabels[result.source] || result.source);

      toast({
        title: 'Locație detectată',
        description: `${result.county}, România (via ${sourceLabels[result.source]})`,
      });
    } catch (error) {
      console.error('Location detection failed:', error);
      toast({
        title: 'Atenție',
        description: 'Nu s-a putut detecta locația automată. Poți selecta manual.',
        variant: 'default',
      });
    } finally {
      setDetectingLocation(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;

    setIsSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (data.success) {
        setProfile({ ...profile, ...updates });
        toast({
          title: 'Salvat',
          description: 'Profilul a fost actualizat',
        });
      } else {
        toast({
          title: 'Eroare',
          description: data.error || 'Nu s-a putut salva',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Eroare',
        description: 'Eroare de conexiune',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/profile/avatar', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Upload failed');
    }

    await saveProfile({ avatar_url: data.url });
    return data.url;
  };

  const handlePhoneVerified = async (phone: string) => {
    await saveProfile({ phone, phone_verified: true });
    setShowPhoneModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Nu s-a putut încărca profilul</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Informații personale</h2>

          <div className="flex flex-col items-center mb-6">
            <AvatarUpload
              currentUrl={profile.avatar_url}
              userName={profile.full_name}
              onUpload={handleAvatarUpload}
            />
          </div>

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium mb-2">
                Nume complet
              </label>
              <Input
                id="full_name"
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                onBlur={() => saveProfile({ full_name: profile.full_name })}
                placeholder="Ion Popescu"
              />
            </div>

            {/* Email (readonly) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  readOnly
                  className="bg-muted"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // TODO: Open change email modal
                    toast({
                      title: 'În curând',
                      description: 'Funcția de schimbare email va fi disponibilă în curând',
                    });
                  }}
                >
                  Schimbă
                </Button>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefon
                <VerifiedBadge verified={profile.phone_verified} />
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone || ''}
                  readOnly
                  className="bg-muted"
                  placeholder="Neverificat"
                />
                {!profile.phone_verified && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowPhoneModal(true)}
                  >
                    Verifică
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Locație
          </h3>

          <div className="space-y-4">
            {/* Detecting location spinner */}
            {detectingLocation && (
              <div className="p-4 bg-muted rounded-lg flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="font-medium">Detectare locație...</p>
                  <p className="text-sm text-muted-foreground">
                    Se încearcă IPGeoLocation, IPInfo și ipapi.co
                  </p>
                </div>
              </div>
            )}

            {/* Auto-detected location */}
            {!profile.use_manual_location && !detectingLocation && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground">Locație detectată automat:</p>
                <p className="font-medium">
                  📍 {profile.city || 'București'}, {profile.country || 'România'}
                </p>
                {detectionSource && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Info className="h-3 w-3" />
                    <span>Detectat via {detectionSource}</span>
                  </div>
                )}
              </div>
            )}

            {/* Manual location toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Folosește locația manuală</p>
                <p className="text-sm text-muted-foreground">
                  Selectează manual orașul și țara
                </p>
              </div>
              <Switch
                checked={profile.use_manual_location}
                onCheckedChange={(checked) => {
                  saveProfile({ use_manual_location: checked });
                }}
              />
            </div>

            {/* Manual location pickers */}
            {profile.use_manual_location && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="country" className="block text-sm font-medium mb-2">
                    Țară
                  </label>
                  <Select
                    value={profile.country || 'RO'}
                    onValueChange={(value) => {
                      saveProfile({ country: value, city: null });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectează țara" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium mb-2">
                    Oraș
                  </label>
                  <Select
                    value={profile.city ?? ''}
                    onValueChange={(value) => saveProfile({ city: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectează orașul" />
                    </SelectTrigger>
                    <SelectContent>
                      {(cities[profile.country as keyof typeof cities] || []).map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save indicator */}
        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Se salvează...</span>
          </div>
        )}
      </Card>

      {/* Phone Verification Modal */}
      <PhoneVerificationModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onVerified={handlePhoneVerified}
      />
    </>
  );
}
