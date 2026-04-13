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
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';

const operators = [
  { id: 'Airtel', name: 'Airtel', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Airtel_logo.svg/256px-Airtel_logo.svg.png' },
  { id: 'Jio', name: 'Jio', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Reliance_Jio_Logo.svg/256px-Reliance_Jio_Logo.svg.png' },
  { id: 'Vi', name: 'Vi', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Vi_logo.svg/256px-Vi_logo.svg.png' },
  { id: 'BSNL', name: 'BSNL', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d7/BSNL_Logo.svg/256px-BSNL_Logo.svg.png' }
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
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

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
      setStep(2);
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

    setLoading(true);
    try {
      const amount = parseFloat(formData.amount);
      
      // 1. Call our backend API to process the recharge
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
              api_response: apiData
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
            .single();

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
        apiTxId: apiData.apiTxId || apiData.txid,
        mobile: formData.mobile,
        amount: amount,
        date: new Date().toLocaleString(),
        error: status === 'failed' ? (apiData.message || 'API rejected the request') : null
      });
      setStep(3);
      
      if (status === 'success') {
        toast.success('Recharge Successful!');
      } else if (status === 'pending') {
        toast.info('Recharge is Pending');
      } else {
        toast.error('Recharge Failed: ' + (apiData.message || 'Unknown error'));
      }
    } catch (error: any) {
      console.error(error);
      setResult({ status: 'failed', error: error.message });
      setStep(3);
    } finally {
      setLoading(false);
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
          {step === 1 ? 'Prepaid Recharge' : step === 2 ? 'Confirm Payment' : 'Status'}
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
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card className="border shadow-sm rounded-2xl overflow-hidden">
                <div className="bg-blue-50 p-6 text-center border-b">
                  <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Recharge Amount</p>
                  <h2 className="text-4xl font-black text-blue-700 mt-1">₹{formData.amount}</h2>
                  <div className="mt-4 inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full shadow-sm border">
                    {operators.find(op => op.name === formData.operator)?.logo && (
                      <img 
                        src={operators.find(op => op.name === formData.operator)?.logo} 
                        alt="" 
                        className="h-4 w-4 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <span className="text-sm font-bold text-slate-700">{formData.mobile}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-sm font-medium text-slate-500">{formData.operator}</span>
                  </div>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-600 ml-1">Enter 4-digit MPIN</label>
                    <Input 
                      type="password" 
                      placeholder="● ● ● ●" 
                      className="text-center text-3xl h-16 tracking-[0.5em] font-bold border-2 focus:border-blue-700 rounded-xl" 
                      maxLength={4}
                      value={formData.mpin}
                      onChange={(e) => setFormData({...formData, mpin: e.target.value})}
                    />
                  </div>
                  <Button 
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white h-14 text-lg font-bold rounded-xl shadow-lg" 
                    onClick={handleRecharge} 
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Confirm Payment'}
                  </Button>
                </CardContent>
              </Card>
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
                    <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-25"></div>
                    <div className="relative rounded-full bg-green-100 p-6 border-4 border-white shadow-xl">
                      <CheckCircle2 className="h-20 w-20 text-green-600" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-green-600">SUCCESSFUL!</h2>
                    <p className="text-slate-500 font-medium">Your recharge has been processed</p>
                  </div>
                  
                  <Card className="w-full max-w-sm border-2 border-dashed bg-white p-6 rounded-2xl shadow-sm">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">Mobile Number</span>
                        <span className="font-bold text-slate-800">{result.mobile}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">Amount Paid</span>
                        <span className="font-black text-xl text-blue-700">₹{result.amount}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <span className="text-slate-500 text-sm">Transaction ID</span>
                        <span className="font-mono text-xs font-bold text-slate-600">{result.txnId}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-sm">Date & Time</span>
                        <span className="text-xs font-bold text-slate-600">{result.date}</span>
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
                  <div className="rounded-full bg-red-100 p-6 border-4 border-white shadow-xl">
                    <XCircle className="h-20 w-20 text-red-600" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-red-600">FAILED!</h2>
                    <p className="text-slate-500 font-medium">{result.error || 'Something went wrong'}</p>
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

