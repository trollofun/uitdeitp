/**
 * Linkul scurt de recenzie: `/r?t=<token>` → redirect către formularul stației.
 *
 * E o rută, nu o pagină: clientul a primit un SMS și vrea să ajungă pe Google,
 * nu să aștepte un render. Redirectul pleacă din prima cerere.
 *
 * De ce token propriu și nu direct linkul Google în SMS:
 *   1. **Măsurare.** Fără contor, o stație nu poate ști dacă merită plătit.
 *      Concurența trimite linkul brut și nu numără nimic.
 *   2. **Caractere.** Un link Google de recenzie are 40-70 de caractere; `/r?t=`
 *      cu token de 12 are ~35 pe domeniul actual. Într-un SMS de 160, contează.
 *
 * Tokenul e aleatoriu (72 de biți), nu derivat din telefon — spre deosebire de
 * cel de opt-out, care e o transformare reversibilă și deci enumerabilă.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { appUrl } from '@/lib/config/app-url';

export const dynamic = 'force-dynamic';

/**
 * Fără asta, contorul se oprea la 1 pentru fiecare token — și mi-a luat patru
 * încercări să înțeleg de ce.
 *
 * `dynamic = 'force-dynamic'` oprește prerandarea paginii, dar **nu** oprește
 * Data Cache-ul din Next.js, care memorează apelurile `fetch`. supabase-js
 * folosește `fetch`, deci apelul RPC — aceeași adresă, același corp, același
 * token — era servit din cache la a doua deschidere: primeam linkul corect
 * înapoi, dar cererea nu mai ajungea niciodată la bază, deci `UPDATE`-ul nu
 * mai rula.
 *
 * Asta explica și de ce URL-uri distincte (`?x=1`, `?x=2`) nu schimbau nimic:
 * cheia de cache e a apelului către Supabase, nu a cererii venite din SMS.
 *
 * `force-no-store` se aplică tuturor `fetch`-urilor din rută. Regula generală:
 * orice rută care scrie în bază prin supabase-js are nevoie de ea.
 */
export const fetchCache = 'force-no-store';

/**
 * Un redirect care are efect secundar nu are voie să fie păstrat în cache.
 *
 * `force-dynamic` spune Next.js să nu prerandeze ruta, dar nu spune nimic
 * rețelei de distribuție despre răspuns. Măsurat pe producție cu un token nou:
 * primul clic se contoriza, al doilea venea din cache și nu mai ajungea la
 * funcție deloc — deci `click_count` rămânea 1 oricâți oameni ar fi deschis
 * linkul. Un contor care se oprește la 1 e mai rău decât niciun contor: arată
 * ca un răspuns.
 */
function noStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.headers.set('CDN-Cache-Control', 'no-store');
  response.headers.set('Vercel-CDN-Cache-Control', 'no-store');
  return response;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t');

  // Orice eșec duce omul acasă, nu într-o pagină de eroare: a dat clic dintr-un
  // SMS, nu are ce face cu un mesaj despre token invalid.
  const fallback = () => noStore(NextResponse.redirect(appUrl(), { status: 302 }));

  if (!token) return fallback();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Un singur apel: incrementează atomic și întoarce linkul stației.
  //
  // Varianta „citește rândul, apoi scrie count+1" din aplicație a picat pe
  // producție — citirea nu întorcea coloanele, deci fiecare clic rescria
  // „primul clic" și contorul rămânea 1. Chiar corectată, ar fi rămas o cursă:
  // doi oameni care dau clic simultan citesc aceeași valoare și scriu aceeași
  // valoare +1, deci un clic dispare. Incrementul stă acum în baza de date,
  // unde rândul e blocat. `clicked_at` reține primul clic (`COALESCE`), nu
  // ultimul — ăla e numărul de oameni distincți care au ajuns pe formular.
  let reviewLink: string | undefined;

  try {
    const { data } = await supabase.rpc('record_review_click', { p_token: token });
    reviewLink = (data as Array<{ review_link: string }> | null)?.[0]?.review_link;
  } catch (error) {
    console.warn('[Review] click not recorded', { error });
  }

  if (!reviewLink) return fallback();

  return noStore(NextResponse.redirect(reviewLink, { status: 302 }));
}
