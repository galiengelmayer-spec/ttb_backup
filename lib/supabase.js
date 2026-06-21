import { createClient } from '@supabase/supabase-js';

// Replace these with your Supabase project URL and anon key
const SUPABASE_URL = 'https://busvgzfykkpwapfayqfy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mFdJ0jFbo66HCvJbNfLAjw_CV-ppABb';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
