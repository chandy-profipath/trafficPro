import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing. Check your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };