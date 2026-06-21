import { todayString } from './dates';

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

  const ticketsAsc = [...purchases].sort((a, b) => (a.purchased_at < b.purchased_at ? -1 : 1));
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

  return {
    totalAttended,
    totalPurchased,
    unpaidCount,
    overdraftCount,
    remaining,
    last,
    purchases,
  };
}
