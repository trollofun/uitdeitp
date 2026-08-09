-- F3.1 `service_visits` — dosarul mașinii, și baza raportului de retenție.
--
-- Până acum, o inspecție care venea prin Contract A actualiza un rând de
-- reminder și atât. Datele tehnice trimise de SIRAR (revizia 3: `masuratori`,
-- `obfcm`, `diagnoza`, `vehicul_extins`) ajungeau la handler prin
-- `.passthrough()` și se pierdeau acolo — nimeni nu le scria nicăieri.
--
-- Tabela asta e locul lor, și e locul VIN-ului. Motivul e mai important decât
-- pare: azi nu putem răspunde la întrebarea care interesează cel mai mult o
-- stație — *câți clienți nu s-au mai întors?* `inspected_at` e populat 12 din
-- 149 și numai prin Contract A; `superseded_by` e 7 din 149 și, sub scope
-- global, o revenire la ALTĂ stație marchează supersede la noi, deci e fals
-- pozitiv. Orice raport de retenție construit pe ele minte.
--
-- O vizită e un fapt istoric: se adaugă, nu se modifică. De aceea nu are
-- `updated_at` și nici ștergere logică — ștergerea unei vizite ar rescrie
-- istoria unei mașini.

CREATE TABLE IF NOT EXISTS public.service_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES public.kiosk_stations(id) ON DELETE CASCADE,

  -- Reminderul care a generat vizita, când există. `SET NULL`, nu `CASCADE`:
  -- dacă un client își exercită dreptul la ștergere, dispare legătura cu
  -- persoana, nu faptul că mașina a trecut pe aici.
  reminder_id uuid REFERENCES public.reminders(id) ON DELETE SET NULL,

  -- Identificarea vehiculului. Placa e mereu prezentă; VIN-ul doar când sursa
  -- îl trimite și doar când există consimțământ (vezi nota de mai jos).
  plate_number text NOT NULL,
  vin text,
  serie_civ text,

  visited_at date NOT NULL,
  result text CHECK (result IS NULL OR result IN ('passed', 'rejected')),
  expires_at date,
  certificate_series text,
  odometer_km integer CHECK (odometer_km IS NULL OR odometer_km >= 0),

  -- Blocurile tehnice, așa cum vin. Le păstrăm întregi în loc să le desfacem în
  -- coloane: SIRAR adaugă câmpuri la fiecare revizie, iar o schemă rigidă ar
  -- însemna o migrare la fiecare. Ce ne trebuie indexat, extragem în coloane.
  technical jsonb NOT NULL DEFAULT '{}'::jsonb,

  /**
   * De unde știm de vizită: `contract_a` (SIRAR), `kiosk`, `import`, `manual`.
   */
  source text NOT NULL DEFAULT 'contract_a',
  external_ref text,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Aceeași inspecție nu se înregistrează de două ori. `external_ref` e
-- `id_eveniment` de la SIRAR, care e și cheia lor de idempotență.
CREATE UNIQUE INDEX IF NOT EXISTS service_visits_external_ref_key
  ON public.service_visits (station_id, external_ref)
  WHERE external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS service_visits_station_visited_idx
  ON public.service_visits (station_id, visited_at DESC);

-- Căutarea după mașină, pentru dosarul ei și pentru raportul de retenție.
CREATE INDEX IF NOT EXISTS service_visits_plate_idx
  ON public.service_visits (plate_number, visited_at DESC);

CREATE INDEX IF NOT EXISTS service_visits_vin_idx
  ON public.service_visits (vin)
  WHERE vin IS NOT NULL;

ALTER TABLE public.service_visits ENABLE ROW LEVEL SECURITY;

-- Patronul își vede vizitele. Inspectorul **nu** primește politică aici, la fel
-- ca pe `reminders`: RLS filtrează rânduri, nu coloane, iar o vizită conține
-- `reminder_id`, deci ar deschide o punte către datele de contact.
CREATE POLICY "Station owners see own visits" ON public.service_visits
  FOR SELECT TO authenticated
  USING (station_id IN (SELECT id FROM public.kiosk_stations WHERE owner_id = auth.uid()));

COMMENT ON TABLE public.service_visits IS
  'Istoricul inspectiilor per statie. Fapt istoric: se adauga, nu se modifica.';
COMMENT ON COLUMN public.service_visits.vin IS
  'Numai cand sursa il trimite SI exista consimtamant. E data personala cand e legabil de o persoana, iar aici e.';
COMMENT ON COLUMN public.service_visits.technical IS
  'Blocurile tehnice SIRAR (masuratori, obfcm, diagnoza, vehicul_extins) asa cum vin.';
