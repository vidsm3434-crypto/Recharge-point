import { supabase } from './supabase';

export async function fetchOperatorLogos() {
  try {
    const response = await fetch('/api/config/operator_logos');
    if (response.ok) {
      const result = await response.json();
      return result.data;
    }
  } catch (error) {
    console.error('Error fetching operator logos:', error);
  }
  return null;
}

const DEFAULT_LOGOS: Record<string, string> = {
  airtel: 'https://img.sanishtech.com/u/f1c9578535dfe829e17b81f1b35757bd.png',
  vi: 'https://img.sanishtech.com/u/60bb10caa5dd136a40dba33d7eb5268e.jpg',
  vodafone: 'https://img.sanishtech.com/u/60bb10caa5dd136a40dba33d7eb5268e.jpg',
  idea: 'https://img.sanishtech.com/u/60bb10caa5dd136a40dba33d7eb5268e.jpg',
  jio: 'https://img.sanishtech.com/u/e53166a350f4b2ff2add92dab3fb8471.png',
  bsnl: 'https://img.sanishtech.com/u/5500e251803fa7db0bb8ab9d037a72a9.webp'
};

export function getOperatorLogo(operator: string, customLogos?: Record<string, string> | null) {
  const op = operator?.toLowerCase() || '';
  
  if (customLogos) {
    if (op.includes('airtel') && customLogos.airtel) return customLogos.airtel;
    if (op.includes('jio') && customLogos.jio) return customLogos.jio;
    if (op.includes('bsnl') && customLogos.bsnl) return customLogos.bsnl;
    if ((op.includes('vi') || op.includes('vodafone') || op.includes('idea')) && customLogos.vi) return customLogos.vi;
  }

  if (op.includes('airtel')) return DEFAULT_LOGOS.airtel;
  if (op.includes('vi') || op.includes('vodafone') || op.includes('idea')) return DEFAULT_LOGOS.vi;
  if (op.includes('jio')) return DEFAULT_LOGOS.jio;
  if (op.includes('bsnl')) return DEFAULT_LOGOS.bsnl;
  
  return `https://picsum.photos/seed/${op}/100/100`;
}
