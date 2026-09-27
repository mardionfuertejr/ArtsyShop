import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { reference_code, status, customer_name, order_type } = body;

    if (!reference_code) {
      return NextResponse.json({ error: 'Missing reference_code' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Broadcast realtime event on public channel
    if (supabase) {
      try {
        const channel = supabase.channel('order-push-alerts');
        await channel.send({
          type: 'broadcast',
          event: 'order_status_changed',
          payload: {
            reference_code,
            status,
            customer_name,
            order_type,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.warn('Realtime broadcast error:', err);
      }
    }

    return NextResponse.json({
      success: true,
      reference_code,
      status,
      message: `Notification dispatched for order ${reference_code}`,
    });
  } catch (error) {
    console.error('Error dispatching push notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
