import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Users, Wallet, Smartphone, CheckCircle2, XCircle, TrendingUp, ShieldAlert, ArrowRight, Landmark } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Button } from '../ui/button';

interface DashboardStatsProps {
  users: any[];
  transactions: any[];
  onViewMpinRequests?: () => void;
  onViewWalletRequests?: () => void;
}

export function DashboardStats({ users, transactions, onViewMpinRequests, onViewWalletRequests }: DashboardStatsProps) {
  const retailers = users.filter(u => u.role === 'retailer');
  const distributors = users.filter(u => u.role === 'distributor');
  const pendingMpinRequests = users.filter(u => u.mpin === 'RESET_PENDING');
  const pendingWalletRequests = transactions.filter(t => t.type === 'wallet_add' && t.status === 'pending');
  
  const today = new Date().toISOString().split('T')[0];
  const todayTxns = transactions.filter(t => {
    const date = t.created_at || t.timestamp;
    return date && date.startsWith(today);
  });
  const successTxns = transactions.filter(t => t.status === 'success');
  const failedTxns = transactions.filter(t => t.status === 'failed');

  const chartData = [
    { name: 'Success', value: successTxns.length, color: '#22c55e' },
    { name: 'Failed', value: failedTxns.length, color: '#ef4444' },
    { name: 'Pending', value: transactions.filter(t => t.status === 'pending').length, color: '#eab308' },
  ];

  const stats = [
    { label: 'Total Users', value: users.length, icon: <Users className="text-blue-600" />, sub: `${retailers.length} Ret / ${distributors.length} Dist` },
    { label: 'Total Float', value: `₹${users.reduce((acc, u) => acc + (u.wallet_balance || 0), 0).toFixed(0)}`, icon: <Wallet className="text-green-600" />, sub: 'System Balance' },
    { label: 'Today Recharges', value: todayTxns.length, icon: <Smartphone className="text-purple-600" />, sub: `₹${todayTxns.reduce((acc, t) => acc + (t.amount || 0), 0).toFixed(0)}` },
    { label: 'Success Rate', value: `${((successTxns.length / (transactions.length || 1)) * 100).toFixed(1)}%`, icon: <TrendingUp className="text-orange-600" />, sub: `${successTxns.length} Success` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {pendingMpinRequests.length > 0 && (
          <Card className="border-none bg-orange-50 shadow-sm border-l-4 border-l-orange-500 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-orange-100 p-2 text-orange-600">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-orange-900">MPIN Reset Requests</p>
                    <p className="text-xs text-orange-700">{pendingMpinRequests.length} users waiting</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-orange-700 hover:bg-orange-100 gap-1"
                  onClick={onViewMpinRequests}
                >
                  View <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {pendingWalletRequests.length > 0 && (
          <Card className="border-none bg-blue-50 shadow-sm border-l-4 border-l-blue-500 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">Wallet Load Requests</p>
                    <p className="text-xs text-blue-700">{pendingWalletRequests.length} requests pending</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-blue-700 hover:bg-blue-100 gap-1"
                  onClick={onViewWalletRequests}
                >
                  View <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="rounded-full bg-slate-50 p-2">{stat.icon}</div>
              </div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-[9px] text-slate-400">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Transaction Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.slice(0, 5).map((txn, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-1.5 ${txn.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {txn.status === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{txn.details?.mobile || 'Wallet'}</p>
                      <p className="text-[9px] text-slate-400">{new Date(txn.created_at || txn.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-xs font-bold">₹{txn.amount}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
