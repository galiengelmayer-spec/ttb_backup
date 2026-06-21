import { createClient } from '@supabase/supabase-js';
import { todayString, startOfWeek, addDays } from '../lib/dates.js';

const ttb = createClient(
  'https://busvgzfykkpwapfayqfy.supabase.co',
  'sb_publishable_mFdJ0jFbo66HCvJbNfLAjw_CV-ppABb'
);

const { data: mockClients, error } = await ttb
  .from('clients')
  .select('id')
  .eq('is_mock', true);

if (error || !mockClients?.length) {
  console.error('No mock clients found. Run seed-clients.mjs first.');
  process.exit(1);
}

await ttb.from('client_absences').delete().in('client_id', mockClients.map(c => c.id));

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}
function rand(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

const REASONS = ['חופשה', 'מחלה', 'נסיעה'];
const weekFrom = startOfWeek(todayString());
const picks = shuffle(mockClients).slice(0, 4);

// Anchor every range to start inside the current week so it's guaranteed to show up.
const records = picks.map((c, i) => {
  const from = addDays(weekFrom, rand(0, 4));
  const to = addDays(from, rand(1, 5));
  return { client_id: c.id, from_date: from, to_date: to, reason: REASONS[i % REASONS.length] };
});

const { error: insertError } = await ttb.from('client_absences').insert(records);
if (insertError) { console.error('Insert error:', insertError.message); process.exit(1); }

console.log(`Done: ${records.length} absence records seeded, anchored to the current week`);
