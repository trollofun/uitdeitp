-- F1.3: indexul unic pe remindere trece de la global la per stație.
--
-- APLICAT PE PRODUCȚIE 2026-08-09. Fișierul consemnează ce s-a executat, ca un
-- mediu nou să reproducă aceeași stare. Conținutul e cel din
-- `prepared/F1.3/02_migration.sql`, rulat instrucțiune cu instrucțiune —
-- `CONCURRENTLY` nu poate rula într-o tranzacție.
--
-- CE REPARĂ. Indexul global `(guest_phone, plate_number)` însemna „ultima
-- stație fură clientul": când un șofer mergea la altă stație, rândul nostru
-- primea `deleted_at`. Iar filtrul `.is('deleted_at', null)` din raportul de
-- retenție îl făcea **invizibil** — clientul pierdut dispărea din exact lista
-- care ar fi trebuit să-l scoată la iveală. Fals negativ, nu fals pozitiv.
--
-- ORDINEA, care contează: SQL întâi, flag după.
--   Flag înainte de SQL = stricat: lookup-ul filtrat pe stația proprie nu mai
--   vede rândul stației A, deci nu-l șterge soft, deci INSERT-ul stației B
--   lovește indexul global încă viu → 23505 → 409 pentru un client nevinovat.
--   SQL înainte de flag = sigur pe termen nelimitat: aplicația în modul
--   `global` șterge soft toate potrivirile, iar indexul per stație e mai
--   permisiv decât comportamentul ei.
--
-- Verificat chiar înainte de fereastră: 133 remindere active, 94 guest, 1 fără
-- stație, **0 grupuri care ar viola** noua cheie — deci fără curățare de date.
--
-- EFECT VIZIBIL, asumat: un șofer înscris la două stații primește de acum două
-- SMS-uri per interval, cu credite consumate la ambele. E chiar scopul F1.3 —
-- fiecare stație își păstrează clientul.
--
-- Rollback: `prepared/F1.3/03_rollback.sql`, în ordine inversă (flag întâi).

DO $$
DECLARE v_dupes INT;
BEGIN
  SELECT COUNT(*) INTO v_dupes FROM (
    SELECT 1 FROM public.reminders
     WHERE deleted_at IS NULL AND guest_phone IS NOT NULL
     GROUP BY station_id, guest_phone, plate_number
    HAVING COUNT(*) > 1
  ) d;
  IF v_dupes > 0 THEN
    RAISE EXCEPTION 'ABORT: % grupuri duplicate sub cheia noua.', v_dupes;
  END IF;
END;
$$;

-- Într-un mediu nou (fără trafic) versiunea neconcurentă e suficientă și poate
-- rula în tranzacția migrării. Pe producție s-a folosit `CONCURRENTLY`.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_station_guest_reminders
  ON public.reminders (station_id, guest_phone, plate_number)
  WHERE deleted_at IS NULL AND guest_phone IS NOT NULL AND station_id IS NOT NULL;

-- NULL-urile sunt distincte într-un index unic, deci rândurile fără stație au
-- nevoie de propriul index parțial — altfel n-ar fi apărate de nimic.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_guest_no_station
  ON public.reminders (guest_phone, plate_number)
  WHERE deleted_at IS NULL AND guest_phone IS NOT NULL AND station_id IS NULL;

DROP INDEX IF EXISTS public.idx_unique_active_guest_reminders;
