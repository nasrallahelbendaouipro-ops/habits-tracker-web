import { NextRequest, NextResponse } from 'next/server';

export type ParsedShift = {
  date: string;   // YYYY-MM-DD
  start: string;  // HH:MM (24h)
  end: string;    // HH:MM (24h)
  title: string;
};

// ─── Shared helpers ────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

// Build a YYYY-MM-DD string from local year/month/day without timezone shifting
function localIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Return true if a line looks like a staff note rather than an event name
// e.g. "Gaelle off SAMEDI HUITRES"
const FR_DAY_RE = /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i;
function isStaffNote(line: string): boolean {
  if (/\boff\b|\babsent|\bcongé\b/i.test(line)) return true;
  if (FR_DAY_RE.test(line)) return true;
  // Mostly uppercase (e.g. "GAELLE OFF SAMEDI") — more than 60% uppercase letters
  const letters = line.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 3 && (line.replace(/[^A-Z]/g, '').length / letters.length) > 0.6) return true;
  return false;
}

function parseTime(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  // 18h or 18h30
  let m = s.match(/^(\d{1,2})h(\d{0,2})$/);
  if (m) {
    const h = parseInt(m[1]), min = m[2] ? parseInt(m[2]) : 0;
    if (h <= 23 && min <= 59) return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  // 18:00
  m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const h = parseInt(m[1]), min = parseInt(m[2]);
    if (h <= 23 && min <= 59) return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  // 6pm / 6:30pm
  m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (m) {
    let h = parseInt(m[1]);
    const min = m[2] ? parseInt(m[2]) : 0;
    if (m[3] === 'pm' && h !== 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
    if (h <= 23) return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }
  return null;
}

// ─── French roster parser ──────────────────────────────────────────────────────
// Handles the VandB-style format:
//   LUNDI 04 MAI 2026
//   Apéro latino                  ← optional event name
//   VandB Saint-Memmie • Planning ← location line (contains •)
//   17:00 - 22:30 (+1h30m)        ← time range (extra tokens ignored)
//   Shift validé O                ← status line (ignored)

const FR_MONTHS: Record<string, number> = {
  janvier: 1, fevrier: 2, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, août: 8, septembre: 9, octobre: 10, novembre: 11,
  decembre: 12, décembre: 12,
};

// Matches: LUNDI 04 MAI 2026  (day-name is captured but only used for context)
const FR_DATE_HEADER = /^(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})\s+([a-zéûô]+)\s+(\d{4})$/i;

// Matches a time range anywhere in a line: 17:00 - 22:30 or 17h - 22h30
const TIME_RANGE = /(\d{1,2}(?:h\d{0,2}|:\d{2}))\s*[-–]\s*(\d{1,2}(?:h\d{0,2}|:\d{2}))/i;

// Lines to skip outright
const SKIP_LINE = /shift\s+valid|^[0-9]{1,2}\s+[a-zéûô]+\s*[-–]\s*[0-9]{1,2}\s+[a-zéûô]+/i;

function parseFrenchRoster(text: string): ParsedShift[] {
  const shifts: ParsedShift[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let currentDate: string | null = null;
  let eventName: string | null = null;
  let workplace: string | null = null;

  for (const line of lines) {
    // Date header
    const dateMatch = line.match(FR_DATE_HEADER);
    if (dateMatch) {
      currentDate = null; eventName = null; workplace = null;
      const day = parseInt(dateMatch[1]);
      const month = FR_MONTHS[dateMatch[2].toLowerCase()];
      const year = parseInt(dateMatch[3]);
      if (month) currentDate = localIsoDate(year, month, day);
      continue;
    }

    if (!currentDate) continue;

    // Skip junk lines
    if (SKIP_LINE.test(line)) continue;

    // Time range — this is the core data line
    const timeMatch = line.match(TIME_RANGE);
    if (timeMatch) {
      const start = parseTime(timeMatch[1]);
      const end   = parseTime(timeMatch[2]);
      if (start && end) {
        const title = eventName ?? workplace ?? 'Shift';
        shifts.push({ date: currentDate, start, end, title });
      }
      // Reset event name after emitting, keep date for possible multi-shift day
      eventName = null;
      continue;
    }

    // Location line (contains •) — extract workplace name before the •
    if (line.includes('•')) {
      const before = line.split('•')[0].trim();
      if (before) workplace = before;
      continue;
    }

    // Anything else before the time line: use as event name only if it looks like one
    if (!eventName && !isStaffNote(line)) eventName = line;
  }

  return shifts;
}

// ─── Generic inline parser ─────────────────────────────────────────────────────
// Handles: Mon 18h-23h, Wed 19:00-02:00, 15/05 18h-23h

const DAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0, dim: 0, dimanche: 0,
  mon: 1, monday: 1, lun: 1, lundi: 1,
  tue: 2, tuesday: 2, mar: 2, mardi: 2,
  wed: 3, wednesday: 3, mer: 3, mercredi: 3,
  thu: 4, thursday: 4, jeu: 4, jeudi: 4,
  fri: 5, friday: 5, ven: 5, vendredi: 5,
  sat: 6, saturday: 6, sam: 6, samedi: 6,
};

function nextOccurrenceISO(dayNum: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let diff = dayNum - today.getDay();
  if (diff < 0) diff += 7;
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  return localIsoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

const INLINE_RANGE = /(\d{1,2}(?:h\d{0,2}|:\d{2}|(?::\d{2})?\s*(?:am|pm)))\s*[-–]\s*(\d{1,2}(?:h\d{0,2}|:\d{2}|(?::\d{2})?\s*(?:am|pm)))/gi;
const DAY_PAT = new RegExp(`\\b(${Object.keys(DAY_MAP).join('|')})\\b`, 'gi');
const DATE_PAT = /(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?/g;

function parseGeneric(text: string): ParsedShift[] {
  const shifts: ParsedShift[] = [];
  const lines = text.split(/[\n;]+/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    INLINE_RANGE.lastIndex = 0;
    const rangeMatch = INLINE_RANGE.exec(line);
    if (!rangeMatch) continue;

    const startTime = parseTime(rangeMatch[1]);
    const endTime   = parseTime(rangeMatch[2]);
    if (!startTime || !endTime) continue;

    DAY_PAT.lastIndex = 0;
    const dayMatches = [...line.matchAll(DAY_PAT)];
    if (dayMatches.length > 0) {
      for (const dm of dayMatches) {
        const dayNum = DAY_MAP[dm[1].toLowerCase()];
        if (dayNum !== undefined)
          shifts.push({ date: nextOccurrenceISO(dayNum), start: startTime, end: endTime, title: 'Shift' });
      }
      continue;
    }

    DATE_PAT.lastIndex = 0;
    const dateMatch = DATE_PAT.exec(line);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]), month = parseInt(dateMatch[2]);
      const year = dateMatch[3]
        ? (parseInt(dateMatch[3]) < 100 ? 2000 + parseInt(dateMatch[3]) : parseInt(dateMatch[3]))
        : new Date().getFullYear();
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31)
        shifts.push({ date: localIsoDate(year, month, day), start: startTime, end: endTime, title: 'Shift' });
    }
  }

  return shifts;
}

// ─── Combined stub ─────────────────────────────────────────────────────────────
// Try the French roster format first; fall back to the generic inline parser.

function parseStub(text: string): ParsedShift[] {
  const french = parseFrenchRoster(text);
  if (french.length > 0) return french;
  return parseGeneric(text);
}

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
    const { text } = await req.json() as { text: string };
    if (!text?.trim()) return NextResponse.json({ error: 'text is required' }, { status: 400 });

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
      shifts = parsed.shifts ?? [];
    } else {
      shifts = parseStub(text);
    }

    return NextResponse.json({ shifts, aiPowered });
  } catch (err) {
    console.error('[parse-shift]', err);
    return NextResponse.json({ error: 'Failed to parse shifts' }, { status: 500 });
  }
}
