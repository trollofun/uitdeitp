'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/auth/input';
import { Label } from '@/components/auth/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/auth/card';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { login } from '@/lib/auth/actions';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      remember: formData.get('remember') === 'on',
    };

    const result = await login(data);

    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: result.error,
      });
      setLoading(false);
    }
    // On success, redirect is handled by the action
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-3xl">Autentificare</CardTitle>
          <CardDescription className="text-center">
            Introdu emailul și parola pentru a te conecta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Parolă</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Ai uitat parola?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                disabled={loading}
                error={errors.password}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              <Label htmlFor="remember" className="font-normal">
                Ține-mă minte
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Se procesează...' : 'Autentifică-te'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Sau continuă cu</span>
            </div>
          </div>

          <GoogleSignInButton className="w-full" />

          <p className="text-center text-sm text-gray-600">
            Nu ai cont?{' '}
            <Link href="/auth/register" className="font-medium text-blue-600 hover:underline">
              Înregistrează-te
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
