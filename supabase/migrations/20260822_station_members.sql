-- ============================================================================
-- 20260822_station_members.sql  (APLICATĂ)
--
-- Apartenența la stație + rolul de inspector.
--
-- De ce apartenență și nu doar un rol: accesul la o stație vine azi din
-- kiosk_stations.owner_id, o singură coloană. Un al doilea om cu rol nou ar
-- avea rolul dar nicio stație. Forma tabelei o copiază deliberat pe cea din
-- Academy (station_members cu role inspector/patron), ca trecerea la
-- apartenență partajată prin rar_code să fie ulterior un import, nu o
-- rescriere.
--
-- ATENȚIE: ALTER TYPE ... ADD VALUE nu poate fi folosit în aceeași tranzacție
-- cu utilizarea valorii, de aceea rulează într-o migrare separată de cea care
-- scrie rânduri cu 'inspector'.
-- ============================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'inspector';

CREATE TABLE IF NOT EXISTS public.station_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.kiosk_stations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('inspector', 'patron')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'left')),
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE (station_id, user_id)
);

COMMENT ON TABLE public.station_members IS
  'Cine lucrează la o stație. Aceeași formă ca station_members din Academy, ca legarea prin rar_code să fie ulterior un import.';

CREATE INDEX IF NOT EXISTS idx_station_members_user
  ON public.station_members(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_station_members_station
  ON public.station_members(station_id) WHERE status = 'active';

ALTER TABLE public.station_members ENABLE ROW LEVEL SECURITY;

-- Fiecare își vede propria apartenență. Scrierile trec exclusiv prin
-- service_role (rutele de admin), niciodată din browser.
DROP POLICY IF EXISTS "Members see own membership" ON public.station_members;
CREATE POLICY "Members see own membership" ON public.station_members
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages membership" ON public.station_members;
CREATE POLICY "Service role manages membership" ON public.station_members
  FOR ALL USING (auth.role() = 'service_role');

REVOKE INSERT, UPDATE, DELETE ON public.station_members FROM anon, authenticated;
GRANT SELECT ON public.station_members TO authenticated;

-- DELIBERAT: nicio politică nouă pe `reminders`.
-- RLS filtrează rânduri, nu coloane, deci nu poate ascunde guest_phone de un
-- inspector. Inspectorul nu primește deci NICIUN acces direct la tabelă —
-- clientul lui de browser vede zero rânduri — iar tot ce poate face trece
-- prin rute dedicate care nu selectează niciodată coloanele de contact.
