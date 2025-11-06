import { StationForm } from '@/components/admin/StationForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Adaugă Stație | Admin Panel',
  description: 'Creează o nouă stație ITP',
};

export default function NewStationPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/stations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Adaugă Stație Nouă</h1>
          <p className="text-muted-foreground mt-2">
            Configurează o nouă stație ITP cu branding personalizat
          </p>
        </div>
      </div>

      {/* Form */}
      <StationForm />
    </div>
  );
}
