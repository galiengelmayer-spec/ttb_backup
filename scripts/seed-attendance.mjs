import { createClient } from '@supabase/supabase-js';
import { CYCLE_LENGTH } from '../lib/cycles.js';

const ttb = createClient(
  'https://busvgzfykkpwapfayqfy.supabase.co',
  'sb_publishable_mFdJ0jFbo66HCvJbNfLAjw_CV-ppABb'
);

const { data: mockClients, error: fetchErr } = await ttb
  .from('clients')
  .select('id')
  .eq('is_mock', true);

if (fetchErr || !mockClients?.length) {
  console.error('No mock clients found. Run seed-clients.mjs first.');
  process.exit(1);
}

const clientIds = mockClients.map(c => c.id);

await ttb.from('attendances').delete().in('client_id', clientIds);
await ttb.from('purchases').delete().in('client_id', clientIds);
console.log(`Cleared existing attendance and purchases for ${clientIds.length} mock clients`);

function dateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}
function rand(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

const MONTHS_BACK = 6;
const MIN_PER_MONTH = 5;
const MAX_PER_MONTH = 8; // max 2 lessons/week x 4 weeks
const OPEN_WEEKDAYS = [0, 1, 2, 3, 4]; // Sun-Thu
const REGULAR_ATTEND_CHANCE = 0.85; // hits most of their fixed days; the rest is vacation/missed days
const EXTRA_DAY_CHANCE = 0.04;      // occasional different day outside their usual schedule

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth();

function monthRange(offset) {
  let m = currentMonth - offset;
  let y = currentYear;
  if (m < 0) { m += 12; y -= 1; }
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const isCurrentMonth = offset === 0;
  const maxDay = isCurrentMonth ? now.getDate() : daysInMonth;
  return { y, m, maxDay };
}

// In-memory tracking of every record generated so far, per client — avoids
// re-querying Supabase mid-script (which silently caps at 1000 rows/request).
const byClient = {};
clientIds.forEach(id => { byClient[id] = []; });

function addRecord(clientId, date) {
  byClient[clientId].push({ client_id: clientId, date });
}

// --- Step 1: give each client a persistent weekly schedule (exactly 2 fixed
// days — a hard cap), then generate attendance around it. Most weeks they
// show up on their usual days; occasionally they skip one (vacation, sick
// day) or show up on a different day entirely.
const clientSchedule = {};
clientIds.forEach(id => {
  clientSchedule[id] = shuffle(OPEN_WEEKDAYS).slice(0, 2).sort();
});

for (let offset = MONTHS_BACK - 1; offset >= 0; offset--) {
  const { y, m, maxDay } = monthRange(offset);

  for (let day = 1; day <= maxDay; day++) {
    const dow = new Date(y, m, day).getDay();
    if (dow === 5 || dow === 6) continue; // closed Fri/Sat

    const date = dateStr(y, m, day);

    for (const clientId of clientIds) {
      const isRegularDay = clientSchedule[clientId].includes(dow);
      const chance = isRegularDay ? REGULAR_ATTEND_CHANCE : EXTRA_DAY_CHANCE;
      if (Math.random() < chance) addRecord(clientId, date);
    }
  }
}

const baseCount = Object.values(byClient).reduce((sum, arr) => sum + arr.length, 0);
console.log(`Base generation: ${baseCount} records (in memory)`);

// --- Step 2: keep every (client, month) within [MIN_PER_MONTH, MAX_PER_MONTH] ---
for (let offset = MONTHS_BACK - 1; offset >= 0; offset--) {
  const { y, m, maxDay } = monthRange(offset);
  const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;

  for (const clientId of clientIds) {
    const monthDates = byClient[clientId].filter(r => r.date.startsWith(monthPrefix)).map(r => r.date);

    if (monthDates.length > MAX_PER_MONTH) {
      const keep = new Set(shuffle(monthDates).slice(0, MAX_PER_MONTH));
      byClient[clientId] = byClient[clientId].filter(r => !r.date.startsWith(monthPrefix) || keep.has(r.date));
      continue;
    }

    if (monthDates.length >= MIN_PER_MONTH) continue;

    const used = new Set(monthDates);
    const candidates = [];
    for (let day = 1; day <= maxDay; day++) {
      const dow = new Date(y, m, day).getDay();
      if (dow === 5 || dow === 6) continue;
      const ds = dateStr(y, m, day);
      if (!used.has(ds)) candidates.push(ds);
    }
    shuffle(candidates);

    const needed = MIN_PER_MONTH - monthDates.length;
    for (let i = 0; i < needed && i < candidates.length; i++) {
      addRecord(clientId, candidates[i]);
    }
  }
}

const afterAdjustCount = Object.values(byClient).reduce((sum, arr) => sum + arr.length, 0);
console.log(`Adjusted to ${MIN_PER_MONTH}-${MAX_PER_MONTH}/month: now ${afterAdjustCount} records`);

// --- Step 3: assign purchases (tickets) per client, simulating the prepaid
// model. Splits the mock pool into four demo categories so every dashboard
// state has something to show. ---
const shuffledIds = shuffle(clientIds);
const dueCandidates = new Set(shuffledIds.slice(0, 5));
const overdueCandidates = new Set(shuffledIds.slice(5, 11));
const unpaidTicketCandidates = new Set(shuffledIds.slice(11, 16));

function ticketChunks(clientId, totalLessons, paid, purchasedAt) {
  const rows = [];
  let remaining = totalLessons;
  while (remaining > 0) {
    const chunk = Math.min(CYCLE_LENGTH, remaining);
    rows.push({ client_id: clientId, lessons_count: chunk, paid, purchased_at: purchasedAt });
    remaining -= chunk;
  }
  return rows;
}

const purchaseRows = [];
for (const id of clientIds) {
  const sorted = [...byClient[id]].sort((a, b) => (a.date < b.date ? -1 : 1));
  const totalAttended = sorted.length;
  if (totalAttended === 0) continue;
  const firstDate = sorted[0].date;

  if (dueCandidates.has(id)) {
    // Paid up, exactly at the end of her current card — the "needs a new
    // card" reminder case, not a debt case.
    purchaseRows.push(...ticketChunks(id, totalAttended, true, firstDate));
  } else if (overdueCandidates.has(id)) {
    // Real overdraft: attended a lesson or two beyond what's been purchased
    // at all — in practice Shirly would never let this run higher than that.
    const overdraft = rand(1, 2);
    const purchasedCount = Math.max(0, totalAttended - overdraft);
    purchaseRows.push(...ticketChunks(id, purchasedCount, true, firstDate));
  } else if (unpaidTicketCandidates.has(id)) {
    // She's just opened a new card and hasn't paid for it yet — debt comes
    // from the handful of lessons actually drawn from that fresh unpaid
    // ticket, not from its full size. Dated after the paid chunk so it's
    // the newest ticket and gets consumed last.
    const usedFromNewTicket = Math.min(rand(1, 3), totalAttended);
    const paidPortion = totalAttended - usedFromNewTicket;
    const newTicketDate = sorted[sorted.length - 1].date;
    purchaseRows.push(...ticketChunks(id, paidPortion, true, firstDate));
    purchaseRows.push({ client_id: id, lessons_count: CYCLE_LENGTH, paid: false, purchased_at: newTicketDate });
  } else {
    // Comfortably ahead, fully paid — the common, healthy case.
    const purchasedCount = totalAttended + rand(2, 8);
    purchaseRows.push(...ticketChunks(id, purchasedCount, true, firstDate));
  }
}

let purchasesInserted = 0;
for (let i = 0; i < purchaseRows.length; i += 200) {
  const batch = purchaseRows.slice(i, i + 200);
  const { error } = await ttb.from('purchases').insert(batch);
  if (error) { console.error('Purchase insert error:', error.message); process.exit(1); }
  purchasesInserted += batch.length;
}
console.log(
  `Created ${purchasesInserted} purchase rows ` +
  `(${dueCandidates.size} due, ${overdueCandidates.size} overdue, ${unpaidTicketCandidates.size} with an unpaid ticket).`
);

// --- Final insert: attendance dates only — payment lives on purchases now ---
const allRecords = clientIds.flatMap(id => byClient[id].map(r => ({
  client_id: r.client_id,
  date: r.date,
})));

let inserted = 0;
for (let i = 0; i < allRecords.length; i += 200) {
  const batch = allRecords.slice(i, i + 200);
  const { error } = await ttb.from('attendances').insert(batch);
  if (error) { console.error('Insert error:', error.message); process.exit(1); }
  inserted += batch.length;
}

const totalDays = new Set(allRecords.map(r => r.date)).size;
console.log(`Done: ${inserted} attendance records across ${totalDays} lesson days, spanning ${MONTHS_BACK} months back.`);
