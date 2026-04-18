import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  let data, error;
  try {
    const result = await supabase.rpc('get_policies', {});
    data = result.data;
    error = result.error;
  } catch (err) {
    data = null;
    error = 'RPC not found';
  }
  console.log("RPC result:", error);
  
  // Let's just create a policy to allow authenticated users to read config
  // Wait, we can't easily run raw SQL via supabase-js without an RPC.
  // But we can check if we can read it as an anon user.
}
check();
