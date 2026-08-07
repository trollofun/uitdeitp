-- ============================================================================
-- Durable rate limiting (PRD uitdeITP F0.7 + F1.2).
--
-- The existing limiter is an in-memory Map in src/lib/api/middleware.ts, which
-- is per-lambda on Vercel and therefore effectively dead: an attacker hitting
-- the unauthenticated kiosk/OTP endpoints spreads across instances and is
-- never throttled. Each OTP costs real money, so this is a direct cost control.
--
-- One generic mechanism, reused by the anti-pumping work (F0.7) and by the
-- per-key ingest limit of Contract A (F1.2).
--
-- Safe to run on the live database (dnowyodhffqqhmakjupo). Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) Event table (one row per attempt; counted over a sliding window)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id          BIGSERIAL PRIMARY KEY,
  bucket      TEXT        NOT NULL,
  key         TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_lookup
  ON public.rate_limit_events (bucket, key, created_at DESC);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: service_role bypasses RLS, everyone else gets nothing.
REVOKE ALL ON public.rate_limit_events FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.rate_limit_events_id_seq FROM anon, authenticated;
GRANT ALL ON public.rate_limit_events TO service_role;
GRANT ALL ON SEQUENCE public.rate_limit_events_id_seq TO service_role;

-- ----------------------------------------------------------------------------
-- B) check_and_record_rate_limit
--    Always records the attempt. p_enforce = false is the log-only mode:
--    `allowed` stays true while `count` reports what WOULD have been blocked.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_record_rate_limit(
  p_bucket   TEXT,
  p_key      TEXT,
  p_limit    INT,
  p_window   INTERVAL,
  p_enforce  BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count      INT;
  v_oldest     TIMESTAMPTZ;
  v_would_block BOOLEAN;
BEGIN
  SELECT COUNT(*), MIN(created_at)
    INTO v_count, v_oldest
    FROM public.rate_limit_events
   WHERE bucket = p_bucket
     AND key = p_key
     AND created_at > NOW() - p_window;

  v_would_block := v_count >= p_limit;

  -- Record the attempt even when blocked: a hammering client must not get a
  -- free pass once the window's oldest entries expire.
  INSERT INTO public.rate_limit_events (bucket, key) VALUES (p_bucket, p_key);

  RETURN jsonb_build_object(
    'allowed',     NOT (p_enforce AND v_would_block),
    'would_block', v_would_block,
    'count',       v_count + 1,
    'limit',       p_limit,
    'reset_at',    COALESCE(v_oldest, NOW()) + p_window
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_record_rate_limit(TEXT, TEXT, INT, INTERVAL, BOOLEAN)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_record_rate_limit(TEXT, TEXT, INT, INTERVAL, BOOLEAN)
  TO service_role;

-- ----------------------------------------------------------------------------
-- C) Housekeeping (called from the daily cron)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_events()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.rate_limit_events WHERE created_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_rate_limit_events() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limit_events() TO service_role;

-- ----------------------------------------------------------------------------
-- D) Daily OTP cap per station (F0.7): auto-stop when a station's kiosk is
--    being used to pump SMS. Additive columns with safe defaults.
-- ----------------------------------------------------------------------------
ALTER TABLE public.kiosk_stations ADD COLUMN IF NOT EXISTS daily_otp_cap INT DEFAULT 100;
ALTER TABLE public.kiosk_stations ADD COLUMN IF NOT EXISTS otp_auto_stopped_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.check_station_otp_cap(p_station_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap   INT;
  v_count INT;
BEGIN
  SELECT COALESCE(daily_otp_cap, 100) INTO v_cap
    FROM public.kiosk_stations WHERE id = p_station_id;

  IF v_cap IS NULL THEN
    RETURN jsonb_build_object('over_cap', false, 'count', 0, 'cap', NULL);
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.phone_verifications
   WHERE station_id = p_station_id
     AND created_at > NOW() - INTERVAL '24 hours';

  RETURN jsonb_build_object('over_cap', v_count >= v_cap, 'count', v_count, 'cap', v_cap);
END;
$$;

REVOKE ALL ON FUNCTION public.check_station_otp_cap(UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_station_otp_cap(UUID) TO service_role;

DO $$
BEGIN
  RAISE NOTICE 'rate_limit_events + check_and_record_rate_limit + check_station_otp_cap ready (log-only until ENFORCE_RATE_LIMIT=true)';
END;
$$;
