import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const airtelPlans = [
  { operator: 'Airtel', type: 'unlimited', amount: 299, validity: '28 Days', description: '1.5 GB/day + Unlimited Calls' },
  { operator: 'Airtel', type: 'unlimited', amount: 359, validity: '1 Month', description: '2 GB/day + Unlimited Calls' },
  { operator: 'Airtel', type: 'unlimited', amount: 479, validity: '56 Days', description: '1.5 GB/day + Unlimited Calls' },
  { operator: 'Airtel', type: 'unlimited', amount: 719, validity: '84 Days', description: '1.5 GB/day + Unlimited Calls' },
  { operator: 'Airtel', type: 'data', amount: 19, validity: '1 Day', description: '1 GB Data' },
  { operator: 'Airtel', type: 'data', amount: 29, validity: '1 Day', description: '2 GB Data' },
  { operator: 'Airtel', type: 'talktime', amount: 10, validity: 'Unlimited', description: '₹7.47 Talktime' },
];

const jioPlans = [
  { operator: 'Jio', type: 'unlimited', amount: 239, validity: '28 Days', description: '1.5 GB/day + Unlimited Calls' },
  { operator: 'Jio', type: 'unlimited', amount: 299, validity: '28 Days', description: '2 GB/day + Unlimited Calls' },
  { operator: 'Jio', type: 'unlimited', amount: 479, validity: '56 Days', description: '1.5 GB/day + Unlimited Calls' },
  { operator: 'Jio', type: 'unlimited', amount: 719, validity: '84 Days', description: '2 GB/day + Unlimited Calls' },
  { operator: 'Jio', type: 'data', amount: 15, validity: 'Base Plan', description: '1 GB Data' },
  { operator: 'Jio', type: 'data', amount: 25, validity: 'Base Plan', description: '2 GB Data' },
  { operator: 'Jio', type: 'talktime', amount: 10, validity: 'Unlimited', description: '₹7.47 Talktime' },
];

async function seed() {
  const { data: existingData } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'recharge_plans')
    .maybeSingle();

  let existingPlans = existingData?.value || [];
  
  const newPlans = [...airtelPlans, ...jioPlans].map(p => ({
    ...p,
    id: Math.random().toString(36).substr(2, 9)
  }));

  const updatedPlans = [...existingPlans, ...newPlans];

  const { error } = await supabase
    .from('config')
    .upsert({ key: 'recharge_plans', value: updatedPlans });

  if (error) {
    console.error('Error seeding plans:', error);
  } else {
    console.log('Successfully seeded Airtel and Jio plans to config table');
  }
}

seed();
