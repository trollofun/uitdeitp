import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ITP Kiosk - UITDeitp',
  description: 'Self-service ITP inspection kiosk',
}

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50">
      {children}
    </div>
  )
}
