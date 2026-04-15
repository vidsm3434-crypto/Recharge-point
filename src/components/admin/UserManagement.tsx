import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Search, UserPlus, ShieldCheck, ShieldAlert, Edit2, Trash2, Wallet, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';

interface UserManagementProps {
  users: any[];
  onUpdateUser: (userId: string, data: any) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateWallet: (user: any) => void;
  onAddUser?: () => void;
}

interface UserCardProps {
  user: any;
  distributors?: any[];
  onUpdateWallet: (user: any) => void;
  onUpdateUser: (userId: string, data: any) => void;
  onDeleteUser: (userId: string) => void;
}

const UserCard = ({ user, distributors, onUpdateWallet, onUpdateUser, onDeleteUser }: UserCardProps) => {
  const linkedDistributor = distributors?.find(d => d.id === user.distributor_id);

  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${user.status === 'blocked' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
              {user.name?.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold">{user.name}</p>
                {user.retailer_id && (
                  <Badge variant="outline" className="text-[9px] h-4 bg-primary/10 text-primary border-primary/20 font-bold">
                    {user.retailer_id}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-slate-500">{user.mobile} • {user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[8px] h-4 bg-slate-50 text-slate-500 border-slate-200">
                  {user.created_by || 'Self'}
                </Badge>
                {user.role === 'retailer' && linkedDistributor && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-400">Distributor:</span>
                    <span className="text-[9px] font-bold text-indigo-600">{linkedDistributor.name}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-4 w-4 text-red-400 hover:text-red-600"
                      onClick={() => onUpdateUser(user.id, { distributor_id: null })}
                    >
                      <Trash2 size={8} />
                    </Button>
                  </div>
                )}
                {user.role === 'retailer' && !linkedDistributor && (
                  <select 
                    className="text-[9px] border rounded px-1 py-0.5 bg-slate-50"
                    onChange={(e) => onUpdateUser(user.id, { distributor_id: e.target.value })}
                    value=""
                  >
                    <option value="">Link Distributor</option>
                    {distributors?.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-primary">₹{user.wallet_balance?.toFixed(2)}</p>
            <p className={`text-[9px] font-bold uppercase ${user.status === 'blocked' ? 'text-red-500' : 'text-green-500'}`}>
              {user.status || 'active'}
            </p>
          </div>
        </div>
        <div className="flex border-t bg-slate-50/50">
          <Button variant="ghost" size="sm" className="flex-1 rounded-none h-9 text-[10px] gap-1" onClick={() => onUpdateWallet(user)}>
            <Wallet size={12} /> Wallet
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 rounded-none h-9 text-[10px] gap-1" onClick={() => onUpdateUser(user.id, { status: user.status === 'blocked' ? 'active' : 'blocked' })}>
            {user.status === 'blocked' ? <ShieldCheck size={12} className="text-green-600" /> : <ShieldAlert size={12} className="text-red-600" />}
            {user.status === 'blocked' ? 'Unblock' : 'Block'}
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 rounded-none h-9 text-[10px] gap-1 text-red-600 hover:text-red-700" onClick={() => onDeleteUser(user.id)}>
            <Trash2 size={12} /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export function UserManagement({ users, onUpdateUser, onDeleteUser, onUpdateWallet, onAddUser }: UserManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const retailers = users.filter(u => u.role === 'retailer');
  const distributors = users.filter(u => u.role === 'distributor');

  const filterUsers = (list: any[]) => list.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.mobile?.includes(searchQuery) ||
    u.retailer_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by name or mobile..." 
            className="pl-10" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button size="sm" className="gap-2" onClick={onAddUser}>
          <UserPlus size={16} /> Add User
        </Button>
      </div>

      <Tabs defaultValue="retailers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="retailers" className="gap-2">
            <Users size={14} /> Retailers ({retailers.length})
          </TabsTrigger>
          <TabsTrigger value="distributors" className="gap-2">
            <ShieldCheck size={14} /> Distributors ({distributors.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="retailers" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filterUsers(retailers).map(u => (
              <div key={u.id}>
                <UserCard 
                  user={u} 
                  distributors={distributors}
                  onUpdateWallet={onUpdateWallet}
                  onUpdateUser={onUpdateUser}
                  onDeleteUser={onDeleteUser}
                />
              </div>
            ))}
          </div>
          {filterUsers(retailers).length === 0 && <p className="text-center py-10 text-slate-400 text-sm">No retailers found</p>}
        </TabsContent>
        
        <TabsContent value="distributors" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filterUsers(distributors).map(u => (
              <div key={u.id} className="space-y-2">
                <UserCard 
                  user={u} 
                  onUpdateWallet={onUpdateWallet}
                  onUpdateUser={onUpdateUser}
                  onDeleteUser={onDeleteUser}
                />
                {/* Linked Retailers */}
                <div className="ml-6 border-l-2 border-slate-200 pl-4 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Linked Retailers</p>
                  {users.filter(ret => ret.distributor_id === u.id).map(ret => (
                    <div key={ret.id} className="flex items-center justify-between bg-white p-2 rounded-lg text-[10px] shadow-sm">
                      <div className="flex flex-col">
                        <span className="font-bold text-primary">{ret.retailer_id || 'N/A'}</span>
                        <span>{ret.name} ({ret.mobile})</span>
                      </div>
                      <span className="font-bold">₹{ret.wallet_balance?.toFixed(0)}</span>
                    </div>
                  ))}
                  {users.filter(ret => ret.distributor_id === u.id).length === 0 && (
                    <p className="text-[9px] text-slate-400 italic">No retailers linked</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {filterUsers(distributors).length === 0 && <p className="text-center py-10 text-slate-400 text-sm">No distributors found</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

