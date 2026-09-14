import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, rememberMe } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Please enter your email and password.' },
        { status: 400 }
      );
    }

    const inputEmail = email.trim().toLowerCase();
    const inputPass = password.trim();

    // 1. Check against Server-Side Secret Environment Variables
    const serverAdminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'mardionjrcordetafuerte@gmail.com').trim().toLowerCase();
    const serverAdminPass = (process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'january2026').trim();

    let authenticated = false;

    // Check credentials purely on the backend
    if (inputEmail === serverAdminEmail && inputPass === serverAdminPass) {
      authenticated = true;
    }

    // 2. Also attempt Supabase Auth if configured
    if (!authenticated) {
      try {
        const supabase = await createClient();
        if (supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: inputEmail,
            password: inputPass,
          });
          if (!error && data?.user) {
            authenticated = true;
          }
        }
      } catch {
        // Fallback gracefully if Supabase network fails
      }
    }

    if (authenticated) {
      const cookieStore = await cookies();
      const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24; // 30 days vs 1 day

      cookieStore.set('admin_session', 'true', {
        path: '/',
        maxAge,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid email or password. Please try again.' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
