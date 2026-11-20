import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseSecretKey, getSupabaseUrl, isSupabaseConfigured } from '../config.ts';

let adminClient: SupabaseClient | null = null;
let cachedSignature = '';

export function isUsingSupabase(): boolean {
  return isSupabaseConfigured();
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();

  if (!url || !secretKey) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).'
    );
  }

  const signature = `${url}::${secretKey}`;
  if (adminClient && cachedSignature === signature) {
    return adminClient;
  }

  adminClient = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  cachedSignature = signature;
  return adminClient;
}

export function resetSupabaseAdmin(): void {
  adminClient = null;
  cachedSignature = '';
}
