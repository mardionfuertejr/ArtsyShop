'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const DEFAULT_ITEMS = [
  { id: '1', text: 'Restock Dusty Rose ribbon', completed: false },
  { id: '2', text: 'Check epoxy resin stock', completed: true },
  { id: '3', text: 'Prepare packaging for custom orders', completed: false },
];

export default function AdminNotepad() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const inputRef = useRef(null);
  const channelRef = useRef(null);
  const localBcRef = useRef(null);

  // Fetch latest notes from API/Supabase
  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notes', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.notes) && data.notes.length > 0) {
          setItems(data.notes);
          try {
            localStorage.setItem('mmartsy_admin_checklist', JSON.stringify(data.notes));
          } catch (e) {}
        }
      }
    } catch (err) {
      // Offline fallback already loaded from localStorage
    }
  }, []);

  // Setup Realtime sync (Supabase Realtime Channel + BroadcastChannel + Periodic Heartbeat)
  useEffect(() => {
    // 1. Initial local load for instant rendering
    try {
      const saved = localStorage.getItem('mmartsy_admin_checklist');
      if (saved) {
        setItems(JSON.parse(saved));
      } else {
        setItems(DEFAULT_ITEMS);
      }
    } catch (e) {
      setItems(DEFAULT_ITEMS);
    }

    // 2. Fetch server notes
    fetchNotes();

    // 3. Browser BroadcastChannel for instant local cross-tab sync
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        localBcRef.current = new BroadcastChannel('mmartsy_studio_notes_channel');
        localBcRef.current.onmessage = (event) => {
          if (event.data?.type === 'SYNC_NOTES' && Array.isArray(event.data.items)) {
            setItems(event.data.items);
          }
        };
      }
    } catch (e) {}

    // 4. Supabase Realtime Channel for Cross-Device / Cloud Realtime Sync
    let supabase = null;
    try {
      supabase = createClient();
      if (supabase) {
        const channel = supabase.channel('studio-notes-realtime', {
          config: { broadcast: { self: false } },
        });

        channel
          .on('broadcast', { event: 'notes-sync' }, (payload) => {
            if (payload?.payload?.items && Array.isArray(payload.payload.items)) {
              setItems(payload.payload.items);
              try {
                localStorage.setItem('mmartsy_admin_checklist', JSON.stringify(payload.payload.items));
              } catch (e) {}
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'studio_notes' }, () => {
            fetchNotes();
          })
          .subscribe();

        channelRef.current = channel;
      }
    } catch (e) {}

    // 5. Periodic polling heartbeat (every 4 seconds) to ensure 100% sync across all admin devices
    const intervalId = setInterval(fetchNotes, 4000);

    return () => {
      clearInterval(intervalId);
      if (localBcRef.current) localBcRef.current.close();
      if (supabase && channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [fetchNotes]);

  // Broadcast change to all devices & tabs
  const broadcastChange = (updatedItems) => {
    // Local Tab Broadcast
    try {
      if (localBcRef.current) {
        localBcRef.current.postMessage({ type: 'SYNC_NOTES', items: updatedItems });
      }
    } catch (e) {}

    // Supabase Cloud Realtime Broadcast
    try {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'notes-sync',
          payload: { items: updatedItems },
        });
      }
    } catch (e) {}
  };

  // Helper to commit and sync changes
  const saveAndSync = async (newItems, apiAction) => {
    setItems(newItems);
    broadcastChange(newItems);
    try {
      localStorage.setItem('mmartsy_admin_checklist', JSON.stringify(newItems));
    } catch (e) {}

    // Send API update in background
    if (apiAction) {
      setIsSyncing(true);
      try {
        await apiAction();
      } catch (e) {}
      setIsSyncing(false);
    }
  };

  const handleAdd = (e) => {
    e.preventDefault();
    const text = inputVal.trim();
    if (!text) return;
    const newItem = { id: `note-${Date.now()}`, text, completed: false };
    const updated = [newItem, ...items];
    saveAndSync(updated, () =>
      fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
    );
    setInputVal('');
  };

  const toggleItem = (id) => {
    const itemToToggle = items.find((it) => it.id === id);
    if (!itemToToggle) return;
    const nextCompleted = !itemToToggle.completed;
    const updated = items.map((it) => (it.id === id ? { ...it, completed: nextCompleted } : it));
    saveAndSync(updated, () =>
      fetch('/api/admin/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: nextCompleted }),
      })
    );
  };

  const deleteItem = (id) => {
    const updated = items.filter((it) => it.id !== id);
    saveAndSync(updated, () =>
      fetch(`/api/admin/notes?id=${id}`, {
        method: 'DELETE',
      })
    );
  };

  const clearDone = () => {
    const updated = items.filter((it) => !it.completed);
    saveAndSync(updated, () =>
      fetch('/api/admin/notes?clear_done=true', {
        method: 'DELETE',
      })
    );
  };

  // Lock body scroll and handle Esc key when modal is open
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') setIsOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);

      // Lock page scroll
      const origBodyOverflow = document.body.style.overflow;
      const origHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = origBodyOverflow;
        document.documentElement.style.overflow = origHtmlOverflow;
      };
    }
  }, [isOpen]);

  const pendingCount = items.filter((it) => !it.completed).length;

  return (
    <>
      {/* Dashboard Top Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 150);
        }}
        className="btn btn-secondary btn-sm"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          fontSize: '12.5px',
          fontWeight: '700',
          borderRadius: '10px',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface, #ffffff)',
          color: 'var(--color-text, #1e293b)',
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <i className="fa-solid fa-list-check" style={{ color: 'var(--color-primary, #b45309)', fontSize: '13px' }}></i>
        <span>Studio Notes</span>
        {pendingCount > 0 && (
          <span
            style={{
              background: 'var(--color-primary, #b45309)',
              color: '#ffffff',
              fontSize: '10.5px',
              fontWeight: '800',
              padding: '1px 7px',
              borderRadius: '9999px',
            }}
          >
            {pendingCount}
          </span>
        )}
      </button>

      {/* Clean Modal with Soft Frosted Blur Backdrop & Stable Position */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.68)',
            backdropFilter: 'blur(30px) saturate(150%)',
            WebkitBackdropFilter: 'blur(30px) saturate(150%)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 20px 260px 80px',
            animation: 'fadeIn 0.12s ease',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transition: 'none',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 22px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-note-sticky" style={{ color: 'var(--color-primary, #b45309)', fontSize: '17px' }}></i>
                <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Studio Notes & Checklist
                </h2>
                {isSyncing && (
                  <span style={{ fontSize: '11px', color: '#16A34A', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <i className="fa-solid fa-arrows-rotate fa-spin" style={{ fontSize: '10px' }}></i>
                  </span>
                )}
              </div>

              <button
                onClick={() => setIsOpen(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#64748b',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleAdd}
              style={{
                padding: '14px 22px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                gap: '10px',
                background: '#FAF6F0',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Add a reminder or to-do..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '13.5px',
                  outline: 'none',
                  background: '#ffffff',
                  color: '#0f172a',
                }}
              />
              <button
                type="submit"
                disabled={!inputVal.trim()}
                className="btn btn-primary btn-sm"
                style={{
                  padding: '0 18px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  opacity: !inputVal.trim() ? 0.6 : 1,
                  cursor: !inputVal.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                Add
              </button>
            </form>

            {/* Checklist items */}
            <div
              style={{
                padding: '14px 22px',
                maxHeight: '300px',
                minHeight: '140px',
                overflowY: 'auto',
                overflowX: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
                  <i className="fa-solid fa-clipboard-check" style={{ fontSize: '26px', opacity: 0.5, marginBottom: '8px', display: 'block' }}></i>
                  <p style={{ fontSize: '13.5px', margin: 0, fontWeight: '600' }}>No notes or tasks</p>
                </div>
              ) : (
                items.map((it) => (
                  <div
                    key={it.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: it.completed ? '#f8fafc' : '#ffffff',
                      border: it.completed ? '1px dashed #e2e8f0' : '1px solid #f1f5f9',
                      transition: 'all 0.12s ease',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      onClick={() => toggleItem(it.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flex: 1,
                        minWidth: 0,
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '6px',
                          border: it.completed ? '1.5px solid #16A34A' : '1.5px solid #cbd5e1',
                          background: it.completed ? '#16A34A' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: '11px',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {it.completed && <i className="fa-solid fa-check"></i>}
                      </div>
                      <span
                        style={{
                          fontSize: '13.5px',
                          color: it.completed ? '#94a3b8' : '#1e293b',
                          textDecoration: it.completed ? 'line-through' : 'none',
                          fontWeight: it.completed ? '500' : '600',
                          lineHeight: 1.4,
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                          minWidth: 0,
                        }}
                      >
                        {it.text}
                      </span>
                    </div>

                    <button
                      onClick={() => deleteItem(it.id)}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '6px',
                        fontSize: '13px',
                        flexShrink: 0,
                        borderRadius: '6px',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#DC2626';
                        e.currentTarget.style.background = '#FEF2F2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#94a3b8';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Balanced Footer */}
            <div
              style={{
                padding: '12px 22px',
                borderTop: '1px solid #f1f5f9',
                background: '#FAF6F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                {pendingCount === 0 ? 'All tasks done 🎉' : `${pendingCount} ${pendingCount === 1 ? 'item' : 'items'} pending`}
              </span>
              {items.some((it) => it.completed) && (
                <button
                  onClick={clearDone}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--color-primary, #b45309)',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-primary, #b45309)')}
                >
                  Clear completed
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
