-- ============================================================================
-- 20260823_partner_provisioning_foundation.sql  (APLICATĂ)
--
-- Fundația pentru provisionarea M2M (Contract Academy → uitdeITP).
-- Vezi docs/RASPUNS_CONTRACT_ACADEMY_2026-08-08.md pentru contractul complet.
--
-- A) find_user_id_by_email cere acum email CONFIRMAT.
--    Regula „rolul se atașează doar pe email verificat" e invariantul pe care
--    se sprijină puntea de identitate dintre Academy și uitdeITP: fără el,
--    cineva își face cont cu emailul inspectorului și îi preia stația.
--    Funcția scrisă în 20260821 pentru asignarea proprietarului din admin nu-l
--    respecta. La aplicare nu exista niciun cont neconfirmat (0 din 92).
--
-- B) partner_api_keys — cheia M2M nu încape în station_api_keys, unde
--    station_id e NOT NULL: o cheie de partener nu aparține unei stații.
--
-- C) partner_provision_requests — idempotența cererii.
--    Cheia brută de ingest nu e recuperabilă (ținem doar hash-ul), deci
--    „aceeași reluare întoarce același bundle" cere stocarea bundle-ului.
--    Stă în Vault, criptat la rest; aici doar referința și expirarea.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.find_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT id
    FROM auth.users
   WHERE lower(email) = lower(trim(p_email))
     AND email_confirmed_at IS NOT NULL
   LIMIT 1;
$$;

COMMENT ON FUNCTION public.find_user_id_by_email(TEXT) IS
  'Email CONFIRMAT -> user id. Doar service_role. Confirmarea nu e opțională: pe ea se sprijină regula ca o stație să nu poată fi preluată de cineva care doar tastează emailul altcuiva.';

CREATE TABLE IF NOT EXISTS public.partner_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['stations:provision'],
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.partner_api_keys IS
  'Chei M2M pentru sisteme partenere (Academy). Cel mai puternic tip de cheie din ecosistem: creează identități complete de stație.';

ALTER TABLE public.partner_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages partner keys" ON public.partner_api_keys;
CREATE POLICY "Service role manages partner keys" ON public.partner_api_keys
  FOR ALL USING (auth.role() = 'service_role');

REVOKE ALL ON public.partner_api_keys FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.partner_provision_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  partner_key_id UUID REFERENCES public.partner_api_keys(id) ON DELETE SET NULL,
  station_id UUID REFERENCES public.kiosk_stations(id) ON DELETE CASCADE,
  rar_code TEXT NOT NULL,
  station_api_key_id UUID REFERENCES public.station_api_keys(id) ON DELETE SET NULL,
  bundle_secret_id UUID,
  bundle_expires_at TIMESTAMPTZ,
  station_created BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.partner_provision_requests IS
  'Idempotența provisionării. O reluare cu aceeași cheie întoarce același bundle cât timp nu a expirat; după, 410 și rotire explicită.';

CREATE INDEX IF NOT EXISTS idx_partner_provision_rar
  ON public.partner_provision_requests(rar_code);

ALTER TABLE public.partner_provision_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages provision requests" ON public.partner_provision_requests;
CREATE POLICY "Service role manages provision requests" ON public.partner_provision_requests
  FOR ALL USING (auth.role() = 'service_role');

REVOKE ALL ON public.partner_provision_requests FROM anon, authenticated;
