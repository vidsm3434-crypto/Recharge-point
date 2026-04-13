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
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('amount', { ascending: true });
    
    if (error) {
      console.error('Error fetching plans:', error);
      // If table doesn't exist, we might need to handle it
    } else {
      setPlans(data || []);
    }
    setLoading(false);
  }

  async function handleAddPlan() {
    if (!newPlan.amount || !newPlan.validity) {
      toast.error('Please fill all required fields');
      return;
    }

    const { data, error } = await supabase
      .from('plans')
      .insert([newPlan]);

    if (error) {
      toast.error('Failed to add plan');
    } else {
      toast.success('Plan added successfully');
      fetchPlans();
      setNewPlan({
        operator: 'Airtel',
        amount: 0,
        validity: '',
        description: '',
        type: 'unlimited'
      });
    }
  }

  async function handleDeletePlan(id: string) {
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete plan');
    } else {
      toast.success('Plan deleted');
      fetchPlans();
    }
  }

  return (
    <div className="space-y-6">
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
