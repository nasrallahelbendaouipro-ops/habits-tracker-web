import { createClient } from '@/lib/supabase/server';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export type GoogleToken = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

export type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  colorId?: string;
  description?: string;
  htmlLink?: string;
};

export async function getStoredToken(userId: string): Promise<GoogleToken | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('google_tokens')
    .select('user_id, access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single();
  return (data as GoogleToken) ?? null;
}

export async function upsertToken(token: GoogleToken): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('google_tokens')
    .upsert(token, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function getFreshAccessToken(userId: string): Promise<string | null> {
  const token = await getStoredToken(userId);
  if (!token) return null;

  // Still valid with a 60-second buffer
  if (new Date(token.expires_at).getTime() - Date.now() > 60_000) {
    return token.access_token;
  }

  // Refresh
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) return null;

  const json = await res.json();
  const newExpiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();

  await upsertToken({
    user_id: userId,
    access_token: json.access_token,
    refresh_token: token.refresh_token, // refresh_token is not rotated on refresh
    expires_at: newExpiresAt,
  });

  return json.access_token;
}

export async function fetchGoogleCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Calendar API ${res.status}: ${body}`);
  }

  const json = await res.json();
  return (json.items ?? []) as GoogleCalendarEvent[];
}
