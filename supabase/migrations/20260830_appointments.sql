-- F-PROG: programări cu sloturi reale.
--
-- Nu exista absolut nimic: zero tabele, zero rute, zero componente. Iar
-- `kiosk_stations` (39 de coloane) n-avea niciuna din cele necesare — nici
-- program, nici durată de slot, nici capacitate.
--
-- Reperul din piață: ITPManager și Inspecto au sloturi reale; itpbooking are
-- pagină publică funcțională dar trei stații; programare-itp are 82 de pagini
-- și butoanele fără `href`. Nimeni nu livrează pâlnia completă la scară — iar
-- pâlnia e chiar avantajul nostru: SMS-ul de expirare duce direct la programare.

-- 1. Programul stației -------------------------------------------------------
--
-- Orele se țin ca `time`, nu ca text: baza le validează și le poate compara.
-- Programul săptămânal stă în `jsonb` fiindcă e o structură cu șapte chei pe
-- care n-o interogăm niciodată pe bucăți — o desfacere în șapte perechi de
-- coloane ar fi fost rigidă fără să câștige nimic.
ALTER TABLE public.kiosk_stations
  ADD COLUMN IF NOT EXISTS booking_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slot_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS slot_capacity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS booking_horizon_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS booking_lead_minutes integer NOT NULL DEFAULT 60,
  /**
   * {"1": [["08:00","16:00"]], …, "7": []} — cheia e ziua ISO (1 = luni).
   * Mai multe intervale pe zi acoperă pauza de prânz fără o coloană separată.
   */
  ADD COLUMN IF NOT EXISTS working_hours jsonb NOT NULL DEFAULT
    '{"1":[["08:00","16:00"]],"2":[["08:00","16:00"]],"3":[["08:00","16:00"]],"4":[["08:00","16:00"]],"5":[["08:00","16:00"]],"6":[],"7":[]}'::jsonb,
  /** Zile în care stația e închisă: sărbători, concediu, revizie. */
  ADD COLUMN IF NOT EXISTS closed_dates jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.kiosk_stations
  DROP CONSTRAINT IF EXISTS kiosk_stations_slot_minutes_check;
ALTER TABLE public.kiosk_stations
  ADD CONSTRAINT kiosk_stations_slot_minutes_check
  CHECK (slot_minutes BETWEEN 10 AND 240 AND slot_capacity BETWEEN 1 AND 20);

-- 2. Programările ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES public.kiosk_stations(id) ON DELETE CASCADE,

  -- Momentul, în UTC. Sloturile se calculează în ora României și se convertesc
  -- aici: un `timestamptz` e un moment, nu o oră de perete, deci trecerea la ora
  -- de vară nu poate muta o programare existentă.
  starts_at timestamptz NOT NULL,
  slot_minutes integer NOT NULL,

  -- Ziua locală, derivată la scriere. Există ca să putem grupa pe zile fără să
  -- refacem conversia de fus la fiecare interogare de calendar.
  local_date date NOT NULL,

  customer_name text,
  customer_phone text NOT NULL,
  plate_number text,

  status text NOT NULL DEFAULT 'booked'
    CHECK (status IN ('booked', 'cancelled', 'completed', 'no_show')),

  /** `public` = pagina de programare, `station` = adăugată de stație. */
  source text NOT NULL DEFAULT 'public',
  note text,

  -- Token opac pentru anulare din SMS. Aleatoriu, nederivat din telefon —
  -- aceeași regulă ca la linkul de recenzie.
  token text NOT NULL DEFAULT replace(replace(encode(gen_random_bytes(9), 'base64'), '/', '_'), '+', '-'),

  reminder_id uuid REFERENCES public.reminders(id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS appointments_token_key ON public.appointments (token);

CREATE INDEX IF NOT EXISTS appointments_station_day_idx
  ON public.appointments (station_id, local_date)
  WHERE status = 'booked';

-- Capacitatea NU se poate impune printr-un index unic: `slot_capacity` e
-- configurabil per stație, iar un index nu poate număra până la N. Se impune în
-- RPC-ul de rezervare, sub blocare pe rând — vezi `book_appointment`.
CREATE INDEX IF NOT EXISTS appointments_slot_idx
  ON public.appointments (station_id, starts_at)
  WHERE status = 'booked';

-- Același telefon nu poate ține două programări active la aceeași stație.
-- Ăsta se poate impune cu index, și e apărarea împotriva cuiva care apasă de
-- două ori pe buton.
CREATE UNIQUE INDEX IF NOT EXISTS appointments_one_active_per_phone
  ON public.appointments (station_id, customer_phone)
  WHERE status = 'booked';

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Patronul își vede programările. Inspectorul are nevoie de ele ca să lucreze,
-- dar programarea conține telefonul clientului — deci accesul lui trece prin
-- server, cu coloane filtrate, ca la `reminders`. Nicio politică pentru el aici.
CREATE POLICY "Station owners see own appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (station_id IN (SELECT id FROM public.kiosk_stations WHERE owner_id = auth.uid()));

COMMENT ON TABLE public.appointments IS
  'Programari. Capacitatea se impune in book_appointment, nu prin index: slot_capacity e per statie.';
COMMENT ON COLUMN public.appointments.local_date IS
  'Ziua in ora Romaniei, derivata la scriere. Grupare pe zile fara conversie de fus la fiecare citire.';
