import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'vidsm3434@gmail.com',
    password: 'password123' // Assuming default password
  });
  
  if (authError) {
    console.log("Auth error:", authError.message);
  } else {
    console.log("Logged in!");
  }
  
  const { data, error } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'recharge_plans')
    .maybeSingle();
    
  if (error) {
    console.error('Error reading config:', error);
  } else {
    console.log('Plans read successfully:', data?.value?.length, 'plans found');
  }
}

check();
