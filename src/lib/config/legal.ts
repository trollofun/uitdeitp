/**
 * Identitatea operatorului de date și datele de contact publice.
 *
 * Art. 13 GDPR cere ca persoana vizată să afle **cine** îi prelucrează datele:
 * denumire, sediu, date de contact. Codul nu are de unde să știe asta — sunt
 * date din actele firmei. Aici sunt citite din mediu, iar paginile publice
 * afișează doar câmpurile completate: mai bine lipsește un rând decât să apară
 * un CUI inventat pe o pagină cu valoare juridică.
 *
 * De completat în Vercel (nu sunt secrete, `NEXT_PUBLIC_`):
 *   NEXT_PUBLIC_LEGAL_ENTITY   — denumirea completă, ex. „Exemplu Auto S.R.L."
 *   NEXT_PUBLIC_LEGAL_REG      — nr. Reg. Com., ex. „J13/1234/2020"
 *   NEXT_PUBLIC_LEGAL_VAT      — CUI, ex. „RO12345678"
 *   NEXT_PUBLIC_LEGAL_ADDRESS  — sediul social
 *   NEXT_PUBLIC_LEGAL_DPO      — email responsabil cu protecția datelor, dacă e desemnat
 */

export const LEGAL_CONTACT_EMAIL = 'contact@uitdeitp.ro';
export const LEGAL_PRIVACY_EMAIL =
  process.env.NEXT_PUBLIC_LEGAL_DPO || 'contact@uitdeitp.ro';

export interface LegalEntity {
  name: string | null;
  registration: string | null;
  vat: string | null;
  address: string | null;
}

export function legalEntity(): LegalEntity {
  const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : null);
  return {
    name: clean(process.env.NEXT_PUBLIC_LEGAL_ENTITY),
    registration: clean(process.env.NEXT_PUBLIC_LEGAL_REG),
    vat: clean(process.env.NEXT_PUBLIC_LEGAL_VAT),
    address: clean(process.env.NEXT_PUBLIC_LEGAL_ADDRESS),
  };
}

/** Data ultimei revizuiri de fond a documentelor legale. Se actualizează manual. */
export const LEGAL_LAST_UPDATED = '10 august 2026';
