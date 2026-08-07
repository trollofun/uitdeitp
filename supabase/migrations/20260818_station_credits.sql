-- ============================================================================
-- Per-station SMS credits (PRD uitdeITP F2.1).
--
-- The credit ledger itself lives in NotifyHub (that is where the real billed
-- cost and delivery status arrive). uitdeITP stores only the mapping from a
-- station to its NotifyHub key — server-side, never exposed — and the state a
-- reminder ends up in when a send is refused for lack of credit.
--
-- Everything is inert until STATION_CREDITS_ENABLED=true and a station has
-- use_own_notifyhub_key=true.
--
-- Safe to run on the live database (dnowyodhffqqhmakjupo). Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) Station credit configuration.
--    notifyhub_api_key_id is NotifyHub's key identifier (needed for topups);
--    the key VALUE lives in Vault, referenced by notifyhub_key_secret_id.
-- ----------------------------------------------------------------------------
ALTER TABLE public.kiosk_stations ADD COLUMN IF NOT EXISTS notifyhub_api_key_id TEXT;
ALTER TABLE public.kiosk_stations ADD COLUMN IF NOT EXISTS notifyhub_key_secret_id UUID;
ALTER TABLE public.kiosk_stations ADD COLUMN IF NOT EXISTS notifyhub_provisioned_at TIMESTAMPTZ;
ALTER TABLE public.kiosk_stations ADD COLUMN IF NOT EXISTS use_own_notifyhub_key BOOLEAN DEFAULT false;
ALTER TABLE public.kiosk_stations ADD COLUMN IF NOT EXISTS low_credit_threshold INT DEFAULT 50;
ALTER TABLE public.kiosk_stations ADD COLUMN IF NOT EXISTS credits_alert_sent_at TIMESTAMPTZ;

-- ----------------------------------------------------------------------------
-- B) Reminder state when a send is refused for lack of credit.
--    Deliberately NOT a general `status` column: the dashboard already derives
--    a client-side status and a DB column of the same name would collide.
-- ----------------------------------------------------------------------------
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS blocked_retry_count INT DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reminders_blocked_reason_check'
  ) THEN
    ALTER TABLE public.reminders
      ADD CONSTRAINT reminders_blocked_reason_check
      CHECK (blocked_reason IS NULL OR blocked_reason IN ('pending_credits', 'skipped_no_credits'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_reminders_blocked
  ON public.reminders (blocked_reason) WHERE blocked_reason IS NOT NULL;

-- ----------------------------------------------------------------------------
-- C) Local record of purchases. The balance is NOT kept here — NotifyHub's
--    ledger is the source of truth; this is the payment evidence.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id         UUID REFERENCES public.kiosk_stations(id) ON DELETE SET NULL,
  payment_ref        TEXT NOT NULL UNIQUE,
  product_permalink  TEXT,
  amount_parts       INT NOT NULL,
  amount_cents       INT,
  currency           TEXT,
  status             TEXT NOT NULL DEFAULT 'pending',
  gumroad_payload    JSONB,
  notifyhub_response JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  credited_at        TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credit_purchases_status_check'
  ) THEN
    ALTER TABLE public.credit_purchases
      ADD CONSTRAINT credit_purchases_status_check
      CHECK (status IN ('pending', 'credited', 'failed', 'refunded'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_credit_purchases_station
  ON public.credit_purchases (station_id, created_at DESC);

ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Station owners see own purchases" ON public.credit_purchases;
CREATE POLICY "Station owners see own purchases"
  ON public.credit_purchases FOR SELECT
  TO authenticated
  USING (
    station_id IN (SELECT id FROM public.kiosk_stations WHERE owner_id = auth.uid())
  );

REVOKE INSERT, UPDATE, DELETE ON public.credit_purchases FROM anon, authenticated;
GRANT SELECT ON public.credit_purchases TO authenticated;
GRANT ALL ON public.credit_purchases TO service_role;

DO $$
BEGIN
  RAISE NOTICE 'Station credits schema ready (inert until STATION_CREDITS_ENABLED=true)';
END;
$$;
