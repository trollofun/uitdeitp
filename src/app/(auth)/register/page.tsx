'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/auth/input';
import { Label } from '@/components/auth/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/auth/card';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { LocationPicker } from '@/components/auth/LocationPicker';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { register } from '@/lib/auth/actions';
import { useToast } from '@/hooks/use-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState({ city: '', country: '' });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const acceptTermsChecked = formData.get('acceptTerms') === 'on';
    const smsNotificationsChecked = formData.get('smsNotifications') === 'on';

    // Validate acceptTerms before proceeding
    if (!acceptTermsChecked) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: 'Trebuie să accepți termenii și condițiile pentru a continua',
      });
      setLoading(false);
      return;
    }

    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
      fullName: formData.get('fullName') as string,
      phone: formData.get('phone') as string || undefined,
      city: location.city || undefined,
      country: location.country || undefined,
      acceptTerms: true as const,
      smsNotifications: smsNotificationsChecked,
    };

    const result = await register(data);

    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: result.error,
      });
      setLoading(false);
    } else {
      // Redirect to verification page
      router.push('/auth/verify-email');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-3xl">Creare cont</CardTitle>
          <CardDescription className="text-center">
            Completează formularul pentru a crea un cont nou
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nume complet *</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Ion Popescu"
                required
                disabled={loading}
                error={errors.fullName}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nume@exemplu.ro"
                required
                disabled={loading}
                error={errors.email}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon (opțional)</Label>
              <PhoneInput
                id="phone"
                name="phone"
                placeholder="+40712345678"
                disabled={loading}
                error={errors.phone}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Parolă *</Label>
              <PasswordInput
                id="password"
                name="password"
                placeholder="••••••••"
                required
                disabled={loading}
                error={errors.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <PasswordStrengthMeter password={password} />
              <p className="text-xs text-gray-500">
                Minim 8 caractere, o literă mare, o cifră și un caracter special
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmă parola *</Label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                placeholder="••••••••"
                required
                disabled={loading}
                error={errors.confirmPassword}
              />
            </div>

            <LocationPicker
              onLocationChange={setLocation}
              defaultCity={location.city}
              defaultCountry={location.country}
            />

            <div className="flex items-start space-x-2">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                required
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              <Label htmlFor="acceptTerms" className="font-normal leading-tight">
                Sunt de acord cu{' '}
                <Link href="/terms" className="text-blue-600 hover:underline">
                  termenii și condițiile
                </Link>{' '}
                și{' '}
                <Link href="/privacy" className="text-blue-600 hover:underline">
                  politica de confidențialitate
                </Link>{' '}
                *
              </Label>
            </div>

            <div className="flex items-start space-x-2">
              <input
                id="smsNotifications"
                name="smsNotifications"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              <Label htmlFor="smsNotifications" className="font-normal leading-tight">
                Doresc să primesc notificări SMS (opțional)
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Se procesează...' : 'Creează cont'}
            </Button>
          </form>

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Sau continuă cu</span>
            </div>
          </div>

          <GoogleSignInButton className="w-full mt-4" />

          <p className="mt-4 text-center text-sm text-gray-600">
            Ai deja cont?{' '}
            <Link href="/auth/login" className="font-medium text-blue-600 hover:underline">
              Autentifică-te
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
