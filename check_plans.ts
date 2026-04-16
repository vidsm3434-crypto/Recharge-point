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
    .eq('key', 'recharge_plans')
    .maybeSingle();
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Plans:', JSON.stringify(data?.value, null, 2));
  }
}

check();
