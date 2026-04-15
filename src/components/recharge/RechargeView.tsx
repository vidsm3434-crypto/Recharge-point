import React, { useState } from 'react';
import { useAuthContext } from '../../hooks/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Smartphone, 
  IndianRupee, 
  CheckCircle2, 
  XCircle, 
  Share2, 
  ArrowLeft, 
  Contact2, 
  ChevronDown,
  Clock,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';

const operators = [
  { id: 'Airtel', name: 'Airtel', logo: 'https://img.sanishtech.com/u/f1c9578535dfe829e17b81f1b35757bd.png' },
  { id: 'Jio', name: 'Jio', logo: 'https://img.sanishtech.com/u/e53166a350f4b2ff2add92dab3fb8471.png' },
  { id: 'Vi', name: 'Vi', logo: 'https://img.sanishtech.com/u/60bb10caa5dd136a40dba33d7eb5268e.jpg' },
  { id: 'BSNL', name: 'BSNL', logo: 'https://img.sanishtech.com/u/5500e251803fa7db0bb8ab9d037a72a9.webp' }
];

const circles = [
  'West Bengal', 'Bihar', 'Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 
  'Uttar Pradesh', 'Rajasthan', 'Gujarat', 'Punjab', 'Haryana', 'Kerala'
];

export function RechargeView({ onBack }: { onBack?: () => void }) {
  const { profile, fetchProfile } = useAuthContext();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    mobile: '',
    operator: '',
    state: '',
    amount: '',
    mpin: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showOperatorList, setShowOperatorList] = useState(false);
  const [showCircleList, setShowCircleList] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Auto-detect operator
  React.useEffect(() => {
    if (formData.mobile.length >= 4) {
      const prefix = formData.mobile.substring(0, 3);
      // Basic detection logic (can be expanded)
      if (['600', '700', '800', '900'].includes(prefix)) {
        if (!formData.operator) setFormData(prev => ({ ...prev, operator: 'Jio' }));
      } else if (['984', '994', '974', '964', '954', '944', '914', '814', '804', '704'].includes(prefix)) {
        if (!formData.operator) setFormData(prev => ({ ...prev, operator: 'Airtel' }));
      } else if (['989', '999', '979', '969', '959', '949', '919', '819', '809', '709'].includes(prefix)) {
        if (!formData.operator) setFormData(prev => ({ ...prev, operator: 'Vi' }));
      }
    }
  }, [formData.mobile]);

  // Real-time status listener
  React.useEffect(() => {
    if (result && result.status === 'pending' && result.id) {
      const channel = supabase
        .channel(`txn-${result.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transactions',
            filter: `id=eq.${result.id}`
          },
          (payload) => {
            console.log('Transaction updated in real-time:', payload.new);
            setResult((prev: any) => ({
              ...prev,
              status: payload.new.status,
              operator_txn_id: payload.new.details?.operator_txn_id,
              error: payload.new.status === 'failed' ? (payload.new.details?.callback_msg || 'Recharge failed') : null
            }));
            
            if (payload.new.status === 'success') {
              toast.success('Recharge Successful!');
              fetchProfile(profile!.id);
            } else if (payload.new.status === 'failed') {
              toast.error('Recharge Failed');
              fetchProfile(profile!.id);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [result, profile, fetchProfile]);

  const fetchPlans = async () => {
    if (!formData.operator) {
      toast.error('Please select an operator first');
      return;
    }
    setLoadingPlans(true);
    setShowPlans(true);
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('operator', formData.operator)
        .order('amount', { ascending: true });
      
      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      toast.error('Failed to fetch plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.mobile || formData.mobile.length !== 10) {
        toast.error('Enter valid 10-digit mobile number');
        return;
      }
      if (!formData.operator || !formData.state || !formData.amount) {
        toast.error('Please fill all details');
        return;
      }
      if (parseFloat(formData.amount) > (profile?.wallet_balance || 0)) {
        toast.error('Insufficient wallet balance');
        return;
      }
      setShowConfirmModal(true);
    }
  };

  const handleRecharge = async () => {
    if (formData.mpin.length !== 4) {
      toast.error('Enter 4-digit MPIN');
      return;
    }

    if (formData.mpin !== profile?.mpin) {
      toast.error('Incorrect MPIN');
      return;
    }

    setShowConfirmModal(false);
    setStep(2); // Move to Processing Screen
    setProcessingStep(1); // Step 1: Transaction Initiated
    
    try {
      const amount = parseFloat(formData.amount);
      
      // Step 1: Initiated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 2: Wallet Deducted
      setProcessingStep(2);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Recharge Processing (API Call)
      setProcessingStep(3);
      
      // Call our backend API to process the recharge
      const apiResponse = await fetch('/api/recharge/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: formData.mobile,
          operator: formData.operator,
          amount: amount,
          circle: formData.state,
          userId: profile?.id
        })
      });

      const apiData = await apiResponse.json();
      
      // Use normalized status from backend if available, otherwise fallback to basic check
      let status: 'success' | 'failed' | 'pending' = apiData.normalizedStatus || 'pending';
      
      if (!apiData.normalizedStatus) {
        if (apiData.status === 'SUCCESS' || apiData.status === 'success' || apiData.STATUS === '1') {
          status = 'success';
        } else if (apiData.status === 'FAILED' || apiData.status === 'failed' || apiData.STATUS === '0') {
          status = 'failed';
        }
      }

      if (status === 'success' || status === 'pending') {
        setProcessingStep(4); // Step 3: Success
      } else {
        setProcessingStep(5); // Step 3: Failed
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500));

      const transactionId = apiData.txnId || apiData.txid || `RBH${Date.now()}`;

      // 2. Save transaction to database
      const { data: txnData, error: txnError } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: profile?.id,
            type: 'recharge',
            amount: amount,
            status: status,
            details: {
              mobile: formData.mobile,
              operator: formData.operator,
              state: formData.state,
              txnId: transactionId,
              opid: apiData.apiTxId || apiData.txid || apiData.opid,
              error_message: status === 'failed' ? (apiData.message || apiData.msg || apiData.ERROR) : null,
              api_response: apiData,
              closing_balance: status === 'success' ? (profile?.wallet_balance || 0) - amount : profile?.wallet_balance || 0
            },
            retailer_name: profile?.name,
            retailer_mobile: profile?.mobile
          }
        ])
        .select()
        .single();

      if (txnError) throw txnError;

      // 3. Update wallet if successful
      if (status === 'success') {
        const { error: walletError } = await supabase
          .from('profiles')
          .update({ wallet_balance: (profile?.wallet_balance || 0) - amount })
          .eq('id', profile?.id);

        if (walletError) throw walletError;

        // --- COMMISSION LOGIC ---
        if (profile?.distributor_id) {
          const { data: distributor, error: distFetchError } = await supabase
            .from('profiles')
            .select('id, wallet_balance')
            .eq('id', profile.distributor_id)
            .maybeSingle();

          if (!distFetchError && distributor) {
            const commissionRate = 0.02; 
            const commissionAmount = amount * commissionRate;

            const { error: distWalletError } = await supabase
              .from('profiles')
              .update({ wallet_balance: (distributor.wallet_balance || 0) + commissionAmount })
              .eq('id', distributor.id);

            if (!distWalletError) {
              await supabase.from('transactions').insert([
                {
                  user_id: distributor.id,
                  type: 'commission',
                  amount: commissionAmount,
                  status: 'success',
                  details: {
                    note: `Commission from ${profile.name} for recharge of ₹${amount}`,
                    retailer_id: profile.id,
                    recharge_amount: amount,
                    mobile: formData.mobile,
                    txnId: `COM${Date.now()}`
                  }
                }
              ]);
            }
          }
        }
      }

      await fetchProfile(profile!.id);

      setResult({
        id: txnData.id,
        status: status,
        txnId: transactionId,
        apiTxId: apiData.apiTxId || apiData.txid || apiData.opid,
        mobile: formData.mobile,
        amount: amount,
        date: new Date().toLocaleString(),
        error: status === 'failed' ? 'Recharge Failed. Please try again later.' : null
      });
      setStep(3); // Result Screen
      
      if (status === 'success') {
        toast.success('Recharge Successful!');
      } else if (status === 'pending') {
        toast.info('Recharge is Pending');
      } else {
        toast.error('Recharge Failed. Please try again later.');
      }
    } catch (error: any) {
      console.error(error);
      setProcessingStep(5);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Save failed transaction to database even if API throws an error
      try {
        await supabase.from('transactions').insert([{
          user_id: profile?.id,
          type: 'recharge',
          amount: parseFloat(formData.amount) || 0,
          status: 'failed',
          details: {
            mobile: formData.mobile,
            operator: formData.operator,
            state: formData.state,
            txnId: `FAIL${Date.now()}`,
            error_message: error.message || 'API Error',
            closing_balance: profile?.wallet_balance || 0
          },
          retailer_name: profile?.name,
          retailer_mobile: profile?.mobile
        }]);
      } catch (dbError) {
        console.error('Failed to save failed transaction:', dbError);
      }

      setResult({ status: 'failed', error: 'Recharge Failed. Please try again later.' });
      setStep(3);
    } finally {
      setLoading(false);
      setProcessingStep(0);
    }
  };

  const reset = () => {
    setStep(1);
    setFormData({ mobile: '', operator: '', state: '', amount: '', mpin: '' });
    setResult(null);
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50">
      {/* Custom Header */}
      <div className="bg-blue-700 text-white p-4 flex items-center gap-4 sticky top-0 z-20">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/10 h-8 w-8" 
          onClick={() => {
            if (step > 1) {
              setStep(step - 1);
            } else if (onBack) {
              onBack();
            }
          }}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-lg font-medium">
          {step === 1 ? 'Prepaid Recharge' : step === 2 ? 'Processing' : 'Status'}
        </h2>
      </div>

      <div className="p-4 flex-1">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                {/* Mobile Number Input */}
                <Card className="border shadow-none rounded-xl">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <Input 
                        placeholder="Please Enter Mobile Number" 
                        className="border-none shadow-none p-0 h-auto text-base focus-visible:ring-0 placeholder:text-slate-500" 
                        value={formData.mobile}
                        onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                        maxLength={10}
                        inputMode="numeric"
                      />
                    </div>
                    <Contact2 className="h-6 w-6 text-blue-700" />
                  </CardContent>
                </Card>

                {/* Operator Select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Select Operator</label>
                  <div className="grid grid-cols-4 gap-3">
                    {operators.map((op) => (
                      <motion.button
                        key={op.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setFormData({...formData, operator: op.name})}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                          formData.operator === op.name 
                            ? "border-blue-600 bg-blue-50 shadow-md" 
                            : "border-slate-100 bg-white hover:border-slate-200"
                        )}
                      >
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-white flex items-center justify-center shadow-sm border">
                          <img 
                            src={op.logo} 
                            alt={op.name} 
                            className="h-8 w-8 object-contain" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-[10px] font-black text-blue-700">${op.name[0]}</span>`;
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700">{op.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Circle Select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Select Circle</label>
                  <Card className="border shadow-none rounded-xl overflow-hidden">
                    <CardContent className="p-0">
                      <button 
                        className="w-full h-14 px-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
                        onClick={() => setShowCircleList(!showCircleList)}
                      >
                        <span className={cn("text-base", !formData.state && "text-slate-500")}>
                          {formData.state || 'Select Circle'}
                        </span>
                        <motion.div
                          animate={{ rotate: showCircleList ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        </motion.div>
                      </button>
                      
                      <AnimatePresence>
                        {showCircleList && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t overflow-hidden bg-slate-50"
                          >
                            <div className="flex flex-col p-2">
                              {circles.map((circle) => (
                                <motion.button
                                  key={circle}
                                  whileHover={{ x: 5, backgroundColor: '#f8fafc' }}
                                  whileTap={{ scale: 0.99 }}
                                  onClick={() => {
                                    setFormData({...formData, state: circle});
                                    setShowCircleList(false);
                                  }}
                                  className={cn(
                                    "px-4 py-3 text-left text-sm rounded-lg transition-all flex items-center justify-between group",
                                    formData.state === circle 
                                      ? "bg-blue-600 text-white font-bold shadow-md" 
                                      : "text-slate-700 hover:text-blue-600 border-b border-slate-50 last:border-0"
                                  )}
                                >
                                  <span>{circle}</span>
                                  {formData.state === circle && <CheckCircle2 className="h-4 w-4 text-white" />}
                                </motion.button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </div>

                {/* Amount Input */}
                <Card className="border shadow-none rounded-xl">
                  <CardContent className="p-4 flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <Input 
                        placeholder="Enter Amount" 
                        className="border-none shadow-none p-0 h-auto text-base focus-visible:ring-0 placeholder:text-slate-500" 
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        inputMode="numeric"
                      />
                    </div>
                    <Button 
                      className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg h-9 px-4"
                      onClick={fetchPlans}
                    >
                      View Plans
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <p className="text-lg font-bold text-slate-800">
                  Wallet Balance : ₹{profile?.wallet_balance?.toFixed(2) || '0.00'}
                </p>

                <Button 
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white h-14 text-xl font-bold rounded-xl shadow-lg"
                  onClick={handleNext}
                >
                  Proceed to Pay
                </Button>
              </div >
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6"
            >
              <div className="w-full max-w-xs space-y-12">
                <div className="space-y-8">
                  {/* Step 1: Initiated */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: processingStep >= 1 ? 1 : 0.3, x: processingStep >= 1 ? 0 : -20 }}
                    className="flex items-center gap-4"
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                      processingStep >= 1 ? "border-blue-600 bg-blue-50" : "border-slate-200"
                    )}>
                      {processingStep > 1 ? (
                        <CheckCircle2 className="h-6 w-6 text-blue-600" />
                      ) : (
                        <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                      )}
                    </div>
                    <span className={cn(
                      "text-lg font-bold transition-all duration-500",
                      processingStep >= 1 ? "text-slate-900" : "text-slate-300"
                    )}>Transaction Initiated</span>
                  </motion.div>

                  {/* Step 2: Wallet Deducted */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: processingStep >= 2 ? 1 : 0.3, x: processingStep >= 2 ? 0 : -20 }}
                    className="flex items-center gap-4"
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                      processingStep >= 2 ? "border-green-600 bg-green-50" : "border-slate-200"
                    )}>
                      {processingStep > 2 ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : processingStep === 2 ? (
                        <Loader2 className="h-6 w-6 text-green-600 animate-spin" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-slate-200" />
                      )}
                    </div>
                    <span className={cn(
                      "text-lg font-bold transition-all duration-500",
                      processingStep >= 2 ? "text-slate-900" : "text-slate-300"
                    )}>Wallet Deducted Successfully</span>
                  </motion.div>

                  {/* Step 3: Recharge Processing / Success / Failed */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: processingStep >= 3 ? 1 : 0.3, x: processingStep >= 3 ? 0 : -20 }}
                    className="flex items-center gap-4"
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                      processingStep === 4 ? "border-green-600 bg-green-50" : 
                      processingStep === 5 ? "border-red-600 bg-red-50" :
                      processingStep === 3 ? "border-blue-600 bg-blue-50" : "border-slate-200"
                    )}>
                      {processingStep === 4 ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : processingStep === 5 ? (
                        <XCircle className="h-6 w-6 text-red-600" />
                      ) : processingStep === 3 ? (
                        <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-slate-200" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-lg font-bold transition-all duration-500",
                        processingStep >= 3 ? "text-slate-900" : "text-slate-300"
                      )}>
                        {processingStep === 4 ? "Recharge Successful" : 
                         processingStep === 5 ? "Recharge Failed" : 
                         "Recharge Processing..."}
                      </span>
                      {processingStep === 5 && (
                        <motion.span 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-red-500 font-medium"
                        >
                          Refund Initiated to Wallet
                        </motion.span>
                      )}
                    </div>
                  </motion.div>
                </div>

                <div className="pt-8">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: `${Math.min((processingStep / 4) * 100, 100)}%` }}
                      className={cn(
                        "h-full transition-all duration-500",
                        processingStep === 5 ? "bg-red-500" : "bg-blue-600"
                      )}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && result && (
            <motion.div
              key="step3"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center space-y-8 py-10"
            >
              {result.status === 'success' ? (
                <div className="flex flex-col items-center gap-6 text-center w-full">
                  <div className="relative">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 12 }}
                      className="relative rounded-full bg-green-100 p-8 border-4 border-white shadow-xl"
                    >
                      <CheckCircle2 className="h-24 w-24 text-green-600" />
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-green-200 rounded-full -z-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-green-600">SUCCESSFUL!</h2>
                    <p className="text-slate-500 font-medium">Your recharge has been processed</p>
                  </div>
                  
                  <Card className="w-full max-w-sm border-2 border-dashed bg-white p-6 rounded-2xl shadow-sm">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">Amount Paid</span>
                        <span className="font-black text-2xl text-blue-700">₹{result.amount}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">Status</span>
                        <span className="font-bold text-green-600 uppercase">Success</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">Date & Time</span>
                        <span className="text-xs font-bold text-slate-600">{result.date}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">Mobile Number</span>
                        <span className="font-bold text-slate-800">{result.mobile}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">Operator</span>
                        <span className="font-bold text-slate-800">{formData.operator}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-sm">Transaction ID</span>
                        <span className="font-mono text-xs font-bold text-slate-600">{result.txnId}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              ) : result.status === 'pending' ? (
                <div className="flex flex-col items-center gap-6 text-center w-full">
                  <div className="relative">
                    <div className="absolute inset-0 bg-yellow-200 rounded-full animate-ping opacity-25"></div>
                    <div className="relative rounded-full bg-yellow-100 p-6 border-4 border-white shadow-xl">
                      <Clock className="h-20 w-20 text-yellow-600 animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-yellow-600">PENDING...</h2>
                    <p className="text-slate-500 font-medium">Waiting for operator confirmation</p>
                  </div>
                  
                  <Card className="w-full max-w-sm border-2 border-dashed bg-white p-6 rounded-2xl shadow-sm">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">Mobile Number</span>
                        <span className="font-bold text-slate-800">{result.mobile}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">Amount</span>
                        <span className="font-black text-xl text-blue-700">₹{result.amount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-sm">Transaction ID</span>
                        <span className="font-mono text-xs font-bold text-slate-600">{result.txnId}</span>
                      </div>
                    </div>
                  </Card>
                  <p className="text-[10px] text-slate-400 max-w-[250px]">
                    Status will update automatically once we receive confirmation from the operator.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="rounded-full bg-red-100 p-8 border-4 border-white shadow-xl">
                    <XCircle className="h-24 w-24 text-red-600" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-red-600">FAILED!</h2>
                    <p className="text-slate-500 font-medium">Recharge Failed</p>
                    {result.error && <p className="text-sm text-red-400">{result.error}</p>}
                  </div>
                </div>
              )}
              
              <div className="flex w-full max-w-sm gap-4">
                <Button variant="outline" className="flex-1 h-12 gap-2 rounded-xl border-2 font-bold" onClick={() => {
                  const text = `Recharge of ₹${result.amount} for ${result.mobile} is successful. Txn ID: ${result.txnId}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}>
                  <Share2 className="h-4 w-4" /> Share
                </Button>
                <Button className="flex-1 h-12 bg-blue-700 hover:bg-blue-800 font-bold rounded-xl" onClick={reset}>Done</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col"
          >
            <div className="bg-blue-700 p-8 text-white text-center space-y-2">
              <p className="text-blue-200 text-sm font-medium uppercase tracking-widest">Confirm Recharge</p>
              <h3 className="text-3xl font-black">{formData.mobile}</h3>
              <div className="text-4xl font-black mt-4 bg-white/10 py-3 rounded-2xl border border-white/20">
                ₹{formData.amount}
              </div>
            </div>

            <div className="p-8 space-y-8 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Operator</p>
                  <p className="font-bold text-slate-800">{formData.operator}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Circle</p>
                  <p className="font-bold text-slate-800">{formData.state}</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Enter 4-digit MPIN</label>
                <Input 
                  type="password" 
                  placeholder="● ● ● ●" 
                  className="text-center text-4xl h-20 tracking-[0.5em] font-black border-2 border-slate-100 focus:border-blue-700 rounded-2xl bg-slate-50" 
                  maxLength={4}
                  value={formData.mpin}
                  onChange={(e) => setFormData({...formData, mpin: e.target.value})}
                  inputMode="numeric"
                  autoFocus
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 h-14 rounded-2xl font-bold border-2 text-slate-600"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 h-14 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-2xl shadow-lg shadow-blue-200"
                  onClick={handleRecharge}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
      {/* Plans Dialog */}
      <Dialog open={showPlans} onOpenChange={setShowPlans}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden h-[80vh] flex flex-col">
          <DialogHeader className="p-4 bg-blue-700 text-white">
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" /> {formData.operator} Plans
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="unlimited" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b">
              <TabsList className="w-full bg-slate-200/50">
                <TabsTrigger value="unlimited" className="flex-1 text-xs">Unlimited</TabsTrigger>
                <TabsTrigger value="data" className="flex-1 text-xs">Data</TabsTrigger>
                <TabsTrigger value="topup" className="flex-1 text-xs">Topup</TabsTrigger>
                <TabsTrigger value="talktime" className="flex-1 text-xs">Others</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 p-4">
              {loadingPlans ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="h-8 w-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-slate-500 font-medium">Fetching best plans...</p>
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-slate-500">No plans found for this operator</p>
                </div>
              ) : (
                <>
                  {['unlimited', 'data', 'topup', 'talktime'].map((type) => (
                    <TabsContent key={type} value={type} className="mt-0 space-y-3">
                      {plans.filter(p => p.type === type).length === 0 ? (
                        <p className="text-center py-10 text-xs text-slate-400">No {type} plans available</p>
                      ) : (
                        plans.filter(p => p.type === type).map((plan) => (
                          <Card 
                            key={plan.id} 
                            className="border shadow-none hover:border-blue-200 cursor-pointer transition-colors active:scale-[0.98]"
                            onClick={() => {
                              setFormData({...formData, amount: plan.amount.toString()});
                              setShowPlans(false);
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl font-black text-slate-900">₹{plan.amount}</span>
                                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">
                                  {plan.validity}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">{plan.description}</p>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </TabsContent>
                  ))}
                </>
              )}
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

