import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../hooks/AuthContext';
import { RetailerDashboard } from './RetailerDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'; 
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { UserPlus, Send, Users, BarChart3, Search, X, CheckCircle2, Menu, History, ShieldCheck, RefreshCw, Wallet, LayoutDashboard, Percent, Settings, HelpCircle, Lock, Minus, ShieldAlert } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { cn } from '../../lib/utils';

export function DistributorDashboard({ onToggleDistributorMode }: { onToggleDistributorMode?: () => void }) {
  const { profile, fetchProfile } = useAuthContext();
  const [view, setView] = useState<'retailer' | 'distributor'>('distributor');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'retailers' | 'kyc' | 'transfer' | 'history' | 'add-balance' | 'mpin-reset' | 'reports' | 'commission' | 'settings' | 'help'>('dashboard');
  const [retailers, setRetailers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ todayRecharges: 0, todayCommission: 0 });
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showAddRetailer, setShowAddRetailer] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showDeduct, setShowDeduct] = useState(false);
  const [showMpinReset, setShowMpinReset] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<any>(null);

  const [newRetailer, setNewRetailer] = useState({
    name: '',
    mobile: '',
    email: '',
    dob: '',
    password: ''
  });

  const [transferData, setTransferData] = useState({
    retailerId: '',
    amount: '',
    remark: ''
  });

  const [mpinResetData, setMpinResetData] = useState({
    dob: '',
    newMpin: ''
  });

  const [distributorMpinData, setDistributorMpinData] = useState({
    oldMpin: '',
    newMpin: '',
    confirmMpin: ''
  });

  const [helpRequest, setHelpRequest] = useState({
    subject: '',
    message: ''
  });

  const [reportFilters, setReportFilters] = useState({
    mobile: '',
    retailerMobile: '',
    startDate: '',
    endDate: ''
  });

  const handleSwitchToRetailer = () => {
    if (onToggleDistributorMode) {
      onToggleDistributorMode();
    } else {
      setView('retailer');
    }
  };

  useEffect(() => {
    if (profile?.role === 'distributor' || profile?.mobile === '7872303434') {
      fetchRetailers();
      fetchTransactions();
      fetchTodayStats();
    }
  }, [profile]);

  async function fetchTodayStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: txns } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'success')
      .gte('created_at', today.toISOString());

    if (txns) {
      const recharges = txns.filter(t => t.type === 'recharge');
      const commissions = txns.filter(t => t.type === 'commission');
      
      setStats({
        todayRecharges: recharges.length,
        todayCommission: commissions.reduce((sum, t) => sum + (t.amount || 0), 0)
      });
    }
  }

  async function fetchRetailers() {
    if (!profile?.id) return;
    
    try {
      console.log('Fetching retailers for role:', profile.role);
      
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'retailer');

      // If not admin, filter by distributor's own retailers
      if (profile.role !== 'admin' && profile.mobile !== '7872303434') {
        query = query.or(`distributor_id.eq.${profile.id},created_by.eq.Distributor`);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      console.log('Retailers found:', data?.length || 0);
      if (data) setRetailers(data);
    } catch (error: any) {
      console.error('Error fetching retailers:', error);
      toast.error(error.message || 'Failed to fetch retailers');
    }
  }

  async function fetchTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, profiles(name, mobile)')
      .or(`user_id.eq.${profile?.id},details->>distributor_id.eq.${profile?.id}`)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setTransactions(data);
  }

  const handleToggleBlock = async (retailer: any) => {
    const newStatus = retailer.status === 'blocked' ? 'active' : 'blocked';
    setLoading(true);
    try {
      // Check if status column exists by attempting a select first or just handling the error
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', retailer.id);
      
      if (error) {
        if (error.message.includes('column "status" of relation "profiles" does not exist')) {
          throw new Error('Database error: The "status" column is missing. Please contact admin to run the SQL migration.');
        }
        throw error;
      }
      toast.success(`Retailer ${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully`);
      fetchRetailers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRetailer = async (retailerId: string) => {
    if (!confirm('Are you sure you want to delete this retailer? This action cannot be undone.')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', retailerId);
      
      if (error) throw error;
      toast.success('Retailer deleted successfully');
      fetchRetailers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetMpin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRetailer || !mpinResetData.dob || !mpinResetData.newMpin) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      // Security Check: Verify DOB (Distributor enters it, we check against DB)
      if (selectedRetailer.dob !== mpinResetData.dob) {
        throw new Error('Incorrect Date of Birth verification failed');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ mpin: mpinResetData.newMpin })
        .eq('id', selectedRetailer.id);

      if (error) throw error;
      toast.success('Retailer MPIN updated successfully');
      setShowMpinReset(false);
      setMpinResetData({ dob: '', newMpin: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset MPIN');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDistributorMpin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (distributorMpinData.newMpin !== distributorMpinData.confirmMpin) {
      toast.error('New MPINs do not match');
      return;
    }
    if (distributorMpinData.oldMpin !== profile?.mpin) {
      toast.error('Incorrect current MPIN');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ mpin: distributorMpinData.newMpin })
        .eq('id', profile?.id);

      if (error) throw error;
      toast.success('Your MPIN updated successfully');
      setDistributorMpinData({ oldMpin: '', newMpin: '', confirmMpin: '' });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendHelpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!helpRequest.subject || !helpRequest.message) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('support_requests').insert([
        {
          user_id: profile?.id,
          subject: helpRequest.subject,
          message: helpRequest.message,
          status: 'pending'
        }
      ]);

      if (error) throw error;
      toast.success('Request sent to Admin successfully');
      setHelpRequest({ subject: '', message: '' });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferData.amount);
    if (!transferData.retailerId || isNaN(amount) || amount <= 0) {
      toast.error('Invalid deduction details');
      return;
    }

    setLoading(true);
    try {
      const retailer = retailers.find(r => r.id === transferData.retailerId);
      if (!retailer) throw new Error('Retailer not found');

      if ((retailer.wallet_balance || 0) < amount) {
        throw new Error('Retailer has insufficient balance');
      }

      // 1. Deduct from retailer
      const { error: retError } = await supabase
        .from('profiles')
        .update({ wallet_balance: (retailer.wallet_balance || 0) - amount })
        .eq('id', retailer.id);

      if (retError) throw retError;

      // 2. Add to distributor
      const { error: distError } = await supabase
        .from('profiles')
        .update({ wallet_balance: (profile?.wallet_balance || 0) + amount })
        .eq('id', profile?.id);

      if (distError) throw distError;

      // 3. Record transaction
      await supabase.from('transactions').insert([
        {
          user_id: retailer.id,
          type: 'wallet_deduct',
          amount: amount,
          status: 'success',
          details: {
            note: transferData.remark || 'Deducted by Distributor',
            distributor_id: profile?.id,
            txnId: `DED${Date.now()}`
          }
        },
        {
          user_id: profile?.id,
          type: 'wallet_add',
          amount: amount,
          status: 'success',
          details: {
            note: `Deducted from ${retailer.name}`,
            retailer_id: retailer.id,
            type: 'credit',
            txnId: `DED${Date.now()}`
          }
        }
      ]);

      toast.success('Balance deducted successfully');
      setShowDeduct(false);
      setTransferData({ retailerId: '', amount: '', remark: '' });
      fetchProfile(profile!.id);
      fetchRetailers();
    } catch (error: any) {
      toast.error(error.message || 'Deduction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRetailer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRetailer.name || !newRetailer.mobile || !newRetailer.email || !newRetailer.dob || !newRetailer.password) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      // Use server-side API to create user without signing them in
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRetailer,
          role: 'retailer',
          distributor_id: profile?.id,
          created_by: 'Distributor'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to add retailer');
      }
      
      toast.success('Retailer added successfully');
      setShowAddRetailer(false);
      setNewRetailer({ name: '', mobile: '', email: '', dob: '', password: '' });
      fetchRetailers();
    } catch (error: any) {
      console.error('Add Retailer Error:', error);
      toast.error(error.message || 'Failed to add retailer');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferData.amount);
    if (!transferData.retailerId || isNaN(amount) || amount <= 0) {
      toast.error('Invalid transfer details');
      return;
    }

    if ((profile?.wallet_balance || 0) < amount) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setLoading(true);
    try {
      const retailer = retailers.find(r => r.id === transferData.retailerId);
      if (!retailer) throw new Error('Retailer not found');

      // 1. Deduct from distributor
      const { error: distError } = await supabase
        .from('profiles')
        .update({ wallet_balance: (profile?.wallet_balance || 0) - amount })
        .eq('id', profile?.id);

      if (distError) throw distError;

      // 2. Add to retailer
      const { error: retError } = await supabase
        .from('profiles')
        .update({ wallet_balance: (retailer.wallet_balance || 0) + amount })
        .eq('id', retailer.id);

      if (retError) throw retError;

      // 3. Record transaction
      await supabase.from('transactions').insert([
        {
          user_id: retailer.id,
          type: 'wallet_add',
          amount: amount,
          status: 'success',
          details: {
            note: transferData.remark || 'Transfer from Distributor',
            distributor_id: profile?.id,
            txnId: `TRF${Date.now()}`
          }
        },
        {
          user_id: profile?.id,
          type: 'wallet_add',
          amount: amount,
          status: 'success',
          details: {
            note: `Transfer to ${retailer.name}`,
            retailer_id: retailer.id,
            type: 'debit',
            txnId: `TRF${Date.now()}`
          }
        }
      ]);

      toast.success('Balance transferred successfully');
      setShowTransfer(false);
      setTransferData({ retailerId: '', amount: '', remark: '' });
      fetchProfile(profile!.id);
      fetchRetailers();
    } catch (error: any) {
      toast.error(error.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  if (view === 'retailer') {
    return (
      <div className="relative">
        <RetailerDashboard onToggleDistributorMode={() => setView('distributor')} />
        <Button 
          className="fixed bottom-24 right-4 h-12 w-12 rounded-full shadow-lg"
          onClick={() => setView('distributor')}
        >
          <Users className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 pb-20">
      <header className="bg-indigo-600 px-4 py-4 text-white sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                    <Menu className="h-6 w-6" />
                  </Button>
                }
              />
              <SheetContent side="left" className="w-[280px] p-0">
                <SheetHeader className="p-6 bg-indigo-600 text-white">
                  <SheetTitle className="text-white flex items-center gap-2">
                    <Users className="h-5 w-5" /> Distributor Menu
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-100px)] py-4">
                  <div className="px-3 space-y-1">
                    <NavButton 
                      active={activeTab === 'dashboard'} 
                      icon={<LayoutDashboard />} 
                      label="Dashboard" 
                      onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }} 
                    />
                    <NavButton 
                      active={activeTab === 'retailers'} 
                      icon={<Users />} 
                      label="Retailer List" 
                      onClick={() => { setActiveTab('retailers'); setSidebarOpen(false); }} 
                    />
                    <NavButton 
                      active={activeTab === 'kyc'} 
                      icon={<ShieldCheck />} 
                      label="KYC Status" 
                      onClick={() => { setActiveTab('kyc'); setSidebarOpen(false); }} 
                    />
                    <NavButton 
                      active={activeTab === 'transfer'} 
                      icon={<Send />} 
                      label="Balance Transfer" 
                      onClick={() => { setActiveTab('transfer'); setSidebarOpen(false); }} 
                    />
                    <NavButton 
                      active={activeTab === 'history'} 
                      icon={<History />} 
                      label="Wallet History" 
                      onClick={() => { setActiveTab('history'); setSidebarOpen(false); }} 
                    />
                    <NavButton 
                      active={activeTab === 'add-balance'} 
                      icon={<Wallet />} 
                      label="Add Balance" 
                      onClick={() => { setActiveTab('add-balance'); setSidebarOpen(false); }} 
                    />
                    <NavButton 
                      active={activeTab === 'mpin-reset'} 
                      icon={<RefreshCw />} 
                      label="MPIN Reset" 
                      onClick={() => { setActiveTab('mpin-reset'); setSidebarOpen(false); }} 
                    />
                    <NavButton 
                      active={activeTab === 'reports'} 
                      icon={<BarChart3 />} 
                      label="Reports" 
                      onClick={() => { setActiveTab('reports'); setSidebarOpen(false); }} 
                    />
                    <NavButton 
                      active={activeTab === 'commission'} 
                      icon={<Percent />} 
                      label="Commission" 
                      onClick={() => { setActiveTab('commission'); setSidebarOpen(false); }} 
                    />
                    <NavButton 
                      active={activeTab === 'settings'} 
                      icon={<Settings />} 
                      label="Settings" 
                      onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }} 
                    />
                    <NavButton 
                      active={activeTab === 'help'} 
                      icon={<HelpCircle />} 
                      label="Help & Support" 
                      onClick={() => { setActiveTab('help'); setSidebarOpen(false); }} 
                    />
                    
                    <Separator className="my-4" />
                    
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-3 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                      onClick={handleSwitchToRetailer}
                    >
                      <RefreshCw className="h-5 w-5" /> Switch to Retailer
                    </Button>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-bold">Distributor Panel</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] opacity-80 uppercase font-bold">Wallet</p>
              <p className="text-sm font-black">₹{profile?.wallet_balance?.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-none bg-white shadow-sm">
                <CardContent className="flex flex-col items-center justify-center p-4">
                  <Users className="mb-2 h-6 w-6 text-indigo-600" />
                  <p className="text-xs text-slate-500">Total Retailers</p>
                  <p className="text-xl font-bold">{retailers.length}</p>
                </CardContent>
              </Card>
              <Card className="border-none bg-white shadow-sm">
                <CardContent className="flex flex-col items-center justify-center p-4">
                  <BarChart3 className="mb-2 h-6 w-6 text-indigo-600" />
                  <p className="text-xs text-slate-500">Today's Recharges</p>
                  <p className="text-xl font-bold">{stats.todayRecharges}</p>
                </CardContent>
              </Card>
              <Card className="border-none bg-white shadow-sm">
                <CardContent className="flex flex-col items-center justify-center p-4">
                  <Percent className="mb-2 h-6 w-6 text-indigo-600" />
                  <p className="text-xs text-slate-500">Today's Earnings</p>
                  <p className="text-xl font-bold">₹{stats.todayCommission.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-800">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <ActionCard icon={<UserPlus />} label="Add Retailer" onClick={() => setShowAddRetailer(true)} />
                <ActionCard icon={<Send />} label="Transfer" onClick={() => setActiveTab('transfer')} />
                <ActionCard icon={<Wallet />} label="Deduct" onClick={() => setShowDeduct(true)} />
                <ActionCard icon={<History />} label="History" onClick={() => setActiveTab('history')} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Recent Transactions</h3>
                <Button variant="link" size="sm" onClick={() => setActiveTab('history')}>View All</Button>
              </div>
              <div className="space-y-3">
                {transactions.slice(0, 5).map(txn => (
                  <div key={txn.id}>
                    <TransactionItem txn={txn} currentUserId={profile?.id || ''} />
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p className="text-center py-8 text-slate-400 text-sm">No recent transactions</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'retailers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Retailer List</h3>
              <Button size="sm" className="gap-2" onClick={() => setShowAddRetailer(true)}>
                <UserPlus className="h-4 w-4" /> Add New
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by mobile number..." 
                className="pl-10"
                value={reportFilters.mobile}
                onChange={(e) => setReportFilters({...reportFilters, mobile: e.target.value})}
              />
            </div>
            <div className="space-y-3">
              {retailers
                .filter(r => r.mobile.includes(reportFilters.mobile))
                .map(ret => (
                <Card key={ret.id} className="border-none shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          {ret.name?.[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm">{ret.name}</p>
                            {ret.distributor_id === profile?.id && (
                              <Badge variant="outline" className="text-[8px] h-4 bg-green-50 text-green-600 border-green-200">
                                Linked
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500">{ret.mobile}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-slate-400">
                              {ret.created_by === 'Distributor' ? 'Added by you' : 'Self Registered'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold">₹{ret.wallet_balance?.toFixed(2)}</p>
                        <Badge variant={ret.status === 'blocked' ? 'destructive' : 'success'} className="text-[8px] h-4">
                          {ret.status || 'active'}
                        </Badge>
                      </div>
                    </div>
                    {ret.distributor_id === profile?.id && (
                      <p className="text-[10px] text-indigo-600 font-medium mb-3 bg-indigo-50 p-1 rounded text-center">
                        This retailer is added by you
                      </p>
                    )}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-[10px] h-8 bg-indigo-50 text-indigo-700 border-indigo-100" 
                          onClick={() => setSelectedRetailer(ret)}
                        >
                          View Details
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 text-[10px] h-8" onClick={() => { setSelectedRetailer(ret); setShowMpinReset(true); }}>
                          Reset MPIN
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={cn("flex-1 text-[10px] h-8", ret.status === 'blocked' ? "text-green-600" : "text-amber-600")}
                          onClick={() => handleToggleBlock(ret)}
                        >
                          {ret.status === 'blocked' ? 'Unblock' : 'Block'}
                        </Button>
                      </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'kyc' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800">Retailer KYC Status</h3>
            <div className="space-y-3">
              {retailers.map(ret => (
                <Card key={ret.id} className="border-none shadow-sm">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-bold text-sm">{ret.name}</p>
                      <p className="text-[10px] text-slate-500">{ret.mobile}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        className={cn(
                          "text-[10px]",
                          ret.kyc_status === 'verified' ? "bg-green-100 text-green-700" : 
                          ret.kyc_status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                        )}
                      >
                        {ret.kyc_status || 'Not Started'}
                      </Badge>
                      {ret.kyc_status === 'pending' && (
                        <p className="text-[10px] text-indigo-600 font-medium italic">Pending Admin Approval</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'transfer' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800">Balance Transfer</h3>
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <form onSubmit={handleTransfer} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Retailer</Label>
                    <select 
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={transferData.retailerId}
                      onChange={(e) => setTransferData({...transferData, retailerId: e.target.value})}
                    >
                      <option value="">Choose Retailer</option>
                      {retailers.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.mobile})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₹)</Label>
                    <Input 
                      type="number"
                      placeholder="Enter amount" 
                      value={transferData.amount}
                      onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Remark (Optional)</Label>
                    <Input 
                      placeholder="e.g. Wallet Load" 
                      value={transferData.remark}
                      onChange={(e) => setTransferData({...transferData, remark: e.target.value})}
                    />
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-indigo-700 font-medium">Your Balance:</span>
                      <span className="text-sm font-bold text-indigo-800">₹{profile?.wallet_balance?.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button className="w-full bg-indigo-600 h-12 rounded-xl font-bold" type="submit" disabled={loading}>
                    {loading ? 'Processing...' : 'Transfer Now'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800">Wallet History</h3>
            <div className="space-y-3">
              {transactions.map(txn => (
                <div key={txn.id}>
                  <TransactionItem txn={txn} currentUserId={profile?.id || ''} />
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="text-center py-12 text-slate-400">No transactions found</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'add-balance' && (
          <div className="space-y-4 text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Wallet className="h-10 w-10" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-800">Add Balance to Wallet</h3>
            <p className="text-slate-500 max-w-xs mx-auto text-sm">
              To add balance to your distributor wallet, please contact the main administrator.
            </p>
            <Button className="mt-6 bg-indigo-600 px-8" onClick={() => window.open('tel:7872303434')}>
              Contact Admin
            </Button>
          </div>
        )}

        {activeTab === 'mpin-reset' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800">Retailer MPIN Reset</h3>
            <div className="space-y-3">
              {retailers.map(ret => (
                <Card key={ret.id} className="border-none shadow-sm">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-bold text-sm">{ret.name}</p>
                      <p className="text-[10px] text-slate-500">{ret.mobile}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-orange-600 border-orange-200 hover:bg-orange-50 gap-2"
                      onClick={() => { setSelectedRetailer(ret); setShowMpinReset(true); }}
                      disabled={loading}
                    >
                      <RefreshCw className="h-3 w-3" /> Reset MPIN
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800">Advanced Reports</h3>
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Retailer Mobile</Label>
                    <Input 
                      placeholder="Mobile" 
                      className="h-8 text-xs"
                      value={reportFilters.retailerMobile}
                      onChange={(e) => setReportFilters({...reportFilters, retailerMobile: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Target Mobile</Label>
                    <Input 
                      placeholder="Mobile" 
                      className="h-8 text-xs"
                      value={reportFilters.mobile}
                      onChange={(e) => setReportFilters({...reportFilters, mobile: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Start Date</Label>
                    <Input 
                      type="date" 
                      className="h-8 text-xs"
                      value={reportFilters.startDate}
                      onChange={(e) => setReportFilters({...reportFilters, startDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">End Date</Label>
                    <Input 
                      type="date" 
                      className="h-8 text-xs"
                      value={reportFilters.endDate}
                      onChange={(e) => setReportFilters({...reportFilters, endDate: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-3">
              {transactions
                .filter(t => t.type === 'recharge')
                .filter(t => !reportFilters.retailerMobile || t.profiles?.mobile.includes(reportFilters.retailerMobile))
                .filter(t => !reportFilters.mobile || t.details?.mobile?.includes(reportFilters.mobile))
                .map(txn => (
                  <div key={txn.id}>
                    <TransactionItem txn={txn} currentUserId={profile?.id || ''} />
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'commission' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800">Commission Earnings</h3>
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-none bg-indigo-600 text-white">
                <CardContent className="p-4">
                  <p className="text-[10px] opacity-80">Today's Commission</p>
                  <p className="text-xl font-bold">₹{stats.todayCommission.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card className="border-none bg-white">
                <CardContent className="p-4">
                  <p className="text-[10px] text-slate-500">Total Commission</p>
                  <p className="text-xl font-bold text-indigo-600">₹{transactions.filter(t => t.type === 'commission').reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-3">
              {transactions.filter(t => t.type === 'commission').map(txn => (
                <div key={txn.id}>
                  <TransactionItem txn={txn} currentUserId={profile?.id || ''} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-800">Settings & Profile</h3>
            
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold">
                    {profile?.name?.[0]}
                  </div>
                  <div>
                    <p className="text-lg font-bold">{profile?.name}</p>
                    <p className="text-sm text-slate-500">{profile?.mobile}</p>
                    <Badge variant="outline" className="mt-1 text-indigo-600 border-indigo-200 bg-indigo-50">
                      Distributor
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">Email ID</Label>
                      <p className="text-sm font-medium">{profile?.email || 'Not provided'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500">KYC Status</Label>
                      <p className="text-sm font-medium capitalize text-green-600">{profile?.kyc_status || 'Verified'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-indigo-600" /> Change MPIN
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <form onSubmit={handleUpdateDistributorMpin} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current MPIN</Label>
                    <Input 
                      type="password" 
                      maxLength={4} 
                      placeholder="Enter current MPIN"
                      value={distributorMpinData.oldMpin}
                      onChange={(e) => setDistributorMpinData({...distributorMpinData, oldMpin: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>New 4-Digit MPIN</Label>
                    <Input 
                      type="password" 
                      maxLength={4} 
                      placeholder="Enter new MPIN"
                      value={distributorMpinData.newMpin}
                      onChange={(e) => setDistributorMpinData({...distributorMpinData, newMpin: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm New MPIN</Label>
                    <Input 
                      type="password" 
                      maxLength={4} 
                      placeholder="Confirm new MPIN"
                      value={distributorMpinData.confirmMpin}
                      onChange={(e) => setDistributorMpinData({...distributorMpinData, confirmMpin: e.target.value})}
                    />
                  </div>
                  <Button className="w-full bg-indigo-600" type="submit" disabled={loading}>
                    {loading ? 'Updating...' : 'Update MPIN'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'help' && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-800">Help & Support</h3>
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <form onSubmit={handleSendHelpRequest} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <select 
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={helpRequest.subject}
                      onChange={(e) => setHelpRequest({...helpRequest, subject: e.target.value})}
                    >
                      <option value="">Select Subject</option>
                      <option value="Password Reset">Password Reset Request</option>
                      <option value="Wallet Issue">Wallet/Balance Issue</option>
                      <option value="Technical Support">Technical Support</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <textarea 
                      className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Describe your issue in detail..."
                      value={helpRequest.message}
                      onChange={(e) => setHelpRequest({...helpRequest, message: e.target.value})}
                    />
                  </div>
                  <Button className="w-full bg-indigo-600" type="submit" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Request to Admin'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 text-center">
              <HelpCircle className="h-10 w-10 text-indigo-600 mx-auto mb-3" />
              <h4 className="font-bold text-indigo-900">Need Immediate Help?</h4>
              <p className="text-sm text-indigo-700 mt-1">Contact our support team directly</p>
              <Button className="mt-4 bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={() => window.open('tel:7872303434')}>
                Call Support
              </Button>
            </div>
          </div>
        )}
      </main>
      
      {/* Add Retailer Modal */}
      <Dialog open={showAddRetailer} onOpenChange={setShowAddRetailer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Retailer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRetailer} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                placeholder="Retailer Name" 
                value={newRetailer.name}
                onChange={(e) => setNewRetailer({...newRetailer, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input 
                placeholder="10-digit mobile" 
                maxLength={10}
                value={newRetailer.mobile}
                onChange={(e) => setNewRetailer({...newRetailer, mobile: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Email ID</Label>
              <Input 
                type="email"
                placeholder="email@example.com" 
                value={newRetailer.email}
                onChange={(e) => setNewRetailer({...newRetailer, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input 
                type="date"
                value={newRetailer.dob}
                onChange={(e) => setNewRetailer({...newRetailer, dob: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Login Password</Label>
              <Input 
                type="password"
                placeholder="Create password" 
                value={newRetailer.password}
                onChange={(e) => setNewRetailer({...newRetailer, password: e.target.value})}
              />
            </div>
            <Button className="w-full bg-indigo-600" type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Retailer'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Balance Modal */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Balance</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransfer} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Retailer</Label>
              <select 
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={transferData.retailerId}
                onChange={(e) => setTransferData({...transferData, retailerId: e.target.value})}
              >
                <option value="">Choose Retailer</option>
                {retailers.map(r => (
                  <option key={r.id} value={r.id}>{r.name} (₹{r.wallet_balance?.toFixed(0)})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input 
                type="number"
                placeholder="Enter amount" 
                value={transferData.amount}
                onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Remark (Optional)</Label>
              <Input 
                placeholder="e.g. Wallet Load" 
                value={transferData.remark}
                onChange={(e) => setTransferData({...transferData, remark: e.target.value})}
              />
            </div>
            <div className="bg-indigo-50 p-3 rounded-lg">
              <p className="text-xs text-indigo-700 font-medium">Your Balance: ₹{profile?.wallet_balance?.toFixed(2)}</p>
            </div>
            <Button className="w-full bg-indigo-600" type="submit" disabled={loading}>
              {loading ? 'Transferring...' : 'Transfer Now'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deduct Balance Modal */}
      <Dialog open={showDeduct} onOpenChange={setShowDeduct}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deduct Balance</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDeduct} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Retailer</Label>
              <select 
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={transferData.retailerId}
                onChange={(e) => setTransferData({...transferData, retailerId: e.target.value})}
              >
                <option value="">Choose Retailer</option>
                {retailers.map(r => (
                  <option key={r.id} value={r.id}>{r.name} (₹{r.wallet_balance?.toFixed(0)})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input 
                type="number"
                placeholder="Enter amount" 
                value={transferData.amount}
                onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Remark (Optional)</Label>
              <Input 
                placeholder="e.g. Balance Correction" 
                value={transferData.remark}
                onChange={(e) => setTransferData({...transferData, remark: e.target.value})}
              />
            </div>
            <Button className="w-full bg-red-600" type="submit" disabled={loading}>
              {loading ? 'Deducting...' : 'Deduct Now'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Retailer Details Modal */}
      <Dialog open={!!selectedRetailer && !showMpinReset} onOpenChange={(open) => !open && setSelectedRetailer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Retailer Details</DialogTitle>
          </DialogHeader>
          {selectedRetailer && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold">
                  {selectedRetailer.name?.[0]}
                </div>
                <div>
                  <p className="text-lg font-bold">{selectedRetailer.name}</p>
                  <p className="text-sm text-slate-500">{selectedRetailer.mobile}</p>
                  <Badge variant={selectedRetailer.status === 'blocked' ? 'destructive' : 'success'} className="mt-1">
                    {selectedRetailer.status || 'active'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase">Wallet Balance</Label>
                  <p className="text-lg font-black text-indigo-600">₹{selectedRetailer.wallet_balance?.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-500 uppercase">KYC Status</Label>
                  <p className="text-sm font-bold capitalize">{selectedRetailer.kyc_status || 'Not Started'}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-800">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    className="gap-2 text-xs"
                    onClick={() => { setShowMpinReset(true); }}
                  >
                    <RefreshCw className="h-3 w-3" /> Reset MPIN
                  </Button>
                  <Button 
                    variant="outline" 
                    className={cn("gap-2 text-xs", selectedRetailer.status === 'blocked' ? "text-green-600" : "text-amber-600")}
                    onClick={() => handleToggleBlock(selectedRetailer)}
                  >
                    {selectedRetailer.status === 'blocked' ? <CheckCircle2 className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                    {selectedRetailer.status === 'blocked' ? 'Unblock' : 'Block'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="gap-2 text-xs text-indigo-600"
                    onClick={() => {
                      setTransferData({ ...transferData, retailerId: selectedRetailer.id });
                      setActiveTab('transfer');
                      setSelectedRetailer(null);
                    }}
                  >
                    <Send className="h-3 w-3" /> Transfer Funds
                  </Button>
                  <Button 
                    variant="outline" 
                    className="gap-2 text-xs text-red-600"
                    onClick={() => {
                      setTransferData({ ...transferData, retailerId: selectedRetailer.id });
                      setShowDeduct(true);
                      setSelectedRetailer(null);
                    }}
                  >
                    <Minus className="h-3 w-3" /> Deduct Funds
                  </Button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium">{selectedRetailer.email}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Joined Date:</span>
                  <span className="font-medium">{new Date(selectedRetailer.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Added By:</span>
                  <span className="font-medium">{selectedRetailer.created_by || 'Self'}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={showMpinReset} onOpenChange={setShowMpinReset}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Retailer MPIN</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetMpin} className="space-y-4 py-4">
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
              <p className="text-xs text-amber-800">
                <strong>Security Check:</strong> You must verify the retailer's Date of Birth to change their MPIN.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Retailer Mobile</Label>
              <Input value={selectedRetailer?.mobile || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Enter Retailer DOB</Label>
              <Input 
                type="date" 
                value={mpinResetData.dob}
                onChange={(e) => setMpinResetData({...mpinResetData, dob: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>New 4-Digit MPIN</Label>
              <Input 
                type="password" 
                maxLength={4}
                placeholder="Enter new MPIN"
                value={mpinResetData.newMpin}
                onChange={(e) => setMpinResetData({...mpinResetData, newMpin: e.target.value})}
              />
            </div>
            <Button className="w-full bg-indigo-600" type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update MPIN'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: any, label: string, onClick: () => void }) {
  return (
    <Button 
      variant="ghost" 
      className={cn(
        "w-full justify-start gap-3 h-11 rounded-lg transition-all",
        active ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-700" : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
      )}
      onClick={onClick}
    >
      {React.cloneElement(icon, { className: "h-5 w-5" })}
      <span className="font-medium">{label}</span>
    </Button>
  );
}

function TransactionItem({ txn, currentUserId }: { txn: any, currentUserId: string }) {
  const isDebit = txn.details?.type === 'debit' || txn.user_id === currentUserId;
  
  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              isDebit ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
            )}>
              {isDebit ? <Send className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {txn.details?.note || (isDebit ? 'Wallet Debit' : 'Wallet Credit')}
              </p>
              <p className="text-[10px] text-slate-500">
                {new Date(txn.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={cn(
              "text-sm font-black",
              isDebit ? "text-red-600" : "text-green-600"
            )}>
              {isDebit ? '-' : '+'}₹{txn.amount?.toFixed(2)}
            </p>
            <p className="text-[9px] text-slate-400 font-mono">{txn.details?.txnId}</p>
          </div>
        </div>
        {txn.profiles && txn.user_id !== currentUserId && (
          <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Retailer:</span>
            <span className="font-medium text-slate-700">{txn.profiles.name} ({txn.profiles.mobile})</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActionCard({ icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
  return (
    <Card className="cursor-pointer border-none shadow-sm transition-transform active:scale-95" onClick={onClick}>
      <CardContent className="flex flex-col items-center justify-center p-6">
        <div className="mb-3 rounded-full bg-indigo-100 p-3 text-indigo-600">
          {icon}
        </div>
        <p className="text-xs font-bold text-slate-700">{label}</p>
      </CardContent>
    </Card>
  );
}
