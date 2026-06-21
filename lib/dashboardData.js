import { supabase } from './supabase';
import { computeCycleStats } from './cycles';
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
        .select('id, client_id, lessons_count, paid, purchased_at')
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

// The financial list: anyone currently owing anything at all — either she
// has an unpaid ticket she's drawn on, or she's attended with no ticket
// backing her at all. Both figures only grow from real attendance, so in
// practice these stay small (a lesson or two of overdraft, or a few lessons
// into a fresh unpaid card) rather than ballooning into double digits.
export async function fetchUnpaidClients() {
  const clients = await fetchActiveClientsWithAttendance();
  return clients
    .map(c => ({ ...c, stats: computeCycleStats(c.attendances, c.purchases) }))
    .filter(c => c.stats.unpaidCount > 0)
    .sort((a, b) => b.stats.unpaidCount - a.stats.unpaidCount);
}

// The proactive, non-urgent heads-up: clients who have fully used up a
// fully-paid card and need a new one. Deliberately NOT about partial
// progress through a card ("1 lesson left") and NOT about clients already
// in debt — that's what טרם שלמו is for. Membership is purely "card just
// ran out, nothing owed" — sending a reminder doesn't change the client's
// actual status, so it must not remove them from this list or its dashboard
// count. reminder_sent_at is only used to decide whether the drill-down
// shows a "send" button or a "sent" indicator.
export async function fetchReminderClients() {
  const clients = await fetchActiveClientsWithAttendance();
  const computed = clients.map(c => ({ ...c, stats: computeCycleStats(c.attendances, c.purchases) }));
  const natural = computed.filter(
    c => c.stats.remaining === 0
      && c.stats.unpaidCount === 0 // already in debt — that's טרם שלמו's job, not this heads-up
      && c.stats.totalPurchased > 0
      && c.stats.last
  );
  const naturalIds = new Set(natural.map(c => c.id));
  // always_remind clients (test contacts) show up regardless of actual balance
  const forced = computed.filter(c => c.always_remind && !naturalIds.has(c.id));
  return [...forced, ...natural];
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
