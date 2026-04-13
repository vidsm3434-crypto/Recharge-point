import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Wallet, Plus, Minus, Search, History, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { toast } from 'sonner';

interface WalletManagementProps {
  users: any[];
  onUpdateWallet: (userId: string, amount: number, type: 'credit' | 'debit', remark: string) => void;
}

export function WalletManagement({ users, onUpdateWallet }: WalletManagementProps) {
  const [mobile, setMobile] = useState('');
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);

  const handleSearch = () => {
    const user = users.find(u => u.mobile === mobile);
    if (user) {
      setFoundUser(user);
    } else {
      toast.error('User not found');
      setFoundUser(null);
    }
  };

  const handleAction = (type: 'credit' | 'debit') => {
    if (!foundUser || !amount) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast.error('Enter valid amount');
      return;
    }
    onUpdateWallet(foundUser.id, val, type, remark);
    setAmount('');
    setRemark('');
    setMobile('');
    setFoundUser(null);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">Wallet Management</h3>
      
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">Quick Fund Transfer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="User Mobile Number" 
                className="pl-10" 
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                maxLength={10}
              />
            </div>
            <Button onClick={handleSearch} variant="secondary">Verify</Button>
          </div>

          {foundUser && (
            <div className="rounded-xl bg-slate-50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">{foundUser.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{foundUser.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase">Current Balance</p>
                  <p className="text-sm font-bold text-primary">₹{foundUser.wallet_balance?.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount (₹)</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Remark / Note</Label>
                  <Input 
                    placeholder="e.g. Cash received" 
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => handleAction('credit')}>
                  <Plus size={16} /> Add Balance
                </Button>
                <Button variant="destructive" className="gap-2" onClick={() => handleAction('debit')}>
                  <Minus size={16} /> Deduct Balance
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <History size={16} /> Recent Wallet Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-10 text-slate-400 text-xs italic">
            Wallet transaction logs are integrated with the main Transactions section.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
