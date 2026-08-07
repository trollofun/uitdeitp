/**
 * Durable rate limiting, backed by Postgres.
 *
 * Replaces the in-memory Map in lib/api/middleware.ts, which is per-lambda on
 * Vercel and therefore does not limit anything in practice. Both limiters run
 * in parallel until ENFORCE_RATE_LIMIT is turned on.
 *
 * While flags.enforceRateLimit is false this is log-only: `allowed` is always
 * true and a [RATELIMIT-AUDIT] line records what would have been rejected.
 */

import { createServiceClient } from '@/lib/supabase/service';
import { flags } from '@/lib/config/flags';

export interface DurableRateLimitResult {
  allowed: boolean;
  wouldBlock: boolean;
  count: number;
  limit: number;
  resetAt: Date;
}

export interface DurableRateLimitParams {
  bucket: string;
  key: string;
  limit: number;
  windowSeconds: number;
}

export async function checkDurableRateLimit({
  bucket,
  key,
  limit,
  windowSeconds,
}: DurableRateLimitParams): Promise<DurableRateLimitResult> {
  const fallback: DurableRateLimitResult = {
    allowed: true,
    wouldBlock: false,
    count: 0,
    limit,
    resetAt: new Date(Date.now() + windowSeconds * 1000),
  };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc('check_and_record_rate_limit', {
      p_bucket: bucket,
      p_key: key,
      p_limit: limit,
      p_window: `${windowSeconds} seconds`,
      p_enforce: flags.enforceRateLimit,
    });

    if (error || !data) {
      // Fail open: a limiter outage must not take down the kiosk.
      console.warn('[RATELIMIT-AUDIT] rpc failed, failing open', {
        bucket,
        key,
        code: error?.code,
        message: error?.message,
      });
      return fallback;
    }

    const result = data as {
      allowed: boolean;
      would_block: boolean;
      count: number;
      limit: number;
      reset_at: string;
    };

    if (result.would_block) {
      console.warn('[RATELIMIT-AUDIT] over limit', {
        bucket,
        key,
        count: result.count,
        limit: result.limit,
        enforced: flags.enforceRateLimit,
      });
    }

    return {
      allowed: result.allowed,
      wouldBlock: result.would_block,
      count: result.count,
      limit: result.limit,
      resetAt: new Date(result.reset_at),
    };
  } catch (err) {
    console.warn('[RATELIMIT-AUDIT] unexpected error, failing open', {
      bucket,
      key,
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}

/**
 * Daily OTP cap per station: the kiosk is unauthenticated and each code costs
 * money, so a station that goes over its cap is stopped automatically.
 */
export async function checkStationOtpCap(stationId: string): Promise<{
  overCap: boolean;
  count: number;
  cap: number | null;
}> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc('check_station_otp_cap', {
      p_station_id: stationId,
    });

    if (error || !data) {
      console.warn('[RATELIMIT-AUDIT] otp cap check failed, failing open', {
        stationId,
        code: error?.code,
      });
      return { overCap: false, count: 0, cap: null };
    }

    const result = data as { over_cap: boolean; count: number; cap: number | null };

    if (result.over_cap) {
      console.warn('[RATELIMIT-AUDIT] station over daily OTP cap', {
        stationId,
        count: result.count,
        cap: result.cap,
        enforced: flags.enforceRateLimit,
      });
    }

    return { overCap: result.over_cap, count: result.count, cap: result.cap };
  } catch (err) {
    console.warn('[RATELIMIT-AUDIT] otp cap unexpected error, failing open', {
      stationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { overCap: false, count: 0, cap: null };
  }
}
