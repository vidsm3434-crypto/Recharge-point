import { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  ClipboardList, 
  History, 
  FileCheck, 
  BarChart3, 
  Calendar, 
  CreditCard, 
  UserCheck,
  ChevronRight,
  ArrowLeft,
  Search,
  Download,
  Filter,
  CalendarDays,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, exportToCSV } from '../../lib/utils';
import { TransactionDetailModal } from '../reports/TransactionDetailModal';

interface ReportsSystemProps {
  transactions: any[];
}

type ReportType = 
  | 'menu'
  | 'transactions' 
  | 'wallet' 
  | 'complaints' 
  | 'commission' 
  | 'datewise' 
  | 'online_deposit' 
  | 'manual_deposit';

export function ReportsSystem({ transactions }: ReportsSystemProps) {
  const [view, setView] = useState<ReportType>('menu');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveTxn, setResolveTxn] = useState<any>(null);
  const [resolveData, setResolveData] = useState({ status: 'Resolved', result: 'Success', remark: '' });

  const handleResolve = (txn: any) => {
    setResolveTxn(txn);
    setResolveData({ status: 'Resolved', result: 'Success', remark: '' });
    setResolveModalOpen(true);
  };

  const submitResolve = async () => {
    if (!resolveTxn) return;
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          details: {
            ...resolveTxn.details,
            complaintStatus: resolveData.status,
            complaintResult: resolveData.result,
            complaintRemark: resolveData.remark,
            complaintResolvedDate: new Date().toISOString()
          }
        })
        .eq('id', resolveTxn.id);

      if (error) throw error;
      toast.success('Complaint resolved successfully');
      setResolveModalOpen(false);
      // We don't have a local setTransactions here, so we rely on the parent component's real-time updates or a refresh.
      // Ideally, we'd trigger a refresh. For now, we just close the modal.
    } catch (error) {
      console.error(error);
      toast.error('Failed to resolve complaint');
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
        data = data.filter(t => {
          const type = (t.type || '').toLowerCase();
          return !t.type || type === 'recharge' || type.includes('recharge') || type === 'mobile';
        });
        break;
      case 'wallet':
        data = data.filter(t => {
          const type = (t.type || '').toLowerCase();
          return type === 'wallet_add' || type === 'wallet' || type === 'deposit' || type.includes('wallet');
        });
        break;
      case 'commission':
        data = data.filter(t => {
          const type = (t.type || '').toLowerCase();
          return type === 'commission' || type.includes('commission');
        });
        break;
      case 'online_deposit':
        data = data.filter(t => t.type?.toLowerCase() === 'wallet_add' && t.details?.gateway);
        break;
      case 'manual_deposit':
        data = data.filter(t => t.type?.toLowerCase() === 'wallet_add' && t.details?.adminAction);
        break;
      case 'complaints':
        data = data.filter(t => t.details?.complaint);
        break;
      default:
        break;
    }

    // Search Filtering
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(t => {
        const mobile = t.details?.mobile || '';
        const retailerName = t.retailer_name || t.profiles?.name || '';
        const txnId = t.details?.txnId || t.id || '';
        return mobile.includes(q) || 
               retailerName.toLowerCase().includes(q) ||
               txnId.toLowerCase().includes(q);
      });
    }

    // Date Filtering
    if (dateRange.start) {
      data = data.filter(t => {
        const dateStr = t.created_at || t.timestamp;
        if (!dateStr) return true; // Don't filter out if no date
        return new Date(dateStr) >= new Date(dateRange.start);
      });
    }
    if (dateRange.end) {
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      data = data.filter(t => {
        const dateStr = t.created_at || t.timestamp;
        if (!dateStr) return true; // Don't filter out if no date
        return new Date(dateStr) <= end;
      });
    }

    return data;
  }, [transactions, view, searchQuery, dateRange]);

  const handleExport = () => {
    if (filteredData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const exportData = filteredData.map(t => {
      const base = {
        Date: new Date(t.created_at || t.timestamp).toLocaleString(),
        'Retailer Name': t.retailer_name || 'N/A',
        'Retailer Mobile': t.retailer_mobile || 'N/A',
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
    <div className="space-y-3">
      {reportOptions.map((option) => (
        <Card 
          key={option.id} 
          className="border-none shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setView(option.id as ReportType)}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-slate-100 rounded-lg">
                {option.icon}
              </div>
              <span className="font-medium text-slate-700">{option.label}</span>
            </div>
            <ChevronRight className="text-slate-300 h-5 w-5" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderReportHeader = (title: string) => (
    <div className="flex items-center gap-3 mb-6">
      <Button variant="ghost" size="icon" onClick={() => setView('menu')} className="h-8 w-8">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
    </div>
  );

  const renderReportContent = () => {
    const title = reportOptions.find(o => o.id === view)?.label || '';
    
    return (
      <div className="space-y-6">
        <div className="bg-[#0033cc] text-white p-4 -mx-4 -mt-4 mb-6 flex items-center gap-4 sticky top-0 z-20 md:rounded-t-xl md:mx-0 md:mt-0">
          <Button variant="ghost" size="icon" onClick={() => setView('menu')} className="text-white hover:bg-white/10 h-8 w-8">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative col-span-1 md:col-span-2">
            <Input 
              placeholder="Mobile no./Order Id" 
              className="pr-12 h-12 text-sm bg-white border border-slate-200 shadow-sm rounded-lg focus-visible:ring-[#0033cc]" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Filter className="absolute right-4 top-3.5 h-5 w-5 text-slate-400" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2 h-12 border-slate-200" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        <Card className="border border-slate-100 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
              <CalendarDays size={14} /> Filter by Date Range
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px]">From</Label>
                <Input 
                  type="date" 
                  className="h-9 text-xs" 
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">To</Label>
                <Input 
                  type="date" 
                  className="h-9 text-xs" 
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {view === 'datewise' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          ) : filteredData.length > 0 ? (
            filteredData.map((txn, i) => (
              <Card 
                key={i} 
                className="border border-slate-100 shadow-sm rounded-xl overflow-hidden bg-white cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => {
                  setSelectedTransaction(txn);
                  setShowDetailModal(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-slate-900">Order Id :{txn.details?.txnId || txn.id?.slice(0, 12).toUpperCase() || 'N/A'}</p>
                    <p className="text-sm font-bold text-slate-900">₹{txn.amount}</p>
                  </div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[11px] text-slate-500 font-medium">
                      {new Date(txn.created_at || txn.timestamp || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date(txn.created_at || txn.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-3 border-blue-200 text-blue-600 rounded-md hover:bg-blue-50">
                      Repay <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-14 w-14 rounded-full overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-100">
                      <img 
                        src={getOperatorLogo(txn.details?.operator)} 
                        alt={txn.details?.operator}
                        className="h-10 w-10 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-base">{txn.details?.operator || (txn.type === 'wallet_add' ? 'Wallet Load' : 'Transaction')}</p>
                      <p className="text-sm text-slate-600 font-medium">{txn.details?.mobile || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400 italic">User: {txn.retailer_name || 'System'}</p>
                    </div>
                    <div className="self-end text-right">
                      <div className={cn(
                        "px-3 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider mb-2 inline-block",
                        txn.status === 'success' ? "border-green-500 text-green-600 bg-white" : 
                        txn.status === 'failed' ? "border-red-500 text-red-600 bg-white" : "border-amber-500 text-amber-600 bg-white"
                      )}>
                        {txn.status}
                      </div>
                      {view === 'complaints' && (
                        <div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] px-3 border-purple-200 text-purple-600 rounded-md hover:bg-purple-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolve(txn);
                            }}
                          >
                            {txn.details?.complaintStatus === 'Resolved' ? 'View Resolution' : 'Resolve'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium">
                    Operator Ref: {txn.details?.opid || txn.details?.txnId || 'N/A'}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="py-20 text-center text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-200">
              No records found for the selected filters.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-10">
      {view === 'menu' ? (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800">Reports Panel</h3>
          {renderMenu()}
        </div>
      ) : (
        renderReportContent()
      )}

      <TransactionDetailModal 
        transaction={selectedTransaction}
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        getOperatorLogo={getOperatorLogo}
      />

      {/* Resolve Complaint Modal */}
      {resolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="bg-purple-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold">Resolve Complaint</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => setResolveModalOpen(false)}>
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500">Transaction ID</p>
                <p className="font-bold text-sm">{resolveTxn?.details?.txnId || resolveTxn?.id}</p>
                <p className="text-xs text-slate-500 mt-2">Complaint Type</p>
                <p className="font-bold text-sm">{resolveTxn?.details?.complaintType || 'N/A'}</p>
                <p className="text-xs text-slate-500 mt-2">Description</p>
                <p className="text-sm">{resolveTxn?.details?.complaintDesc || 'N/A'}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={resolveData.status}
                  onChange={(e) => setResolveData({...resolveData, status: e.target.value})}
                >
                  <option value="Pending">Pending</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Final Result</label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={resolveData.result}
                  onChange={(e) => setResolveData({...resolveData, result: e.target.value})}
                >
                  <option value="Success">Success</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Remark</label>
                <textarea 
                  className="w-full p-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px]"
                  placeholder="Resolution remark..."
                  value={resolveData.remark}
                  onChange={(e) => setResolveData({...resolveData, remark: e.target.value})}
                />
              </div>

              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={submitResolve}>
                Update Complaint
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


