-- ============================================================================
-- phone_verifications: lock down RLS + SECURITY DEFINER grants (F0.3).
--
-- The critical hole closed here: get_active_verification(text) is SECURITY
-- DEFINER, returns the OTP code in PLAINTEXT, and was executable by anon —
-- anyone with the public anon key could fetch any phone's active code and
-- complete a takeover with mark_verification_complete(uuid), no SMS needed.
--
-- Safe because all live traffic on this table runs on the service-role
-- client (verified caller by caller): /api/verification/{send,verify,resend}
-- and src/lib/services/phone-verification.ts use createServiceClient(); the
-- only RPC call from app code (increment_verification_attempts) is on the
-- same client. The two broken authenticated-role routes were deleted in A4.
--
-- Safe to run on the live database (dnowyodhffqqhmakjupo). Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) Drop every anon/authenticated policy; service_role bypasses RLS.
--    RLS stays enabled with zero policies = zero access for anon/authenticated.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view own verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "Anonymous users can view active verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "Anonymous users can update verification attempts" ON public.phone_verifications;
DROP POLICY IF EXISTS "Anonymous users can request verification" ON public.phone_verifications;

-- ----------------------------------------------------------------------------
-- B) Table grants
-- ----------------------------------------------------------------------------
REVOKE ALL ON public.phone_verifications FROM anon, authenticated;
GRANT ALL ON public.phone_verifications TO service_role;

-- ----------------------------------------------------------------------------
-- C) SECURITY DEFINER functions: service_role only
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_active_verification(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_verification(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.mark_verification_complete(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_verification_complete(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_verification_attempts(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_verification_attempts(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_phone_rate_limited(text, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_phone_rate_limited(text, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.check_verification_rate_limit_rpc(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_verification_rate_limit_rpc(text) TO service_role;

-- ----------------------------------------------------------------------------
-- D) verification_analytics view leaked aggregates to anon via definer rights
-- ----------------------------------------------------------------------------
ALTER VIEW public.verification_analytics SET (security_invoker = on);

-- ----------------------------------------------------------------------------
-- E) Report
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'phone_verifications';
  RAISE NOTICE 'phone_verifications now has % policies (expected 0); anon/authenticated fully revoked', v_count;
END;
$$;
