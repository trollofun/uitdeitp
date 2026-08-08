/**
 * Testele care au nevoie de un backend viu.
 *
 * O parte din suită presupune o bază Supabase reală și un server HTTP: creează
 * utilizatori, scrie zeci de rânduri, verifică politici RLS, apelează
 * endpoint-uri. Fără ele, nu „pică" — pur și simplu **nu pot rula**. Diferența
 * contează: 120 de teste roșii permanent înseamnă că nimeni nu se mai uită la
 * suită, deci un eșec adevărat trece neobservat.
 *
 * Nu le pornim implicit împotriva producției, pentru un motiv concret: aceleași
 * fișiere folosesc `SUPABASE_SERVICE_ROLE_KEY` (ocolește RLS), iar
 * `notification-flow/integration/cron-endpoint` face `POST` pe
 * `/api/cron/process-reminders` cu `CRON_SECRET`. Cu `.env.local` încărcat,
 * `npm test` putea declanșa cronul real de remindere.
 *
 * Ca să le rulezi, pornește un backend de test și cere-o explicit:
 *
 *   TEST_LIVE_BACKEND=1 npm test
 *
 * Fără variabila asta, `tests/setup.ts` înlocuiește oricum cheile cu unele
 * false, deci nu se poate atinge nimic real nici din greșeală.
 */

import { describe } from 'vitest';

export const hasLiveBackend = process.env.TEST_LIVE_BACKEND === '1';

/**
 * `describe` care sare tot blocul când nu există un backend de test.
 * Se folosește exact ca `describe`.
 */
export const describeWithBackend: typeof describe.skip = hasLiveBackend
  ? describe
  : describe.skip;
