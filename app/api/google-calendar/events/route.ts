import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken, fetchGoogleCalendarEvents } from '@/lib/google-calendar';
import { googleEventsQuerySchema } from '@/lib/validation/schemas';
import { createRateLimiter } from '@/lib/rate-limit';

const limiter = createRateLimiter('google-calendar-events', 20, 60);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (await limiter.check(user.id)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  const parsedQuery = googleEventsQuerySchema.safeParse({
    timeMin: searchParams.get('timeMin'),
    timeMax: searchParams.get('timeMax'),
  });
  if (!parsedQuery.success) {
    return NextResponse.json({ error: 'Invalid query params', issues: z.treeifyError(parsedQuery.error) }, { status: 400 });
  }
  const { timeMin, timeMax } = parsedQuery.data;

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
