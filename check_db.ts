import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  // Login as admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'vidsm3434@gmail.com',
    password: 'password123' // Assuming default password or we can just use service role to check
  });
  
  if (authError) {
    console.log("Auth error:", authError.message);
    // Let's just use service role to check the contents
    const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || '');
    const { data } = await adminSupabase.from('config').select('*');
    console.log("All config keys:", data?.map(d => d.key));
    return;
  }
}

check();
