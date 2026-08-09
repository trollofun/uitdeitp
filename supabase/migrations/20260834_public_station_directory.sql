-- Directorul public de stații: `/statii`.
--
-- Reperul din piață: itpbooking are produsul dar **3 stații** — distribuția e
-- problema lui. programare-itp are 82 de pagini SEO și butoanele fără `href` —
-- distribuție fără produs. Nimeni n-are ambele jumătăți; noi avem deja
-- jumătatea funcțională (`/programare/<slug>`, sloturi reale, rezervare atomică).
--
-- Avertismentul rămâne scris aici, nu doar spus: valoarea vine din SEO, care
-- cere luni și conținut. Cu o singură stație listată, pagina e o investiție în
-- viitor, nu o sursă de clienți azi.

ALTER TABLE public.kiosk_stations
  /**
   * **Opt-in, implicit oprit.** O stație nu ajunge într-un director public
   * fiindcă și-a făcut cont: apariția publică e o decizie comercială a
   * patronului, iar adresa și programul devin date pe care le garantăm noi.
   */
  ADD COLUMN IF NOT EXISTS public_listed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS city text,
  /** Codul de județ, ex. `CT`. Aceeași listă ca la plăcuțe (`ROMANIAN_COUNTIES`). */
  ADD COLUMN IF NOT EXISTS county_code text,
  ADD COLUMN IF NOT EXISTS latitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6),
  /** Ce categorii deservește și cât costă: [{"label":"Autoturism","price_lei":120}] */
  ADD COLUMN IF NOT EXISTS pricing jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS public_description text;

ALTER TABLE public.kiosk_stations
  DROP CONSTRAINT IF EXISTS kiosk_stations_county_code_check;
ALTER TABLE public.kiosk_stations
  ADD CONSTRAINT kiosk_stations_county_code_check
  CHECK (county_code IS NULL OR county_code ~ '^[A-Z]{1,2}$');

-- Listarea publică cere minimul care face pagina utilă. Fără el, un vizitator
-- ajunge pe o fișă fără adresă și fără telefon — mai rău decât nicio fișă.
ALTER TABLE public.kiosk_stations
  DROP CONSTRAINT IF EXISTS kiosk_stations_public_listing_complete;
ALTER TABLE public.kiosk_stations
  ADD CONSTRAINT kiosk_stations_public_listing_complete
  CHECK (
    public_listed = false
    OR (city IS NOT NULL AND county_code IS NOT NULL AND station_address IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS kiosk_stations_public_idx
  ON public.kiosk_stations (county_code, city)
  WHERE public_listed = true AND is_active = true;

COMMENT ON COLUMN public.kiosk_stations.public_listed IS
  'Opt-in. Aparitia in directorul public e decizie comerciala a patronului, nu efect al crearii contului.';
COMMENT ON CONSTRAINT kiosk_stations_public_listing_complete ON public.kiosk_stations IS
  'O fisa publica fara adresa si oras e mai rea decat nicio fisa.';
