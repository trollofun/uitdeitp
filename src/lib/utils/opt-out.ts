import { randomBytes } from 'node:crypto';
import { shortHost, shortUrl } from '@/lib/config/short-url';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Linkul de dezabonare din SMS — forma cea mai scurtă posibilă, GSM-7 pur.
 *
 * `itp.vin/xxxxxx` = 14 caractere (fără schemă, fără prefix de rută), cu token
 * OPAC de 6 caractere `a-z0-9`, unic per telefon și refolosit: același client
 * primește mereu același link, deci tokenul se generează o singură dată.
 *
 * Istoric: vechiul token era telefonul codat reversibil în base36 — 26 de
 * caractere pe link și, mai grav, oricine putea enumera numere reale prin
 * GET /api/opt-out?token=. Decodarea legacy rămâne DOAR pentru linkurile din
 * SMS-urile deja trimise, care nu expiră niciodată.
 */

const TOKEN_LENGTH = 6;
const TOKEN_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'; // GSM-7 pur

function randomToken(): string {
  const bytes = randomBytes(TOKEN_LENGTH);
  let out = '';
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    out += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  }
  return out;
}

/** Tokenul legacy: telefonul fără +40, în base36. Doar pentru fallback-uri. */
function encodePhoneToToken(phone: string): string {
  const digits = phone.replace(/^\+40/, '');

  if (digits.length !== 9) {
    throw new Error('Invalid Romanian phone number format');
  }

  return parseInt(digits, 10).toString(36);
}

/**
 * Decodarea tokenului LEGACY (reversibil). Strictă pe formă: `parseInt(x, 36)`
 * acceptă prefixe valide urmate de gunoi, deci validăm întâi tot tokenul.
 */
export function decodeOptOutToken(token: string): string | null {
  if (!/^[0-9a-z]{1,7}$/.test(token)) return null;

  const numberValue = parseInt(token, 36);
  if (Number.isNaN(numberValue)) return null;

  const digits = numberValue.toString().padStart(9, '0');

  // Validate: must be 9 digits and start with 7 (Romanian mobile numbers)
  if (digits.length !== 9 || !digits.startsWith('7')) return null;

  return `+40${digits}`;
}

/**
 * Telefonul din spatele unui token: întâi tabela de tokenuri opace, apoi
 * decodarea legacy (linkurile vechi trăiesc în SMS-uri trimise și nu expiră).
 */
export async function resolvePhoneFromToken(token: string): Promise<string | null> {
  if (!/^[a-z0-9]{1,12}$/.test(token)) return null;

  const { data } = await createServiceClient()
    .from('opt_out_tokens' as never)
    .select('phone')
    .eq('token', token)
    .maybeSingle<{ phone: string }>();

  if (data?.phone) return data.phone;

  return decodeOptOutToken(token);
}

/**
 * Linkul de opt-out pentru un telefon: `itp.vin/xxxxxx`.
 *
 * Refolosește tokenul existent al telefonului sau generează unul nou, cu
 * retry pe coliziune (23505 pe PK-ul token). Fail-open pe formatul legacy:
 * un SMS fără link de dezabonare e problemă GDPR, deci dacă baza nu răspunde
 * la generare, linkul vechi e mai bun decât niciunul.
 */
export async function generateOptOutLink(phone: string): Promise<string> {
  try {
    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from('opt_out_tokens' as never)
      .select('token')
      .eq('phone', phone)
      .maybeSingle<{ token: string }>();

    if (existing?.token) {
      return `${shortHost()}/${existing.token}`;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const token = randomToken();
      const { error } = await supabase
        .from('opt_out_tokens' as never)
        .insert({ token, phone } as never);

      if (!error) {
        return `${shortHost()}/${token}`;
      }

      if (error.code === '23505') {
        // Coliziune pe token → reîncearcă; cursă pe phone → tokenul câștigător
        // e deja în tabel, îl citim.
        const { data: raced } = await supabase
          .from('opt_out_tokens' as never)
          .select('token')
          .eq('phone', phone)
          .maybeSingle<{ token: string }>();
        if (raced?.token) return `${shortHost()}/${raced.token}`;
        continue;
      }

      throw error;
    }

    throw new Error('token collision retries exhausted');
  } catch (error) {
    console.warn('[OptOut] token store unavailable, falling back to legacy link', {
      error: error instanceof Error ? error.message : String(error),
    });
    return `${shortUrl()}/o?t=${encodePhoneToToken(phone)}`;
  }
}
