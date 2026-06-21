import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';

/** Supabase client for use in Client Components ('use client'). */
export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
