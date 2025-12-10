import { Settings as SettingsIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export const metadata = {
  title: 'Setări | Admin Panel',
  description: 'Setări sistem',
};

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Setări</h1>
        <p className="text-muted-foreground mt-2">
          Configurează setările sistemului
        </p>
      </div>

      {/* Coming Soon */}
      <Card className="p-12 text-center">
        <SettingsIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">În Dezvoltare</h2>
        <p className="text-muted-foreground">
          Pagina de setări va fi disponibilă în curând
        </p>
      </Card>
    </div>
  );
}
