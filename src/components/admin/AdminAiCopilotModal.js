'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Clean and human structured parser: strips raw markdown symbols (*, #, quotes) and renders clean typography
function formatAiText(text) {
  if (!text) return '';
  const lines = text.split('\n');

  return lines.map((line, idx) => {
    let trimmed = line.trim();
    if (!trimmed) {
      return <div key={idx} style={{ height: '6px' }} />;
    }

    // Strip leading header hashtags if any (e.g. ### Title)
    trimmed = trimmed.replace(/^#+\s*/, '');

    // Check if bullet point
    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('* ')) {
      // Clean bullet prefix and strip wrapping quotes or rogue asterisks
      let content = trimmed.replace(/^[•\-\*]\s*/, '').replace(/^\s*["'*]+/, '').replace(/["'*]+\s*$/, '').trim();

      // Handle internal **bold** if present
      const parts = content.split(/(\*\*.*?\*\*)/g);

      return (
        <div
          key={idx}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            margin: '4px 0',
            fontSize: '12.5px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: '#BE123C',
              marginTop: '7px',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={pIdx} style={{ color: '#0F172A', fontWeight: '700' }}>
                    {part.slice(2, -2).replace(/[*#]/g, '')}
                  </strong>
                );
              }
              return part.replace(/[*#]/g, '');
            })}
          </div>
        </div>
      );
    }

    // Regular line with bold formatting
    const parts = trimmed.split(/(\*\*.*?\*\*)/g);
    return (
      <div key={idx} style={{ margin: '3px 0' }}>
        {parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} style={{ color: '#0F172A', fontWeight: '700' }}>
                {part.slice(2, -2).replace(/[*#]/g, '')}
              </strong>
            );
          }
          return part.replace(/[*#]/g, '');
        })}
      </div>
    );
  });
}

export default function AdminAiCopilotModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechSynthesisEnabled, setSpeechSynthesisEnabled] = useState(false);
  const [toastNotice, setToastNotice] = useState('');

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hi Parents! I'm your baby **Ayrion**. Don't worry, I'm taking care of our shop. What can I do for you today? 👶✨",
      time: 'Now',
    },
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setToastNotice('');
        };

        recognition.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          setInput(transcript);
        };

        recognition.onerror = (event) => {
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setToastNotice('Please allow microphone access in your browser.');
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Listen for custom trigger event (e.g. from topbar button)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('likha_open_ayrion', handleOpen);
    return () => window.removeEventListener('likha_open_ayrion', handleOpen);
  }, []);

  // Lock background body scroll when Ayrion drawer is open
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Text to Speech playback
  const speakText = (text) => {
    if (!speechSynthesisEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*_#`~]/g, '').replace(/•/g, ', ');
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'en-US';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  // Toggle Speech Recognition
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch {
        recognitionRef.current.stop();
      }
    }
  };

  // Execute Action from AI
  const executeAction = async (action, msgId) => {
    if (!action) return;

    try {
      const supabase = createClient();

      // 0. CREATE NEW PRODUCT
      if (action.type === 'CREATE_PRODUCT') {
        const { name, price = 150, category = 'Special', description = 'Handcrafted with love by M&M Artsy', isAvailable = true, stock = 10 } = action.payload;
        const newProd = {
          id: 'prod_' + Date.now(),
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          base_price: parseFloat(price) || 150,
          price: parseFloat(price) || 150,
          is_available: isAvailable,
          is_ready_made: true,
          ready_made_stock: parseInt(stock, 10) || 10,
          category_name: category,
          description,
          images: ['/images/products/sunflower-single.jpg'],
          created_at: new Date().toISOString(),
        };

        if (supabase) {
          try {
            await supabase.from('products').insert([{
              name: newProd.name,
              slug: newProd.slug,
              base_price: newProd.base_price,
              is_available: newProd.is_available,
              is_ready_made: newProd.is_ready_made,
              ready_made_stock: newProd.ready_made_stock,
              description: newProd.description,
            }]);
          } catch {}
        }

        const localProds = JSON.parse(localStorage.getItem('likha_custom_products') || '[]');
        localProds.unshift(newProd);
        localStorage.setItem('likha_custom_products', JSON.stringify(localProds));

        const mockProds = JSON.parse(localStorage.getItem('likha_mock_products') || '[]');
        mockProds.unshift(newProd);
        localStorage.setItem('likha_mock_products', JSON.stringify(mockProds));

        window.dispatchEvent(new CustomEvent('likha_products_updated', { detail: { product: newProd } }));
        window.dispatchEvent(new CustomEvent('likha_toast', {
          detail: {
            type: 'success',
            title: 'New Product Added! 🌸',
            message: `"${name}" is now live in our shop (₱${newProd.base_price.toFixed(2)}).`,
            duration: 4000,
          },
        }));

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, actionExecuted: true, actionResultText: `✓ Created "${name}" (₱${newProd.base_price.toFixed(2)}) & live on shop` } : m
          )
        );

        speakText(`I have created ${name} and added it to our shop for you, Parents!`);
      }

      // 1. UPDATE ORDER STATUS
      else if (action.type === 'UPDATE_ORDER_STATUS') {
        const { referenceCode, status } = action.payload;

        if (supabase && referenceCode) {
          await supabase.from('orders').update({ status }).ilike('reference_code', `%${referenceCode}%`);
        }

        const myOrders = JSON.parse(localStorage.getItem('likha_my_orders') || '[]');
        const idx = myOrders.findIndex(o => (o.reference_code || o.referenceCode || '').toUpperCase().includes(referenceCode.toUpperCase()));
        if (idx >= 0) {
          myOrders[idx].status = status;
          localStorage.setItem('likha_my_orders', JSON.stringify(myOrders));
        }

        const mockOrders = JSON.parse(localStorage.getItem('likha_mock_orders') || '[]');
        const mIdx = mockOrders.findIndex(o => (o.reference_code || o.referenceCode || '').toUpperCase().includes(referenceCode.toUpperCase()));
        if (mIdx >= 0) {
          mockOrders[mIdx].status = status;
          localStorage.setItem('likha_mock_orders', JSON.stringify(mockOrders));
        }

        window.dispatchEvent(new CustomEvent('likha_order_updated', { detail: { referenceCode, status } }));
        window.dispatchEvent(new CustomEvent('likha_toast', {
          detail: {
            type: 'success',
            title: 'Order Updated! 🤖',
            message: `Order #${referenceCode} is now "${status.toUpperCase()}".`,
            duration: 3500,
          },
        }));

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, actionExecuted: true, actionResultText: `✓ Status changed to ${status.toUpperCase()}` } : m
          )
        );

        speakText(`Order ${referenceCode} is now updated to ${status}.`);
      }

      // 2. UPDATE MATERIAL STOCK
      else if (action.type === 'UPDATE_MATERIAL_STOCK') {
        const { materialId, materialName, deltaQuantity, newQuantity } = action.payload;

        if (supabase && materialId) {
          await supabase.from('raw_materials').update({ current_stock: newQuantity }).eq('id', materialId);
        }

        const rawMats = JSON.parse(localStorage.getItem('likha_materials') || '[]');
        const mIndex = rawMats.findIndex(m => m.id === materialId || m.name.toLowerCase() === materialName.toLowerCase());
        if (mIndex >= 0) {
          rawMats[mIndex].current_stock = newQuantity;
          rawMats[mIndex].currentStock = newQuantity;
          localStorage.setItem('likha_materials', JSON.stringify(rawMats));
        }

        window.dispatchEvent(new CustomEvent('likha_materials_updated', { detail: { materialId, newQuantity } }));
        window.dispatchEvent(new CustomEvent('likha_toast', {
          detail: {
            type: 'success',
            title: 'Stock Updated! 📦',
            message: `${materialName} is now ${newQuantity} units (+${deltaQuantity}).`,
            duration: 3500,
          },
        }));

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, actionExecuted: true, actionResultText: `✓ Stock updated to ${newQuantity}` } : m
          )
        );

        speakText(`${materialName} restocked. Current stock is ${newQuantity}.`);
      }

      // 3. TOGGLE PRODUCT STATUS (ENABLE / DISABLE)
      else if (action.type === 'TOGGLE_PRODUCT_STATUS') {
        const { productId, productName, isAvailable } = action.payload;

        if (supabase && productId) {
          await supabase.from('products').update({ is_available: isAvailable }).eq('id', productId);
        }

        const localProds = JSON.parse(localStorage.getItem('likha_custom_products') || '[]');
        const pIdx = localProds.findIndex(p => p.id === productId || p.name.toLowerCase() === productName.toLowerCase());
        if (pIdx >= 0) {
          localProds[pIdx].is_available = isAvailable;
          localProds[pIdx].isAvailable = isAvailable;
          localStorage.setItem('likha_custom_products', JSON.stringify(localProds));
        }

        window.dispatchEvent(new CustomEvent('likha_products_updated', { detail: { productId, isAvailable } }));
        window.dispatchEvent(new CustomEvent('likha_toast', {
          detail: {
            type: 'success',
            title: 'Product Catalog Updated! ✨',
            message: `${productName} is now ${isAvailable ? 'AVAILABLE in shop' : 'DISABLED/HIDDEN'}.`,
            duration: 3500,
          },
        }));

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, actionExecuted: true, actionResultText: `✓ ${productName} is ${isAvailable ? 'Available' : 'Hidden'}` } : m
          )
        );

        speakText(`${productName} is now ${isAvailable ? 'available in store' : 'hidden'}.`);
      }

      // 4. NAVIGATE PAGE
      else if (action.type === 'NAVIGATE_PAGE') {
        const { path, label } = action.payload;
        if (path) {
          router.push(path);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId ? { ...m, actionExecuted: true, actionResultText: `✓ Opened ${label || path}` } : m
            )
          );
        }
      }

      // 5. UPDATE ANNOUNCEMENT
      else if (action.type === 'UPDATE_ANNOUNCEMENT') {
        const { announcementText } = action.payload;

        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ announcementText, announcementEnabled: true }),
        }).catch(() => {});

        localStorage.setItem('likha_announcement_text', announcementText);
        window.dispatchEvent(new CustomEvent('likha_announcement_updated', { detail: { announcementText } }));
        window.dispatchEvent(new CustomEvent('likha_toast', {
          detail: {
            type: 'success',
            title: 'Announcement Updated! 📢',
            message: announcementText,
            duration: 3500,
          },
        }));

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, actionExecuted: true, actionResultText: `✓ Announcement updated!` } : m
          )
        );

        speakText('Announcement banner updated successfully.');
      }

      // 6. UPDATE GAME DISCOUNTS
      else if (action.type === 'UPDATE_GAME_DISCOUNTS') {
        const { silverDiscount, silverMinSpend, goldDiscount, goldMinSpend, diamondDiscount, diamondMinSpend, enabled } = action.payload;

        const currentSettings = JSON.parse(localStorage.getItem('mm_studio_settings') || '{}');
        const updatedSettings = {
          ...currentSettings,
          ...(silverDiscount !== undefined ? { gameSilverDiscount: silverDiscount } : {}),
          ...(silverMinSpend !== undefined ? { gameSilverMinSpend: silverMinSpend } : {}),
          ...(goldDiscount !== undefined ? { gameGoldDiscount: goldDiscount } : {}),
          ...(goldMinSpend !== undefined ? { gameGoldMinSpend: goldMinSpend } : {}),
          ...(diamondDiscount !== undefined ? { gameDiamondDiscount: diamondDiscount } : {}),
          ...(diamondMinSpend !== undefined ? { gameDiamondMinSpend: diamondMinSpend } : {}),
          ...(enabled !== undefined ? { gameDiscountsEnabled: enabled } : {}),
        };

        localStorage.setItem('mm_studio_settings', JSON.stringify(updatedSettings));
        window.dispatchEvent(new CustomEvent('likha_settings_updated', { detail: updatedSettings }));

        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSettings),
        }).catch(() => {});

        window.dispatchEvent(new CustomEvent('likha_toast', {
          detail: {
            type: 'success',
            title: 'Game Rewards Updated! 🎮',
            message: `Mini-game discounts updated successfully.`,
            duration: 3500,
          },
        }));

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, actionExecuted: true, actionResultText: `✓ Game rewards updated!` } : m
          )
        );

        speakText('Game discounts updated for our shop.');
      }
    } catch (e) {
      console.error('Failed to execute AI action:', e);
    }
  };

  // Send message to AI endpoint
  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMsgId = `user-${Date.now()}`;
    const newMessages = [
      ...messages,
      { id: userMsgId, sender: 'user', text: query, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ];

    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      let liveContext = {};
      try {
        const localOrders = localStorage.getItem('likha_my_orders');
        if (localOrders) liveContext.orders = JSON.parse(localOrders);
        const localProds = localStorage.getItem('likha_custom_products');
        if (localProds) liveContext.products = JSON.parse(localProds);
        const localMats = localStorage.getItem('likha_materials');
        if (localMats) liveContext.materials = JSON.parse(localMats);
      } catch {}

      const res = await fetch('/api/admin/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          liveContext,
          history: newMessages.slice(-6).map((m) => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
        }),
      });

      const data = await res.json();
      const aiReply = data.reply || 'Sorry, please try again.';
      const action = data.action || null;

      const aiMsgId = `ai-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          sender: 'ai',
          text: aiReply,
          action,
          actionExecuted: false,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      speakText(aiReply);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: 'An error occurred. Please try again.',
          time: 'Now',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── AYRION SLIDE-OVER DRAWER ── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '430px',
              height: '100%',
              background: '#FFFFFF',
              boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Clean Header */}
            <div
              style={{
                padding: '14px 18px',
                background: '#FFFFFF',
                borderBottom: '1px solid #EFE4D6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #BE123C 0%, #EA580C 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    boxShadow: '0 3px 8px rgba(190, 18, 60, 0.25)',
                  }}
                >
                  <i className="fa-solid fa-baby"></i>
                </div>
                <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: '800', color: '#0F172A' }}>
                  Ayrion
                </h3>
              </div>

              {/* Header Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setSpeechSynthesisEnabled((prev) => !prev)}
                  style={{
                    background: speechSynthesisEnabled ? '#FEF2F2' : '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    color: speechSynthesisEnabled ? '#BE123C' : '#94A3B8',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                  }}
                  title={speechSynthesisEnabled ? 'Voice reply ON' : 'Voice reply MUTED'}
                  aria-label="Toggle voice replies"
                >
                  <i className={speechSynthesisEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark'}></i>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    color: '#64748B',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '13.5px',
                  }}
                  aria-label="Close Agent"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            {/* Quick Action Chips */}
            <div
              style={{
                padding: '8px 14px',
                background: '#FAF8F5',
                borderBottom: '1px solid #EFE4D6',
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                scrollbarWidth: 'none',
              }}
            >
              {[
                'Check low stocks',
                "Today's orders",
                'Our total sales',
                'Open orders page',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSendMessage(chip)}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E5DFD5',
                    borderRadius: '999px',
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#475569',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#BE123C';
                    e.currentTarget.style.color = '#BE123C';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5DFD5';
                    e.currentTarget.style.color = '#475569';
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div
              style={{
                flex: 1,
                padding: '14px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: '#FAFBFD',
              }}
            >
              {messages.map((m) => {
                const isUser = m.sender === 'user';
                return (
                  <div
                    key={m.id}
                    className="ayrion-msg-bubble"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      gap: '3px',
                      maxWidth: '92%',
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        background: isUser ? 'linear-gradient(135deg, #BE123C 0%, #EA580C 100%)' : '#FFFFFF',
                        color: isUser ? '#FFFFFF' : '#0F172A',
                        padding: '11px 15px',
                        borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                        fontSize: '12.5px',
                        lineHeight: 1.5,
                        boxShadow: isUser ? '0 4px 12px rgba(190, 18, 60, 0.2)' : '0 2px 6px rgba(0,0,0,0.04)',
                        border: isUser ? 'none' : '1px solid #EFE4D6',
                      }}
                    >
                      {formatAiText(m.text)}

                      {/* Interactive Action Card if proposed */}
                      {m.action && (
                        <div
                          style={{
                            marginTop: '10px',
                            background: '#FAF5EF',
                            border: '1.5px solid #EFE4D6',
                            borderRadius: '10px',
                            padding: '10px 12px',
                          }}
                        >
                          <div style={{ fontSize: '10px', fontWeight: '800', color: '#C2410C', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.04em' }}>
                            Action Proposal
                          </div>

                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A', marginBottom: '8px', lineHeight: 1.4 }}>
                            {m.action.type === 'CREATE_PRODUCT' && `Create Product: "${m.action.payload.name}" — ₱${parseFloat(m.action.payload.price || 150).toFixed(2)}`}
                            {m.action.type === 'UPDATE_ORDER_STATUS' && `Set Order #${m.action.payload.referenceCode} to "${m.action.payload.status.toUpperCase()}"`}
                            {m.action.type === 'UPDATE_MATERIAL_STOCK' && `Add +${m.action.payload.deltaQuantity} to ${m.action.payload.materialName} (New: ${m.action.payload.newQuantity})`}
                            {m.action.type === 'TOGGLE_PRODUCT_STATUS' && `${m.action.payload.isAvailable ? 'Enable' : 'Disable'} ${m.action.payload.productName}`}
                            {m.action.type === 'NAVIGATE_PAGE' && `Go to ${m.action.payload.label || m.action.payload.path}`}
                            {m.action.type === 'UPDATE_ANNOUNCEMENT' && `Announcement: "${m.action.payload.announcementText}"`}
                          </div>

                          {m.actionExecuted ? (
                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#16A34A', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <i className="fa-solid fa-circle-check"></i>
                              <span>{m.actionResultText || 'Action Executed'}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => executeAction(m.action, m.id)}
                              style={{
                                width: '100%',
                                background: '#16A34A',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '7px',
                                padding: '7px 12px',
                                fontSize: '11.5px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                              }}
                            >
                              <i className={m.action.type === 'NAVIGATE_PAGE' ? 'fa-solid fa-arrow-right' : 'fa-solid fa-check'}></i>
                              <span>{m.action.type === 'NAVIGATE_PAGE' ? 'Open Page Now' : 'Apply Action'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <span style={{ fontSize: '9.5px', color: '#94A3B8', fontWeight: '600' }}>
                      {m.time}
                    </span>
                  </div>
                );
              })}

              {loading && (
                <div
                  className="ayrion-msg-bubble"
                  style={{
                    alignSelf: 'flex-start',
                    background: '#FFFFFF',
                    padding: '11px 15px',
                    borderRadius: '16px 16px 16px 2px',
                    border: '1px solid #EFE4D6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#64748B',
                  }}
                >
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ color: '#BE123C' }}></i>
                  <span style={{ fontWeight: '600' }}>Ayrion is on it, Parents...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Listening Feedback with Animated Sound Waves */}
            {isListening && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #BE123C 0%, #EA580C 100%)',
                  color: '#FFFFFF',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  fontWeight: '700',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '16px' }}>
                    <div className="ayrion-wave-bar"></div>
                    <div className="ayrion-wave-bar"></div>
                    <div className="ayrion-wave-bar"></div>
                    <div className="ayrion-wave-bar"></div>
                  </div>
                  <span>Listening to Parents... Speak now 👶</span>
                </div>
                <button
                  type="button"
                  onClick={toggleListening}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px', color: '#FFFFFF', padding: '2px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
                >
                  Done
                </button>
              </div>
            )}

            {toastNotice && (
              <div style={{ background: '#FFFBEB', color: '#B45309', padding: '6px 14px', fontSize: '11px', fontWeight: '600' }}>
                ℹ️ {toastNotice}
              </div>
            )}

            {/* Input & Voice Controls */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{
                padding: '10px 14px',
                background: '#FFFFFF',
                borderTop: '1px solid #EFE4D6',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {/* Mic Icon Button */}
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: isListening ? '#BE123C' : '#FAF5EF',
                    color: isListening ? '#FFFFFF' : '#C2410C',
                    border: isListening ? 'none' : '1px solid #EFE4D6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '14px',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                  title={isListening ? 'Stop' : 'Speak'}
                  aria-label="Voice input"
                >
                  <i className={isListening ? 'fa-solid fa-microphone-slash' : 'fa-solid fa-microphone'}></i>
                </button>
              )}

              {/* Clean Input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? 'Listening to Parents...' : 'Tell baby Ayrion what you need...'}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #E2E8F0',
                  fontSize: '12.5px',
                  outline: 'none',
                  background: '#F8FAFC',
                }}
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: input.trim() && !loading ? 'linear-gradient(135deg, #BE123C 0%, #EA580C 100%)' : '#E2E8F0',
                  color: input.trim() && !loading ? '#FFFFFF' : '#94A3B8',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  flexShrink: 0,
                }}
                aria-label="Send command"
              >
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
