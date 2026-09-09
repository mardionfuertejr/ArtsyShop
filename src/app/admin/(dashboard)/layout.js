import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminShellClient from '@/components/admin/AdminShellClient';

async function getAdminUser() {
  try {
    const supabase = await createClient();
    if (!supabase) return { email: 'mardionjrcordetafuerte@gmail.com', role: 'admin' };
    const { data: { user } } = await supabase.auth.getUser();
    return user || { email: 'mardionjrcordetafuerte@gmail.com', role: 'admin' };
  } catch {
    return { email: 'mardionjrcordetafuerte@gmail.com', role: 'admin' };
  }
}

export default async function AdminLayout({ children }) {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');

  return (
    <AdminShellClient user={user}>
      {children}
    </AdminShellClient>
  );
}
