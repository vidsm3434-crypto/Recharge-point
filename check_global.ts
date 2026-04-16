import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'global')
    .maybeSingle();
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Global Config:', data ? 'Exists' : 'Not Found');
  }
}

check();
