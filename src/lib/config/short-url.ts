/**
 * Domeniul scurt pentru linkurile care intră în SMS.
 *
 * `itp.vin` în loc de `www.uitdeitp.ro`: **8 caractere economisite per link**,
 * 16 într-un mesaj care are și programare, și dezabonare.
 *
 * Nu e o înjumătățire ca eliminarea diacriticelor — e **marjă**. Un mesaj de
 * 140 de caractere și unul de 124 costă amândouă un SMS; diferența e că al
 * doilea mai suportă un nume de stație lung fără să treacă în a doua parte.
 * Exact acolo se pierd banii: nu la mesajul tipic, ci la cel puțin cu noroc.
 *
 * **Ce servește domeniul scurt:** doar linkurile scurte (`/o`, `/r`, `/p`).
 * Restul se redirecționează către domeniul canonic — vezi `middleware.ts`.
 * Motivul e că două domenii care servesc aceeași aplicație înseamnă conținut
 * duplicat, cookie-uri pe host greșit și o a doua suprafață de întreținut.
 */

import { appUrl } from './app-url';

/**
 * Baza pentru linkurile din SMS.
 *
 * Cât timp `NEXT_PUBLIC_SHORT_URL` nu e setat — adică până se propagă DNS-ul —
 * cade pe domeniul principal. Deci se poate desfășura codul înaintea
 * domeniului, fără ca vreun link să se rupă.
 */
export function shortUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SHORT_URL?.trim();
  if (!raw) return appUrl();
  return raw.replace(/\/+$/, '');
}

/** URL absolut pe domeniul scurt, ex. `shortPath('/o?t=abc')`. */
export function shortPath(path: string): string {
  return `${shortUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Domeniul scurt e configurat și diferit de cel principal? */
export function hasShortDomain(): boolean {
  return shortUrl() !== appUrl();
}

/**
 * Căile pe care le servește domeniul scurt. Orice altceva ajunge pe domeniul
 * canonic, cu un redirect permanent.
 *
 * `/p/` e programarea: `itp.vin/p/euro-auto` în loc de
 * `www.uitdeitp.ro/programare/euro-auto` — încă 12 caractere.
 * `/a` e anularea, care intră în SMS-ul de confirmare.
 */
export const SHORT_PATHS = ['/o', '/r', '/a', '/p/'] as const;

export function isShortPath(pathname: string): boolean {
  return SHORT_PATHS.some((prefix) =>
    prefix.endsWith('/') ? pathname.startsWith(prefix) : pathname === prefix
  );
}

/** Hostul scurt fără schemă — forma care intră efectiv în SMS (`itp.vin`). */
export function shortHost(): string {
  return new URL(shortUrl()).host;
}

/**
 * Rute reale ale aplicației care s-ar potrivi din greșeală pe forma unui token
 * (6-12 caractere, doar litere mici și cifre). Pe hostul scurt ele ar fi
 * oricum redirecționate spre domeniul canonic — denylist-ul păstrează exact
 * comportamentul ăla în loc să le trateze ca tokenuri invalide.
 */
const TOKEN_DENYLIST = new Set([
  'statii',
  'programare',
  'dashboard',
  'stations',
  'register',
  'contact',
  'unauthorized',
  'sitemap',
  'robots',
]);

/**
 * `itp.vin/xxxxxx` — forma cea mai scurtă a linkului de opt-out din SMS
 * (14 caractere). Întoarce tokenul dacă path-ul e exact un token, altfel null.
 */
export function bareOptOutToken(pathname: string): string | null {
  const match = /^\/([a-z0-9]{6,12})$/.exec(pathname);
  if (!match || TOKEN_DENYLIST.has(match[1])) return null;
  return match[1];
}
