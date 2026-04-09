import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lnvebvrayuveygycpolc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudmVidnJheXV2ZXlneWNwb2xjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwNjk4NTQsImV4cCI6MjA1MjY0NTg1NH0.ERYEax0MBj2xrzMEEupjfFPgTvkWyMK3MyyGj7fHOJY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
