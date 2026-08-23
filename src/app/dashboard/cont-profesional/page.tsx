import { notFound } from 'next/navigation';
import { flags } from '@/lib/config/flags';
import { ProfessionalAccountForm } from '@/components/dashboard/ProfessionalAccountForm';

export const metadata = {
  title: 'Cont profesional | uitdeITP',
  description: 'Administrează-ți proprii clienți ITP — gratuit, plătești doar SMS-urile',
};

export const dynamic = 'force-dynamic';

export default function ContProfesionalPage() {
  if (!flags.professionalAccountsEnabled) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold">Contul tău profesional</h1>
      <p className="mt-2 text-gray-600">
        Ești inspector ITP și vrei să ai grijă de proprii clienți? Contul profesional îți dă
        propriul dashboard: clienții tăi, reminder-ele tale, SMS-uri cu numele tău.
      </p>
      <ul className="mt-4 space-y-1 text-sm text-gray-600">
        <li>✓ Clienții tăi se strâng <strong>gratuit din SIRAR</strong> — primești cheia ta personală</li>
        <li>✓ E-mailurile de reminder sunt <strong>gratuite, nelimitate</strong></li>
        <li>✓ Plătești doar SMS-urile (1 credit = 1 SMS)</li>
        <li>✓ Datele sunt ale tale: export CSV oricând</li>
      </ul>
      <div className="mt-8">
        <ProfessionalAccountForm />
      </div>
    </main>
  );
}
