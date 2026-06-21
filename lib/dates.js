const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTHS_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

// Returns YYYY-MM-DD using local time, not UTC
export function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayString() {
  return toLocalDateString(new Date());
}

// Shifts a YYYY-MM-DD string by n days (negative = past)
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + n);
  return toLocalDateString(date);
}

// "יום שלישי, 15 ביוני 2026"
export function formatDateHebrew(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = DAYS_HE[date.getDay()];
  const monthName = MONTHS_HE[m - 1];
  return `יום ${dayName}, ${d} ב${monthName} ${y}`;
}

// Short: "15.6"
export function formatDateShort(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d}.${m}`;
}

// Day-of-week index (0=Sun) from a YYYY-MM-DD string
export function dayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

// Sunday of the calendar week containing dateStr
export function startOfWeek(dateStr) {
  return addDays(dateStr, -dayOfWeek(dateStr));
}

// Saturday of the calendar week containing dateStr
export function endOfWeek(dateStr) {
  return addDays(dateStr, 6 - dayOfWeek(dateStr));
}

// Do two [aFrom, aTo] / [bFrom, bTo] date ranges overlap (inclusive)?
export function rangesOverlap(aFrom, aTo, bFrom, bTo) {
  return aFrom <= bTo && bFrom <= aTo;
}

// "20.9–24.9" or "20.9" if same day
export function formatDateRangeShort(from, to) {
  const a = formatDateShort(from);
  if (from === to) return a;
  return `${a}–${formatDateShort(to)}`;
}
