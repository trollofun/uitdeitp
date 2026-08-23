# Runbook: politica anti-oboseală a notificărilor

Decisă de owner pe 23.08.2026, după auditul complet al presiunii de mesaje.
Principiu: **informația nu e spam; repetiția este.**

## Politica

| Regulă | Valoare | Unde e implementată |
|---|---|---|
| Aceeași mașină + același expeditor | max 1 SMS/zi | chei de idempotență pe zi: cron `${reminder.id}:${azi}`, buton stație `station-manual:${id}:${azi}`, manual `manual:${id}:${azi}`, bulk `bulk:${id}:${azi}` |
| Mașini diferite, același client | TOATE se trimit, oricând scadente | decizie de produs — fără combinare, fără eșalonare |
| Plasă anti-defect per telefon | max 10 SMS/zi (env `RECIPIENT_SMS_DAILY_CAP`) | `src/lib/services/notifyhub.ts` — punctul unic de ieșire; log-only până la `ENFORCE_RATE_LIMIT` |
| Intervale de notificare | max 3 per reminder | `src/lib/validation/index.ts` (aliniat cu promisiunea publică de pe homepage) |
| Fair-use email | max 10/lună per adresă | `reminder-processor.ts` (email-ul e gratuit, nu nelimitat) |
| Cereri de recenzie | max 1 / 6 luni per telefon | `review-processor.ts` (preexistent) |
| Ton | fără ATENTIE/URGENT în majuscule | `DEFAULT_SMS_TEMPLATES` |
| Dezabonare | link obligatoriu în orice șablon SMS (validare la salvare); link real în email | `stations/[id]` schema; `email.ts` |

## Excepții tranzacționale (exceptate de la plasă, NU de la idempotență)

`otp`, `booking_confirmation`, `test` — mesaje cerute de client chiar atunci.
Confirmarea de programare nu verifică opt-out-ul: clientul tocmai a cerut-o.

## Comportament la plafon

- Plasa (log-only): `[RecipientCap] would_block` în loguri, mesajul pleacă.
- Plasa (enforce): răspuns local `RECIPIENT_DAILY_CAP` (429) fără apel de rețea; apelanții nu avansează programarea → reminderul se reia natural a doua zi.

## Cum se măsoară

- `/admin/notifications` → „Top destinatari (30 zile)" — semnalul timpuriu.
- SQL: `SELECT recipient, COUNT(*) FROM notification_log WHERE sent_at > now() - interval '30 days' AND status IN ('sent','delivered') GROUP BY 1 ORDER BY 2 DESC;`
- Precondiția (reparată la audit): TOATE căile scriu `recipient` — cronul trece prin `logSms` (care face și tarifarea ledger, alt bug reparat în trecere).

## Cazul multi-tenant (asumat)

Același client la stația X și la contul profesional Y primește mesaje de la ambii expeditori — sunt operatori de date diferiți, cu branduri diferite (efect asumat în F1.3). Plasa de 10/zi îl acoperă doar la extreme. Politica comercială a „proprietății" clientului rămâne decizie separată.

## Datorii cunoscute

- Quiet-hours per user e practic mort (se aplică doar userilor înregistrați, cu default care nu se activează la ora cronului — 10:00 vara). Ora de trimitere 10:00 e decentă; de revizuit doar dacă apare un al doilea cron.
- `blocked_reason` dedicat pentru plafonul de destinatar (azi reluarea e implicită, nu etichetată).
