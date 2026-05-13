import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken, fetchGoogleCalendarEvents } from '@/lib/google-calendar';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const timeMin = searchParams.get('timeMin');
  const timeMax = searchParams.get('timeMax');
  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: 'timeMin and timeMax are required' }, { status: 400 });
  }
  const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  if (!ISO_RE.test(timeMin) || !ISO_RE.test(timeMax)) {
    return NextResponse.json({ error: 'timeMin and timeMax must be ISO 8601 datetime strings' }, { status: 400 });
  }

  const accessToken = await getFreshAccessToken(user.id);
  if (!accessToken) {
    return NextResponse.json({ connected: false, events: [] });
  }

  try {
    const events = await fetchGoogleCalendarEvents(accessToken, timeMin, timeMax);
    return NextResponse.json({ connected: true, events });
  } catch (err) {
    console.error('[google-calendar/events]', err);
    return NextResponse.json({ connected: true, events: [], error: 'Failed to fetch from Google' });
  }
}
