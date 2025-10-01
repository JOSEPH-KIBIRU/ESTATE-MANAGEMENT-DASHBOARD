import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// // Debug: Log raw environment variables
// console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL);
// console.log('REACT_APP_SUPABASE_ANON_KEY:', process.env.REACT_APP_SUPABASE_ANON_KEY);
// console.log('All env vars:', process.env);

// Validate URL
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase URL or Anon Key in environment variables');
}
if (!supabaseUrl.startsWith('https://')) {
  throw new Error('Supabase URL must start with https://');
}

export const supabase = createClient(supabaseUrl, supabaseKey);