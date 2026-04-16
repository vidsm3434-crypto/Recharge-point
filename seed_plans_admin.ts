import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const viPlans = [
  { operator: 'Vi', type: 'unlimited', amount: 349, validity: '28 Days', description: '1.5 GB/day + Unlimited Calls' },
  { operator: 'Vi', type: 'unlimited', amount: 379, validity: '1 Month', description: '2 GB/day + Unlimited Calls' },
  { operator: 'Vi', type: 'unlimited', amount: 409, validity: '28 Days', description: '2.5 GB/day + Unlimited Calls' },
  { operator: 'Vi', type: 'unlimited', amount: 449, validity: '28 Days', description: '3 GB/day + Unlimited Calls' },
  { operator: 'Vi', type: 'unlimited', amount: 469, validity: '28 Days', description: '2.5 GB/day + Disney+ Hotstar' },
  { operator: 'Vi', type: 'unlimited', amount: 539, validity: '28 Days', description: '4 GB/day + Unlimited Calls' },
  { operator: 'Vi', type: 'unlimited', amount: 579, validity: '56 Days', description: '1.5 GB/day + Unlimited Calls' },
  { operator: 'Vi', type: 'unlimited', amount: 666, validity: '64 Days', description: '1.5 GB/day + Unlimited Calls' },
  { operator: 'Vi', type: 'unlimited', amount: 795, validity: '56 Days', description: '3 GB/day + Unlimited Calls' },
  { operator: 'Vi', type: 'unlimited', amount: 859, validity: '84 Days', description: '1.5 GB/day + Unlimited Calls' },
  { operator: 'Vi', type: 'unlimited', amount: 979, validity: '84 Days', description: '2 GB/day + Unlimited Calls' },
  { operator: 'Vi', type: 'unlimited', amount: 994, validity: '84 Days', description: '2 GB/day + Disney+ Hotstar' },
  { operator: 'Vi', type: 'unlimited', amount: 1749, validity: '180 Days', description: '1.5 GB/day + Unlimited Calls' },
  { operator: 'Vi', type: 'unlimited', amount: 3499, validity: '365 Days', description: '1.5 GB/day + Unlimited Calls' },
  { operator: 'Vi', type: 'unlimited', amount: 3699, validity: '365 Days', description: '2 GB/day + Disney+ Hotstar' },
  { operator: 'Vi', type: 'data', amount: 23, validity: '1 Day', description: '1 GB Data' },
  { operator: 'Vi', type: 'data', amount: 26, validity: '1 Day', description: '1.5 GB Data' },
  { operator: 'Vi', type: 'data', amount: 33, validity: '2 Days', description: '2 GB Data' },
  { operator: 'Vi', type: 'data', amount: 48, validity: '3 Days', description: '6 GB Data' },
  { operator: 'Vi', type: 'data', amount: 49, validity: '1 Day', description: '20 GB Data' },
  { operator: 'Vi', type: 'data', amount: 98, validity: '21 Days', description: '9 GB Data' },
  { operator: 'Vi', type: 'data', amount: 118, validity: '28 Days', description: '12 GB Data' },
  { operator: 'Vi', type: 'data', amount: 151, validity: '30 Days', description: '8 GB Data + Disney+ Hotstar' },
  { operator: 'Vi', type: 'data', amount: 175, validity: '28 Days', description: '10 GB Data + 16 OTT Apps' },
  { operator: 'Vi', type: 'data', amount: 298, validity: '28 Days', description: '50 GB Data (Bulk)' },
  { operator: 'Vi', type: 'data', amount: 418, validity: '56 Days', description: '100 GB Data (Bulk)' },
  { operator: 'Vi', type: 'talktime', amount: 10, validity: 'Unlimited', description: '₹7.47 Talktime' },
  { operator: 'Vi', type: 'talktime', amount: 20, validity: 'Unlimited', description: '₹14.95 Talktime' },
  { operator: 'Vi', type: 'talktime', amount: 30, validity: 'Unlimited', description: '₹22.42 Talktime' },
  { operator: 'Vi', type: 'talktime', amount: 50, validity: 'Unlimited', description: '₹39.37 Talktime' },
  { operator: 'Vi', type: 'talktime', amount: 100, validity: 'Unlimited', description: '₹81.75 Talktime' },
  { operator: 'Vi', type: 'talktime', amount: 500, validity: '28 Days', description: '₹423.73 Talktime' },
];

async function seed() {
  const viPlansWithIds = viPlans.map(p => ({
    ...p,
    id: Math.random().toString(36).substr(2, 9)
  }));

  const { error } = await supabase
    .from('config')
    .upsert({ key: 'recharge_plans', value: viPlansWithIds });

  if (error) {
    console.error('Error seeding plans:', error);
  } else {
    console.log('Successfully seeded Vi plans to config table');
  }
}

seed();
