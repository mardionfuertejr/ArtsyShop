import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function POST() {
  try {
    const supabase = await createClient();
    if (supabase) await supabase.auth.signOut();
  } catch {}

  const cookieStore = await cookies();
  cookieStore.delete('admin_session');

  redirect('/admin/login');
}
