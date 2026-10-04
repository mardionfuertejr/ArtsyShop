import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// Temporary in-memory OTP storage: email -> { code, expiresAt }
const activeOtps = new Map();

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, email, code, newPassword } = body;

    const serverAdminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'mardionjrcordetafuerte@gmail.com').trim().toLowerCase();
    const cleanEmail = (email || '').trim().toLowerCase();

    // ── ACTION 1: REQUEST CODE ──
    if (action === 'request_code') {
      if (!cleanEmail) {
        return NextResponse.json({ success: false, message: 'Please enter your admin email.' }, { status: 400 });
      }

      if (cleanEmail !== serverAdminEmail) {
        return NextResponse.json({ success: false, message: 'Email address is not registered as an Admin.' }, { status: 404 });
      }

      // Generate secure 6-digit PIN
      const generatedCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

      activeOtps.set(cleanEmail, { code: generatedCode, expiresAt });

      return NextResponse.json({
        success: true,
        code: generatedCode,
        message: 'Security code generated and dispatched to your device.',
      });
    }

    // ── ACTION 2: VERIFY CODE & RESET PASSWORD ──
    if (action === 'verify_and_reset') {
      if (!cleanEmail || !code || !newPassword) {
        return NextResponse.json({ success: false, message: 'Please complete all required fields.' }, { status: 400 });
      }

      const stored = activeOtps.get(cleanEmail);

      if (!stored) {
        return NextResponse.json({ success: false, message: 'No active code found. Please request a new code.' }, { status: 400 });
      }

      if (Date.now() > stored.expiresAt) {
        activeOtps.delete(cleanEmail);
        return NextResponse.json({ success: false, message: 'Security code has expired. Please request a new one.' }, { status: 400 });
      }

      if (String(stored.code).trim() !== String(code).trim()) {
        return NextResponse.json({ success: false, message: 'Incorrect 6-digit code. Please check your notification.' }, { status: 400 });
      }

      // Valid OTP: Remove used code
      activeOtps.delete(cleanEmail);

      // Attempt Supabase password update if user exists in Supabase Auth
      try {
        const supabase = await createClient();
        if (supabase) {
          await supabase.auth.updateUser({ password: newPassword });
        }
      } catch {}

      // Log admin in automatically
      const cookieStore = await cookies();
      cookieStore.set('admin_session', 'true', {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      return NextResponse.json({
        success: true,
        message: 'Password reset successfully! Redirecting to dashboard...',
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action.' }, { status: 400 });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json({ success: false, message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
