import { createClient } from '@supabase/supabase-js';

const ttb = createClient(
  'https://busvgzfykkpwapfayqfy.supabase.co',
  'sb_publishable_mFdJ0jFbo66HCvJbNfLAjw_CV-ppABb'
);

// One-time backfill: under the old model, payment was a per-lesson flag
// applied retroactively (oldest-unpaid-first), which we'd already made
// contiguous — every client's history was [paid..., unpaid...] with no
// gaps. Under the new model, payment lives on a ticket (a purchases row),
// and debt is "attended more than purchased." To preserve everyone's
// current debt number exactly: turn each client's paid lessons into
// paid=true tickets (in chunks of 10, dated to when that chunk started),
// and leave their unpaid lessons with no ticket at all — pure overdraft,
// which lands on the same total.

const { data: clients } = await ttb.from('clients').select('id').eq('active', true);

let clientsMigrated = 0;
let purchasesCreated = 0;

for (const client of clients ?? []) {
  const { data: atts } = await ttb
    .from('attendances')
    .select('date, paid')
    .eq('client_id', client.id)
    .order('date', { ascending: true });

  if (!atts || atts.length === 0) continue;

  const paidLessons = atts.filter(a => a.paid);
  if (paidLessons.length === 0) continue;

  const rows = [];
  for (let i = 0; i < paidLessons.length; i += 10) {
    const chunk = paidLessons.slice(i, i + 10);
    rows.push({
      client_id: client.id,
      lessons_count: chunk.length,
      paid: true,
      purchased_at: chunk[0].date,
    });
  }

  const { error } = await ttb.from('purchases').insert(rows);
  if (error) {
    console.error(`Failed for client ${client.id}:`, error.message);
    continue;
  }
  clientsMigrated++;
  purchasesCreated += rows.length;
}

console.log(`Migrated ${clientsMigrated} clients, created ${purchasesCreated} purchase rows.`);
