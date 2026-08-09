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
