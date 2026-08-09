-- Rezervarea unui slot, atomic.
--
-- Capacitatea nu se poate impune printr-un index unic: `slot_capacity` e
-- configurabil per stație, iar un index nu știe să numere până la N. Deci
-- verificarea și inserarea trebuie să fie o singură operație indivizibilă —
-- altfel doi oameni care apasă în aceeași secundă citesc amândoi „mai e loc" și
-- scriu amândoi. La un slot de capacitate 1, al doilea client se prezintă
-- degeaba.
--
-- Blocare consultativă pe (stație, slot), nu pe stație: două persoane care
-- rezervă ore diferite n-au de ce să se aștepte una pe alta. `hashtextextended`
-- peste cheia slotului dă bigint-ul cerut de `pg_advisory_xact_lock`, iar
-- blocarea se eliberează singură la finalul tranzacției — inclusiv la eroare.

CREATE OR REPLACE FUNCTION public.book_appointment(
  p_station_id uuid,
  p_starts_at timestamptz,
  p_local_date date,
  p_slot_minutes integer,
  p_customer_phone text,
  p_customer_name text DEFAULT NULL,
  p_plate_number text DEFAULT NULL,
  p_source text DEFAULT 'public',
  p_reminder_id uuid DEFAULT NULL
)
RETURNS TABLE (appointment_id uuid, token text, error_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity integer;
  v_taken integer;
  v_id uuid;
  v_token text;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_station_id::text || '|' || p_starts_at::text, 0)
  );

  SELECT slot_capacity INTO v_capacity
  FROM kiosk_stations
  WHERE id = p_station_id AND booking_enabled = true AND is_active = true;

  IF v_capacity IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 'booking_disabled'::text;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_taken
  FROM appointments
  WHERE station_id = p_station_id
    AND starts_at = p_starts_at
    AND status = 'booked';

  IF v_taken >= v_capacity THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 'slot_full'::text;
    RETURN;
  END IF;

  BEGIN
    INSERT INTO appointments (
      station_id, starts_at, local_date, slot_minutes,
      customer_phone, customer_name, plate_number, source, reminder_id
    ) VALUES (
      p_station_id, p_starts_at, p_local_date, p_slot_minutes,
      p_customer_phone, p_customer_name, p_plate_number, p_source, p_reminder_id
    )
    RETURNING id, appointments.token INTO v_id, v_token;
  EXCEPTION WHEN unique_violation THEN
    -- Indexul `appointments_one_active_per_phone`. Nu e o eroare de sistem: e
    -- cineva care are deja o programare activă la stația asta, cel mai adesea
    -- fiindcă a apăsat de două ori.
    RETURN QUERY SELECT NULL::uuid, NULL::text, 'already_booked'::text;
    RETURN;
  END;

  RETURN QUERY SELECT v_id, v_token, NULL::text;
END;
$$;

-- Doar service_role: rezervarea trece prin rută, care aplică rate-limit,
-- Turnstile și validarea telefonului. O cale directă din browser le-ar ocoli.
REVOKE ALL ON FUNCTION public.book_appointment FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_appointment TO service_role;

COMMENT ON FUNCTION public.book_appointment IS
  'Rezervare atomica: blocare consultativa pe (statie, slot), verificare de capacitate si insert intr-o singura tranzactie.';
