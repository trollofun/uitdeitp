-- ============================================================================
-- Conturi profesionale de inspector (decizia din 23.08).
--
-- Un inspector care își crește propria bază de clienți primește o „stație
-- personală": kind='professional' — fără cod RAR propriu, fără kiosk, fără
-- listare în directorul public, dar cu TOT restul infrastructurii per
-- station_id: clienții lui (cu contacte), creditele lui, șabloanele lui,
-- ingestul SIRAR pe cheia LUI (verificarea rar_code se sare natural: e
-- condiționată de station.rar_code, care aici e NULL — rar-ul din payload e
-- stația angajatorului, unde a lucrat fizic).
--
-- Premisa de confidențialitate rămâne: la stația angajatorului același om e
-- inspector fără acces la contactele clienților STAȚIEI.
--
-- Idempotent, inert până la PROFESSIONAL_ACCOUNTS_ENABLED=true.
-- ============================================================================

ALTER TABLE public.kiosk_stations
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'station'
  CHECK (kind IN ('station', 'professional'));

-- Un cont profesional nu apare niciodată în directorul public: acolo sunt
-- stații ITP unde poți merge, nu persoane.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kiosk_stations_professional_never_public'
  ) THEN
    ALTER TABLE public.kiosk_stations
      ADD CONSTRAINT kiosk_stations_professional_never_public
      CHECK (kind <> 'professional' OR public_listed = false);
  END IF;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE 'professional accounts schema ready (inert until PROFESSIONAL_ACCOUNTS_ENABLED=true)';
END;
$$;
