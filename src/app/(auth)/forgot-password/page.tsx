import { redirect } from 'next/navigation';

/**
 * URL-ul /forgot-password rămâne viu, dar pagina reală e /auth/forgot-password.
 *
 * Existau două implementări paralele ale aceluiași ecran, cu cod diferit —
 * o reparație aplicată uneia (ca aterizarea pe rol după login) o rata pe
 * cealaltă, tăcut, pentru jumătate dintre utilizatori. Nu ștergem URL-ul:
 * poate fi în semne de carte sau în emailuri deja trimise.
 */
export default function ForgotPasswordRedirectPage() {
  redirect('/auth/forgot-password');
}
