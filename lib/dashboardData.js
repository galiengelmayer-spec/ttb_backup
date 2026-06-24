import { supabase } from './supabase';
import { computeCycleStats, pillStateFromStats, CYCLE_LENGTH } from './cycles';
import { todayString, startOfWeek, endOfWeek } from './dates';
import { fetchAllRows } from './fetchAll';

async function fetchActiveClientsWithAttendance() {
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, phone, always_remind')
    .eq('active', true)
    .order('name');
  const ids = (clients ?? []).map(c => c.id);
  if (ids.length === 0) return [];

  const [atts, purchases] = await Promise.all([
    fetchAllRows(() =>
      supabase
        .from('attendances')
        .select('id, client_id, date, reminder_sent_at')
        .in('client_id', ids)
        .order('date', { ascending: true })
    ),
    fetchAllRows(() =>
      supabase
        .from('purchases')
        .select('id, client_id, lessons_count, paid, purchased_at, created_at')
        .in('client_id', ids)
        .order('purchased_at', { ascending: true })
    ),
  ]);

  const attsByClient = {};
  atts.forEach(a => { (attsByClient[a.client_id] ??= []).push(a); });
  const purchasesByClient = {};
  purchases.forEach(p => { (purchasesByClient[p.client_id] ??= []).push(p); });

  return (clients ?? []).map(c => ({
    ...c,
    attendances: attsByClient[c.id] ?? [],
    purchases: purchasesByClient[c.id] ?? [],
  }));
}

// Maps every active client to their unpaid lesson count and how much of it
// is true overdraft. Used anywhere a client list shows a name and should
// also show how much they owe (DebtBadge needs both to pick its color).
export async function fetchUnpaidCounts() {
  const clients = await fetchActiveClientsWithAttendance();
  const map = {};
  clients.forEach(c => {
    const stats = computeCycleStats(c.attendances, c.purchases);
    map[c.id] = { unpaidCount: stats.unpaidCount, overdraftCount: stats.overdraftCount };
  });
  return map;
}

// The lesson-count pill shown on לקוחות and נוכחות — same derivation
// (pillStateFromStats) on both screens so they always agree. Bulk version
// for a full-screen load; see fetchClientPillState below for the cheap
// single-client version used after marking one attendance, so a toggle
// doesn't have to wait on every client being re-fetched.
export async function fetchPillStates() {
  const clients = await fetchActiveClientsWithAttendance();
  const map = {};
  clients.forEach(c => {
    map[c.id] = pillStateFromStats(computeCycleStats(c.attendances, c.purchases));
  });
  return map;
}

export async function fetchClientPillState(clientId) {
  const [{ data: atts }, { data: purchases }] = await Promise.all([
    supabase.from('attendances').select('id, date').eq('client_id', clientId),
    supabase.from('purchases').select('id, lessons_count, paid, purchased_at, created_at').eq('client_id', clientId),
  ]);
  return pillStateFromStats(computeCycleStats(atts ?? [], purchases ?? []));
}

// The financial list: clients with true overdraft — attended a lesson with
// no ticket capacity left anywhere, paid or not. Deliberately NOT clients
// who are merely drawing down an unpaid-but-not-yet-exhausted ticket (that's
// a card she sold but hasn't been paid for yet, not unbilled attendance) —
// only "no available lessons left, but showed up anyway" counts here. This
// figure only grows from real attendance, so in practice it stays small (a
// lesson or two) rather than ballooning into double digits.
export async function fetchUnpaidClients() {
  const clients = await fetchActiveClientsWithAttendance();
  return clients
    .map(c => ({ ...c, stats: computeCycleStats(c.attendances, c.purchases) }))
    .filter(c => c.stats.overdraftCount > 0)
    .sort((a, b) => b.stats.overdraftCount - a.stats.overdraftCount);
}

// The proactive, non-urgent heads-up: clients who have fully used up a
// fully-paid 10-lesson card and need a new one. Deliberately NOT about
// partial progress through a card ("1 lesson left"), NOT about clients
// already in debt (that's what טרם שלמו is for), and NOT about finishing an
// irregular leftover ticket that isn't a real 10-lesson card. Membership is
// purely "a full card just ran out, nothing owed" — sending a reminder
// doesn't change the client's actual status, so it must not remove them
// from this list or its dashboard count. reminder_sent_at is only used to
// decide whether the drill-down shows a "send" button or a "sent" indicator.
export async function fetchReminderClients() {
  const clients = await fetchActiveClientsWithAttendance();
  const computed = clients.map(c => ({ ...c, stats: computeCycleStats(c.attendances, c.purchases) }));
  return computed.filter(
    c => c.stats.remaining === 0
      && c.stats.unpaidCount === 0 // already in debt — that's טרם שלמו's job, not this heads-up
      && c.stats.totalPurchased > 0
      && c.stats.last
      && c.stats.lastTicket?.lessons_count === CYCLE_LENGTH // a real 10-lesson card, not a leftover partial ticket
  );
}

export async function fetchWeeklyAttendance() {
  const today = todayString();
  const from = startOfWeek(today);
  const to = endOfWeek(today);
  const { data } = await supabase
    .from('attendances')
    .select('id, date, clients(id, name)')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });
  return data ?? [];
}

export async function fetchAbsentThisWeek() {
  const today = todayString();
  const weekFrom = startOfWeek(today);
  const weekTo = endOfWeek(today);
  const { data } = await supabase
    .from('client_absences')
    .select('id, from_date, to_date, reason, clients(id, name, phone)')
    .lte('from_date', weekTo)
    .gte('to_date', weekFrom)
    .order('from_date', { ascending: true });
  return data ?? [];
}

export async function markReminderSent(attendanceId) {
  await supabase
    .from('attendances')
    .update({ reminder_sent_at: todayString() })
    .eq('id', attendanceId);
}
