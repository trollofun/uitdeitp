import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with service role key (bypasses RLS)
 *
 * IMPORTANT: Use ONLY for system operations in API routes
 * - Sending verification codes
 * - System notifications
 * - Admin operations
 *
 * NEVER expose service role key to browser!
 * This client should only be used server-side.
 *
 * Note: No Database type generic to avoid strict TypeScript issues
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role credentials');
  }

  // Don't use Database generic type to avoid strict TypeScript issues
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
