import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Diagnostic for the user
if (typeof window !== 'undefined') {
  (window as any).__SUPABASE_DEBUG = {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlValue: supabaseUrl ? (supabaseUrl.substring(0, 10) + '...') : 'MISSING',
    vitePrefix: supabaseUrl ? 'OK' : 'FAIL (Check VITE_ prefix in Vercel)'
  };
}

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.error('CRITICAL: Supabase environment variables are missing!');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
