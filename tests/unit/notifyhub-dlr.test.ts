/**
 * Testele webhook-ului de DLR de la NotifyHub.
 *
 * Semnăturile sunt generate cu exact schema lor (HMAC-SHA256 peste
 * `<timestamp>.<corp brut>`, citită din notify_hub/src/lib/callbacks/outbox.ts),
 * deci un test verde aici înseamnă compatibilitate reală cu ce trimit ei —
 * nu cu o presupunere despre ce trimit.
 *
 * Ruta e testată prin handler-ul POST cu Request-uri construite manual;
 * clientul de bază e fals (mock pe modulul admin), pentru că verificăm
 * logică de tranziție, nu Supabase.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHmac } from 'crypto';
import {
  applyDlr,
  mapDlrStatus,
  verifyNotifyHubSignature,
  type DlrClient,
} from '@/lib/services/notifyhub-dlr';

// ---------------------------------------------------------------------------
// Client Supabase fals: păstrează rândurile în memorie și aplică patch-urile
// cu aceeași semantică compare-and-set pe care o folosește applyDlr.
// ---------------------------------------------------------------------------

interface FakeRow {
  id: string;
  provider_message_id: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  delivered_at?: string | null;
  parts?: number | null;
}

function fakeClient(rows: FakeRow[]) {
  const updates: Array<{ id: string; patch: Record<string, unknown> }> = [];
  const client: DlrClient = {
    from() {
      return {
        select() {
          return {
            eq(_col: string, value: string) {
              return Promise.resolve({
                data: rows.filter((r) => r.provider_message_id === value),
                error: null,
              });
            },
          };
        },
        update(patch: Record<string, unknown>) {
          return {
            eq(_c1: string, id: string) {
              return {
                eq(_c2: string, guardStatus: string) {
                  return {
                    select() {
                      // CAS: patch-ul se aplică doar dacă rândul mai e în
                      // starea citită — exact ce face .eq('status', ...) real
                      const row = rows.find((r) => r.id === id && r.status === guardStatus);
                      if (row) {
                        Object.assign(row, patch);
                        updates.push({ id, patch });
                        return Promise.resolve({ data: [{ id }], error: null });
                      }
                      return Promise.resolve({ data: [], error: null });
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
  return { client, rows, updates };
}

const SECRET = 'test-secret';

function sign(body: string, timestamp = Math.floor(Date.now() / 1000).toString()) {
  const signature = createHmac('sha256', SECRET).update(`${timestamp}.${body}`).digest('hex');
  return { timestamp, signature };
}

function dlrBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    event: 'dlr',
    messageId: 'cal-msg-1',
    provider: 'calisero',
    status: 'delivered',
    idempotency_key: null,
    recipient: '+407****5678',
    parts: 1,
    occurred_at: '2026-08-09T10:00:00.000Z',
    metadata: null,
    ...overrides,
  });
}

function sentRow(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: 'row-1',
    provider_message_id: 'cal-msg-1',
    status: 'sent',
    sent_at: '2026-08-09T09:59:00.000Z',
    error_message: null,
    delivered_at: null,
    parts: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Semnătura
// ---------------------------------------------------------------------------

describe('verifyNotifyHubSignature', () => {
  it('acceptă o semnătură generată cu schema lor exactă', () => {
    const body = dlrBody();
    const { timestamp, signature } = sign(body);
    expect(
      verifyNotifyHubSignature({ secret: SECRET, body, timestamp, signature })
    ).toEqual({ ok: true });
  });

  it('respinge semnătura calculată cu alt secret', () => {
    const body = dlrBody();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac('sha256', 'alt-secret')
      .update(`${timestamp}.${body}`)
      .digest('hex');
    const result = verifyNotifyHubSignature({ secret: SECRET, body, timestamp, signature });
    expect(result).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('respinge un corp modificat după semnare', () => {
    const { timestamp, signature } = sign(dlrBody());
    const tampered = dlrBody({ status: 'failed' });
    const result = verifyNotifyHubSignature({ secret: SECRET, body: tampered, timestamp, signature });
    expect(result.ok).toBe(false);
  });

  it('fail-closed: fără antete → respins, nu acceptat din oficiu', () => {
    expect(
      verifyNotifyHubSignature({ secret: SECRET, body: '{}', timestamp: null, signature: null })
    ).toEqual({ ok: false, reason: 'missing_headers' });
  });

  it('respinge un timestamp mai vechi de 5 minute — anti-replay', () => {
    const body = dlrBody();
    const old = (Math.floor(Date.now() / 1000) - 301).toString();
    const { signature } = sign(body, old);
    const result = verifyNotifyHubSignature({ secret: SECRET, body, timestamp: old, signature });
    expect(result).toEqual({ ok: false, reason: 'timestamp_out_of_range' });
  });

  it('nu aruncă pe semnături cu lungime greșită sau non-hex', () => {
    const body = dlrBody();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    for (const bad of ['deadbeef', 'nu-e-hex!', '']) {
      const result = verifyNotifyHubSignature({ secret: SECRET, body, timestamp, signature: bad });
      expect(result.ok).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Tranzițiile de status
// ---------------------------------------------------------------------------

describe('applyDlr', () => {
  it('sent → delivered: setează delivered_at din occurred_at și parts', async () => {
    const { client, rows } = fakeClient([sentRow()]);
    const result = await applyDlr(client, JSON.parse(dlrBody({ parts: 2 })));

    expect(result).toEqual({ outcome: 'updated', rows: 1 });
    expect(rows[0].status).toBe('delivered');
    expect(rows[0].delivered_at).toBe('2026-08-09T10:00:00.000Z');
    expect(rows[0].parts).toBe(2);
  });

  it('sent → failed: pune un error_message (constrângerea valid_error_message)', async () => {
    const { client, rows } = fakeClient([sentRow()]);
    const result = await applyDlr(client, JSON.parse(dlrBody({ status: 'failed' })));

    expect(result).toEqual({ outcome: 'updated', rows: 1 });
    expect(rows[0].status).toBe('failed');
    expect(rows[0].error_message).toBeTruthy();
  });

  it('failed nu suprascrie motivul de eroare scris la trimitere', async () => {
    const { client, rows } = fakeClient([
      sentRow({ error_message: 'INSUFFICIENT_CREDITS' }),
    ]);
    await applyDlr(client, JSON.parse(dlrBody({ status: 'failed' })));
    expect(rows[0].error_message).toBe('INSUFFICIENT_CREDITS');
  });

  it('idempotent: același callback aplicat de două ori lasă rândul identic', async () => {
    const { client, rows, updates } = fakeClient([sentRow()]);
    const payload = JSON.parse(dlrBody());

    const first = await applyDlr(client, payload);
    const snapshot = JSON.stringify(rows[0]);
    const second = await applyDlr(client, payload);

    expect(first).toEqual({ outcome: 'updated', rows: 1 });
    // A doua livrare nu mai are tranziție de făcut — și nu atinge baza.
    expect(second).toEqual({ outcome: 'unchanged' });
    expect(JSON.stringify(rows[0])).toBe(snapshot);
    expect(updates).toHaveLength(1);
  });

  it("un 'sent' întârziat nu trage înapoi un rând deja 'delivered'", async () => {
    const { client, rows } = fakeClient([
      sentRow({ status: 'delivered', delivered_at: '2026-08-09T10:00:00.000Z' }),
    ]);
    const result = await applyDlr(client, JSON.parse(dlrBody({ status: 'sent' })));

    expect(result).toEqual({ outcome: 'unchanged' });
    expect(rows[0].status).toBe('delivered');
  });

  it('status necunoscut → semnalat, nu aruncat', async () => {
    const { client, updates } = fakeClient([sentRow()]);
    const result = await applyDlr(client, JSON.parse(dlrBody({ status: 'ceva-nou' })));

    expect(result).toEqual({ outcome: 'unknown_status', status: 'ceva-nou' });
    expect(updates).toHaveLength(0);
  });

  it('mesaj inexistent → not_found', async () => {
    const { client } = fakeClient([]);
    const result = await applyDlr(client, JSON.parse(dlrBody()));
    expect(result).toEqual({ outcome: 'not_found' });
  });

  it('occurred_at neparsabil nu blochează livrarea — cade pe „acum"', async () => {
    const { client, rows } = fakeClient([sentRow()]);
    await applyDlr(client, JSON.parse(dlrBody({ occurred_at: 'nu-e-data' })));
    expect(rows[0].status).toBe('delivered');
    expect(rows[0].delivered_at).toBeTruthy();
  });
});

describe('mapDlrStatus', () => {
  it('acceptă exact statusurile din contractul lor', () => {
    expect(mapDlrStatus('sent')).toBe('sent');
    expect(mapDlrStatus('delivered')).toBe('delivered');
    expect(mapDlrStatus('failed')).toBe('failed');
  });

  it('respinge restul — inclusiv `undelivered`, pe care ei îl mapează înainte', () => {
    for (const bad of ['undelivered', 'DELIVERED', '', null, undefined, 3]) {
      expect(mapDlrStatus(bad)).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// Ruta cap-coadă: semnătură → parsare → răspuns HTTP
// ---------------------------------------------------------------------------

const fakeState: { client: DlrClient } = { client: fakeClient([]).client };

vi.mock('@/lib/supabase/admin', () => ({
  // rutele nu au voie să atingă baza reală din teste; clientul fals se
  // schimbă per-test prin fakeState
  createAdminClient: () => fakeState.client,
}));

async function postDlr(body: string, headers: Record<string, string>) {
  const { POST } = await import('@/app/api/webhooks/notifyhub/route');
  const req = new Request('https://www.uitdeitp.ro/api/webhooks/notifyhub', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
  return POST(req);
}

describe('POST /api/webhooks/notifyhub', () => {
  const ORIGINAL = { ...process.env };

  beforeEach(() => {
    process.env.NOTIFYHUB_CALLBACK_SECRET = SECRET;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it('503 când secretul nu e configurat — fail-closed pe configurare', async () => {
    delete process.env.NOTIFYHUB_CALLBACK_SECRET;
    const res = await postDlr(dlrBody(), {});
    expect(res.status).toBe(503);
  });

  it('401 pe semnătură invalidă', async () => {
    const body = dlrBody();
    const { timestamp } = sign(body);
    const res = await postDlr(body, {
      'x-notifyhub-timestamp': timestamp,
      'x-notifyhub-signature': 'a'.repeat(64),
    });
    expect(res.status).toBe(401);
  });

  it('401 pe lipsa antetelor', async () => {
    const res = await postDlr(dlrBody(), {});
    expect(res.status).toBe(401);
  });

  it('200 și update pe un DLR semnat corect', async () => {
    const { client, rows } = fakeClient([sentRow()]);
    fakeState.client = client;

    const body = dlrBody();
    const { timestamp, signature } = sign(body);
    const res = await postDlr(body, {
      'x-notifyhub-timestamp': timestamp,
      'x-notifyhub-signature': signature,
    });

    expect(res.status).toBe(200);
    expect(rows[0].status).toBe('delivered');
  });

  it('404 pe mesaj inexistent — outbox-ul lor reîncearcă și vindecă cursa cu insert-ul nostru', async () => {
    fakeState.client = fakeClient([]).client;
    const body = dlrBody({ messageId: 'nu-exista' });
    const { timestamp, signature } = sign(body);
    const res = await postDlr(body, {
      'x-notifyhub-timestamp': timestamp,
      'x-notifyhub-signature': signature,
    });
    expect(res.status).toBe(404);
  });

  it('200 pe status necunoscut — coada lor nu se blochează din cauza noastră', async () => {
    fakeState.client = fakeClient([sentRow()]).client;
    const body = dlrBody({ status: 'quarantined' });
    const { timestamp, signature } = sign(body);
    const res = await postDlr(body, {
      'x-notifyhub-timestamp': timestamp,
      'x-notifyhub-signature': signature,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, ignored: 'unknown_status' });
  });

  it('400 pe JSON semnat dar neparsabil', async () => {
    const body = 'nu-e-json';
    const { timestamp, signature } = sign(body);
    const res = await postDlr(body, {
      'x-notifyhub-timestamp': timestamp,
      'x-notifyhub-signature': signature,
    });
    expect(res.status).toBe(400);
  });

  it('200 pe un tip de eveniment viitor — confirmat, nu respins', async () => {
    const body = dlrBody({ event: 'balance_low' });
    const { timestamp, signature } = sign(body);
    const res = await postDlr(body, {
      'x-notifyhub-timestamp': timestamp,
      'x-notifyhub-signature': signature,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, ignored: 'unknown_event' });
  });
});
