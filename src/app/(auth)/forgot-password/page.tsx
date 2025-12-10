'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/auth/input';
import { Label } from '@/components/auth/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/auth/card';
import { requestPasswordReset } from '@/lib/auth/actions';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const emailValue = formData.get('email') as string;
    setEmail(emailValue);

    const result = await requestPasswordReset({ email: emailValue });

    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: result.error,
      });
      setLoading(false);
    } else {
      setEmailSent(true);
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Verifică-ți emailul</CardTitle>
            <CardDescription>
              Am trimis instrucțiuni de resetare a parolei la{' '}
              <span className="font-medium text-gray-900">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Ce urmează?</p>
                  <ol className="mt-2 list-decimal list-inside space-y-1 text-xs">
                    <li>Verifică inbox-ul și folderul de spam</li>
                    <li>Accesează linkul din email (valabil 1 oră)</li>
                    <li>Creează o parolă nouă</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => setEmailSent(false)}
                variant="outline"
                className="w-full"
              >
                Încearcă alt email
              </Button>

              <Link href="/auth/login" className="block">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Înapoi la autentificare
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-3xl">Ai uitat parola?</CardTitle>
          <CardDescription className="text-center">
            Introdu adresa de email și îți vom trimite instrucțiuni pentru a-ți reseta parola
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Se trimite...' : 'Trimite linkul de resetare'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Înapoi la autentificare
            </Link>
          </div>

          <div className="mt-6 rounded-lg bg-gray-50 p-4 text-xs text-gray-600">
            <p className="font-medium text-gray-900">Probleme cu resetarea?</p>
            <ul className="mt-2 space-y-1">
              <li>• Verifică că ai introdus emailul corect</li>
              <li>• Linkul de resetare expiră după 1 oră</li>
              <li>• Poți solicita un link nou oricând</li>
              <li>• Contactează suportul dacă problema persistă</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
