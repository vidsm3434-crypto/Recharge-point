import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedLogos() {
  const logos = {
    airtel: 'https://img.sanishtech.com/u/f1c9578535dfe829e17b81f1b35757bd.png',
    vi: 'https://img.sanishtech.com/u/60bb10caa5dd136a40dba33d7eb5268e.jpg',
    jio: 'https://img.sanishtech.com/u/e53166a350f4b2ff2add92dab3fb8471.png',
    bsnl: 'https://img.sanishtech.com/u/5500e251803fa7db0bb8ab9d037a72a9.webp'
  };

  const { error } = await supabase
    .from('config')
    .upsert({ key: 'operator_logos', value: logos }, { onConflict: 'key' });

  if (error) {
    console.error('Error seeding logos:', error);
  } else {
    console.log('Operator logos initialized successfully');
  }
}

seedLogos();
