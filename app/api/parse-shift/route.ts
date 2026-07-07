import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseShiftSchema } from '@/lib/validation/schemas';
import { parseStub, expandWithTravel, type ParsedShift } from '@/lib/shift-parser';

// ─── Rate limiter ──────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT) return true;
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  try {
    const rawBody = await req.json();
    const parsedBody = parseShiftSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid payload', issues: z.treeifyError(parsedBody.error) }, { status: 400 });
    }
    const { text } = parsedBody.data;

    let shifts: ParsedShift[];
    const aiPowered = !!process.env.OPENAI_API_KEY;

    if (aiPowered) {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `Parse work shifts from the user text (may be French). Return JSON: { "shifts": [{ "date": "YYYY-MM-DD", "start": "HH:MM", "end": "HH:MM", "title": "Shift name or event name" }] }. Today is ${today}. Use 24h time. For overnight shifts keep the start date. Ignore status lines like "Shift validé".`,
            },
            { role: 'user', content: text },
          ],
          max_tokens: 800,
        }),
      });
      const json = await res.json();
      const parsed = JSON.parse(json.choices[0].message.content);
      shifts = expandWithTravel(parsed.shifts ?? []);
    } else {
      shifts = parseStub(text);
    }

    return NextResponse.json({ shifts, aiPowered });
  } catch (err) {
    console.error('[parse-shift]', err);
    return NextResponse.json({ error: 'Failed to parse shifts' }, { status: 500 });
  }
}
