'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/auth/card';
import { AlertTriangle } from 'lucide-react';

/**
 * AuthErrorPage - Pagină pentru erori de autentificare
 *
 * Gestionează diverse tipuri de erori:
 * - expired: Link expirat (>60 minute)
 * - invalid: Link invalid sau deja folosit
 * - callback: Eroare în procesul OAuth
 * - default: Eroare generică
 */

function ErrorContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type');

  const getErrorConfig = () => {
    switch (type) {
      case 'expired':
        return {
          title: 'Link expirat',
          message: 'Link-ul de verificare este expirat. Link-urile sunt valabile doar 60 de minute.',
          action: {
            primary: { href: '/forgot-password', text: 'Solicită un nou link' },
            secondary: { href: '/login', text: 'Înapoi la autentificare' },
          },
        };

      case 'invalid':
        return {
          title: 'Link invalid',
          message: 'Link-ul de verificare este invalid sau a fost deja folosit.',
          action: {
            primary: { href: '/forgot-password', text: 'Solicită un nou link' },
            secondary: { href: '/login', text: 'Înapoi la autentificare' },
          },
        };

      case 'callback':
        return {
          title: 'Eroare de autentificare',
          message: 'Autentificarea a eșuat. Te rugăm să încerci din nou.',
          action: {
            primary: { href: '/login', text: 'Încearcă din nou' },
            secondary: { href: '/register', text: 'Creează cont nou' },
          },
        };

      default:
        return {
          title: 'Eroare',
          message: 'A apărut o eroare la procesarea cererii tale.',
          action: {
            primary: { href: '/login', text: 'Înapoi la autentificare' },
            secondary: { href: '/register', text: 'Creează cont nou' },
          },
        };
    }
  };

  const config = getErrorConfig();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-center">{config.title}</CardTitle>
          <CardDescription className="text-center">
            {config.message}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {type === 'expired' && (
            <p className="text-sm text-gray-600 text-center">
              Pentru siguranța ta, link-urile de verificare sunt valabile doar <strong>60 de minute</strong>.
            </p>
          )}

          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href={config.action.primary.href}>
                {config.action.primary.text}
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full">
              <Link href={config.action.secondary.href}>
                {config.action.secondary.text}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
