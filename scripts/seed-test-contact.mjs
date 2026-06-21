import { createClient } from '@supabase/supabase-js';

const ttb = createClient(
  'https://busvgzfykkpwapfayqfy.supabase.co',
  'sb_publishable_mFdJ0jFbo66HCvJbNfLAjw_CV-ppABb'
);

const NAME = 'גלי אנגלמאיר';

const { data: existing, error: findErr } = await ttb
  .from('clients')
  .select('id')
  .eq('name', NAME)
  .maybeSingle();

if (findErr) {
  console.error('Lookup error:', findErr.message);
  process.exit(1);
}

if (existing) {
  const { error } = await ttb.from('clients').update({ always_remind: true, active: true }).eq('id', existing.id);
  if (error) { console.error('Update error:', error.message); process.exit(1); }
  console.log(`Updated existing client "${NAME}" to always_remind = true`);
} else {
  const { error } = await ttb
    .from('clients')
    .insert({ name: NAME, phone: null, active: true, is_mock: true, always_remind: true });
  if (error) { console.error('Insert error:', error.message); process.exit(1); }
  console.log(`Created test contact "${NAME}" with always_remind = true`);
}

console.log('Note: add a real phone number for this client via the app (Clients > tap the row) to actually test sending WhatsApp.');
