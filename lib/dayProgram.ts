export type ActivityCategory = 'corps' | 'cerveau' | 'ame' | 'travail';

export type DayActivity = {
  timeSlot: string;
  category: ActivityCategory;
  icon: string;
  title: string;
  detail?: string;
  kcal?: string;
};

export type DayScenario = 'withShift' | 'freeDay' | 'sunday';

export type DayProgram = {
  withShift: DayActivity[];
  freeDay: DayActivity[];
  sunday: DayActivity[];
};

const STORAGE_KEY = 'day_program_v1';
const CATEGORIES: ActivityCategory[] = ['corps', 'cerveau', 'ame', 'travail'];

// Browser-only: uses DOMParser
export function parseDayProgramHTML(html: string): DayProgram {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  function parseScenario(id: string): DayActivity[] {
    return Array.from(doc.querySelector(id)?.querySelectorAll('.schedule-row') ?? [])
      .map(row => {
        const timeSlot = row.querySelector('.time-slot')?.textContent?.trim() ?? '';
        const actDiv   = row.querySelector('.activity');
        const category = CATEGORIES.find(c => actDiv?.classList.contains(c)) ?? 'corps';
        const icon     = actDiv?.querySelector('.activity-icon')?.textContent?.trim() ?? '';
        const title    = actDiv?.querySelector('.activity-title')?.textContent?.trim() ?? '';
        const detail   = actDiv?.querySelector('.activity-detail')?.textContent?.trim() || undefined;
        const kcal     = actDiv?.querySelector('.activity-kcal')?.textContent?.trim() || undefined;
        return { timeSlot, category, icon, title, detail, kcal } satisfies DayActivity;
      })
      .filter(a => a.timeSlot && a.title);
  }

  return {
    withShift: parseScenario('#scenario1'),
    freeDay:   parseScenario('#scenario2'),
    sunday:    parseScenario('#scenario3'),
  };
}

export function saveDayProgram(p: DayProgram): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function loadDayProgram(): DayProgram | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DayProgram) : null;
  } catch {
    return null;
  }
}

export function clearDayProgram(): void {
  localStorage.removeItem(STORAGE_KEY);
}
