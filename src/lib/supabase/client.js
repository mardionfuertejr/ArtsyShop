import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const isConfigured = url && url.startsWith('http') && !url.includes('placeholder') && !url.includes('your_supabase') && key && !key.includes('your_supabase');
  if (!isConfigured) {
    return null;
  }

  return createBrowserClient(
    url,
    key
  );
}
