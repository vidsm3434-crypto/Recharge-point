import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search, Filter, Smartphone, CheckCircle2, XCircle, Clock, Download, Calendar, RefreshCw } from 'lucide-react';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';
import { TransactionDetailModal } from '../reports/TransactionDetailModal';

interface TransactionManagementProps {
  transactions: any[];
  users: any[];
}

export function TransactionManagement({ transactions, users }: TransactionManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const filteredTransactions = transactions.filter(t => {
    const user = t.profiles || t.user_profile;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (t.details?.mobile || '').includes(searchTerm) || 
      (t.details?.txnId || '').toLowerCase().includes(searchLower) ||
      (user?.name || '').toLowerCase().includes(searchLower) ||
      (user?.retailer_id || '').toLowerCase().includes(searchLower) ||
      (t.retailer_name || '').toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getOperatorLogo = (operator: string) => {
    const op = operator?.toLowerCase() || '';
    if (op.includes('airtel')) return 'https://img.sanishtech.com/u/f1c9578535dfe829e17b81f1b35757bd.png';
    if (op.includes('vi') || op.includes('vodafone') || op.includes('idea')) return 'https://img.sanishtech.com/u/60bb10caa5dd136a40dba33d7eb5268e.jpg';
    if (op.includes('jio')) return 'https://img.sanishtech.com/u/e53166a350f4b2ff2add92dab3fb8471.png';
    if (op.includes('bsnl')) return 'https://img.sanishtech.com/u/5500e251803fa7db0bb8ab9d037a72a9.webp';
    return `https://picsum.photos/seed/${op}/100/100`;
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">All Transactions</h3>
        <Button variant="outline" size="sm" className="gap-2 border-slate-200">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Input 
            placeholder="Mobile no./Order Id" 
            className="pr-12 h-12 text-sm bg-white border border-slate-200 shadow-sm rounded-lg focus-visible:ring-[#0033cc]" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Filter className="absolute right-4 top-3.5 h-5 w-5 text-slate-400" />
        </div>
        <div className="flex gap-2">
          {['all', 'success', 'failed', 'pending'].map((status) => (
            <Button 
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'} 
              size="sm" 
              className={cn(
                "h-12 px-4 text-xs font-bold capitalize rounded-lg border-slate-200",
                statusFilter === status ? "bg-[#0033cc] text-white" : "text-slate-600"
              )}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 pb-10">
          {filteredTransactions.map((txn) => {
            const user = users.find(u => u.id === txn.user_id);
            const distributor = users.find(u => u.id === user?.distributor_id);
            
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
                      <div className="mt-1 text-[10px] leading-tight">
                        <p className="text-primary font-bold">{txn.profiles?.retailer_id || 'N/A'}</p>
                        <p className="text-slate-600 font-bold">{txn.profiles?.name || 'N/A'}</p>
                        <p className="text-slate-400">({txn.profiles?.mobile || 'N/A'})</p>
                      </div>
                    </div>
                    <div className="self-end">
                      <div className={cn(
                        "px-3 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider",
                        txn.status === 'success' ? "border-green-500 text-green-600 bg-white" : 
                        txn.status === 'failed' ? "border-red-500 text-red-600 bg-white" : "border-amber-500 text-amber-600 bg-white"
                      )}>
                        {txn.status}
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium">
                    Operator Ref: {txn.details?.opid || txn.details?.txnId || 'N/A'}
                  </p>
                </CardContent>
              </Card>
            );
          })}
          {filteredTransactions.length === 0 && (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
              <Smartphone className="mx-auto h-12 w-12 text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">No transactions found matching your filters.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <TransactionDetailModal 
        transaction={selectedTransaction}
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        getOperatorLogo={getOperatorLogo}
      />
    </div>
  );
}
