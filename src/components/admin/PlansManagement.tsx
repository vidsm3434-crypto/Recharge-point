import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, Trash2, Edit2, Save, X, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import React from 'react';

interface Plan {
  id: string;
  operator: string;
  amount: number;
  validity: string;
  description: string;
  type: 'topup' | 'unlimited' | 'data' | 'talktime';
}

export function PlansManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState<Partial<Plan>>({
    operator: 'Airtel',
    amount: 0,
    validity: '',
    description: '',
    type: 'unlimited'
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    setLoading(true);
    try {
      const response = await fetch('/api/config/recharge_plans');
      if (!response.ok) throw new Error('Failed to fetch plans');
      const result = await response.json();
      setPlans(result.data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
    setLoading(false);
  }

  async function handleAddPlan() {
    if (!newPlan.amount || !newPlan.validity) {
      toast.error('Please fill all required fields');
      return;
    }

    const planToAdd = { ...newPlan, id: Math.random().toString(36).substr(2, 9) };
    const updatedPlans = [...plans, planToAdd];

    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'recharge_plans', value: updatedPlans })
      });

      if (!response.ok) throw new Error('Failed to add plan');
      
      toast.success('Plan added successfully');
      setPlans(updatedPlans);
      setNewPlan({
        operator: 'Airtel',
        amount: 0,
        validity: '',
        description: '',
        type: 'unlimited'
      });
    } catch (error) {
      toast.error('Failed to add plan');
    }
  }

  async function handleDeletePlan(id: string) {
    const updatedPlans = plans.filter(p => p.id !== id);
    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'recharge_plans', value: updatedPlans })
      });

      if (!response.ok) throw new Error('Failed to delete plan');
      
      toast.success('Plan deleted');
      setPlans(updatedPlans);
    } catch (error) {
      toast.error('Failed to delete plan');
    }
  }

  async function handleSeedPlans() {
    if (!confirm('This will add default Vi plans to your list. Continue?')) return;
    
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

    const viPlansWithIds = viPlans.map(p => ({
      ...p,
      id: Math.random().toString(36).substr(2, 9)
    }));

    const otherPlans = plans.filter(p => p.operator !== 'Vi');
    const updatedPlans = [...otherPlans, ...viPlansWithIds];

    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'recharge_plans', value: updatedPlans })
      });

      if (!response.ok) throw new Error('Failed to seed plans');
      
      toast.success('Vi plans seeded successfully');
      setPlans(updatedPlans);
    } catch (error) {
      toast.error('Failed to seed plans');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-800">Recharge Plans Management</h3>
        <Button variant="outline" size="sm" className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={handleSeedPlans}>
          <RefreshCw className="h-4 w-4" /> Seed Default Plans
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Operator</Label>
              <Select 
                value={newPlan.operator} 
                onValueChange={(v) => setNewPlan({...newPlan, operator: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Airtel">Airtel</SelectItem>
                  <SelectItem value="Jio">Jio</SelectItem>
                  <SelectItem value="Vi">Vi</SelectItem>
                  <SelectItem value="BSNL">BSNL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={newPlan.type} 
                onValueChange={(v: any) => setNewPlan({...newPlan, type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                  <SelectItem value="topup">Topup</SelectItem>
                  <SelectItem value="data">Data</SelectItem>
                  <SelectItem value="talktime">Talktime</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input 
                type="number" 
                value={newPlan.amount} 
                onChange={(e) => setNewPlan({...newPlan, amount: parseFloat(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Validity</Label>
              <Input 
                placeholder="e.g. 28 Days" 
                value={newPlan.validity} 
                onChange={(e) => setNewPlan({...newPlan, validity: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input 
              placeholder="Plan details..." 
              value={newPlan.description} 
              onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
            />
          </div>
          <Button className="w-full gap-2" onClick={handleAddPlan}>
            <Plus className="h-4 w-4" /> Add Plan
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="font-bold text-slate-800">Existing Plans</h3>
        {loading ? (
          <p className="text-center py-10 text-slate-500">Loading plans...</p>
        ) : plans.length === 0 ? (
          <p className="text-center py-10 text-slate-500">No plans added yet</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className="relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeletePlan(plan.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 uppercase text-[10px]">
                      {plan.operator}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none uppercase text-[10px]">
                      {plan.type}
                    </Badge>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900">₹{plan.amount}</h4>
                  <p className="text-xs font-bold text-slate-500 mt-1">Validity: {plan.validity}</p>
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2">{plan.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'outline' }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      variant === 'default' ? "bg-primary text-primary-foreground" : "border border-input bg-background",
      className
    )}>
      {children}
    </span>
  );
}
