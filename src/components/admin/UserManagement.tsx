import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Search, UserPlus, ShieldCheck, ShieldAlert, Edit2, Trash2, Wallet, Users, Eye, Link as LinkIcon, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';

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
  onViewDetails: (user: any) => void;
}

const UserCard = ({ user, distributors, onUpdateWallet, onUpdateUser, onDeleteUser, onViewDetails }: UserCardProps) => {
  const linkedDistributor = distributors?.find(d => d.id === user.distributor_id);

  return (
    <Card className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black shadow-inner ${user.status === 'blocked' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
              {user.name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black truncate">{user.name}</p>
                {user.retailer_id && (
                  <Badge variant="outline" className="text-[9px] h-4 bg-primary/10 text-primary border-primary/20 font-bold px-1">
                    {user.retailer_id}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-medium">{user.mobile} • {user.email || 'No Email'}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[8px] h-4 bg-slate-50 text-slate-500 border-slate-200 font-bold">
                  {user.created_by || 'Self'}
                </Badge>
                {user.role === 'retailer' && linkedDistributor && (
                  <div className="flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                    <span className="text-[8px] font-bold text-indigo-600 truncate max-w-[80px]">{linkedDistributor.name}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-3 w-3 text-indigo-400 hover:text-red-500"
                      onClick={() => onUpdateUser(user.id, { distributor_id: null })}
                    >
                      <X size={8} />
                    </Button>
                  </div>
                )}
                {user.role === 'retailer' && !linkedDistributor && (
                  <div className="flex items-center gap-1">
                    <LinkIcon size={10} className="text-slate-400" />
                    <select 
                      className="text-[8px] border rounded px-1 py-0 bg-white font-bold text-slate-600 focus:ring-1 focus:ring-primary outline-none"
                      onChange={(e) => onUpdateUser(user.id, { distributor_id: e.target.value })}
                      value=""
                    >
                      <option value="">Link Distributor</option>
                      {distributors?.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-black text-primary">₹{user.wallet_balance?.toFixed(2)}</p>
            <Badge className={`text-[8px] font-black uppercase h-4 ${user.status === 'blocked' ? 'bg-red-500' : 'bg-green-500'}`}>
              {user.status || 'active'}
            </Badge>
          </div>
        </div>
        <div className="flex border-t bg-slate-50/50">
          <Button variant="ghost" size="sm" className="flex-1 rounded-none h-10 text-[10px] font-bold gap-1 hover:bg-white" onClick={() => onUpdateWallet(user)}>
            <Wallet size={12} className="text-primary" /> Wallet
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 rounded-none h-10 text-[10px] font-bold gap-1 hover:bg-white" onClick={() => onViewDetails(user)}>
            <Eye size={12} className="text-blue-600" /> Details
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 rounded-none h-10 text-[10px] font-bold gap-1 hover:bg-white" onClick={() => onUpdateUser(user.id, { status: user.status === 'blocked' ? 'active' : 'blocked' })}>
            {user.status === 'blocked' ? <ShieldCheck size={12} className="text-green-600" /> : <ShieldAlert size={12} className="text-red-600" />}
            {user.status === 'blocked' ? 'Unblock' : 'Block'}
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 rounded-none h-10 text-[10px] font-bold gap-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onDeleteUser(user.id)}>
            <Trash2 size={12} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export function UserManagement({ users, onUpdateUser, onDeleteUser, onUpdateWallet, onAddUser }: UserManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null);
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
                  onViewDetails={setSelectedUserDetails}
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
                  onViewDetails={setSelectedUserDetails}
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

      {/* User Details Modal */}
      <Dialog open={!!selectedUserDetails} onOpenChange={() => setSelectedUserDetails(null)}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black">
                {selectedUserDetails?.name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">{selectedUserDetails?.name}</h3>
                <p className="text-sm opacity-80 font-bold uppercase tracking-wider">{selectedUserDetails?.role}</p>
              </div>
            </div>
          </div>
          
          <ScrollArea className="max-h-[70vh]">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-black">Mobile Number</p>
                  <p className="text-sm font-bold text-slate-800">{selectedUserDetails?.mobile}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-black">Email Address</p>
                  <p className="text-sm font-bold text-slate-800">{selectedUserDetails?.email || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-black">Retailer ID</p>
                  <p className="text-sm font-bold text-slate-800">{selectedUserDetails?.retailer_id || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-black">Date of Birth</p>
                  <p className="text-sm font-bold text-slate-800">{selectedUserDetails?.dob || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-black">KYC Status</p>
                  <Badge className={cn(
                    "font-black uppercase text-[10px]",
                    selectedUserDetails?.kyc_status === 'verified' ? "bg-green-500" : 
                    selectedUserDetails?.kyc_status === 'pending' ? "bg-amber-500" : "bg-slate-400"
                  )}>
                    {selectedUserDetails?.kyc_status || 'Not Started'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-black">Wallet Balance</p>
                  <p className="text-sm font-black text-primary">₹{selectedUserDetails?.wallet_balance?.toFixed(2)}</p>
                </div>
              </div>

              {selectedUserDetails?.kyc_details && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">KYC Documents</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Aadhar Number</p>
                      <p className="text-sm font-bold">{selectedUserDetails.kyc_details.aadhaar}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">PAN Number</p>
                      <p className="text-sm font-bold">{selectedUserDetails.kyc_details.pan}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Shop Name</p>
                    <p className="text-sm font-bold">{selectedUserDetails.kyc_details.shopName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Address</p>
                    <p className="text-sm font-bold">{selectedUserDetails.kyc_details.address}</p>
                  </div>
                  {selectedUserDetails.kyc_details.aadhaarPhoto && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Aadhaar Photo</p>
                      <div className="aspect-video rounded-xl overflow-hidden border bg-slate-50">
                        <img src={selectedUserDetails.kyc_details.aadhaarPhoto} alt="Aadhaar" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedUserDetails?.role === 'distributor' && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Retailer Network</h4>
                  <div className="space-y-2">
                    {users.filter(ret => ret.distributor_id === selectedUserDetails.id).map(ret => (
                      <div key={ret.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-800">{ret.name}</span>
                          <span className="text-[10px] text-slate-500">{ret.mobile} • {ret.retailer_id}</span>
                        </div>
                        <span className="text-xs font-black text-primary">₹{ret.wallet_balance?.toFixed(2)}</span>
                      </div>
                    ))}
                    {users.filter(ret => ret.distributor_id === selectedUserDetails.id).length === 0 && (
                      <p className="text-sm text-slate-400 italic py-4 text-center">No retailers linked to this distributor</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-4 bg-slate-50 border-t flex gap-3">
            <Button variant="outline" className="flex-1 font-bold" onClick={() => setSelectedUserDetails(null)}>Close</Button>
            <Button 
              className="flex-1 font-bold bg-primary" 
              onClick={() => {
                onUpdateWallet(selectedUserDetails);
                setSelectedUserDetails(null);
              }}
            >
              Update Wallet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

