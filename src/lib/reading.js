import { toInputDate } from "./borrow";

// Semesters start on these months (0 = January, 6 = July). Change them to match your school calendar.
export const SEMESTER_START_MONTHS = [0, 6];

export function semesterStart(now = new Date()) {
  const m = now.getMonth();
  const startMonth = [...SEMESTER_START_MONTHS].sort((a, b) => b - a).find((sm) => sm <= m);
  if (startMonth !== undefined) return new Date(now.getFullYear(), startMonth, 1);
  return new Date(now.getFullYear() - 1, Math.max(...SEMESTER_START_MONTHS), 1);
}

const dayNumber = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};

// rows: [{ resource_id, opened_on: "YYYY-MM-DD" }]
export function computeReadingStats(rows, now = new Date()) {
  const nums = [...new Set(rows.map((r) => r.opened_on))].map(dayNumber).sort((a, b) => a - b);

  let best = 0, run = 0, prev = null;
  nums.forEach((n) => {
    run = prev !== null && n === prev + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = n;
  });

  const set = new Set(nums);
  const today = dayNumber(toInputDate(now));
  let current = 0;
  let d = set.has(today) ? today : today - 1; // a streak stays alive until the day is over
  while (set.has(d)) { current++; d--; }

  const semStart = toInputDate(semesterStart(now));
  const semester = new Set(rows.filter((r) => r.opened_on >= semStart).map((r) => r.resource_id)).size;
  const total = new Set(rows.map((r) => r.resource_id)).size;

  return { current, best, semester, total, activeToday: set.has(today) };
}

export const BADGES = [
  { key: "first", name: "First Page", hint: "Open your first resource", test: (s) => s.total >= 1, icon: "BookOpen" },
  { key: "worm", name: "Bookworm", hint: "5 resources this semester", test: (s) => s.semester >= 5, icon: "Library" },
  { key: "scholar", name: "Scholar", hint: "15 resources this semester", test: (s) => s.semester >= 15, icon: "GraduationCap" },
  { key: "roll", name: "On a Roll", hint: "3-day streak", test: (s) => s.best >= 3, icon: "Flame" },
  { key: "week", name: "Week Warrior", hint: "7-day streak", test: (s) => s.best >= 7, icon: "Zap" },
  { key: "unstop", name: "Unstoppable", hint: "14-day streak", test: (s) => s.best >= 14, icon: "Trophy" },
];
