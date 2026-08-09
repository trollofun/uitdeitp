/**
 * POST /api/webhooks/notifyhub — raportul de livrare (DLR) redirecționat de
 * NotifyHub din outbox-ul lor durabil (F3.3 la ei).
 *
 * Fără ruta asta, notification_log rămâne blocat pe 'sent' pentru totdeauna:
 * providerul confirmă livrarea către NotifyHub, dar confirmarea nu are unde
 * să ajungă la noi, iar dashboard-ul arată „trimis" în loc de „livrat".
 *
 * Fail-closed ca la gumroad: fără secret configurat → 503, fără semnătură
 * validă → 401. Semnătura e HMAC-SHA256 peste `<timestamp>.<corp brut>` cu
 * secretul partajat (la ei: CALLBACK_SIGNING_SECRET; la noi:
 * NOTIFYHUB_CALLBACK_SECRET — aceeași valoare în ambele deploy-uri).
 *
 * Semantica răspunsurilor e dictată de outbox-ul lor: non-2xx = reîncearcă
 * cu backoff (limitat de max_attempts, fără să blocheze restul cozii). De
 * aici două decizii:
 *  - mesaj negăsit → 404: un DLR poate lua-o înaintea insert-ului nostru din
 *    logSms (scriem rândul abia după ce răspunde /api/send); reîncercarea
 *    lor vindecă exact cursa asta.
 *  - status necunoscut → 200: reîncercarea nu-l face cunoscut, deci ar fi
 *    doar zgomot în outbox-ul lor. Se loghează și atât.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  applyDlr,
  verifyNotifyHubSignature,
  type DlrClient,
  type DlrPayload,
} from '@/lib/services/notifyhub-dlr';

export const dynamic = 'force-dynamic';

/**
 * Obligatoriu pentru orice rută care scrie prin supabase-js: Data Cache-ul
 * din Next.js memorează apelurile `fetch` (aceeași adresă, același corp),
 * deci al doilea callback identic ar primi răspunsul din cache și UPDATE-ul
 * n-ar mai ajunge niciodată la bază. Vezi povestea completă în src/app/r/route.ts.
 */
export const fetchCache = 'force-no-store';

export async function POST(req: Request) {
  const secret = process.env.NOTIFYHUB_CALLBACK_SECRET?.trim();
  if (!secret) {
    // 503, nu 401: e o problemă de configurare la noi, nu o cerere rea —
    // iar outbox-ul lor va reîncerca după ce setăm variabila.
    return NextResponse.json({ error: 'callback_secret_not_configured' }, { status: 503 });
  }

  // Corpul BRUT, nu re-serializat: semnătura s-a calculat peste octeții
  // exacți trimiși, iar JSON.stringify(JSON.parse(x)) nu garantează aceiași
  // octeți.
  const body = await req.text();

  const check = verifyNotifyHubSignature({
    secret,
    body,
    timestamp: req.headers.get('x-notifyhub-timestamp'),
    signature: req.headers.get('x-notifyhub-signature'),
  });

  if (!check.ok) {
    console.warn('[NotifyHub DLR] semnătură respinsă:', check.reason);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let payload: DlrPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // Azi trimit doar 'dlr'; un tip nou de eveniment nu trebuie să producă
  // 404/500 la ei — confirmăm primirea și mergem mai departe.
  const event = payload.event ?? req.headers.get('x-notifyhub-event');
  if (event !== 'dlr') {
    console.warn('[NotifyHub DLR] eveniment ignorat:', event);
    return NextResponse.json({ received: true, ignored: 'unknown_event' }, { status: 200 });
  }

  if (typeof payload.messageId !== 'string' || !payload.messageId) {
    return NextResponse.json({ error: 'missing_message_id' }, { status: 400 });
  }

  try {
    // Cast-ul e doar o îngustare: clientul real acoperă interfața minimă,
    // dar tipurile generate din database.types.ts au rămas în urma
    // migrărilor (vezi comentariul de pe DlrClient).
    const result = await applyDlr(createAdminClient() as unknown as DlrClient, payload);

    switch (result.outcome) {
      case 'unknown_status':
        console.warn('[NotifyHub DLR] status necunoscut, ignorat:', {
          messageId: payload.messageId,
          status: result.status,
        });
        return NextResponse.json({ received: true, ignored: 'unknown_status' }, { status: 200 });

      case 'not_found':
        return NextResponse.json({ error: 'message_not_found' }, { status: 404 });

      default:
        return NextResponse.json(
          { received: true, updated: result.outcome === 'updated' },
          { status: 200 }
        );
    }
  } catch (error) {
    // 500 e corect aici: o eroare de bază e tranzitorie, iar reîncercarea
    // lor cu backoff e exact mecanismul de recuperare prevăzut de contract.
    console.error('[NotifyHub DLR] eroare la aplicare:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
