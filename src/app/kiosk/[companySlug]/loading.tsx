import { Loader2 } from 'lucide-react';

export default function KioskLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Se încarcă kiosk-ul...</p>
      </div>
    </div>
  );
}
