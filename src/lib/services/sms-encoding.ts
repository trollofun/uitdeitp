/**
 * Codarea SMS: GSM-7 vs UCS-2, și de ce ne costă diacriticele dublu.
 *
 * Un SMS nu se taxează pe caractere, ci pe „părți". Cât încape într-o parte
 * depinde de alfabetul folosit:
 *
 *   GSM-7  — alfabetul standard  → 160 caractere într-o parte, 153 în multipart
 *   UCS-2  — orice altceva       →  70 caractere într-o parte,  67 în multipart
 *
 * Un singur „ă" undeva în mesaj mută tot mesajul pe UCS-2. Șablonul nostru de
 * 112 caractere costa 2 părți din cauza lui `expiră`; fără diacritice costă 1.
 *
 * Măsurat 2026-08-09 pe șablonul care pleca în producție.
 */

/** Alfabetul GSM 03.38 de bază — fiecare caracter ocupă un septet. */
const GSM7_BASE = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
);

/** Tabelul de extensie — fiecare caracter ocupă **doi** septeți (escape + cod). */
const GSM7_EXTENDED = new Set('^{}\\[~]|€');

/**
 * Înlocuiri pentru caractere frecvente în textele românești care nu au
 * echivalent prin descompunere Unicode (ghilimele tipografice, liniuțe lungi).
 */
const TRANSLITERATIONS: Record<string, string> = {
  '–': '-', // – en dash
  '—': '-', // — em dash
  '‘': "'", // '
  '’': "'", // '
  '‚': "'",
  '“': '"', // "
  '”': '"', // "
  '„': '"', // „ — ghilimelele românești de deschidere
  '…': '...', // …
  ' ': ' ', // spațiu neîntrerupt
  '•': '-', // •
  '°': ' grade', // °
};

export type SmsEncoding = 'GSM-7' | 'UCS-2';

export interface SmsSegmentation {
  encoding: SmsEncoding;
  /** Numărul de unități taxabile (septeți la GSM-7, unități UTF-16 la UCS-2). */
  length: number;
  /** Câte SMS-uri se taxează. */
  parts: number;
  /** Câte unități mai încap până la următoarea parte. */
  remaining: number;
  /** Caracterele care forțează UCS-2 — utile ca să-i arăți omului ce să schimbe. */
  offenders: string[];
}

/** Caracterele care nu încap în GSM-7, unice, în ordinea apariției. */
export function findNonGsm7(text: string): string[] {
  const seen = new Set<string>();
  for (const char of text) {
    if (!GSM7_BASE.has(char) && !GSM7_EXTENDED.has(char) && !seen.has(char)) {
      seen.add(char);
    }
  }
  return [...seen];
}

export function detectEncoding(text: string): SmsEncoding {
  return findNonGsm7(text).length > 0 ? 'UCS-2' : 'GSM-7';
}

/**
 * Câte părți costă mesajul, și în ce codare.
 *
 * Notă despre UCS-2: numărăm unități UTF-16, nu puncte de cod, pentru că așa
 * se taxează. Un emoji din planurile suplimentare ocupă 2 — de asta folosim
 * `text.length`, nu `[...text].length`.
 */
export function segmentSms(text: string): SmsSegmentation {
  const offenders = findNonGsm7(text);
  const encoding: SmsEncoding = offenders.length > 0 ? 'UCS-2' : 'GSM-7';

  let length: number;
  let singleLimit: number;
  let multiLimit: number;

  if (encoding === 'GSM-7') {
    // Caracterele din tabelul de extensie ocupă doi septeți.
    length = 0;
    for (const char of text) {
      length += GSM7_EXTENDED.has(char) ? 2 : 1;
    }
    singleLimit = 160;
    multiLimit = 153;
  } else {
    length = text.length;
    singleLimit = 70;
    multiLimit = 67;
  }

  const parts = length <= singleLimit ? 1 : Math.ceil(length / multiLimit);
  const capacity = parts === 1 ? singleLimit : parts * multiLimit;

  return { encoding, length, parts, remaining: capacity - length, offenders };
}

/**
 * Regula de normalizare a valorilor injectate într-un șablon, într-un singur loc.
 *
 * Dacă șablonul e curat, normalizăm ce punem în el — altfel un client pe nume
 * „Ștefan" ar dubla tăcut costul unui mesaj pe care stația îl crede ieftin.
 * Dacă stația a scris ea cu diacritice, mesajul e oricum UCS-2: normalizarea
 * n-ar mai economisi nimic și doar i-ar stâlci numele omului, deci n-o facem.
 *
 * Se folosește în `renderSmsTemplate` și în procesorul de recenzii — amândouă
 * randează șabloane de stație, deci amândouă trebuie să răspundă la fel.
 */
export function valueNormalizerFor(template: string): (value: string) => string {
  return detectEncoding(template) === 'GSM-7' ? toGsm7 : (value: string) => value;
}

/**
 * Aduce textul în GSM-7 fără să-i schimbe înțelesul: „expiră" → „expira".
 *
 * Păstrează caracterele care sunt deja valide în GSM-7 (é, ä, ö, ü, ñ, à există
 * în alfabet) — nu le strică degeaba. Doar ce nu încape se descompune Unicode și
 * se păstrează litera de bază, exact cum se așteaptă un cititor român.
 */
export function toGsm7(text: string): string {
  let out = '';

  for (const char of text) {
    if (GSM7_BASE.has(char) || GSM7_EXTENDED.has(char)) {
      out += char;
      continue;
    }

    const replacement = TRANSLITERATIONS[char];
    if (replacement !== undefined) {
      out += replacement;
      continue;
    }

    // Descompunere canonică: „ă" → „a" + semn combinatoriu, pe care îl aruncăm.
    // Prinde ambele variante românești de ș/ț — cea corectă, cu virgulă dedesubt
    // (U+0219/U+021B), și cea greșită dar foarte răspândită, cu sedilă
    // (U+015F/U+0163) — pentru că amândouă se descompun la s/t.
    const stripped = char.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (stripped !== char && stripped.length > 0) {
      // Litera de bază poate fi ea însăși în afara GSM-7; o acceptăm doar dacă e validă.
      const usable = [...stripped].every((c) => GSM7_BASE.has(c) || GSM7_EXTENDED.has(c));
      if (usable) {
        out += stripped;
        continue;
      }
    }

    // Nu știm să-l transliterăm. Îl păstrăm: e mai bine să plătim o parte în plus
    // decât să trimitem un mesaj mutilat, iar `segmentSms` va semnala costul.
    out += char;
  }

  return out;
}
