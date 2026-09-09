import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const isConfigured = url && url.startsWith('http') && !url.includes('placeholder') && !url.includes('your_supabase') && key && !key.includes('your_supabase');
  if (!isConfigured) {
    return null;
  }

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component: cookies can't be set — middleware handles session refresh
          }
        },
      },
      global: {
        fetch: (input, init = {}) => {
          return fetch(input, {
            ...init,
            signal: AbortSignal.timeout(600), // Max 600ms network timeout to prevent SSR hanging
          });
        },
      },
    }
  );
}
