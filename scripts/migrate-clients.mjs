import { createClient } from '@supabase/supabase-js';

const pilatese = createClient(
  'https://fdcurjtwyqidfrqhmhmg.supabase.co',
  'sb_publishable_ZBk5LRF9_RyfxfjSXuxFBw_1fLza4sk'
);

const ttb = createClient(
  'https://busvgzfykkpwapfayqfy.supabase.co',
  'sb_publishable_mFdJ0jFbo66HCvJbNfLAjw_CV-ppABb'
);

// Fetch all active clients from Pilatese
const { data: clients, error } = await pilatese
  .from('clients')
  .select('*')
  .eq('active', true)
  .order('name');

if (error) {
  console.error('Failed to fetch from Pilatese:', error.message);
  process.exit(1);
}

console.log(`Found ${clients.length} clients in Pilatese`);
console.log('Columns:', Object.keys(clients[0] ?? {}));

// Map to TTB schema
const mapped = clients.map(c => ({
  name: c.name,
  phone: c.phone ?? null,
  package_size: c.package_size ?? 10,
  total_lessons_purchased: c.total_lessons_purchased ?? c.package_size ?? 10,
  notes: c.notes ?? null,
  active: true,
}));

// Insert into TTB
const { data: inserted, error: insertError } = await ttb
  .from('clients')
  .insert(mapped)
  .select();

if (insertError) {
  console.error('Failed to insert into TTB:', insertError.message);
  process.exit(1);
}

console.log(`✓ Migrated ${inserted.length} clients to TTB`);
