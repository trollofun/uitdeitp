import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';

export const metadata: Metadata = {
  title: 'uitdeITP - Remindere ITP Inteligente',
  description: 'Platform multi-modal pentru gestionarea reminder-elor ITP, RCA și Rovinieta',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
