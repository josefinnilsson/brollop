import { createClient } from '@supabase/supabase-js';

let _client;

export function getSupabase() {
  if (!_client) {
    _client = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    );
  }
  return _client;
}
