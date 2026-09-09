import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

let serverSettings = {
  studioName: 'M&M Artsy',
  tagline: 'Handcrafted Everlasting Fuzzy Bouquets & Resin Keepsakes',
  messengerLink: 'https://www.facebook.com/messages/t/61587268312750',
  contactNumber: '0917 890 1234',
  gcashName: 'M&M ARTSY STUDIO',
  gcashNumber: '0917 890 1234',
  deliveryFee: 50,
  studioAddress: 'Poblacion, Barugo, Leyte (Near Town Plaza)',
  autoConfirm: false,
};

export async function GET() {
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase.from('store_settings').select('*').limit(1).single();
      if (!error && data) {
        return NextResponse.json({ success: true, settings: { ...serverSettings, ...data } });
      }
    }
  } catch {}

  return NextResponse.json({ success: true, settings: serverSettings });
}

export async function POST(request) {
  try {
    const body = await request.json();
    serverSettings = { ...serverSettings, ...body };

    try {
      const supabase = await createClient();
      if (supabase) {
        await supabase.from('store_settings').upsert({
          id: 'default',
          ...serverSettings,
          updated_at: new Date().toISOString(),
        });
      }
    } catch {}

    return NextResponse.json({ success: true, settings: serverSettings });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
