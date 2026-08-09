-- Ciclul de viață al stației: ce se întâmplă după claim.
--
-- Contract F rezolvă nașterea unei stații. Restul vieții ei nu era acoperit de
-- nimic: dacă o stație se deconectează în Academy, dacă un abonament expiră,
-- dacă un inspector pleacă — nu aflam. Cheia de ingest rămânea validă la
-- nesfârșit, iar singura cale de a o tăia era ca cineva să intre manual în
-- admin. Adică o stație care nu mai plătește continua să scrie la noi cu o
-- cheie pe care Academy o credea revocată.
--
-- Un singur tabel de evenimente, nu patru endpoint-uri: Academy poate adăuga un
-- tip nou fără să ne ceară o rută nouă, iar idempotența și auditul au un singur
-- loc.

CREATE TABLE IF NOT EXISTS public.partner_station_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Idempotența: `Idempotency-Key` e id-ul evenimentului de la ei. O reluare
  -- după timeout nu are voie să revoce de două ori sau să dea 500.
  idempotency_key text NOT NULL,
  partner_key_id uuid REFERENCES public.partner_api_keys(id) ON DELETE SET NULL,

  event_type text NOT NULL,
  academy_station_id text,
  rar_code text,
  station_id uuid REFERENCES public.kiosk_stations(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- `handled=false` nu e o eroare: un tip pe care nu-l cunoaștem încă primește
  -- 202 și se logează, ca să nu rupem coada lor de evenimente doar fiindcă noi
  -- n-am prins din urmă.
  handled boolean NOT NULL DEFAULT false,
  result jsonb,
  occurred_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS partner_station_events_idem_key
  ON public.partner_station_events (idempotency_key);

CREATE INDEX IF NOT EXISTS partner_station_events_station_idx
  ON public.partner_station_events (station_id, created_at DESC);

ALTER TABLE public.partner_station_events ENABLE ROW LEVEL SECURITY;
-- Fără politici: se scrie și se citește exclusiv cu service_role, din rută.
-- Un partener nu are voie să-și citească propriul jurnal prin API-ul public.

-- Corelarea cu Academy. Le primim la provisionare de la început și le aruncam:
-- `academy_station_id` era validat și nefolosit, `tier` ajungea doar în eticheta
-- cheii. Fără ele, un eveniment de ciclu de viață nu poate găsi stația decât
-- prin `rar_code` — care e tocmai lucrul care se poate schimba.
ALTER TABLE public.kiosk_stations
  ADD COLUMN IF NOT EXISTS academy_station_id text,
  ADD COLUMN IF NOT EXISTS tier text,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivated_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS kiosk_stations_academy_id_key
  ON public.kiosk_stations (academy_station_id)
  WHERE academy_station_id IS NOT NULL;

COMMENT ON COLUMN public.kiosk_stations.academy_station_id IS
  'Corelarea cu Academy. Stabil, spre deosebire de rar_code, care se poate schimba.';
COMMENT ON COLUMN public.kiosk_stations.deactivated_at IS
  'Dezactivata prin eveniment de la Academy. Cheile de ingest se revoca, datele raman.';
