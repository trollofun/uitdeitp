/**
 * Uneltele de reconciliere manuală ale adminului (/admin/credite).
 *
 * GET  — privirea de ansamblu: soldul fiecărei stații (din ledger), ultimele
 *        achiziții cu statusul lor (inclusiv failed/pending, care cer ochi
 *        umani) și ultimele linii de ledger.
 * POST — două acțiuni:
 *        { action: 'reconcile' }  → rulează ACUM exact reconcilierea cronului
 *                                    (aceeași funcție, același raport);
 *        { action: 'adjust', station_id, delta, descriere }
 *                                  → linie adjust_admin în ledger, cu motivul
 *                                    scris de admin; apare ca atare în
 *                                    istoricul stației. Auditabilă, nu editabilă.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { reconcileGumroadSales } from '@/lib/services/gumroad-sales';
import { appendLedger } from '@/lib/services/credit-ledger';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60;

async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Doar pentru administratori' }, { status: 403 });
  }
  return { userId: user.id };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const service = createServiceClient();

  const [{ data: stations }, { data: purchases }, { data: ledger }] = await Promise.all([
    service
      .from('kiosk_stations')
      .select('id, name, slug, rar_code, is_active')
      .order('name'),
    service
      .from('credit_purchases' as never)
      .select('id, station_id, payment_ref, product_permalink, amount_parts, status, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
    service
      .from('credit_ledger' as never)
      .select('station_id, delta, motiv, descriere, sold_rezultat, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  // Soldul per stație, din ledger (sursa de adevăr).
  const balances: Record<string, number> = {};
  for (const station of stations ?? []) {
    const { data } = await service.rpc('credit_ledger_balance' as never, {
      p_station_id: station.id,
    } as never);
    balances[station.id] = (data as number) ?? 0;
  }

  return NextResponse.json({
    stations: (stations ?? []).map((s) => ({ ...s, balance: balances[s.id] ?? 0 })),
    purchases: purchases ?? [],
    ledger: ledger ?? [],
  });
}

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('reconcile') }),
  z.object({
    action: z.literal('adjust'),
    station_id: z.string().uuid(),
    delta: z.number().int().refine((n) => n !== 0, 'Delta nu poate fi zero'),
    descriere: z.string().min(5, 'Scrie motivul ajustării (minim 5 caractere)').max(300),
  }),
]);

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = actionSchema.parse(await req.json());

    if (body.action === 'reconcile') {
      const result = await reconcileGumroadSales();
      return NextResponse.json(result, { status: result.ok ? 200 : 502 });
    }

    // adjust: fiecare ajustare e o linie nouă, unică (timestamp în referință),
    // cu adminul și motivul în descriere — istoric complet, nimic editabil.
    const result = await appendLedger({
      stationId: body.station_id,
      delta: body.delta,
      motiv: 'adjust_admin',
      referinta: `admin:${auth.userId}:${Date.now()}`,
      descriere: `${body.delta > 0 ? '+' : ''}${body.delta} credite · ajustare admin: ${body.descriere}`,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error === 'insufficient_credits' ? 'Soldul nu poate deveni negativ' : result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, balance: result.balance });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? 'Date invalide' }, { status: 400 });
    }
    console.error('[Admin credits] error:', error);
    return NextResponse.json({ error: 'Eroare internă' }, { status: 500 });
  }
}
