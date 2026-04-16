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
  XCircle,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, exportToCSV } from '../../lib/utils';
import { TransactionDetailModal } from '../reports/TransactionDetailModal';
import { CardHeader, CardTitle } from '../ui/card';

interface ReportsSystemProps {
  transactions: any[];
  initialView?: ReportType;
}

type ReportType = 
  | 'menu'
  | 'transactions' 
  | 'wallet' 
  | 'complaints' 
  | 'commission' 
  | 'admin_profit'
  | 'datewise' 
  | 'online_deposit' 
  | 'manual_deposit';

export function ReportsSystem({ transactions, initialView = 'menu' }: ReportsSystemProps) {
  const [view, setView] = useState<ReportType>(initialView);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [operatorFilter, setOperatorFilter] = useState('all');
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
    { id: 'admin_profit', label: 'Admin Profit Tracking', icon: <TrendingUp className="text-green-600" /> },
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
      case 'admin_profit':
        data = data.filter(t => {
          const type = (t.type || '').toLowerCase();
          return type === 'admin_profit' || type.includes('admin_profit');
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

    // Operator Filter
    if (operatorFilter !== 'all') {
      data = data.filter(t => t.details?.operator === operatorFilter);
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
        if (!dateStr) return true;
        return new Date(dateStr) >= new Date(dateRange.start);
      });
    }
    if (dateRange.end) {
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      data = data.filter(t => {
        const dateStr = t.created_at || t.timestamp;
        if (!dateStr) return true;
        return new Date(dateStr) <= end;
      });
    }

    return data;
  }, [transactions, view, searchQuery, dateRange, operatorFilter]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);

    const todayProfit = transactions
      .filter(t => (t.type === 'admin_profit') && (t.created_at || t.timestamp || '').startsWith(today))
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    const monthlyProfit = transactions
      .filter(t => (t.type === 'admin_profit') && (t.created_at || t.timestamp || '').startsWith(thisMonth))
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    const operatorProfits = transactions
      .filter(t => t.type === 'admin_profit' && t.details?.operator)
      .reduce((acc: any, t) => {
        const op = t.details.operator;
        acc[op] = (acc[op] || 0) + (t.amount || 0);
        return acc;
      }, {});

    return { todayProfit, monthlyProfit, operatorProfits };
  }, [transactions]);

  const handleExport = () => {
    if (filteredData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const exportData = filteredData.map(t => {
      const base = {
        Date: new Date(t.created_at || t.timestamp).toLocaleString(),
        'Retailer Name': t.retailer_name || t.profiles?.name || 'N/A',
        'Retailer Mobile': t.retailer_mobile || t.profiles?.mobile || 'N/A',
        Amount: t.amount,
        Status: t.status?.toUpperCase(),
        Type: t.type,
      };

      if (view === 'transactions' || view === 'admin_profit' || view === 'commission') {
        return {
          ...base,
          Mobile: t.details?.mobile || 'N/A',
          Operator: t.details?.operator || 'N/A',
          'Transaction ID': t.details?.txnId || t.id,
          'Operator ID': t.details?.opid || 'N/A',
          'Distributor Name': t.details?.distributor_name || 'N/A',
          'Profit/Comm Amount': t.amount,
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

  const renderAdminProfitDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none bg-green-50 shadow-sm">
          <CardContent className="p-6">
            <p className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Total Profit (Today)</p>
            <p className="text-3xl font-black text-green-700">₹{stats.todayProfit.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-blue-50 shadow-sm">
          <CardContent className="p-6">
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Total Profit (Monthly)</p>
            <p className="text-3xl font-black text-blue-700">₹{stats.monthlyProfit.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-purple-50 shadow-sm">
          <CardContent className="p-6">
            <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-1">Active Operators</p>
            <p className="text-3xl font-black text-purple-700">{Object.keys(stats.operatorProfits).length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">Operator-wise Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.operatorProfits).sort((a: any, b: any) => b[1] - a[1]).map(([op, amount]: any) => (
              <div key={op} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <img src={getOperatorLogo(op)} className="h-8 w-8 object-contain" referrerPolicy="no-referrer" />
                  <span className="font-bold text-sm">{op}</span>
                </div>
                <span className="font-black text-green-600">₹{amount.toFixed(2)}</span>
              </div>
            ))}
            {Object.keys(stats.operatorProfits).length === 0 && (
              <p className="text-center py-4 text-slate-400 italic">No operator profit data yet</p>
            )}
          </div>
        </CardContent>
      </Card>
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

        {view === 'admin_profit' && renderAdminProfitDashboard()}
        
        <div className="grid gap-4 md:grid-cols-4">
          <div className="relative col-span-1 md:col-span-2">
            <Input 
              placeholder="Search Mobile/Retailer/Txn ID" 
              className="pr-12 h-12 text-sm bg-white border border-slate-200 shadow-sm rounded-lg focus-visible:ring-[#0033cc]" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-4 top-3.5 h-5 w-5 text-slate-400" />
          </div>
          <div className="col-span-1">
            <select 
              className="w-full h-12 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0033cc]"
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
            >
              <option value="all">All Operators</option>
              <option value="Reliance Jio">Jio</option>
              <option value="Airtel">Airtel</option>
              <option value="VI">VI</option>
              <option value="BSNL">BSNL</option>
            </select>
          </div>
          <Button variant="outline" className="gap-2 h-12 border-slate-200" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
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
            <div className="space-y-3">
              <div className="bg-slate-100 p-3 rounded-lg flex justify-between items-center text-xs font-bold text-slate-600">
                <span>Showing {filteredData.length} records</span>
                <span>Total: ₹{filteredData.reduce((acc, t) => acc + (t.amount || 0), 0).toFixed(2)}</span>
              </div>
              {filteredData.map((txn, i) => (
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
                      <div className="flex gap-2">
                        {txn.type === 'recharge' && (
                          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-3 border-blue-200 text-blue-600 rounded-md hover:bg-blue-50">
                            Repay <RefreshCw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
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
                        <p className="font-bold text-slate-900 text-base">{txn.details?.operator || (txn.type === 'wallet_add' ? 'Wallet Load' : txn.type.replace(/_/g, ' '))}</p>
                        <p className="text-sm text-slate-600 font-medium">{txn.details?.mobile || 'N/A'}</p>
                        <div className="mt-1">
                          <p className="text-[10px] text-slate-500 font-bold">Retailer: {txn.retailer_name || txn.profiles?.name || 'System'}</p>
                          {txn.details?.distributor_name && (
                            <p className="text-[10px] text-indigo-500 font-bold">Distributor: {txn.details.distributor_name}</p>
                          )}
                        </div>
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
              ))}
            </div>
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


