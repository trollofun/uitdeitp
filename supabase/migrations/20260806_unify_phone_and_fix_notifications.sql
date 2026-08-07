-- ============================================================================
-- Unify kiosk guest reminders with registered users by VERIFIED phone number,
-- close the unverified-phone RLS read hole, and stop the scheduling trigger
-- from clobbering the cron's next_notification_date updates.
--
-- Safe to run on the live database (dnowyodhffqqhmakjupo). Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) Claim function: attaches guest (kiosk) reminders to a user account.
--    Called server-side (service role) right after the user verifies their
--    phone via SMS. Defense in depth: re-checks that the profile really owns
--    this phone and that it is verified.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_guest_reminders(p_user_id UUID, p_phone TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = p_user_id
      AND phone = p_phone
      AND phone_verified = true
  ) THEN
    RETURN 0;
  END IF;

  -- Keep guest_name/guest_phone/station_id/source: station attribution and the
  -- kiosk LIFO dedupe (guest_phone + plate unique index) must keep working.
  UPDATE public.reminders
     SET user_id = p_user_id,
         updated_at = NOW()
   WHERE user_id IS NULL
     AND guest_phone = p_phone
     AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_guest_reminders(UUID, TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_guest_reminders(UUID, TEXT) TO service_role;

-- ----------------------------------------------------------------------------
-- B) Tighten the phone-match SELECT policy: only a VERIFIED profile phone may
--    see unclaimed guest reminders. (Previously any authenticated user could
--    set an arbitrary phone on their profile and read matching kiosk reminders.)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users see own reminders" ON public.reminders;
CREATE POLICY "Users see own reminders"
  ON public.reminders FOR SELECT
  USING (
    deleted_at IS NULL AND (
      auth.uid() = user_id OR
      (user_id IS NULL AND guest_phone IN (
        SELECT phone FROM public.user_profiles
        WHERE id = auth.uid() AND phone_verified = true
      ))
    )
  );

-- ----------------------------------------------------------------------------
-- C) Scope the next_notification_date trigger to the columns that actually
--    define the schedule. As a row-level BEFORE UPDATE on ALL columns it was
--    recomputing next_notification_date on every cron bookkeeping update,
--    causing duplicate notifications on consecutive days and overwriting the
--    processor's quiet-hours / final-NULL scheduling.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  trg RECORD;
  fn_name TEXT;
BEGIN
  SELECT tgname, tgfoid::regproc::text AS fname
    INTO trg
    FROM pg_trigger
   WHERE tgrelid = 'public.reminders'::regclass
     AND NOT tgisinternal
     AND tgname IN ('trg_update_next_notification', 'update_next_notification_date_trigger')
   LIMIT 1;

  IF trg.tgname IS NOT NULL THEN
    fn_name := trg.fname;
    EXECUTE format('DROP TRIGGER %I ON public.reminders', trg.tgname);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF expiry_date, notification_intervals ON public.reminders FOR EACH ROW EXECUTE FUNCTION %s()',
      trg.tgname, fn_name
    );
    RAISE NOTICE 'Rescoped trigger % (function %) to INSERT / UPDATE OF expiry_date, notification_intervals', trg.tgname, fn_name;
  ELSE
    RAISE NOTICE 'No next-notification trigger found on public.reminders — nothing to rescope';
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- D) One phone = one account (prevents ambiguous claims).
--    Run the duplicate check first; the index creation is skipped with a
--    NOTICE instead of failing the whole migration if duplicates exist.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT phone FROM public.user_profiles
    WHERE phone IS NOT NULL
    GROUP BY phone HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'Duplicate phones exist in user_profiles — unique index NOT created. Resolve duplicates, then run: CREATE UNIQUE INDEX idx_user_profiles_phone_unique ON public.user_profiles(phone) WHERE phone IS NOT NULL;';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_phone_unique
      ON public.user_profiles(phone) WHERE phone IS NOT NULL;
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- E) Profile columns the dashboard already writes but the table never had
--    (avatar upload and the manual-location toggle were silently discarded).
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS use_manual_location BOOLEAN DEFAULT false;

-- ----------------------------------------------------------------------------
-- F) One-time backfill: claim guest reminders for users whose phone is
--    ALREADY verified (they verified before this migration existed).
-- ----------------------------------------------------------------------------
UPDATE public.reminders r
   SET user_id = up.id,
       updated_at = NOW()
  FROM public.user_profiles up
 WHERE r.user_id IS NULL
   AND r.deleted_at IS NULL
   AND up.phone_verified = true
   AND up.phone = r.guest_phone;
