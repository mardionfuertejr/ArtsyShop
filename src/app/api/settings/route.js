import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

let serverSettings = {
  studioName: 'M&M Artsy',
  tagline: 'Handcrafted Everlasting Fuzzy Bouquets & Resin Keepsakes',
  messengerLink: 'https://www.facebook.com/messages/t/61587268312750',
  contactNumber: '09949909686',
  gcashName: 'M.... J.. F...',
  gcashNumber: '09949909686',
  deliveryFee: 45,
  deliveryFeeMode: 'auto', // 'auto' (Distance-based GPS) or 'fixed' (Manual flat fee)
  deliveryFeeNear: 20,     // 0-2 km (Barugo Proper / Poblacion)
  deliveryFeeMid: 35,      // 2-5 km (Other Barangays)
  studioAddress: 'Poblacion, Barugo, Leyte (Near Town Plaza)',
  studioLat: 11.3039,
  studioLng: 124.7350,
  autoConfirm: false,
  announcementEnabled: true,
  announcementText: 'I-send ang resibo sa Messenger para masimulan agad ang pag-craft.',
  announcementBadge: 'Notice',
  announcementLink: '/shop',
  rushFeeEnabled: true,
  rushFeeAmount: 50,
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
