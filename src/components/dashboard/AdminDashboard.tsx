import React, { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../../hooks/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Users, 
  Settings, 
  Wallet, 
  Search, 
  ShieldAlert, 
  Menu, 
  LayoutDashboard, 
  ArrowLeft,
  RefreshCw,
  Smartphone,
  FileText,
  ShieldCheck,
  Percent,
  Bell,
  History,
  Plus,
  Minus,
  Landmark,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

// New Components
import { DashboardStats } from '../admin/DashboardStats';
import { UserManagement } from '../admin/UserManagement';
import { TransactionManagement } from '../admin/TransactionManagement';
import { WalletManagement } from '../admin/WalletManagement';
import { ApiSettings } from '../admin/ApiSettings';
import { SecuritySettings } from '../admin/SecuritySettings';
import { KycManagement } from '../admin/KycManagement';
import { NotificationSystem } from '../admin/NotificationSystem';
import { ReportsSystem } from '../admin/ReportsSystem';
import { MPINRequests } from '../admin/MPINRequests';
import { WalletRequests } from '../admin/WalletRequests';
import { PlansManagement } from '../admin/PlansManagement';
import { LogoManagement } from '../admin/LogoManagement';
import { CommissionStructure } from '../reports/CommissionStructure';

interface AdminDashboardProps {
  onBackToRetailer?: () => void;
}

type AdminSection = 
  | 'dashboard' 
  | 'users' 
  | 'transactions' 
  | 'reports' 
  | 'wallet' 
  | 'api' 
  | 'security' 
  | 'kyc' 
  | 'notifications'
  | 'mpin_requests'
  | 'wallet_requests'
  | 'admin_profit'
  | 'plans'
  | 'commission_structure'
  | 'logos';

export function AdminDashboard({ onBackToRetailer }: AdminDashboardProps) {
  const { fetchProfile } = useAuthContext();
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [config, setConfig] = useState<any>({
    passwordResetMethod: 'whatsapp',
    adminMobile: '7872303434',
    commissions: {
      mobile: { retailer: 2.5, distributor: 0.5 },
      dth: { retailer: 3.0, distributor: 0.5 },
      electricity: { retailer: 0.5, distributor: 0.1 },
      datacard: { retailer: 2.0, distributor: 0.5 }
    },
    api: { url: '', key: '', operatorCodes: '' },
    payment: { upiId: '', qrUrl: '', pgKey: '' }
  });
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [pendingMpinRequests, setPendingMpinRequests] = useState(0);
  const [pendingWalletRequests, setPendingWalletRequests] = useState(0);
  const [showAddUser, setShowAddUser] = useState(false);
  const [walletAction, setWalletAction] = useState({
    amount: '',
    type: 'credit' as 'credit' | 'debit',
    remark: ''
  });
  const [newUser, setNewUser] = useState({
    name: '',
    mobile: '',
    email: '',
    dob: '',
    role: 'retailer',
    password: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Config
      const { data: configData } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'global')
        .maybeSingle();
      
      if (configData) {
        setConfig(configData.value);
      }

      // Fetch Users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
      } else if (usersData) {
        console.log('Total users fetched for admin:', usersData.length);
        setUsers(usersData);
        // Count pending MPIN requests
        const pendingCount = usersData.filter(u => u.mpin === 'RESET_PENDING').length;
        setPendingMpinRequests(pendingCount);
      }

      // Fetch Transactions
      let txnsData: any[] | null = null;
      let txnsError: any = null;

      try {
        // Try to fetch with profiles join
        // We use a more permissive order and fallback
        const { data, error } = await supabase
          .from('transactions')
          .select('*, profiles:user_id(name, mobile, retailer_id, distributor_id)')
          .order('created_at', { ascending: false });
        
        txnsData = data;
        txnsError = error;

        // If created_at order fails, try ordering by timestamp or just fetching without order
        if (txnsError && txnsError.message?.includes('column "created_at" does not exist')) {
          console.warn('created_at column missing, trying timestamp:');
          const { data: tData, error: tError } = await supabase
            .from('transactions')
            .select('*, profiles:user_id(name, mobile, retailer_id, distributor_id)')
            .order('timestamp', { ascending: false });
          txnsData = tData;
          txnsError = tError;
        }

        if (txnsError) {
          console.warn('Join query failed, trying separate fetch:', txnsError);
          // Fallback: Fetch transactions and profiles separately
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('transactions')
            .select('*')
            .limit(2000); // Increased limit for "all history"
          
          if (fallbackError) throw fallbackError;
          
          if (fallbackData) {
            // Sort in JS as a final fallback
            fallbackData.sort((a, b) => {
              const dateA = new Date(a.created_at || a.timestamp || 0).getTime();
              const dateB = new Date(b.created_at || b.timestamp || 0).getTime();
              return dateB - dateA;
            });

            const userIds = [...new Set(fallbackData.map(t => t.user_id))].filter(Boolean);
            let profiles: any[] = [];
            
            if (userIds.length > 0) {
              const { data: pData, error: pError } = await supabase
                .from('profiles')
                .select('id, name, mobile, retailer_id, distributor_id')
                .in('id', userIds);
              
              if (!pError) profiles = pData || [];
            }

            txnsData = fallbackData.map(t => ({
              ...t,
              profiles: profiles.find(p => p.id === t.user_id)
            }));
          }
        }
      } catch (err) {
        console.error('Error in transaction fetch:', err);
        txnsError = err;
      }
      
      if (txnsData) {
        console.log('Total transactions fetched for admin:', txnsData.length);
        // Ensure every transaction has a profiles object for the UI
        const normalizedTxns = txnsData.map(t => ({
          ...t,
          profiles: t.profiles || { name: t.retailer_name || 'N/A', mobile: t.retailer_mobile || 'N/A' }
        }));
        setTransactions(normalizedTxns);
        // Count pending wallet requests
        const pendingWallet = normalizedTxns.filter(t => t.type === 'wallet_add' && t.status === 'pending').length;
        setPendingWalletRequests(pendingWallet);
      } else {
        console.warn('No transactions data returned from Supabase');
        setTransactions([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const mpinChannelRef = useRef<any>(null);
  const walletChannelRef = useRef<any>(null);

  useEffect(() => {
    if (activeSection === 'reports' || activeSection === 'transactions' || activeSection === 'dashboard') {
      fetchData();
    }
  }, [activeSection]);

  useEffect(() => {
    fetchData();

    const mpinChannelName = 'mpin-requests';
    const walletChannelName = 'wallet-requests';

    const setupSubscriptions = async () => {
      // Clean up existing channels with these names
      const existingChannels = supabase.getChannels();
      for (const c of existingChannels) {
        const cAny = c as any;
        if (cAny.name === mpinChannelName || cAny.name === `realtime:${mpinChannelName}` ||
            cAny.name === walletChannelName || cAny.name === `realtime:${walletChannelName}`) {
          await supabase.removeChannel(c);
        }
      }

      const mpinChannel = supabase
        .channel(mpinChannelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles'
          },
          (payload) => {
            const wasPending = payload.old.mpin === 'RESET_PENDING';
            const isPending = payload.new.mpin === 'RESET_PENDING';

            if (!wasPending && isPending) {
              console.log('New MPIN reset request:', payload);
              toast.info('New MPIN Reset Request', {
                description: `User ${payload.new.name} has requested an MPIN reset.`,
                action: {
                  label: 'View',
                  onClick: () => setActiveSection('mpin_requests')
                }
              });
              setPendingMpinRequests(prev => prev + 1);
            } else if (wasPending && !isPending) {
              console.log('MPIN reset request resolved:', payload);
              setPendingMpinRequests(prev => Math.max(0, prev - 1));
            }
            
            setUsers(current => current.map(u => u.id === payload.new.id ? payload.new : u));
          }
        );

      const walletChannel = supabase
        .channel(walletChannelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions',
            filter: 'type=eq.wallet_add'
          },
          (payload) => {
            if (payload.new.status === 'pending') {
              toast.info('New Wallet Load Request', {
                description: `Amount: ₹${payload.new.amount}`,
                action: {
                  label: 'View',
                  onClick: () => setActiveSection('wallet_requests')
                }
              });
              setPendingWalletRequests(prev => prev + 1);
            }
          }
        );

      mpinChannel.subscribe();
      walletChannel.subscribe();

      mpinChannelRef.current = mpinChannel;
      walletChannelRef.current = walletChannel;
    };

    setupSubscriptions();

    return () => {
      if (mpinChannelRef.current) supabase.removeChannel(mpinChannelRef.current);
      if (walletChannelRef.current) supabase.removeChannel(walletChannelRef.current);
    };
  }, []);

  const handleUpdateUser = async (userId: string, data: any) => {
    try {
      console.log('Updating user:', userId, data);
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', userId);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }
      toast.success('User updated successfully');
      fetchData();
    } catch (error: any) {
      console.error('Failed to update user:', error);
      toast.error(`Failed to update user: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      toast.success('User deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleUpdateWallet = async (userId: string, amount: number, type: 'credit' | 'debit', remark: string) => {
    try {
      const response = await fetch('/api/admin/update-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount, type, remark })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Update failed');

      toast.success(`Wallet ${type}ed successfully`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Wallet update failed');
    }
  };

  const handleUpdateConfig = async (newConfig: any) => {
    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'global', value: newConfig })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update');
      
      setConfig(newConfig);
      toast.success('Configuration updated');
    } catch (error: any) {
      console.error('Update Config Error:', error);
      toast.error(`Update failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.mobile || !newUser.dob || !newUser.password) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      // Generate Unique Retailer ID
      let retailer_id = 'MB1001';
      const { data: lastUser } = await supabase
        .from('profiles')
        .select('retailer_id')
        .not('retailer_id', 'is', null)
        .order('retailer_id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastUser && lastUser.retailer_id) {
        const lastNum = parseInt(lastUser.retailer_id.replace('MB', ''));
        retailer_id = `MB${lastNum + 1}`;
      }

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newUser,
          retailer_id: newUser.role === 'retailer' ? retailer_id : null,
          created_by: 'Admin'
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to add user');
      }
      
      toast.success(`${newUser.role.charAt(0).toUpperCase() + newUser.role.slice(1)} added successfully`);
      setShowAddUser(false);
      setNewUser({ name: '', mobile: '', email: '', dob: '', role: 'retailer', password: '' });
      fetchData();
    } catch (error: any) {
      console.error('Add User Error:', error);
      toast.error(error.message || 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) return <div className="flex h-64 items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-primary" /></div>;
    
    switch (activeSection) {
      case 'dashboard': 
        return <DashboardStats 
          users={users} 
          transactions={transactions} 
          onViewMpinRequests={() => setActiveSection('mpin_requests')}
          onViewWalletRequests={() => setActiveSection('wallet_requests')}
        />;
      case 'users': 
        return <UserManagement 
          users={users} 
          onUpdateUser={handleUpdateUser} 
          onDeleteUser={handleDeleteUser}
          onUpdateWallet={(user) => setSelectedUser(user)}
          onAddUser={() => setShowAddUser(true)}
        />;
      case 'transactions':
        return <TransactionManagement transactions={transactions} users={users} />;
      case 'reports':
        return <ReportsSystem transactions={transactions} />;
      case 'wallet':
        return <WalletManagement users={users} onUpdateWallet={handleUpdateWallet} />;
      case 'api':
        return <ApiSettings config={config} onUpdateConfig={handleUpdateConfig} />;
      case 'security':
        return <SecuritySettings config={config} onUpdateConfig={handleUpdateConfig} />;
      case 'kyc':
        return <KycManagement users={users} onUpdateUser={handleUpdateUser} />;
      case 'notifications':
        return <NotificationSystem />;
      case 'admin_profit':
        return <ReportsSystem transactions={transactions} initialView="admin_profit" />;
      case 'mpin_requests':
        return <MPINRequests />;
      case 'wallet_requests':
        return <WalletRequests />;
      case 'plans':
        return <PlansManagement />;
      case 'logos':
        return <LogoManagement />;
      case 'commission_structure':
        return <CommissionStructure config={config} forcedRole="admin" onUpdateConfig={handleUpdateConfig} />;
      default: 
        return <DashboardStats users={users} transactions={transactions} />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: 'users', label: 'Users', icon: <Users className="h-5 w-5" /> },
    { id: 'plans', label: 'Recharge Plans', icon: <Smartphone className="h-5 w-5" /> },
    { id: 'transactions', label: 'Transactions', icon: <Smartphone className="h-5 w-5" /> },
    { id: 'reports', label: 'Reports', icon: <FileText className="h-5 w-5" /> },
    { id: 'admin_profit', label: 'Admin Profit', icon: <TrendingUp className="h-5 w-5" /> },
    { id: 'commission_structure', label: 'Commission Management', icon: <Percent className="h-5 w-5" /> },
    { id: 'logos', label: 'Operator Logos', icon: <ImageIcon className="h-5 w-5" /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet className="h-5 w-5" /> },
    { id: 'api', label: 'API Settings', icon: <Settings className="h-5 w-5" /> },
    { id: 'security', label: 'Security', icon: <ShieldCheck className="h-5 w-5" /> },
    { id: 'kyc', label: 'KYC', icon: <ShieldAlert className="h-5 w-5" /> },
    { 
      id: 'mpin_requests', 
      label: 'MPIN Requests', 
      icon: <RefreshCw className="h-5 w-5" />,
      badge: pendingMpinRequests > 0 ? pendingMpinRequests : null
    },
    { id: 'wallet_requests', 
      label: 'Wallet Requests', 
      icon: <Landmark className="h-5 w-5" />,
      badge: pendingWalletRequests > 0 ? pendingWalletRequests : null
    },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-5 w-5" /> },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col border-r bg-slate-900 text-white sticky top-0 h-screen">
        <div className="p-8 border-b border-slate-800">
          <h2 className="text-2xl font-black tracking-tighter text-primary">ADMIN PANEL</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Control Center</p>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-1">
            {navItems.map(item => (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-4 h-12 px-4 transition-all duration-200",
                  activeSection === item.id 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
                onClick={() => {
                  setActiveSection(item.id as AdminSection);
                  if (item.id === 'mpin_requests') setPendingMpinRequests(0);
                  if (item.id === 'wallet_requests') setPendingWalletRequests(0);
                  if (item.id === 'transactions' || item.id === 'reports') fetchData();
                }}
              >
                <div className={cn(
                  "transition-transform",
                  activeSection === item.id && "scale-110"
                )}>
                  {item.icon}
                </div>
                <span className="font-bold text-sm flex-1">{item.label}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                    {item.badge}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-slate-800 space-y-2">
          {onBackToRetailer && (
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-4 h-12 px-4 text-slate-400 hover:text-white hover:bg-white/5"
              onClick={onBackToRetailer}
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-bold text-sm">Retailer View</span>
            </Button>
          )}
          <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center font-black text-white">
              A
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">Administrator</p>
              <p className="text-[10px] text-slate-500 truncate">Super Admin Access</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between bg-slate-900 lg:bg-white px-4 lg:px-8 py-4 lg:py-6 text-white lg:text-slate-800 shadow-lg lg:shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetTrigger
                  render={
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                      <Menu className="h-6 w-6" />
                    </Button>
                  }
                />
                <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-slate-900 border-slate-800">
                  <SheetHeader className="bg-slate-900 p-6 text-white shrink-0 border-b border-slate-800">
                    <SheetTitle className="text-white font-black tracking-tighter">ADMIN CONTROL</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {navItems.map(item => (
                      <Button
                        key={item.id}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-4 h-12 px-4",
                          activeSection === item.id ? "bg-primary text-white" : "text-slate-400 hover:bg-white/5"
                        )}
                        onClick={() => {
                          setActiveSection(item.id as AdminSection);
                          setIsSidebarOpen(false);
                          if (item.id === 'mpin_requests') setPendingMpinRequests(0);
                          if (item.id === 'wallet_requests') setPendingWalletRequests(0);
                          if (item.id === 'transactions' || item.id === 'reports') fetchData();
                        }}
                      >
                        {item.icon}
                        <span className="font-bold text-sm flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Button>
                    ))}
                    <div className="my-4 border-t border-slate-800" />
                    {onBackToRetailer && (
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start gap-4 h-12 px-4 text-slate-400 hover:text-white"
                        onClick={onBackToRetailer}
                      >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="text-sm">Retailer View</span>
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <h1 className="text-lg lg:text-2xl font-black tracking-tight">
              {navItems.find(n => n.id === activeSection)?.label || activeSection.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h1>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white lg:text-slate-500 lg:hover:bg-slate-100" 
              onClick={fetchData}
            >
              <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
            </Button>
            <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right">
                <p className="text-xs font-black text-slate-800 uppercase tracking-wider">System Online</p>
                <p className="text-[10px] text-green-600 font-bold">Connected to Supabase</p>
              </div>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {users.length === 0 && !loading && (
              <Card className="border-dashed bg-amber-50 mb-8 border-amber-200">
                <CardContent className="py-10 text-center">
                  <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-amber-500 opacity-50" />
                  <p className="text-lg font-bold text-amber-900">No users found in the database.</p>
                  <p className="text-sm text-amber-700">Users will appear here as they sign up and complete their profiles.</p>
                </CardContent>
              </Card>
            )}
            
            <div className="transition-all duration-300">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>

      {/* Wallet Update Dialog (Quick Action) */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Update Wallet Balance</DialogTitle>
            <p className="text-sm text-slate-500">
              Update wallet for {selectedUser?.name} ({selectedUser?.mobile})
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500 uppercase font-bold">Current Balance</p>
              <p className="text-2xl font-black text-primary">₹{selectedUser?.wallet_balance?.toFixed(2) || '0.00'}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Action</Label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={walletAction.type}
                  onChange={(e) => setWalletAction({...walletAction, type: e.target.value as any})}
                >
                  <option value="credit">Credit (Add)</option>
                  <option value="debit">Debit (Deduct)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input 
                  type="number" 
                  placeholder="0.00"
                  value={walletAction.amount}
                  onChange={(e) => setWalletAction({...walletAction, amount: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Remark / Note</Label>
              <Input 
                placeholder="Reason for update" 
                value={walletAction.remark}
                onChange={(e) => setWalletAction({...walletAction, remark: e.target.value})}
              />
            </div>
            
            <Button 
              className="w-full h-12 rounded-xl font-bold" 
              onClick={() => {
                handleUpdateWallet(
                  selectedUser.id, 
                  parseFloat(walletAction.amount), 
                  walletAction.type, 
                  walletAction.remark
                );
                setSelectedUser(null);
                setWalletAction({ amount: '', type: 'credit', remark: '' });
              }}
              disabled={!walletAction.amount || parseFloat(walletAction.amount) <= 0}
            >
              Update Wallet
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Add New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User Role</Label>
              <select 
                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              >
                <option value="retailer">Retailer</option>
                <option value="distributor">Distributor</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                placeholder="Enter name" 
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input 
                placeholder="10-digit mobile" 
                maxLength={10}
                value={newUser.mobile}
                onChange={(e) => setNewUser({...newUser, mobile: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Email ID (Optional)</Label>
              <Input 
                type="email"
                placeholder="email@example.com" 
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input 
                type="date"
                value={newUser.dob}
                onChange={(e) => setNewUser({...newUser, dob: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Login Password</Label>
              <Input 
                type="password"
                placeholder="Create password" 
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              />
            </div>
            <Button className="w-full bg-primary" type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Create User'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

