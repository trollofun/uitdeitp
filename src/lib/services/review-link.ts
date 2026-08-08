/**
 * Validarea linkului de recenzie Google.
 *
 * Azi câmpul e verificat doar cu `z.string().url()`, deci acceptă orice —
 * inclusiv un link de căutare Google, o pagină Facebook, sau un shortener.
 * Inspecto are exact aceeași gaură, iar stațiile lor lipesc `shorturl.at`:
 * linkul „merge" la salvare și eșuează tăcut la fiecare client, luni la rând.
 *
 * Un generator adevărat (cauți stația după nume, alegi din rezultate, primești
 * URL-ul canonic) are nevoie de **Google Places API**, deci de o cheie și de un
 * cost per cerere — o decizie de dependență, nu ceva de adăugat pe tăcute.
 * Până atunci validăm formele reale și spunem limpede ce e greșit, ceea ce
 * acoperă cauza principală a eșecurilor: linkul lipit greșit.
 */

export interface ReviewLinkCheck {
  ok: boolean;
  /** Forma normalizată, de salvat. */
  normalized?: string;
  /** Ce să-i spunem patronului, în română, ca să poată repara singur. */
  error?: string;
}

/** Formele pe care Google le folosește pentru „scrie o recenzie". */
const ACCEPTED: Array<{ test: (u: URL) => boolean; label: string }> = [
  {
    // https://g.page/r/<id>/review — forma scurtă oficială
    test: (u) => u.hostname === 'g.page' && u.pathname.startsWith('/r/'),
    label: 'g.page',
  },
  {
    // https://search.google.com/local/writereview?placeid=<id>
    test: (u) =>
      u.hostname === 'search.google.com' &&
      u.pathname.startsWith('/local/writereview') &&
      u.searchParams.has('placeid'),
    label: 'search.google.com/local/writereview',
  },
  {
    // https://maps.app.goo.gl/<id> — linkul de partajare din aplicația Maps
    test: (u) => u.hostname === 'maps.app.goo.gl' && u.pathname.length > 1,
    label: 'maps.app.goo.gl',
  },
  {
    // https://www.google.com/maps/place/... — acceptat, deși duce la fișă, nu
    // direct la formular; e mai bine decât nimic și foarte des folosit.
    test: (u) =>
      /^(www\.)?google\.[a-z.]+$/.test(u.hostname) && u.pathname.startsWith('/maps/'),
    label: 'google.com/maps',
  },
];

/** Shortenere: linkul poate expira sau poate fi redirecționat oriunde. */
const SHORTENERS = new Set([
  'shorturl.at',
  'bit.ly',
  'tinyurl.com',
  'goo.gl',
  't.co',
  'ow.ly',
  'is.gd',
  'cutt.ly',
]);

export function checkReviewLink(raw: string): ReviewLinkCheck {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { ok: false, error: 'Linkul de recenzie lipsește.' };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return {
      ok: false,
      error: 'Nu pare un link valid. Trebuie să înceapă cu https://',
    };
  }

  if (url.protocol !== 'https:') {
    return { ok: false, error: 'Linkul trebuie să fie https://, nu http://' };
  }

  if (SHORTENERS.has(url.hostname)) {
    return {
      ok: false,
      error:
        'Linkurile scurtate (shorturl.at, bit.ly) pot expira sau se pot schimba. ' +
        'Lipește linkul direct de la Google.',
    };
  }

  // Cazul cel mai frecvent de greșeală: linkul din bara de adrese după o
  // căutare, în loc de linkul de recenzie al fișei.
  if (/^(www\.)?google\.[a-z.]+$/.test(url.hostname) && url.pathname.startsWith('/search')) {
    return {
      ok: false,
      error:
        'Ăsta e un link de căutare Google, nu linkul stației. ' +
        'Deschide fișa stației în Google Maps → Distribuie → Copiază link.',
    };
  }

  if (!ACCEPTED.some((form) => form.test(url))) {
    return {
      ok: false,
      error:
        'Linkul nu pare să fie de la Google. Acceptăm g.page, maps.app.goo.gl, ' +
        'google.com/maps sau search.google.com/local/writereview.',
    };
  }

  // Parametrii de urmărire adăugați de aplicația Maps nu ajută pe nimeni și
  // ocupă caractere într-un SMS — deși linkul nostru scurt îi ascunde oricum.
  url.searchParams.delete('utm_source');
  url.searchParams.delete('utm_medium');
  url.searchParams.delete('utm_campaign');

  return { ok: true, normalized: url.toString() };
}
