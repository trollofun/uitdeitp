-- ============================================================================
-- Post-inspection review request (PRD uitdeITP F2.5).
--
-- A short SMS a few days after the inspection, with the station's Google
-- review link. It consumes credits like any other SMS.
--
-- STAYS GLOBALLY OFF (REVIEW_SMS_ENABLED=false) until the canonical consent
-- wording is cleared legally; only then does per-station opt-in apply.
--
-- Safe to run on the live database (dnowyodhffqqhmakjupo). Idempotent.
-- ============================================================================

ALTER TABLE public.kiosk_stations ADD COLUMN IF NOT EXISTS review_link TEXT;
ALTER TABLE public.kiosk_stations ADD COLUMN IF NOT EXISTS review_sms_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.kiosk_stations ADD COLUMN IF NOT EXISTS review_delay_days INT DEFAULT 3;
ALTER TABLE public.kiosk_stations ADD COLUMN IF NOT EXISTS sms_template_review TEXT
  DEFAULT 'Mulțumim că ai ales {station_name}! Dacă ești mulțumit, lasă-ne o recenzie: {review_link}';

-- One row per reminder guarantees "one message per client per inspection".
CREATE TABLE IF NOT EXISTS public.review_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id     UUID NOT NULL UNIQUE REFERENCES public.reminders(id) ON DELETE CASCADE,
  station_id      UUID REFERENCES public.kiosk_stations(id) ON DELETE SET NULL,
  phone           TEXT NOT NULL,
  scheduled_for   DATE NOT NULL,
  sent_at         TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'scheduled',
  skip_reason     TEXT,
  consent_version TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_requests_status_check') THEN
    ALTER TABLE public.review_requests
      ADD CONSTRAINT review_requests_status_check
      CHECK (status IN ('scheduled', 'sent', 'skipped', 'failed'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_review_requests_station
  ON public.review_requests (station_id, scheduled_for DESC);

ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Station owners see own review requests" ON public.review_requests;
CREATE POLICY "Station owners see own review requests"
  ON public.review_requests FOR SELECT
  TO authenticated
  USING (station_id IN (SELECT id FROM public.kiosk_stations WHERE owner_id = auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.review_requests FROM anon, authenticated;
GRANT SELECT ON public.review_requests TO authenticated;
GRANT ALL ON public.review_requests TO service_role;

DO $$
BEGIN
  RAISE NOTICE 'Review requests schema ready (globally disabled until legal sign-off)';
END;
$$;
