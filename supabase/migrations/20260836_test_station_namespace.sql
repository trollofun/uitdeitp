-- Spațiul rezervat stațiilor de test, apărat de bază, nu doar de aplicație.
--
-- Contextul: staging-ul Academy și Preview-ul nostru folosesc amândouă baza de
-- producție (verificat: pe Vercel, NEXT_PUBLIC_SUPABASE_URL are aceeași valoare
-- pentru Production, Preview și Development). Deci un claim de test creează o
-- stație reală. Convenția — coduri RAR care încep cu ZZ — e verificată la ușă
-- în `src/lib/partner/test-namespace.ts`, dar ruta de provisionare nu e singura
-- cale de scriere: rămân panoul de admin și SQL-ul manual.
--
-- Constrângerea de mai jos ține partea care chiar contează pentru un vizitator:
-- o stație de test nu ajunge niciodată în directorul public. Restul diferențelor
-- (fără SMS, fără programări) sunt deja implicite prin `booking_enabled = false`
-- și `review_sms_enabled = false`, plus lista albă `SMS_ALLOWLIST` din mediu.

ALTER TABLE public.kiosk_stations
  DROP CONSTRAINT IF EXISTS kiosk_stations_test_never_public;

ALTER TABLE public.kiosk_stations
  ADD CONSTRAINT kiosk_stations_test_never_public
  CHECK (public_listed = false OR rar_code IS NULL OR rar_code NOT LIKE 'ZZ%');

COMMENT ON CONSTRAINT kiosk_stations_test_never_public ON public.kiosk_stations IS
  'Prefixul ZZ e rezervat statiilor de test din ecosistem. ZZ nu e abreviere de judet, deci nu se poate ciocni cu un cod RAR real. O statie de test nu are ce cauta in directorul public.';

-- Curățenia de după testele de ecosistem, ca să existe într-un singur loc și să
-- fie evidentă. Nu se apelează automat: ștergerea rămâne o decizie umană.
--
-- Ordinea respectă cheile străine, iar `notification_log` intră prin remindere:
-- fără pasul ăsta ștergerea eșuează pe o stație care chiar a trimis ceva.
CREATE OR REPLACE FUNCTION public.purge_test_stations()
RETURNS TABLE(statii_sterse integer, remindere_sterse integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_station_ids uuid[];
  v_reminders integer := 0;
  v_stations integer := 0;
BEGIN
  SELECT array_agg(id) INTO v_station_ids
  FROM kiosk_stations
  WHERE rar_code LIKE 'ZZ%';

  IF v_station_ids IS NULL THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;

  DELETE FROM notification_log
  WHERE reminder_id IN (SELECT id FROM reminders WHERE station_id = ANY(v_station_ids));

  WITH sterse AS (
    DELETE FROM reminders WHERE station_id = ANY(v_station_ids) RETURNING 1
  )
  SELECT count(*) INTO v_reminders FROM sterse;

  DELETE FROM station_members WHERE station_id = ANY(v_station_ids);

  WITH sterse AS (
    DELETE FROM kiosk_stations WHERE id = ANY(v_station_ids) RETURNING 1
  )
  SELECT count(*) INTO v_stations FROM sterse;

  RETURN QUERY SELECT v_stations, v_reminders;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_test_stations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_test_stations() FROM anon, authenticated;

COMMENT ON FUNCTION public.purge_test_stations() IS
  'Sterge tot ce tine de statiile din spatiul de test (cod RAR ZZ*). Doar service_role: nu e o operatie pe care un utilizator logat sa o poata declansa.';
