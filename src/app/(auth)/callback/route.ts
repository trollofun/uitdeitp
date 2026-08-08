/**
 * /callback e ținta unor linkuri de confirmare deja trimise prin email.
 *
 * Aici NU merge un redirect: codul OAuth din query trebuie procesat, nu
 * pasat mai departe. Deci re-export din handler-ul canonic — o singură
 * implementare, fără copia care rămăsese în urmă (cea veche n-avea
 * aterizarea pe rol).
 */
export { GET } from '@/app/auth/callback/route';
