import { createBrowserClient as createClient } from '@supabase/ssr';
import { Database } from '@/types';

/**
 * Creates a Supabase client for browser/client-side usage
 * Use this in Client Components and client-side code
 */
export function createBrowserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
