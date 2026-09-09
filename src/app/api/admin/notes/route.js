import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// In-memory fallback if Supabase table is not yet migrated
let memoryNotes = [
  { id: 'note-1', text: 'Restock Dusty Rose ribbon', completed: false, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'note-2', text: 'Prepare packaging for custom orders', completed: false, created_at: new Date(Date.now() - 1800000).toISOString() },
];

export async function GET() {
  try {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('studio_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return NextResponse.json({ notes: data });
      }
    }
  } catch (err) {
    // Fallback to memory
  }

  return NextResponse.json({ notes: memoryNotes });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const text = (body.text || '').trim();
    if (!text) {
      return NextResponse.json({ error: 'Note text is required' }, { status: 400 });
    }

    const newNote = {
      id: `note-${Date.now()}`,
      text,
      completed: false,
      created_at: new Date().toISOString(),
    };

    try {
      const supabase = await createClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('studio_notes')
          .insert([newNote])
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json({ note: data });
        }
      }
    } catch (err) {}

    // In-memory fallback
    memoryNotes = [newNote, ...memoryNotes];
    return NextResponse.json({ note: newNote });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { id, completed, text } = body;
    if (!id) {
      return NextResponse.json({ error: 'Note ID required' }, { status: 400 });
    }

    const updates = {};
    if (completed !== undefined) updates.completed = completed;
    if (text !== undefined) updates.text = text;

    try {
      const supabase = await createClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('studio_notes')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json({ note: data });
        }
      }
    } catch (err) {}

    // In-memory fallback
    memoryNotes = memoryNotes.map((n) => (n.id === id ? { ...n, ...updates } : n));
    const updated = memoryNotes.find((n) => n.id === id);
    return NextResponse.json({ note: updated });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const clearAllDone = searchParams.get('clear_done');

    try {
      const supabase = await createClient();
      if (supabase) {
        if (clearAllDone === 'true') {
          await supabase.from('studio_notes').delete().eq('completed', true);
        } else if (id) {
          await supabase.from('studio_notes').delete().eq('id', id);
        }
        return NextResponse.json({ success: true });
      }
    } catch (err) {}

    // In-memory fallback
    if (clearAllDone === 'true') {
      memoryNotes = memoryNotes.filter((n) => !n.completed);
    } else if (id) {
      memoryNotes = memoryNotes.filter((n) => n.id !== id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
