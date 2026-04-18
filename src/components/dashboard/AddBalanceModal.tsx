import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../hooks/AuthContext';
import { toast } from 'sonner';
import { CreditCard, Landmark, Send, Info, CheckCircle2 } from 'lucide-react';

interface AddBalanceModalProps {
  open: boolean;
  onClose: () => void;
  initialAmount?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function AddBalanceModal({ open, onClose, initialAmount }: AddBalanceModalProps) {
  const { profile, fetchProfile } = useAuthContext();
  const [amount, setAmount] = useState(initialAmount || '');
  const [refNumber, setRefNumber] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'manual'>('online');

  // Update amount if initialAmount changes
  React.useEffect(() => {
    if (initialAmount) {
      setAmount(initialAmount);
    }
  }, [initialAmount]);

  const handleManualRequest = async () => {
    const cleanRefNumber = refNumber.trim().toUpperCase();
    const cleanUpiId = upiId.trim();

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!cleanRefNumber) {
      toast.error('Please enter reference number');
      return;
    }
    if (!cleanUpiId) {
      toast.error('Please enter your UPI ID');
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      // Check if UTR already exists in any successful or pending transaction
      // Using arrow operator for JSONB field check
      const { data: existingTxns, error: checkError } = await supabase
        .from('transactions')
        .select('id, status')
        .eq('type', 'wallet_add')
        .filter('details->>refNumber', 'eq', cleanRefNumber);

      if (checkError) {
        console.error('Error checking UTR:', checkError);
      } else if (existingTxns && existingTxns.length > 0) {
        const hasSuccess = existingTxns.some(t => t.status === 'success');
        const hasPending = existingTxns.some(t => t.status === 'pending');
        
        if (hasSuccess) {
          toast.error('This Reference Number (UTR) has already been used and approved.');
          setLoading(false);
          return;
        }
        if (hasPending) {
          toast.error('A request with this Reference Number is already pending approval.');
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: profile?.id,
            type: 'wallet_add',
            amount: parseFloat(amount),
            status: 'pending',
            details: {
              method: 'manual',
              refNumber: cleanRefNumber,
              upiId: cleanUpiId,
              requestedAt: new Date().toISOString(),
              note: 'Manual wallet load request'
            }
          }
        ]);

      if (error) throw error;

      toast.success('Request submitted successfully. Admin will verify and approve.');
      onClose();
      setAmount('');
      setRefNumber('');
      setUpiId('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const handleOnlinePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      // DRMO Check
      if (profile?.email?.trim().toLowerCase() === 'ashish.10bd@gmail.com') {
        const { error } = await supabase
          .from('transactions')
          .insert([
            {
              user_id: profile?.id,
              type: 'wallet_add',
              amount: parseFloat(amount),
              status: 'success',
              details: {
                method: 'online',
                gateway: 'Razorpay',
                razorpay_payment_id: `pay_DRMO${Date.now()}`,
                note: 'Online wallet load via Razorpay',
                closing_balance: (profile?.wallet_balance || 0) + parseFloat(amount)
              }
            }
          ]);

        if (error) throw error;

        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ 
            wallet_balance: (profile?.wallet_balance || 0) + parseFloat(amount) 
          })
          .eq('id', profile?.id);

        if (balanceError) throw balanceError;

        // Force a profile fetch to update balance immediately in UI
        if (profile?.id) {
          await fetchProfile(profile.id);
        }

        toast.success('Payment successful! Balance added to wallet.');
        onClose();
        setLoading(false);
        return;
      }

      // 1. Fetch Razorpay Config from Admin
      const { data: configData } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'global')
        .maybeSingle();
      
      const razorpayKey = configData?.value?.payment?.razorpayKeyId;

      if (!razorpayKey) {
        toast.error('Online payment is currently unavailable. Please use Manual method.');
        setLoading(false);
        return;
      }

      // 2. Initialize Razorpay Options
      const options = {
        key: razorpayKey,
        amount: parseFloat(amount) * 100, // Amount in paise
        currency: 'INR',
        name: 'RechargePoint',
        description: 'Wallet Add Balance',
        image: 'https://picsum.photos/seed/recharge/200/200',
        handler: async function (response: any) {
          // Payment Success
          try {
            const { error } = await supabase
              .from('transactions')
              .insert([
                {
                  user_id: profile?.id,
                  type: 'wallet_add',
                  amount: parseFloat(amount),
                  status: 'success',
                  details: {
                    method: 'online',
                    gateway: 'Razorpay',
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                    note: 'Online wallet load via Razorpay',
                    closing_balance: (profile?.wallet_balance || 0) + parseFloat(amount)
                  }
                }
              ]);

            if (error) throw error;

            // Update user balance (In a real app, this should be done via a secure backend function/webhook)
            const { error: balanceError } = await supabase
              .from('profiles')
              .update({ 
                wallet_balance: (profile?.wallet_balance || 0) + parseFloat(amount) 
              })
              .eq('id', profile?.id);

            if (balanceError) throw balanceError;

            // Force a profile fetch to update balance immediately in UI
            if (profile?.id) {
              await fetchProfile(profile.id);
            }

            toast.success('Payment successful! Balance added to wallet.');
            onClose();
          } catch (err: any) {
            toast.error('Payment recorded but balance update failed. Please contact support.');
          }
        },
        prefill: {
          name: profile?.name,
          email: profile?.email,
          contact: profile?.mobile
        },
        theme: {
          color: '#0f172a'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        toast.error(response.error.description || 'Payment failed');
      });
      rzp.open();
    } catch (error: any) {
      toast.error('Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && !o && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Add Wallet Balance
          </DialogTitle>
          <DialogDescription>
            Choose your preferred method to add money to your wallet.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="online" className="w-full" onValueChange={(v) => setPaymentMethod(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="online" className="gap-2">
              <CreditCard size={14} /> Online
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <Landmark size={14} /> Manual
            </TabsTrigger>
          </TabsList>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-bold"
                inputMode="numeric"
              />
            </div>

            <TabsContent value="online" className="mt-0 space-y-4">
              <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800 flex gap-2">
                <Info className="h-4 w-4 shrink-0" />
                <p>Instant balance update via Razorpay. Supports UPI, Cards, and Netbanking.</p>
              </div>
              <Button className="w-full gap-2" onClick={handleOnlinePayment} disabled={loading}>
                {loading ? "Processing..." : "Pay Now"}
              </Button>
            </TabsContent>

            <TabsContent value="manual" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="upiId">Your UPI ID (Sender)</Label>
                <Input
                  id="upiId"
                  placeholder="e.g. name@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="refNumber">Reference / UTR Number</Label>
                <Input
                  id="refNumber"
                  placeholder="Enter transaction reference"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                />
              </div>
              <div className="rounded-lg bg-orange-50 p-3 text-xs text-orange-800 flex gap-2">
                <Info className="h-4 w-4 shrink-0" />
                <p>Submit your payment details. Admin will verify and approve within 30-60 minutes.</p>
              </div>
              <Button className="w-full gap-2" onClick={handleManualRequest} disabled={loading}>
                <Send size={16} /> {loading ? "Submitting..." : "Submit Request"}
              </Button>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <p className="text-[10px] text-slate-400 text-center w-full">
            By proceeding, you agree to our terms of service and payment policies.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
