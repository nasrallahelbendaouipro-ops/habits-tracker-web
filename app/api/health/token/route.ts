import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET — return (or create) the user's sync token
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('health_sync_tokens')
    .select('token, last_used')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data) return NextResponse.json(data);

  // First time — create one
  const { data: created, error: insertErr } = await supabase
    .from('health_sync_tokens')
    .insert({ user_id: user.id })
    .select('token, last_used')
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  return NextResponse.json(created);
}

// POST — regenerate the token
export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('health_sync_tokens')
    .upsert({ user_id: user.id, token: crypto.randomUUID(), last_used: null }, { onConflict: 'user_id' })
    .select('token, last_used')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
