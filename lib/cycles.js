import { todayString } from './dates.js';

export const CYCLE_LENGTH = 10; // default lessons per ticket/card

// Payment lives at the *ticket* level (a purchases row), never per lesson —
// Shirly sells a card of lessons in advance, then the client draws it down
// by attending. A lesson only draws down a ticket once its date has actually
// arrived (today or earlier) — a future-dated attendance is just scheduled,
// not charged yet.
//
// Debt is computed by walking chargeable attendances through tickets in
// purchase order (oldest first): each lesson consumes the oldest ticket with
// capacity left, regardless of that ticket's paid status.
//  - unpaidCount: lessons consumed from an unpaid ticket, plus any lessons
//    attended beyond every ticket's capacity (true overdraft — attended with
//    no ticket backing them at all). Both grow only as lessons are actually
//    attended, so a freshly-opened unpaid ticket owes nothing until she's
//    actually used it.
//  - overdraftCount: just the true-overdraft portion of the above — the only
//    case that should read as urgent (red), since in practice it can't
//    legitimately run past a lesson or two before payment is sorted out.
//  - remaining: lessons left in the prepaid balance before the next ticket
//    is needed — drives the "about to run out" reminder.
export function computeCycleStats(attendancesAsc, purchases = []) {
  const today = todayString();
  const chargeable = attendancesAsc.filter(a => a.date <= today);
  const totalAttended = chargeable.length;

  // purchased_at is date-only, so same-day tickets tie — created_at and
  // finally id break the tie deterministically. Without this, ties fall back
  // to whatever row order Postgres happens to return, which is not guaranteed
  // stable across queries and made lastTicket (and consumption order) flicker
  // for clients with same-day tickets.
  const ticketsAsc = [...purchases].sort((a, b) => {
    if (a.purchased_at !== b.purchased_at) return a.purchased_at < b.purchased_at ? -1 : 1;
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const totalPurchased = ticketsAsc.reduce((sum, p) => sum + p.lessons_count, 0);

  let consumed = 0;
  let unpaidFromTickets = 0;
  for (const ticket of ticketsAsc) {
    const usedFromThisTicket = Math.min(ticket.lessons_count, Math.max(0, totalAttended - consumed));
    if (!ticket.paid) unpaidFromTickets += usedFromThisTicket;
    consumed += usedFromThisTicket;
  }
  const overdraftCount = Math.max(0, totalAttended - consumed);
  const unpaidCount = unpaidFromTickets + overdraftCount;

  const remaining = Math.max(0, totalPurchased - totalAttended);
  const last = chargeable.length > 0 ? chargeable[chargeable.length - 1] : null;
  // The most recently purchased ticket — when remaining is 0, consumption is
  // sequential oldest-first, so this is necessarily the ticket that just got
  // used up (the one a "card finished" reminder should be about).
  const lastTicket = ticketsAsc.length > 0 ? ticketsAsc[ticketsAsc.length - 1] : null;

  return {
    totalAttended,
    totalPurchased,
    unpaidCount,
    overdraftCount,
    remaining,
    last,
    lastTicket,
    purchases,
  };
}
