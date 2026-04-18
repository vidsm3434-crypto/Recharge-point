import { useState, useEffect } from 'react';
import { useAuthContext } from '../../hooks/AuthContext';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Smartphone, Tv, Zap, Car, CreditCard, Plus, ArrowRight, Gift, Info, ShieldCheck, Sparkles, Percent, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { AddBalanceModal } from './AddBalanceModal';
import { BannerSlider } from './BannerSlider';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';

export function HomeView({ onServiceSelect, onViewCommission }: { onServiceSelect: () => void, onViewCommission?: () => void }) {
  const { profile, fetchProfile } = useAuthContext();
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [banners, setBanners] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/config/global')
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data?.banners) {
          setBanners(result.data.banners);
        }
      })
      .catch(err => console.error('Error fetching banners:', err));
  }, []);

  const handleUpgrade = async () => {
    if (!profile) return;
    if ((profile.wallet_balance || 0) < 500) {
      toast.error('Insufficient balance. You need ₹500 in your wallet.');
      return;
    }
    
    setUpgrading(true);
    setShowUpgradeConfirm(false);
    try {
      console.log('Starting distributor upgrade for user:', profile.id);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          role: 'distributor',
          wallet_balance: profile.wallet_balance - 500
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      const { error: txnError } = await supabase.from('transactions').insert([{
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

      if (txnError) {
        console.error('Transaction insert error:', txnError);
        // We don't throw here because the profile is already updated
      }

      toast.success('Congratulations! You are now a Distributor.');
      
      // Refresh profile data instead of full reload
      await fetchProfile(profile.id);
      
      // Small delay then reload to ensure all components update
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('Upgrade failed:', error);
      toast.error(`Upgrade failed: ${error.message || 'Unknown error'}`);
    } finally {
      setUpgrading(false);
    }
  };

  const services = [
    { id: 'mobile', icon: <Smartphone className="h-6 w-6" />, label: 'Mobile', color: 'bg-primary' },
    { id: 'dth', icon: <Tv className="h-6 w-6" />, label: 'DTH', color: 'bg-slate-400', comingSoon: true },
    { id: 'electricity', icon: <Zap className="h-6 w-6" />, label: 'Electricity', color: 'bg-primary/60', comingSoon: true },
    { id: 'fastag', icon: <Car className="h-6 w-6" />, label: 'FASTag', color: 'bg-secondary', comingSoon: true },
    { id: 'postpaid', icon: <CreditCard className="h-6 w-6" />, label: 'Postpaid', color: 'bg-primary/40', comingSoon: true },
  ];

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Banner Section */}
      <BannerSlider banners={banners} />

      {/* Wallet Card & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden border-none bg-gradient-to-br from-primary to-primary/80 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-0.5">
                <p className="text-[10px] opacity-70 font-black uppercase tracking-[0.2em]">Available Balance</p>
                <h2 className="text-2xl md:text-3xl font-black">₹{profile?.wallet_balance?.toFixed(2) || '0.00'}</h2>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="gap-2 rounded-xl px-6 h-11 font-bold shadow-lg hover:shadow-primary/20 transition-all border-none"
                  onClick={() => setShowAddBalance(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Money
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats / Info Card */}
        <Card className="hidden lg:flex border-none bg-white shadow-sm overflow-hidden">
          <CardContent className="p-6 flex flex-col justify-between w-full">
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800">Quick Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Today's Sales</span>
                  <span className="font-bold text-slate-800">₹0.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Success Rate</span>
                  <span className="font-bold text-green-600">100%</span>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4 border-slate-200">View Detailed Analytics</Button>
          </CardContent>
        </Card>
      </div>

      {/* Distributor Upgrade Banner */}
      {profile?.role === 'retailer' && profile?.kyc_status === 'verified' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white shadow-lg"
        >
          <div className="absolute -right-4 -top-4 opacity-20">
            <Sparkles className="h-24 w-24" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-black">Become a Distributor</h4>
                <p className="text-sm opacity-90 font-medium">Earn higher commissions & manage your own retailer network!</p>
              </div>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="text-center md:text-right hidden sm:block">
                <p className="text-[10px] uppercase font-bold opacity-80">Upgrade Fee</p>
                <p className="text-lg font-black">₹500.00</p>
              </div>
              <Button 
                className="w-full md:w-auto bg-white text-orange-600 hover:bg-white/90 font-black px-8 h-12 rounded-xl shadow-lg"
                onClick={() => setShowUpgradeConfirm(true)}
                disabled={upgrading}
              >
                {upgrading ? 'Upgrading...' : 'Upgrade Now'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <Dialog open={showUpgradeConfirm} onOpenChange={setShowUpgradeConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade to Distributor</DialogTitle>
            <DialogDescription>
              Are you sure you want to upgrade to Distributor for ₹500? 
              This will give you higher commissions and the ability to manage your own retailer network.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowUpgradeConfirm(false)} disabled={upgrading}>
              Cancel
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleUpgrade} disabled={upgrading}>
              {upgrading ? 'Processing...' : 'Confirm Upgrade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddBalanceModal 
        open={showAddBalance} 
        onClose={() => setShowAddBalance(false)} 
      />

      {/* Services Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-800">Recharge & Bill Payments</h3>
            <p className="text-xs text-slate-500">Fast and secure payments for all your needs</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-full px-4" onClick={onServiceSelect}>
            View All Services
          </Button>
        </div>
        
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 md:gap-6">
          {services.map((service, index) => (
            <motion.button
              key={service.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              className="group relative flex flex-col items-center gap-3"
              onClick={() => !service.comingSoon && onServiceSelect()}
            >
              <div className={cn(
                "flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl md:rounded-3xl text-white shadow-lg transition-all group-hover:shadow-xl group-hover:-translate-y-1 group-active:scale-95",
                service.color
              )}>
                <div className="transition-transform group-hover:scale-110">
                  {service.icon}
                </div>
              </div>
              <span className="text-center text-xs md:text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">
                {service.label}
              </span>
              {service.comingSoon && (
                <span className="absolute top-0 right-0 rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm">
                  Soon
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Promotions / Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none bg-indigo-600 text-white shadow-lg overflow-hidden relative group cursor-pointer" onClick={onViewCommission}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Percent className="h-24 w-24" />
          </div>
          <CardContent className="flex items-center justify-between p-6 relative z-10">
            <div className="space-y-2">
              <h4 className="text-xl font-bold">Commission Structure</h4>
              <p className="text-sm opacity-80 max-w-[200px]">Check your earnings for each operator</p>
              <Button size="sm" variant="secondary" className="mt-2 rounded-full">View Details</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-purple-600 text-white shadow-lg overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Gift className="h-24 w-24" />
          </div>
          <CardContent className="flex items-center justify-between p-6 relative z-10">
            <div className="space-y-2">
              <h4 className="text-xl font-bold">Refer & Earn ₹50</h4>
              <p className="text-sm opacity-80 max-w-[200px]">Invite your friends and earn rewards</p>
              <Button size="sm" variant="secondary" className="mt-2 rounded-full">Invite Now</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-amber-50 shadow-sm border border-amber-100">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-800">
                <Info className="h-5 w-5" />
                <h4 className="font-bold">Security Tip</h4>
              </div>
              <p className="text-sm text-amber-700">Never share your MPIN or OTP with anyone.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
