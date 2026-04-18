import { supabase } from '../../lib/supabase';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { User, ShieldCheck, History, Percent, Settings, HelpCircle, LogOut, Printer, Users } from 'lucide-react';
import { useAuthContext } from '../../hooks/AuthContext';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import { MPINModal } from './MPINModal';
import { useState } from 'react';

interface ProfileViewProps {
  open: boolean;
  onClose: () => void;
  onToggleAdminMode?: () => void;
  onMenuClick?: (id: string) => void;
}

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';

export function ProfileContent({ 
  onClose, 
  onToggleAdminMode, 
  onMenuClick 
}: { 
  onClose?: () => void;
  onToggleAdminMode?: () => void;
  onMenuClick?: (id: string) => void;
}) {
  const { profile, fetchProfile } = useAuthContext();
  const [showMPINModal, setShowMPINModal] = useState(false);
  const [mpinMode, setMpinMode] = useState<'change' | 'reset-request'>('change');
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const handleUpgrade = async () => {
    if (!profile) return;
    setUpgrading(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          role: 'distributor',
          wallet_balance: profile.wallet_balance - 500
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await supabase.from('transactions').insert([{
        user_id: profile.id,
        type: 'wallet_add',
        amount: 500,
        status: 'success',
        details: {
          note: 'Distributor Upgrade Fee',
          type: 'debit',
          txnId: `UPG${Date.now()}`,
          closing_balance: profile.wallet_balance - 500
        }
      }]);

      toast.success('Congratulations! You are now a Distributor.');
      await fetchProfile(profile.id);
      setShowUpgradeConfirm(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      toast.error(`Upgrade failed: ${error.message || 'Unknown error'}`);
    } finally {
      setUpgrading(false);
    }
  };

  const menuItems = [
    { id: 'kyc', icon: <ShieldCheck className="h-5 w-5" />, label: 'KYC Verification', sub: profile?.kyc_status || 'Pending' },
    { id: 'history', icon: <History className="h-5 w-5" />, label: 'Wallet History', sub: 'View all credits/debits' },
    { id: 'commission', icon: <Percent className="h-5 w-5" />, label: 'Commission Structure', sub: 'View your earnings' },
    { id: 'mpin', icon: <Settings className="h-5 w-5" />, label: 'Change MPIN', sub: 'Secure your transactions' },
    { id: 'support', icon: <HelpCircle className="h-5 w-5" />, label: 'Support & Help', sub: 'Contact admin' },
  ];

  if (profile?.role === 'retailer' && profile?.kyc_status === 'verified') {
    menuItems.splice(1, 0, { 
      id: 'upgrade', 
      icon: <ShieldCheck className="h-5 w-5 text-amber-500" />, 
      label: 'Become Distributor', 
      sub: 'Upgrade for ₹500' 
    });
  }

  if ((profile?.role === 'distributor' || profile?.mobile === '7872303434') && onMenuClick) {
    menuItems.unshift({ 
      id: 'distributor_panel',
      icon: <Users className="h-5 w-5 text-indigo-600" />, 
      label: 'Distributor Panel', 
      sub: 'Manage your retailers' 
    });
  }

  if (profile?.mobile === '7872303434' && onToggleAdminMode) {
    menuItems.unshift({ 
      id: 'admin',
      icon: <ShieldCheck className="h-5 w-5 text-primary" />, 
      label: 'Admin Panel', 
      sub: 'Switch to Admin Control' 
    });
  }

  const handleMenuClick = async (id: string) => {
    switch (id) {
      case 'admin':
        if (onToggleAdminMode) {
          onToggleAdminMode();
          onClose?.();
        }
        break;
      case 'distributor_panel':
        if (onMenuClick) {
          onMenuClick('distributor_panel');
          onClose?.();
        }
        break;
      case 'upgrade':
        if (!profile) return;
        if ((profile.wallet_balance || 0) < 500) {
          toast.error('Insufficient balance. You need ₹500 in your wallet.');
          return;
        }
        setShowUpgradeConfirm(true);
        break;
      case 'kyc':
        if (onMenuClick) {
          onMenuClick('kyc');
          onClose?.();
        }
        break;
      case 'history':
        if (onMenuClick) {
          onMenuClick('reports');
          onClose?.();
        }
        break;
      case 'commission':
        if (onMenuClick) {
          onMenuClick('commission');
          onClose?.();
        }
        break;
      case 'mpin':
        setMpinMode('change');
        setShowMPINModal(true);
        break;
      case 'support':
        window.open(`https://wa.me/917872303434?text=Support%20Request%20from%20${profile?.name}`, '_blank');
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="bg-primary p-6 text-white shrink-0">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-white/20">
            <AvatarFallback className="bg-white/10 text-xl text-white">
              {profile?.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <h3 className="text-xl font-bold">{profile?.name}</h3>
            <p className="text-white/70 text-sm">
              {profile?.mobile} • <span className="capitalize">{profile?.role}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Menu</p>
        </div>
        <div className="space-y-1 px-2">
          {menuItems.map((item, index) => (
            <Button 
              key={index} 
              variant="ghost" 
              className="h-auto w-full justify-start gap-4 py-3 text-left hover:bg-slate-100 rounded-xl"
              onClick={() => handleMenuClick(item.id)}
            >
              <div className="text-slate-500">{item.icon}</div>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-[10px] text-slate-400">{item.sub}</p>
              </div>
            </Button>
          ))}
        </div>
        
        <Separator className="my-4" />
        
        <div className="px-4 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">App Info</p>
          <p className="mt-2 text-xs text-slate-500 font-medium">Version 1.1.0 (Build 2026)</p>
        </div>
      </div>

      <div className="border-t p-4 shrink-0">
        <Button variant="destructive" className="w-full gap-2 rounded-xl h-11" onClick={handleLogout}>
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>

      <MPINModal 
        open={showMPINModal} 
        onClose={() => setShowMPINModal(false)} 
        mode={mpinMode}
      />

      <Dialog open={showUpgradeConfirm} onOpenChange={setShowUpgradeConfirm}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Upgrade to Distributor</DialogTitle>
            <DialogDescription>
              Are you sure you want to upgrade for ₹500?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowUpgradeConfirm(false)} disabled={upgrading}>Cancel</Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleUpgrade} disabled={upgrading}>
              {upgrading ? 'Processing...' : 'Confirm Upgrade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ProfileView({ open, onClose, onToggleAdminMode, onMenuClick }: ProfileViewProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[300px] p-0 border-none">
        <ProfileContent 
          onClose={onClose} 
          onToggleAdminMode={onToggleAdminMode} 
          onMenuClick={onMenuClick} 
        />
      </SheetContent>
    </Sheet>
  );
}
