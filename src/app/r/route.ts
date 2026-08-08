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

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t');

  // Orice eșec duce omul acasă, nu într-o pagină de eroare: a dat clic dintr-un
  // SMS, nu are ce face cu un mesaj despre token invalid.
  const fallback = NextResponse.redirect(appUrl(), { status: 302 });

  if (!token) return fallback;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: request } = await supabase
    .from('review_requests')
    .select('id, clicked_at, click_count, kiosk_stations!inner(review_link)')
    .eq('token', token)
    .maybeSingle();

  const reviewLink = (request as unknown as { kiosk_stations?: { review_link?: string } } | null)
    ?.kiosk_stations?.review_link;

  if (!request || !reviewLink) return fallback;

  // Contorizarea nu are voie să întârzie sau să blocheze redirectul: dacă baza
  // e lentă, omul tot trebuie să ajungă la formular. Măsurăm ce putem, mergem
  // mai departe orice s-ar întâmpla.
  try {
    await supabase
      .from('review_requests')
      .update({
        // `clicked_at` reține primul clic — ăsta e clicul unic, cel care spune
        // câți oameni distincți au ajuns pe formular. `click_count` e brut și
        // include re-deschiderile și scanerele de linkuri ale operatorilor.
        clicked_at: request.clicked_at ?? new Date().toISOString(),
        click_count: (request.click_count ?? 0) + 1,
      } as never)
      .eq('id', request.id);
  } catch (error) {
    console.warn('[Review] click not recorded', { id: request.id, error });
  }

  return NextResponse.redirect(reviewLink, { status: 302 });
}
