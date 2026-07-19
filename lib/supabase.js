import { createClient } from '@supabase/supabase-js';

// Replace these with your Supabase project URL and anon key
const SUPABASE_URL = 'https://busvgzfykkpwapfayqfy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1c3ZnemZ5a2twd2FwZmF5cWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mzc5NjgsImV4cCI6MjA5NzExMzk2OH0.t2YidF-TXGGK6Kcnw_5JjkXyVJCm3uS4ACeS01rYTV8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
