import { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from '../../hooks/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { 
  Search, 
  Filter, 
  Download, 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ClipboardList,
  History,
  FileCheck,
  BarChart3,
  Calendar,
  CreditCard,
  UserCheck,
  ChevronRight,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { TransactionDetailModal } from './TransactionDetailModal';

type ReportType = 
  | 'menu'
  | 'transactions' 
  | 'wallet' 
  | 'complaints' 
  | 'commission' 
  | 'datewise' 
  | 'online_deposit' 
  | 'manual_deposit';

export function ReportsView() {
  const { profile } = useAuthContext();
  const [view, setView] = useState<ReportType>('menu');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (!profile) return;

    async function fetchTransactions() {
      setLoading(true);
      try {
        let query = supabase
          .from('transactions')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(200);

        if (profile?.role === 'admin') {
          // Admin sees everything
        } else if (profile?.role === 'distributor') {
          // Distributor sees their own AND their retailers' transactions
          const { data: retailers } = await supabase
            .from('profiles')
            .select('id')
            .eq('distributor_id', profile.id);
          
          const retailerIds = retailers?.map(r => r.id) || [];
          query = query.in('user_id', [profile.id, ...retailerIds]);
        } else {
          // Retailer only sees their own
          query = query.eq('user_id', profile?.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setTransactions(data || []);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();

    const subscription = supabase
      .channel('transactions-channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'transactions'
      }, async (payload) => {
        const newTxn = payload.new;
        
        // Filter logic for real-time
        if (profile.role === 'admin') {
          setTransactions(prev => [newTxn, ...prev].slice(0, 200));
        } else if (profile.role === 'distributor') {
          // Check if it belongs to distributor or their retailers
          if (newTxn.user_id === profile.id) {
            setTransactions(prev => [newTxn, ...prev].slice(0, 200));
          } else {
            const { data } = await supabase
              .from('profiles')
              .select('distributor_id')
              .eq('id', newTxn.user_id)
              .maybeSingle();
            
            if (data?.distributor_id === profile.id) {
              setTransactions(prev => [newTxn, ...prev].slice(0, 200));
            }
          }
        } else if (newTxn.user_id === profile.id) {
          setTransactions(prev => [newTxn, ...prev].slice(0, 200));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [profile]);

  const handleComplain = async (txn: any) => {
    if (txn.details?.complaint) {
      toast.info('Complaint already registered for this transaction.');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          details: {
            ...txn.details,
            complaint: true,
            complaintDate: new Date().toISOString()
          }
        })
        .eq('id', txn.id);

      if (error) throw error;
      
      toast.success('Complaint registered successfully! Admin will review it.');
      
      // Update local state
      setTransactions(prev => prev.map(t => 
        t.id === txn.id 
          ? { ...t, details: { ...t.details, complaint: true, complaintDate: new Date().toISOString() } }
          : t
      ));
    } catch (error: any) {
      console.error('Error registering complaint:', error);
      toast.error('Failed to register complaint.');
    }
  };

  const reportOptions = [
    { id: 'transactions', label: 'Transactions History', icon: <ClipboardList className="text-blue-600" /> },
    { id: 'wallet', label: 'Wallet History', icon: <History className="text-blue-600" /> },
    { id: 'complaints', label: 'Complaints History', icon: <FileCheck className="text-blue-600" /> },
    { id: 'commission', label: 'Commission Reports', icon: <BarChart3 className="text-blue-600" /> },
    { id: 'datewise', label: 'Datewise Reports', icon: <Calendar className="text-blue-600" /> },
    { id: 'online_deposit', label: 'Online Deposit Reports', icon: <CreditCard className="text-blue-600" /> },
    { id: 'manual_deposit', label: 'Manual Deposit Reports', icon: <UserCheck className="text-blue-600" /> },
  ];

  const filteredData = useMemo(() => {
    let data = [...transactions];

    // Category Filtering
    switch (view) {
      case 'transactions':
        data = data.filter(t => t.type === 'recharge');
        break;
      case 'wallet':
        // Show all transactions for wallet history
        break;
      case 'commission':
        data = data.filter(t => t.details?.commission);
        break;
      case 'online_deposit':
        data = data.filter(t => t.type === 'wallet_add' && t.details?.gateway);
        break;
      case 'manual_deposit':
        data = data.filter(t => t.type === 'wallet_add' && t.details?.adminAction);
        break;
      case 'complaints':
        data = data.filter(t => t.details?.complaint);
        break;
      default:
        break;
    }

    // Search Filtering
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      data = data.filter(t => 
        t.details?.mobile?.includes(q) || 
        t.details?.txnId?.toLowerCase().includes(q)
      );
    }

    return data;
  }, [transactions, view, searchTerm]);

  const getOperatorLogo = (operator: string) => {
    const op = operator?.toLowerCase() || '';
    if (op.includes('airtel')) return 'https://img.sanishtech.com/u/f1c9578535dfe829e17b81f1b35757bd.png';
    if (op.includes('vi') || op.includes('vodafone') || op.includes('idea')) return 'https://img.sanishtech.com/u/60bb10caa5dd136a40dba33d7eb5268e.jpg';
    if (op.includes('jio')) return 'https://img.sanishtech.com/u/e53166a350f4b2ff2add92dab3fb8471.png';
    if (op.includes('bsnl')) return 'https://img.sanishtech.com/u/5500e251803fa7db0bb8ab9d037a72a9.webp';
    return `https://picsum.photos/seed/${op}/100/100`;
  };

  const renderMenu = () => (
    <div className="flex flex-col h-full">
      <div className="bg-blue-700 text-white p-4 sticky top-0 z-20">
        <h2 className="text-lg font-medium">Reports</h2>
      </div>
      <div className="space-y-3 p-4 overflow-y-auto">
        {reportOptions.map((option) => (
          <Card 
            key={option.id} 
            className="border shadow-none rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => setView(option.id as ReportType)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-50 rounded-lg">
                  {option.icon}
                </div>
                <span className="font-medium text-slate-700 text-sm">{option.label}</span>
              </div>
              <ChevronRight className="text-slate-300 h-4 w-4" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderReportContent = () => {
    const title = reportOptions.find(o => o.id === view)?.label || '';
    
    return (
      <div className="flex h-full flex-col bg-slate-50">
        <div className="bg-[#0033cc] text-white p-4 flex items-center gap-4 sticky top-0 z-20">
          <Button variant="ghost" size="icon" onClick={() => setView('menu')} className="text-white hover:bg-white/10 h-8 w-8">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h2 className="text-lg font-bold">{title}</h2>
        </div>

        <div className="p-4 space-y-4 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Input 
                placeholder="Mobile no./Order Id" 
                className="pr-12 h-12 text-sm bg-white border border-slate-200 shadow-sm rounded-lg focus-visible:ring-[#0033cc]" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Filter className="absolute right-4 top-3.5 h-5 w-5 text-slate-400" />
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-600">
              <Search className="h-6 w-6" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-4 pb-24">
              {loading ? (
                <p className="py-10 text-center text-sm text-slate-500">Loading...</p>
              ) : filteredData.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">No records found</p>
              ) : (
                filteredData.map((txn) => {
                  const isDebit = txn.type === 'recharge' || txn.type === 'wallet_deduct' || txn.details?.type === 'debit';
                  
                  return (
                  <Card 
                    key={txn.id} 
                    className="border border-slate-100 shadow-sm rounded-xl overflow-hidden bg-white cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => {
                      setSelectedTransaction(txn);
                      setShowDetailModal(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-bold text-slate-900">Order Id :{txn.details?.txnId || txn.id.slice(0, 12).toUpperCase()}</p>
                        <p className={cn(
                          "text-sm font-bold",
                          isDebit ? "text-red-600" : "text-green-600"
                        )}>
                          {isDebit ? '-' : '+'}₹{txn.amount}
                        </p>
                      </div>
                      
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-[11px] text-slate-500 font-medium">
                          {new Date(txn.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date(txn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div className="flex gap-2">
                          {txn.type === 'recharge' && (
                            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-3 border-blue-200 text-blue-600 rounded-md hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); toast.info('Repay clicked'); }}>
                              Repay <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-3 border-red-200 text-red-600 rounded-md hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleComplain(txn); }}>
                            {txn.details?.complaint ? 'Complained' : 'Complain'}
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-14 w-14 rounded-full overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-100">
                          <img 
                            src={getOperatorLogo(txn.details?.operator)} 
                            alt={txn.details?.operator || 'Logo'}
                            className="h-10 w-10 object-contain"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/wallet/100/100';
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900 text-base">
                            {txn.details?.operator || (txn.type === 'wallet_add' ? (txn.details?.gateway ? 'Online Load' : txn.details?.distributor_id ? 'Distributor Load' : 'Wallet Load') : txn.type === 'wallet_deduct' ? 'Wallet Deduct' : txn.type === 'refund' ? 'Refund' : txn.type === 'commission' ? 'Commission' : 'Transaction')}
                          </p>
                          <p className="text-sm text-slate-600 font-medium">{txn.details?.mobile || txn.details?.note || 'N/A'}</p>
                        </div>
                        <div className="self-end text-right">
                          <div className={cn(
                            "px-3 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider mb-1 inline-block",
                            txn.status === 'success' ? "border-green-500 text-green-600 bg-white" : 
                            txn.status === 'failed' ? "border-red-500 text-red-600 bg-white" : "border-amber-500 text-amber-600 bg-white"
                          )}>
                            {txn.status}
                          </div>
                          {txn.details?.closing_balance !== undefined && (
                            <p className="text-[10px] text-slate-500 font-medium">
                              Bal: ₹{txn.details.closing_balance.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 font-medium">
                        Operator Ref: {txn.details?.opid || txn.details?.refNumber || txn.details?.txnId || 'N/A'}
                      </p>
                    </CardContent>
                  </Card>
                )})
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-slate-50">
      {view === 'menu' ? renderMenu() : renderReportContent()}
      
      <TransactionDetailModal 
        transaction={selectedTransaction}
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        getOperatorLogo={getOperatorLogo}
      />
    </div>
  );
}

