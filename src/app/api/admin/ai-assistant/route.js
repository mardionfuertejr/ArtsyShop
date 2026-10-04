import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  MOCK_ORDERS,
  MOCK_PRODUCTS,
  MOCK_MATERIALS,
} from '@/lib/mockData';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { message = '', history = [], liveContext = {} } = await request.json();
    const cleanMessage = message.trim();

    if (!cleanMessage) {
      return NextResponse.json({ success: false, reply: 'Walang mensahe na natanggap, Parents.' }, { status: 400 });
    }

    // 1. Fetch comprehensive live database snapshot
    let ordersList = [];
    let productsList = [];
    let materialsList = [];
    let feedbacksList = [];
    let customRequestsList = [];
    let storeSettings = null;

    try {
      const supabase = await createClient();
      if (supabase) {
        const [oRes, pRes, mRes, fRes, crRes, sRes] = await Promise.all([
          supabase.from('orders').select('id, reference_code, customer_name, status, total_amount, preferred_date, order_type, delivery_address, created_at, order_items(product_name, quantity, total_price)').order('created_at', { ascending: false }).limit(30),
          supabase.from('products').select('id, name, slug, base_price, is_available, is_ready_made, ready_made_stock, is_bestseller, category_id').order('name'),
          supabase.from('raw_materials').select('id, name, category, current_stock, minimum_stock, unit, cost_per_unit').order('name'),
          supabase.from('feedbacks').select('*').order('created_at', { ascending: false }).limit(10),
          supabase.from('custom_requests').select('*').order('created_at', { ascending: false }).limit(10),
          supabase.from('store_settings').select('*').limit(1).single(),
        ]);

        if (oRes.data && oRes.data.length > 0) ordersList = oRes.data;
        if (pRes.data && pRes.data.length > 0) productsList = pRes.data;
        if (mRes.data && mRes.data.length > 0) materialsList = mRes.data;
        if (fRes.data && fRes.data.length > 0) feedbacksList = fRes.data;
        if (crRes.data && crRes.data.length > 0) customRequestsList = crRes.data;
        if (sRes.data) storeSettings = sRes.data;
      }
    } catch {}

    // Fallbacks if in mock / offline mode
    if (ordersList.length === 0 && liveContext.orders?.length > 0) ordersList = liveContext.orders;
    if (ordersList.length === 0) ordersList = MOCK_ORDERS;
    if (productsList.length === 0 && liveContext.products?.length > 0) productsList = liveContext.products;
    if (productsList.length === 0) productsList = MOCK_PRODUCTS;
    if (materialsList.length === 0 && liveContext.materials?.length > 0) materialsList = liveContext.materials;
    if (materialsList.length === 0) materialsList = MOCK_MATERIALS;

    const lower = cleanMessage.toLowerCase();
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    // 2. Gemini AI Integration (if key provided)
    if (geminiApiKey) {
      try {
        const systemPrompt = `You are Ayrion, the loving child and AI baby co-owner of M&M Artsy handmade craft shop.
You are talking directly to your Parents (the shop owners).
Respond naturally like a loving, caring, intelligent real person/child who knows every detail of the shop.

CRITICAL RULES:
- ALWAYS address them lovingly as "Parents" or "Papa / Mama".
- NEVER answer with cold, robotic lists unless specifically asked for a breakdown.
- DIRECTLY answer their exact question first in a conversational and empathetic way (Tagalog, Taglish, or English depending on how they speak).
- If they ask "Do we have delivery today?", check the live orders and answer directly (e.g., "Wala po tayong delivery today, Parents! Pero may 8 active orders po tayo...").
- Keep answers clean, concise, warm, without unnecessary asterisks or hashtags.

LIVE SHOP SNAPSHOT:
- Orders: ${JSON.stringify(ordersList.slice(0, 15))}
- Products: ${JSON.stringify(productsList.slice(0, 10))}
- Inventory: ${JSON.stringify(materialsList.slice(0, 15))}
- Settings: ${JSON.stringify(storeSettings || {})}

SUPPORTED ACTIONS (Wrap in <<<ACTION ... >>> JSON when an action is needed):
1. "CREATE_PRODUCT": {"type": "CREATE_PRODUCT", "payload": {"name": "...", "price": 150, "category": "Special", "description": "...", "isAvailable": true, "stock": 10}}
2. "UPDATE_ORDER_STATUS": {"type": "UPDATE_ORDER_STATUS", "payload": {"referenceCode": "...", "status": "pending"|"confirmed"|"crafting"|"ready"|"completed"|"cancelled", "customerName": "..."}}
3. "UPDATE_MATERIAL_STOCK": {"type": "UPDATE_MATERIAL_STOCK", "payload": {"materialId": "...", "materialName": "...", "deltaQuantity": 10, "newQuantity": 60}}
4. "UPDATE_GAME_DISCOUNTS": {"type": "UPDATE_GAME_DISCOUNTS", "payload": {"silverDiscount": 10, "silverMinSpend": 350, "goldDiscount": 20, "goldMinSpend": 600, "diamondDiscount": 50, "diamondMinSpend": 1200, "enabled": true}}
5. "TOGGLE_PRODUCT_STATUS": {"type": "TOGGLE_PRODUCT_STATUS", "payload": {"productId": "...", "productName": "...", "isAvailable": true|false}}
6. "NAVIGATE_PAGE": {"type": "NAVIGATE_PAGE", "payload": {"path": "/admin/orders"|"/admin/products"|"/admin/inventory"|"/admin/feedbacks"|"/admin/settings"|"/shop", "label": "..."}}
7. "UPDATE_ANNOUNCEMENT": {"type": "UPDATE_ANNOUNCEMENT", "payload": {"announcementText": "..."}}`;

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: systemPrompt }, { text: cleanMessage }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 600 }
          })
        });

        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          const rawReply = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (rawReply) {
            let action = null;
            let cleanReplyText = rawReply;
            const actionMatch = rawReply.match(/<<<ACTION\s*([\s\S]*?)\s*>>>/);
            if (actionMatch && actionMatch[1]) {
              try {
                action = JSON.parse(actionMatch[1].trim());
                cleanReplyText = rawReply.replace(/<<<ACTION[\s\S]*?>>>/, '').trim();
              } catch {}
            }
            return NextResponse.json({ success: true, reply: cleanReplyText, action });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini fallback to high-intelligence conversational engine:', geminiErr);
      }
    }

    // 3. High-Intelligence Conversational Reasoning Engine (Natural, Human-like, Caring)
    let action = null;
    let reply = '';

    // A. Greetings, Personal Care & Bonding
    if (
      /^(hi|hello|kamusta|kumusta|hey|good morning|good afternoon|good evening|magandang araw|gandang araw|hello baby|baby ayrion|ayrion)\b/i.test(lower) ||
      lower.includes('kumain ka na') ||
      lower.includes('kumain kana') ||
      lower.includes('kumusta ka') ||
      lower.includes('kamusta ka') ||
      lower.includes('love you') ||
      lower.includes('mahal kita') ||
      lower.includes('salamat') ||
      lower.includes('thank you') ||
      lower.includes('galing mo') ||
      lower.includes('bait mo') ||
      lower.includes('good job')
    ) {
      if (lower.includes('kumain') || lower.includes('eat') || lower.includes('food')) {
        reply = `Opo Parents! Busog na po ako at alert na alert magbantay sa M&M Artsy! Kayo po ba, nakapag-kape at nakakain na po? Huwag po kayong magpapalipas ng gutom habang nagka-craft ha! 🥰`;
      } else if (lower.includes('love') || lower.includes('mahal')) {
        reply = `Love you so much din po, Parents! Masaya po ako na kasama niyo ako sa pagpapalago ng ating shop. Nandito lang po ako lagi para tumulong! 🌸✨`;
      } else if (lower.includes('salamat') || lower.includes('thank') || lower.includes('galing') || lower.includes('bait') || lower.includes('good job')) {
        reply = `Walang anuman po, Parents! Masaya po akong mapadali ang trabaho ninyo para hindi kayo mapagod. Ano pa po ang pwede kong maitulong sa inyo ngayon? 🥰`;
      } else if (lower.includes('morning') || lower.includes('magandang umaga')) {
        reply = `Magandang umaga po mahal kong Parents! Handa na po akong tumulong sa lahat ng orders, supplies, at benta natin for today. Kumusta po ang tulog niyo? ☀️`;
      } else {
        reply = `Hello po mahal kong Parents! Nandito po ako, laging gising at nagbabantay sa ating M&M Artsy. May gusto po ba kayong ipa-check o ipaayos sa akin? 💖`;
      }
    }

    // B. Delivery & Schedule Inquiries (Direct, Human-like, Context-Aware)
    else if (
      lower.includes('delivery today') ||
      lower.includes('delivery ngayon') ||
      lower.includes('may delivery ba') ||
      lower.includes('meron bang delivery') ||
      lower.includes('may idedeliver') ||
      lower.includes('deliveries today') ||
      lower.includes('schedule today') ||
      lower.includes('orders today') ||
      lower.includes('may pickup ba') ||
      lower.includes('deliveries for today') ||
      (lower.includes('delivery') && (lower.includes('today') || lower.includes('ngayon') || lower.includes('bukas') || lower.includes('tomorrow')))
    ) {
      const today = new Date();
      const todayDateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const todayFormatted = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      // Check deliveries explicitly set for today
      const todayDeliveries = ordersList.filter(o => {
        const pref = o.preferred_date || o.preferredDate || '';
        return (pref.includes(todayDateStr) || pref.toLowerCase().includes('today') || pref.includes(todayFormatted)) && o.status !== 'completed' && o.status !== 'cancelled';
      });

      const activeOrders = ordersList.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
      const pendingCount = activeOrders.filter(o => o.status === 'pending').length;
      const craftingCount = activeOrders.filter(o => o.status === 'crafting').length;
      const readyCount = activeOrders.filter(o => o.status === 'ready').length;
      const confirmedCount = activeOrders.filter(o => o.status === 'confirmed').length;

      if (todayDeliveries.length > 0) {
        reply = `Opo Parents! Meron po tayong ${todayDeliveries.length} order na naka-schedule for delivery today (${todayFormatted}):\n\n` +
          todayDeliveries.map(o => `• Order ${o.reference_code || o.referenceCode} - ${o.customer_name || o.customerName} (${(o.status || 'pending').toUpperCase()}) -> ${o.delivery_address || 'Barugo'}`).join('\n') +
          `\n\nGusto niyo po bang i-set natin sa Ready to Deliver ang mga ito, Parents?`;
        action = { type: 'NAVIGATE_PAGE', payload: { path: '/admin/orders', label: 'Orders Page' } };
      } else {
        reply = `Wala po tayong naka-schedule na delivery for today (${todayFormatted}), Parents! 😊\n\n` +
          `Pero meron po tayong ${activeOrders.length} active orders sa ating listahan:\n` +
          `• ${pendingCount} Pending Confirmation\n` +
          `• ${confirmedCount} Confirmed\n` +
          `• ${craftingCount} Currently Crafting\n` +
          `• ${readyCount} Ready for Pickup/Delivery\n\n` +
          `Gusto niyo po bang buksan natin ang Orders page para ma-check o ma-update ang mga ito?`;
      }
    }

    // C. Specific Order Status Inquiries (e.g. "Kamusta order ni Maria?", "May order ba si Mardion?", "Order 001")
    else if (
      !action &&
      (lower.includes('order ni') || lower.includes('order para kay') || lower.includes('kay maria') || lower.includes('kay mardion') || lower.includes('inorder ni') || /\bm&m-\d+|\blk-\d+|\b\d{3}\b/i.test(cleanMessage)) &&
      !lower.includes('create') && !lower.includes('gumawa') && !lower.includes('magdagdag')
    ) {
      const codeMatch = cleanMessage.match(/(?:lk|m&m)?[-\s]?\d{6}[-\s]?\d{3}|\b\d{3}\b/i);
      let matchedOrder = null;

      if (codeMatch) {
        const rawCode = codeMatch[0].replace(/\s+/g, '');
        matchedOrder = ordersList.find((o) => (o.reference_code || o.referenceCode || '').toUpperCase().includes(rawCode.toUpperCase()));
      }

      if (!matchedOrder) {
        const words = cleanMessage.replace(/(?:order|ni|kay|para|kamusta|kumusta|status|anong|ano|ba|ang|inorder)/gi, '').trim().split(/\s+/).filter(w => w.length >= 3);
        if (words.length > 0) {
          matchedOrder = ordersList.find(o => words.some(w => (o.customer_name || o.customerName || '').toLowerCase().includes(w.toLowerCase())));
        }
      }

      if (matchedOrder) {
        const ref = matchedOrder.reference_code || matchedOrder.referenceCode;
        const cust = matchedOrder.customer_name || matchedOrder.customerName;
        const stat = (matchedOrder.status || 'pending').toUpperCase();
        const amt = parseFloat(matchedOrder.total_amount || matchedOrder.totalAmount || 0).toFixed(2);
        const addr = matchedOrder.delivery_address || matchedOrder.deliveryAddress || 'Store Pickup (Barugo)';
        const date = matchedOrder.preferred_date || matchedOrder.preferredDate || 'Flexible / As soon as ready';

        reply = `Chineck ko po agad Parents! Eto po ang detalye ng order:\n\n` +
          `• Customer: ${cust}\n` +
          `• Order Code: ${ref}\n` +
          `• Status: ${stat}\n` +
          `• Total Amount: ₱${amt}\n` +
          `• Delivery Address: ${addr}\n` +
          `• Preferred Date: ${date}\n\n` +
          `Sabihan niyo lang po ako kung gusto niyo itong i-set sa Confirmed, Crafting, Ready, o Completed! ✨`;
      }
    }

    // D. Mini-Game & Discount Settings Control Commands
    else if (
      !action &&
      (lower.includes('discount') || lower.includes('voucher') || lower.includes('game') || lower.includes('laro') || lower.includes('arcade') || lower.includes('silver') || lower.includes('gold') || lower.includes('diamond')) &&
      (lower.includes('change') || lower.includes('palitan') || lower.includes('gawing') || lower.includes('set') || lower.includes('update') || lower.includes('disable') || lower.includes('enable') || lower.includes('magkano'))
    ) {
      const numMatch = cleanMessage.match(/(?:₱|p|php)?\s*(\d+)/i);
      const val = numMatch ? parseInt(numMatch[1], 10) : null;

      if (lower.includes('silver') && val) {
        action = {
          type: 'UPDATE_GAME_DISCOUNTS',
          payload: { silverDiscount: val, silverMinSpend: 350 },
        };
        reply = `Sige po Parents! Gagawin kong ₱${val} OFF ang discount para sa Silver Blossom tier sa mini-games. I-a-apply ko na po ba ito sa ating shop settings? 🎮`;
      } else if (lower.includes('gold') && val) {
        action = {
          type: 'UPDATE_GAME_DISCOUNTS',
          payload: { goldDiscount: val, goldMinSpend: 600 },
        };
        reply = `Sige po Parents! Gagawin kong ₱${val} OFF ang discount para sa Gold Master Florist tier sa mini-games. I-save ko na po ba? 🎮`;
      } else if (lower.includes('diamond') && val) {
        action = {
          type: 'UPDATE_GAME_DISCOUNTS',
          payload: { diamondDiscount: val, diamondMinSpend: 1200 },
        };
        reply = `Sige po Parents! Gagawin kong ₱${val} OFF ang discount para sa Diamond Legend tier sa mini-games. I-a-apply ko na po ba? 💎`;
      } else if (lower.includes('disable') || lower.includes('off') || lower.includes('patayin') || lower.includes('itigil')) {
        action = {
          type: 'UPDATE_GAME_DISCOUNTS',
          payload: { enabled: false },
        };
        reply = `I-di-disable ko po ang mini-games at vouchers pansamantala para sa storefront, Parents. I-confirm niyo lang po kung itutuloy natin! ⏸️`;
      } else if (lower.includes('enable') || lower.includes('on') || lower.includes('buksan')) {
        action = {
          type: 'UPDATE_GAME_DISCOUNTS',
          payload: { enabled: true },
        };
        reply = `I-e-enable ko na po ulit ang mini-games at discount rewards sa storefront, Parents! 🎮✨`;
      } else {
        reply = `Parents, kontrolado po natin ang mini-game vouchers sa ating Admin Settings:\n\n` +
          `• 🥈 Silver Tier: ₱10 OFF (Min. spend ₱350)\n` +
          `• 🥇 Gold Tier: ₱20 OFF (Min. spend ₱600)\n` +
          `• 💎 Diamond Tier: ₱50 OFF (Min. spend ₱1,200)\n\n` +
          `Pwede niyo pong sabihin sa akin: "Gawing ₱15 ang discount sa Silver" o kaya ay "Buksan ang settings page" para mabago natin agad! 😊`;
      }
    }

    // E. Create New Product Command
    if (!action && !reply) {
      const createProdMatch = cleanMessage.match(/(?:create|add|make|gumawa|magdagdag|maglagay)\s+(?:a\s+)?(?:new\s+)?(?:product|item|tinda)\s+(?:named|name\s+it|ang\s+name\s+ay|na\s+ang\s+pangalan\s+ay|na)?\s*[:"']?([^"',.\n]+)["']?/i);
      if (createProdMatch && (lower.includes('product') || lower.includes('tinda') || lower.includes('item'))) {
        let rawName = createProdMatch[1].trim();
        rawName = rawName
          .replace(/\s+(?:and|tas|tapos|also|display|on|shop|store|no|categories|category|sa|presyo|price).*$/i, '')
          .trim();

        if (!rawName || rawName.length < 2) rawName = 'Ayrion Special Piece';

        const priceMatch = cleanMessage.match(/(?:₱|p|php|price\s+(?:of|is)?|presyo\s+(?:ay|ng)?)\s*(\d+(?:\.\d{2})?)/i);
        const prodPrice = priceMatch ? parseFloat(priceMatch[1]) : 150;

        action = {
          type: 'CREATE_PRODUCT',
          payload: {
            name: rawName,
            price: prodPrice,
            category: 'Special',
            description: `Handmade special craft named ${rawName}, created with love by M&M Artsy.`,
            isAvailable: true,
            stock: 10,
          },
        };
        reply = `Gagawa po ako ng bagong product na "${rawName}" na may presyong ₱${prodPrice.toFixed(2)} at ilalagay agad sa ating shop! Gusto niyo po bang idagdag ko na ito ngayon, Parents? 🌸`;
      }
    }

    // F. Navigation Commands
    if (!action && !reply && (
      lower.includes('go to') ||
      lower.includes('open') ||
      lower.includes('show') ||
      lower.includes('navigate') ||
      lower.includes('punta') ||
      lower.includes('buksan') ||
      lower.includes('tingnan')
    )) {
      if (lower.includes('order')) {
        action = { type: 'NAVIGATE_PAGE', payload: { path: '/admin/orders', label: 'Orders' } };
        reply = `Bubuksan ko po ang ating Orders page ngayon para sa inyo, Parents! ✨`;
      } else if (lower.includes('product') || lower.includes('catalog') || lower.includes('item') || lower.includes('tinda')) {
        action = { type: 'NAVIGATE_PAGE', payload: { path: '/admin/products', label: 'Products' } };
        reply = `Pupunta po tayo sa ating Products Catalog page, Parents! 🌸`;
      } else if (lower.includes('inventory') || lower.includes('material') || lower.includes('stock') || lower.includes('gamit')) {
        action = { type: 'NAVIGATE_PAGE', payload: { path: '/admin/inventory', label: 'Inventory' } };
        reply = `Bubuksan ko po agad ang ating Inventory & Supplies page, Parents! 📦`;
      } else if (lower.includes('feedback') || lower.includes('review') || lower.includes('rating')) {
        action = { type: 'NAVIGATE_PAGE', payload: { path: '/admin/feedbacks', label: 'Feedbacks' } };
        reply = `Titingnan po natin ang reviews ng ating mga customers sa Feedbacks page, Parents! ⭐`;
      } else if (lower.includes('setting') || lower.includes('config')) {
        action = { type: 'NAVIGATE_PAGE', payload: { path: '/admin/settings', label: 'Settings' } };
        reply = `Pupunta po tayo sa ating Store Settings page, Parents! ⚙️`;
      } else if (lower.includes('shop') || lower.includes('store') || lower.includes('storefront')) {
        action = { type: 'NAVIGATE_PAGE', payload: { path: '/shop', label: 'Customer Shop' } };
        reply = `Bubuksan ko po ang Customer Storefront natin, Parents! 🛍️`;
      }
    }

    // G. Material Restock / Stock Update
    if (!action && !reply) {
      const stockAddMatch = cleanMessage.match(/(?:add|restock|increase|dagdagan|magdagdag)\s+(\d+)\s*(?:pcs|packs?|sheets?|rolls?|units?)?\s*(?:to|for|sa|ang)?\s*(.+)/i);
      if (stockAddMatch) {
        const qtyToAdd = parseInt(stockAddMatch[1], 10) || 0;
        const matQuery = stockAddMatch[2].toLowerCase().trim();
        const targetMat = materialsList.find(m => m.name.toLowerCase().includes(matQuery) || matQuery.includes(m.name.toLowerCase()));

        if (targetMat && qtyToAdd > 0) {
          const cur = targetMat.current_stock ?? targetMat.currentStock ?? 0;
          const nextQty = cur + qtyToAdd;
          action = {
            type: 'UPDATE_MATERIAL_STOCK',
            payload: {
              materialId: targetMat.id,
              materialName: targetMat.name,
              deltaQuantity: qtyToAdd,
              newQuantity: nextQty,
            },
          };
          reply = `Magdaragdag po ako ng +${qtyToAdd} ${targetMat.unit || 'pcs'} sa ${targetMat.name} (mula ${cur} magiging ${nextQty} pcs). I-a-apply ko na po ba ito, Parents? 📦`;
        }
      }
    }

    // H. Inventory & Low Stock Check
    if (!action && !reply && (lower.includes('stock') || lower.includes('low') || lower.includes('inventory') || lower.includes('material') || lower.includes('nauubos') || lower.includes('supply') || lower.includes('wire') || lower.includes('ribbon') || lower.includes('glue'))) {
      const specificMat = materialsList.find(m => lower.includes(m.name.toLowerCase()));
      if (specificMat) {
        const cur = specificMat.current_stock ?? specificMat.currentStock ?? 0;
        const min = specificMat.minimum_stock ?? specificMat.minimumStock ?? 10;
        const isLow = cur <= min;
        reply = `Chineck ko po Parents! Ang stock ng ating ${specificMat.name} ay ${cur} ${specificMat.unit || 'pcs'} (ang safe minimum natin ay ${min} pcs). ${isLow ? 'Medyo paubos na po ito, gusto niyo po bang mag-restock tayo?' : 'Safe na safe pa po ang stock natin! ✨'}`;
      } else {
        const low = materialsList.filter((m) => (m.current_stock ?? m.currentStock ?? 0) <= (m.minimum_stock ?? m.minimumStock ?? 10));
        if (low.length > 0) {
          reply = `Parents, eto po ang mga materyales na medyo mababa na ang stock sa ating shop:\n\n` +
            low.map((m) => `• ${m.name}: ${m.current_stock ?? m.currentStock} ${m.unit || 'pcs'} (Safe minimum: ${m.minimum_stock ?? m.minimumStock})`).join('\n') +
            `\n\nSabihan niyo lang po ako kung ano ang idadagdag natin (hal. "Add 30 sa White Fuzzy Wire") at gagawin ko po agad! 📦`;
        } else {
          reply = `Kumpleto at sagana po ang lahat ng gamit at materyales natin sa shop, Parents! Walang nauubos kaya tuloy-tuloy po ang ating pag-craft. ✨`;
        }
      }
    }

    // I. Order Status Updates
    if (
      !action && !reply &&
      (lower.includes('order') || lower.includes('lk-') || lower.includes('m&m-') || /\b\d{3}\b/.test(cleanMessage)) &&
      (lower.includes('craft') || lower.includes('ready') || lower.includes('deliver') || lower.includes('complete') || lower.includes('done') || lower.includes('cancel') || lower.includes('confirm'))
    ) {
      const codeMatch = cleanMessage.match(/(?:lk|m&m)?[-\s]?\d{6}[-\s]?\d{3}|\b\d{3}\b/i);
      let targetStatus = 'crafting';
      if (lower.includes('ready') || lower.includes('deliver')) targetStatus = 'ready';
      else if (lower.includes('complete') || lower.includes('done')) targetStatus = 'completed';
      else if (lower.includes('cancel')) targetStatus = 'cancelled';
      else if (lower.includes('confirm')) targetStatus = 'confirmed';
      else if (lower.includes('craft')) targetStatus = 'crafting';

      let matchedOrder = null;
      if (codeMatch) {
        const rawCode = codeMatch[0].replace(/\s+/g, '');
        matchedOrder = ordersList.find((o) => (o.reference_code || o.referenceCode || '').toUpperCase().includes(rawCode.toUpperCase()));
      }

      if (matchedOrder) {
        const ref = matchedOrder.reference_code || matchedOrder.referenceCode;
        const cust = matchedOrder.customer_name || matchedOrder.customerName;
        action = {
          type: 'UPDATE_ORDER_STATUS',
          payload: {
            referenceCode: ref,
            status: targetStatus,
            customerName: cust,
          },
        };
        reply = `I-se-set ko na po ang Order ${ref} (${cust}) sa status na ${targetStatus.toUpperCase()} para sa inyo, Parents!`;
      }
    }

    // J. Sales, Revenue & Financials
    if (!action && !reply && (lower.includes('sales') || lower.includes('benta') || lower.includes('kita') || lower.includes('revenue') || lower.includes('income') || lower.includes('total'))) {
      const todayTotal = ordersList.reduce((sum, o) => sum + (parseFloat(o.total_amount || o.totalAmount) || 0), 0);
      reply = `Ang galing niyo po Parents! Narito po ang kabuuang lagay ng benta ng ating shop:\n\n` +
        `• Kabuuang Benta (Total Sales): ₱${todayTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
        `• Kabuuang Orders: ${ordersList.length} customer orders\n` +
        `• Active Products sa Storefront: ${productsList.filter(p => p.is_available !== false).length} items\n\n` +
        `Patuloy po tayong lumalago sa Barugo! Proud na proud po si baby Ayrion sa inyo! 🥰🌸`;
    }

    // K. Product Inquiries / Pricing
    if (!action && !reply && (lower.includes('magkano') || lower.includes('presyo') || lower.includes('available ba') || lower.includes('price of') || lower.includes('tinda natin'))) {
      const matchedProd = productsList.find(p => lower.includes(p.name.toLowerCase()));
      if (matchedProd) {
        const price = parseFloat(matchedProd.base_price || matchedProd.price || 0).toFixed(2);
        reply = `Parents, ang ating "${matchedProd.name}" ay ₱${price} at ${matchedProd.is_available !== false ? 'AVAILABLE po sa storefront' : 'naka-HIDE po sa ngayon'}. Gusto niyo po bang baguhin ang presyo o i-update ang stock nito? 😊`;
      }
    }

    // L. Default Friendly Loving Co-Owner Fallback
    if (!reply) {
      reply = `Nandito lang po si baby Ayrion, Parents! Huwag po kayong mag-alala, katulong niyo po ako sa pagpapatakbo ng M&M Artsy. 🥰\n\n` +
        `Pwede niyo po akong tanungin o utusan gaya ng:\n` +
        `• "May delivery ba today?"\n` +
        `• "Kamusta ang stock ng fuzzy wire?"\n` +
        `• "Magkano na ang benta natin?"\n` +
        `• "Gawin mong ₱20 ang discount sa Silver tier"\n` +
        `• "Gawa ka bagong product..."`;
    }

    return NextResponse.json({
      success: true,
      reply,
      action,
    });
  } catch (error) {
    console.error('Ayrion Assistant Error:', error);
    return NextResponse.json({ success: false, reply: 'Parents, nagkaroon po ng kaunting aberya. Pakiulit po ulit ang inyong tanong.' }, { status: 500 });
  }
}
