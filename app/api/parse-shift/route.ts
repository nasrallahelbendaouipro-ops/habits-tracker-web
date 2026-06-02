import { NextRequest, NextResponse } from 'next/server';

export type ParsedShift = {
  date: string;   // YYYY-MM-DD
  start: string;  // HH:MM (24h)
  end: string;    // HH:MM (24h)
  title: string;
  isTravel?: boolean;
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

// ─── Travel helpers ────────────────────────────────────────────────────────────

function subtractMinutes(time: string, mins: number): { time: string; dayOffset: number } {
  const [h, m] = time.split(':').map(Number);
  let total = h * 60 + m - mins;
  let dayOffset = 0;
  if (total < 0) { total += 24 * 60; dayOffset = -1; }
  return {
    time: `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`,
    dayOffset,
  };
}

function addDaysToISO(iso: string, days: number): string {
  const [y, mo, d] = iso.split('-').map(Number);
  const dt = new Date(y, mo - 1, d);
  dt.setDate(dt.getDate() + days);
  return localIsoDate(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

function emitWithTravel(results: ParsedShift[], date: string, start: string, end: string, title: string): void {
  const { time: travelStart, dayOffset } = subtractMinutes(start, 30);
  const travelDate = dayOffset !== 0 ? addDaysToISO(date, dayOffset) : date;
  results.push({ date: travelDate, start: travelStart, end: start, title: 'Trajet', isTravel: true });
  results.push({ date, start, end, title });
}

function expandWithTravel(raw: ParsedShift[]): ParsedShift[] {
  const out: ParsedShift[] = [];
  for (const s of raw) emitWithTravel(out, s.date, s.start, s.end, s.title);
  return out;
}

// ─── French roster parser ──────────────────────────────────────────────────────
// Handles two VandB-style layouts:
//
// Inline format (time immediately follows location):
//   LUNDI 04 MAI 2026
//   Apéro latino                  ← optional event name
//   VandB Saint-Memmie • Planning ← location line (contains •)
//   17:00 - 22:30 (+1h30m)        ← time range (extra tokens ignored)
//   Shift validé O                ← status line (ignored)
//
// Deferred format (times grouped at the bottom, one per date, in order):
//   JEUDI 21 MAI 2026
//   Soirée stand up Livraison 14h-16h   ← embedded time = event context, not shift
//   VandB Saint-Memmie • Planning
//   VENDREDI 22 MAI 2026
//   VandB Saint-Memmie • Planning
//   SAMEDI 23 MAI 2026
//   VandB Saint-Memmie • Planning
//   19:30 - 22:30   ← JEUDI's time
//   17:30 - 22:30   ← VENDREDI's time
//   18:30 - 22:30   ← SAMEDI's time

const FR_MONTHS: Record<string, number> = {
  janvier: 1, fevrier: 2, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, août: 8, septembre: 9, octobre: 10, novembre: 11,
  decembre: 12, décembre: 12,
};

// Matches: LUNDI 04 MAI 2026
const FR_DATE_HEADER = /^(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})\s+([a-zéûô]+)\s+(\d{4})$/i;

// Matches a time range anywhere in a line: 17:00 - 22:30 or 17h - 22h30
const TIME_RANGE = /(\d{1,2}(?:h\d{0,2}|:\d{2}))\s*[-–]\s*(\d{1,2}(?:h\d{0,2}|:\d{2}))/i;

// Lines to skip outright
const SKIP_LINE = /shift\s+valid|^[0-9]{1,2}\s+[a-zéûô]+\s*[-–]\s*[0-9]{1,2}\s+[a-zéûô]+/i;

// True when a line is exclusively a time range (e.g. "19:30 - 22:30") with no other meaningful text
function isStandaloneTimeRange(line: string): boolean {
  const m = line.match(TIME_RANGE);
  if (!m) return false;
  const rest = line.replace(m[0], '').replace(/[-–()+\dhms\s]/g, '');
  return rest.length === 0;
}

function parseFrenchRoster(text: string): ParsedShift[] {
  const shifts: ParsedShift[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // First pass: collect date headers in order
  type DateEntry = { lineIdx: number; date: string };
  const dateHeaders: DateEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(FR_DATE_HEADER);
    if (m) {
      const day = parseInt(m[1]);
      const month = FR_MONTHS[m[2].toLowerCase()];
      const year = parseInt(m[3]);
      if (month) dateHeaders.push({ lineIdx: i, date: localIsoDate(year, month, day) });
    }
  }

  if (dateHeaders.length === 0) return [];

  // Collect standalone time ranges that appear after the last date header
  const lastDateLineIdx = dateHeaders[dateHeaders.length - 1].lineIdx;
  const trailingTimes: string[] = [];
  for (let i = lastDateLineIdx + 1; i < lines.length; i++) {
    if (isStandaloneTimeRange(lines[i])) trailingTimes.push(lines[i]);
  }

  // Deferred format: one trailing time per date, in order
  if (trailingTimes.length > 0 && trailingTimes.length === dateHeaders.length) {
    for (let idx = 0; idx < dateHeaders.length; idx++) {
      const { lineIdx, date } = dateHeaders[idx];
      const nextLineIdx = dateHeaders[idx + 1]?.lineIdx ?? lines.length;

      // Extract event name and workplace for this date block
      let eventName: string | null = null;
      let workplace: string | null = null;
      for (let i = lineIdx + 1; i < nextLineIdx; i++) {
        const line = lines[i];
        if (SKIP_LINE.test(line) || isStandaloneTimeRange(line)) continue;
        if (line.includes('•')) {
          const before = line.split('•')[0].trim();
          if (before) workplace = before;
          continue;
        }
        if (!eventName && !isStaffNote(line)) {
          // Strip any embedded time (e.g. "Soirée stand up Livraison 14h-16h" → "Soirée stand up Livraison")
          const clean = line.replace(TIME_RANGE, '').trim().replace(/\s{2,}/g, ' ');
          if (clean) eventName = clean;
        }
      }

      const timeMatch = trailingTimes[idx].match(TIME_RANGE)!;
      const start = parseTime(timeMatch[1]);
      const end   = parseTime(timeMatch[2]);
      if (start && end) {
        emitWithTravel(shifts, date, start, end, eventName ?? workplace ?? 'Shift');
      }
    }
    return shifts;
  }

  // Inline format: time range follows each date block directly
  let currentDate: string | null = null;
  let eventName: string | null = null;
  let workplace: string | null = null;

  for (const line of lines) {
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
    if (SKIP_LINE.test(line)) continue;

    const timeMatch = line.match(TIME_RANGE);
    if (timeMatch) {
      const start = parseTime(timeMatch[1]);
      const end   = parseTime(timeMatch[2]);
      if (start && end) {
        emitWithTravel(shifts, currentDate, start, end, eventName ?? workplace ?? 'Shift');
      }
      eventName = null;
      continue;
    }

    if (line.includes('•')) {
      const before = line.split('•')[0].trim();
      if (before) workplace = before;
      continue;
    }

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
          emitWithTravel(shifts, nextOccurrenceISO(dayNum), startTime, endTime, 'Shift');
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
        emitWithTravel(shifts, localIsoDate(year, month, day), startTime, endTime, 'Shift');
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
