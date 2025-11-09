import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kiosk ITP - uitdeITP',
  description: 'Înregistrează-te pentru reminder-e ITP',
};

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
