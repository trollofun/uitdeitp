import { CreditsAdminPanel } from '@/components/admin/CreditsAdminPanel';

export const metadata = {
  title: 'Credite | Admin Panel',
  description: 'Solduri, achiziții Gumroad și reconciliere manuală',
};

export const dynamic = 'force-dynamic';

export default function AdminCreditePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Credite</h1>
        <p className="text-muted-foreground">
          Soldurile stațiilor (din ledger), achizițiile Gumroad și uneltele de reconciliere.
          Reconcilierea rulează oricum automat la 15 minute — butonul de aici e pentru
          „vreau să văd ACUM", iar ajustarea manuală lasă mereu o linie auditabilă în istoric.
        </p>
      </div>
      <CreditsAdminPanel />
    </div>
  );
}
