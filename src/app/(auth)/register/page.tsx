import { redirect } from 'next/navigation';

/**
 * URL-ul /register rămâne viu, dar pagina reală e /auth/register.
 *
 * Existau două implementări paralele ale aceluiași ecran, cu cod diferit —
 * o reparație aplicată uneia (ca aterizarea pe rol după login) o rata pe
 * cealaltă, tăcut, pentru jumătate dintre utilizatori. Nu ștergem URL-ul:
 * poate fi în semne de carte sau în emailuri deja trimise.
 */
export default function RegisterRedirectPage() {
  redirect('/auth/register');
}
