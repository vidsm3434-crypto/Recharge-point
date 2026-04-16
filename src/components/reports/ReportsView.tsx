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
import { cn, exportToCSV } from '../../lib/utils';
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

interface ReportsViewProps {
  mode?: 'personal' | 'management';
}

export function ReportsView({ mode = 'personal' }: ReportsViewProps) {
  const { profile } = useAuthContext();
  const [view, setView] = useState<ReportType>('menu');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [complaintTxn, setComplaintTxn] = useState<any>(null);
  const [complaintData, setComplaintData] = useState({ type: 'Wrong Recharge', description: '' });

  useEffect(() => {
    if (!profile) return;

    async function fetchTransactions() {
      setLoading(true);
      try {
        let userIds: string[] | null = [profile.id];
        
        if (mode === 'management') {
          if (profile.role === 'distributor') {
            const { data: retailers } = await supabase
              .from('profiles')
              .select('id')
              .eq('distributor_id', profile.id);
              
            if (retailers) {
              userIds = [...userIds, ...retailers.map(r => r.id)];
            }
          } else if (profile.role === 'admin' || profile.mobile === '7872303434') {
            // Admin in management mode (Distributor Dashboard)
            // Should see their own retailers' transactions
            const { data: retailers } = await supabase
              .from('profiles')
              .select('id')
              .eq('distributor_id', profile.id);
              
            if (retailers) {
              userIds = [...userIds, ...retailers.map(r => r.id)];
            }
          }
        } else {
          // Personal mode: ALWAYS filter by own ID, even for admin
          userIds = [profile.id];
        }
        // In 'personal' mode, userIds remains [profile.id]

        let txnsData: any[] | null = null;
        let txnsError: any = null;

        // Fetch with proper filtering at database level
        let query = supabase
          .from('transactions')
          .select('*, profiles:user_id(name, mobile, retailer_id, distributor_id)');

        if (userIds) {
          query = query.in('user_id', userIds);
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(2000);
        
        txnsData = data;
        txnsError = error;

        if (txnsError) {
          console.warn('Join query failed in ReportsView, trying separate fetch:', txnsError);
          // Fallback logic for older schemas or missing columns
          let fallbackQuery = supabase
            .from('transactions')
            .select('*')
            .limit(2000);
          
          if (userIds) {
            fallbackQuery = fallbackQuery.in('user_id', userIds);
          }

          // Try ordering by timestamp if created_at fails
          const { data: fallbackData, error: fallbackError } = await fallbackQuery.order('timestamp', { ascending: false });
          
          if (fallbackError) throw fallbackError;
          
          if (fallbackData) {
            const uIds = [...new Set(fallbackData.map(t => t.user_id))].filter(Boolean);
            let profiles: any[] = [];
            
            if (uIds.length > 0) {
              const { data: pData } = await supabase
                .from('profiles')
                .select('id, name, mobile, retailer_id, distributor_id')
                .in('id', uIds);
              
              if (pData) {
                profiles = pData;
              } else {
                const { data: pDataBasic } = await supabase
                  .from('profiles')
                  .select('id, name, mobile')
                  .in('id', uIds);
                profiles = pDataBasic || [];
              }
            }

            txnsData = fallbackData.map(t => ({
              ...t,
              profiles: profiles.find(p => p.id === t.user_id)
            }));
          }
        }

        if (txnsData) {
          // Sort in JS to handle mixed timestamp/created_at
          txnsData.sort((a, b) => {
            const dateA = new Date(a.created_at || a.timestamp || 0).getTime();
            const dateB = new Date(b.created_at || b.timestamp || 0).getTime();
            return dateB - dateA;
          });
          setTransactions(txnsData);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast.error('Failed to load reports history');
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
        if (mode === 'management' && profile.role === 'distributor') {
          if (newTxn.user_id === profile.id) {
            setTransactions(prev => [newTxn, ...prev].slice(0, 500));
          } else {
            const { data } = await supabase
              .from('profiles')
              .select('distributor_id')
              .eq('id', newTxn.user_id)
              .maybeSingle();
            
            if (data?.distributor_id === profile.id) {
              setTransactions(prev => [newTxn, ...prev].slice(0, 500));
            }
          }
        } else if (mode === 'management' && (profile.role === 'admin' || profile.mobile === '7872303434')) {
          // Admin sees everything in management mode
          setTransactions(prev => [newTxn, ...prev].slice(0, 500));
        } else if (newTxn.user_id === profile.id) {
          // Personal mode or Retailer: only show own
          setTransactions(prev => [newTxn, ...prev].slice(0, 500));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [profile]);

  const handleComplain = (txn: any) => {
    if (txn.details?.complaint) {
      toast.info('Complaint already registered for this transaction.');
      return;
    }
    setComplaintTxn(txn);
    setComplaintData({ type: 'Wrong Recharge', description: '' });
    setComplaintModalOpen(true);
  };

  const submitComplaint = async () => {
    if (!complaintTxn) return;
    
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          details: {
            ...complaintTxn.details,
            complaint: true,
            complaintDate: new Date().toISOString(),
            complaintType: complaintData.type,
            complaintDesc: complaintData.description,
            complaintStatus: 'Pending'
          }
        })
        .eq('id', complaintTxn.id);

      if (error) throw error;
      
      toast.success('Complaint registered successfully! Admin will review it.');
      
      // Update local state
      setTransactions(prev => prev.map(t => 
        t.id === complaintTxn.id 
          ? { ...t, details: { ...t.details, complaint: true, complaintDate: new Date().toISOString(), complaintType: complaintData.type, complaintDesc: complaintData.description, complaintStatus: 'Pending' } }
          : t
      ));
      setComplaintModalOpen(false);
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
        data = data.filter(t => t.type === 'commission');
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

    // Date Filtering
    if (dateRange.start) {
      data = data.filter(t => new Date(t.timestamp) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      data = data.filter(t => new Date(t.timestamp) <= end);
    }

    return data;
  }, [transactions, view, searchTerm, dateRange]);

  const handleExport = () => {
    if (filteredData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const exportData = filteredData.map(t => {
      const base = {
        Date: new Date(t.timestamp).toLocaleString(),
        Amount: t.amount,
        Status: t.status?.toUpperCase(),
        Type: t.type,
      };

      if (view === 'transactions') {
        return {
          ...base,
          Mobile: t.details?.mobile || 'N/A',
          Operator: t.details?.operator || 'N/A',
          State: t.details?.state || 'N/A',
          'Transaction ID': t.details?.txnId || t.id,
          'Operator ID': t.details?.opid || 'N/A',
          Message: t.details?.error_message || t.details?.api_response?.message || 'N/A',
        };
      } else if (view === 'wallet' || view === 'online_deposit' || view === 'manual_deposit') {
        return {
          ...base,
          Method: t.details?.method || 'N/A',
          Gateway: t.details?.gateway || 'N/A',
          'Ref Number': t.details?.refNumber || t.details?.razorpay_payment_id || 'N/A',
          Note: t.details?.note || 'N/A',
          'Closing Balance': t.details?.closing_balance || 'N/A',
        };
      } else if (view === 'complaints') {
        return {
          ...base,
          'Complaint Date': t.details?.complaintDate ? new Date(t.details.complaintDate).toLocaleString() : 'N/A',
          'Complaint Status': t.details?.complaintStatus || 'Pending',
          'Complaint Remark': t.details?.complaintRemark || 'N/A',
        };
      } else if (view === 'commission') {
        return {
          ...base,
          'Commission Amount': t.details?.commission_amount || 0,
        };
      }

      return base;
    });

    exportToCSV(exportData, `${view}_report_${new Date().toISOString().split('T')[0]}`);
    toast.success('Exported successfully');
  };

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
          <div className="flex flex-col gap-3">
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
              <Button variant="outline" className="h-12 border-slate-200" onClick={handleExport}>
                <Download className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Export</span>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-slate-500 uppercase">From Date</label>
                <Input 
                  type="date" 
                  className="h-9 text-xs" 
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-slate-500 uppercase">To Date</label>
                <Input 
                  type="date" 
                  className="h-9 text-xs" 
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {view === 'datewise' ? (
              <div className="space-y-4 pb-24">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-none shadow-sm bg-blue-50">
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-500 font-medium">Total Transactions</p>
                      <p className="text-2xl font-bold text-blue-700">{filteredData.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-sm bg-indigo-50">
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-500 font-medium">Total Amount</p>
                      <p className="text-2xl font-bold text-indigo-700">₹{filteredData.reduce((acc, t) => acc + (t.amount || 0), 0).toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-sm bg-green-50">
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-500 font-medium">Success Count</p>
                      <p className="text-2xl font-bold text-green-700">{filteredData.filter(t => t.status === 'success').length}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-sm bg-red-50">
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-500 font-medium">Failed Count</p>
                      <p className="text-2xl font-bold text-red-700">{filteredData.filter(t => t.status === 'failed').length}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
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
                          
                          {/* Retailer Visibility Rule for Reports */}
                          {mode === 'management' && profile?.role !== 'retailer' && txn.profiles && (
                            <div className="mt-1 text-[9px] leading-tight">
                              <p className="text-primary font-bold">{txn.profiles.retailer_id || 'N/A'}</p>
                              <p className="text-slate-700 font-bold">{txn.profiles.name || 'N/A'}</p>
                              <p className="text-slate-500">({txn.profiles.mobile || 'N/A'})</p>
                            </div>
                          )}
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
            )}
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

      {/* Complaint Modal */}
      {complaintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold">Raise Complaint</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setComplaintModalOpen(false)}>
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500">Transaction ID</p>
                <p className="font-bold text-sm">{complaintTxn?.details?.txnId || complaintTxn?.id}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Issue Type</label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={complaintData.type}
                  onChange={(e) => setComplaintData({...complaintData, type: e.target.value})}
                >
                  <option value="Wrong Recharge">Wrong Recharge</option>
                  <option value="Number Entered Wrong">Number Entered Wrong</option>
                  <option value="Recharge Failed but Deducted">Recharge Failed but Deducted</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea 
                  className="w-full p-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  placeholder="Describe your issue..."
                  value={complaintData.description}
                  onChange={(e) => setComplaintData({...complaintData, description: e.target.value})}
                />
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={submitComplaint}>
                Submit Complaint
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

