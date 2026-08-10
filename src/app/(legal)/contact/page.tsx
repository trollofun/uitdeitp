import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, ShieldCheck, Building2, Ban } from 'lucide-react';
import { legalEntity, LEGAL_CONTACT_EMAIL, LEGAL_PRIVACY_EMAIL } from '@/lib/config/legal';

/**
 * Pagina de contact.
 *
 * Fără formular, intenționat: un formular public înseamnă încă o suprafață de
 * spam de apărat (rate-limit, Turnstile, o cutie poștală de citit) pentru un
 * câștig zero față de o adresă de e-mail. Adresele de aici sunt cele reale,
 * folosite deja în aplicație.
 */
export const metadata: Metadata = {
  title: 'Contact | uitdeITP',
  description:
    'Cum ne contactezi: suport pentru șoferi, activarea unei stații ITP, chestiuni legate de datele personale, dezabonare.',
};

const CHANNELS = [
  {
    icon: Mail,
    title: 'Suport pentru șoferi',
    body: 'Nu ți-a ajuns un mesaj, ai o dată greșită în cont sau nu te poți autentifica.',
    email: LEGAL_CONTACT_EMAIL,
  },
  {
    icon: Building2,
    title: 'Stații ITP',
    body: 'Vrei ca stația ta să trimită reamintiri clienților sau să apară în directorul public.',
    email: LEGAL_CONTACT_EMAIL,
    subject: 'Vreau activarea stației',
  },
  {
    icon: ShieldCheck,
    title: 'Date personale',
    body: 'Acces, rectificare, ștergere sau retragerea acordului — inclusiv dacă nu ai cont.',
    email: LEGAL_PRIVACY_EMAIL,
    subject: 'Solicitare GDPR',
  },
];

export default function ContactPage() {
  const entity = legalEntity();

  return (
    <>
      <h1>Contact</h1>
      <p className="text-muted-foreground">
        Scrie-ne direct pe e-mail. Răspundem în una–două zile lucrătoare.
      </p>

      <div className="my-8 grid gap-4 sm:grid-cols-2">
        {CHANNELS.map(({ icon: Icon, title, body, email, subject }) => (
          <div key={title} className="rounded-lg border p-5">
            <Icon className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            <a
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
              href={`mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`}
            >
              {email}
            </a>
          </div>
        ))}

        <div className="rounded-lg border p-5">
          <Ban className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-semibold">Oprirea mesajelor</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Nu e nevoie să ne scrii: folosește linkul de dezabonare din SMS sau răspunde cu{' '}
            <strong>STOP</strong>. Se aplică imediat.
          </p>
        </div>
      </div>

      <h2>Date de identificare</h2>
      {entity.name ? (
        <ul>
          <li>
            <strong>{entity.name}</strong>
          </li>
          {entity.registration && <li>Reg. Com.: {entity.registration}</li>}
          {entity.vat && <li>CUI: {entity.vat}</li>}
          {entity.address && <li>Sediu: {entity.address}</li>}
        </ul>
      ) : (
        <p>
          Datele complete de identificare ale operatorului se pot obține la{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
        </p>
      )}

      <p>
        Vezi și <Link href="/termeni-si-conditii">termenii și condițiile</Link> și{' '}
        <Link href="/politica-confidentialitate">politica de confidențialitate</Link>.
      </p>
    </>
  );
}
