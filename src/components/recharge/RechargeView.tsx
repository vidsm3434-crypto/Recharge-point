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
  Loader2,
  PlusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { fetchOperatorLogos, getOperatorLogo } from '../../lib/operators';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { AddBalanceModal } from '../dashboard/AddBalanceModal';

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
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [addBalanceAmount, setAddBalanceAmount] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [operatorLogos, setOperatorLogos] = useState<any>(null);

  React.useEffect(() => {
    fetchOperatorLogos().then(setOperatorLogos);
  }, []);

  const dynamicOperators = operators.map(op => ({
    ...op,
    logo: getOperatorLogo(op.name, operatorLogos)
  }));

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
      const response = await fetch('/api/config/recharge_plans');
      if (!response.ok) throw new Error('Failed to fetch plans');
      const result = await response.json();
      
      const allPlans = result.data || [];
      const filteredPlans = allPlans.filter((p: any) => p.operator === formData.operator);
      
      setPlans(filteredPlans);
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
      
      const amount = parseFloat(formData.amount);
      const balance = profile?.wallet_balance || 0;
      
      if (amount > balance) {
        setAddBalanceAmount((amount - balance).toString());
        setStep(2);
        setProcessingStep(-1); // Low balance state
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
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setProcessingStep(2); // Step 2: Wallet Deducted
    
    // Start the API process automatically in the background
    continueRecharge(false); 
    
    await new Promise(resolve => setTimeout(resolve, 800));
    // Only show OK button if we haven't already moved to a later processing stage (4+)
    setProcessingStep(prev => prev < 3 ? 3 : prev); 
  };

  const continueRecharge = async (manualClick: boolean = true) => {
    if (isContinuing && manualClick) {
      // If already running and user clicks OK, just switch the view
      setStep(3);
      return;
    }
    
    if (isContinuing) return;
    setIsContinuing(true);
    
    // Set processing step to 4 to show the "Recharge Processing" spinner
    setProcessingStep(4);

    // If user clicked OK, move to result screen immediately
    if (manualClick) {
      setStep(3);
    }

    // Initialize processing result
    setResult({
      status: 'processing',
      mobile: formData.mobile,
      amount: formData.amount,
      date: new Date().toLocaleString(),
      txnId: `RBH${Date.now()}`
    });
    
    try {
      const amount = parseFloat(formData.amount);
      
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

      const transactionId = apiData.txnId || apiData.txid || `RBH${Date.now()}`;

      // 2. Calculate Commission before saving transaction
      let retailerCommAmount = 0;
      let distributorCommAmount = 0;
      let adminProfitAmount = 0;
      let apiCommRate = 0;

      if (status === 'success') {
        try {
          const response = await fetch('/api/config/global');
          const result = await response.json();
          const globalConfig = result.data || {};
          
          const serviceType = 'mobile'; // Default to mobile for now
          const defaultRates = globalConfig.commissions?.[serviceType] || { api: 3.5, retailer: 2.5, distributor: 0.7 };
          
          // Check for operator-specific override
          const operatorName = formData.operator; // e.g., "Jio", "Airtel"
          const operatorOverride = globalConfig.commissions?.operators?.[operatorName];
          
          // Hardcoded defaults based on user image if not in config
          const opDefaults: Record<string, any> = {
            'Airtel': { api: 0.80, retailer: 0.50, distributor: 0.20 },
            'Vodafone': { api: 3.50, retailer: 2.50, distributor: 0.70 },
            'Idea': { api: 3.50, retailer: 2.50, distributor: 0.70 },
            'Jio': { api: 0.55, retailer: 0.35, distributor: 0.15 },
            'BSNL': { api: 2.80, retailer: 2.00, distributor: 0.60 },
            'Vi': { api: 3.50, retailer: 2.50, distributor: 0.70 }
          };

          const rates = {
            api: operatorOverride?.api ?? opDefaults[operatorName]?.api ?? defaultRates.api ?? 3.5,
            retailer: operatorOverride?.retailer ?? opDefaults[operatorName]?.retailer ?? defaultRates.retailer ?? 2.5,
            distributor: operatorOverride?.distributor ?? opDefaults[operatorName]?.distributor ?? defaultRates.distributor ?? 0.7
          };
          
          apiCommRate = (rates.api || 0) / 100;
          const retailerCommRate = (rates.retailer || 0) / 100;
          const distributorCommRate = (rates.distributor || 0) / 100;
          
          // Calculate Amounts
          retailerCommAmount = amount * retailerCommRate;
          distributorCommAmount = amount * distributorCommRate;
          adminProfitAmount = amount * (apiCommRate - retailerCommRate - distributorCommRate);
        } catch (err) {
          console.error("Error calculating commission:", err);
        }
      }

      // 3. Save transaction to database
      const closingBalance = status === 'success' ? (profile?.wallet_balance || 0) - amount + retailerCommAmount : profile?.wallet_balance || 0;

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
              closing_balance: closingBalance,
              commission_earned: retailerCommAmount
            },
            retailer_name: profile?.name,
            retailer_mobile: profile?.mobile
          }
        ])
        .select()
        .single();

      if (txnError) throw txnError;

      // 4. Update wallet and distribute commission if successful
      if (status === 'success') {
        try {
          // 2. Credit Retailer
          const { error: retailerWalletError } = await supabase
            .from('profiles')
            .update({ wallet_balance: closingBalance })
            .eq('id', profile?.id);

          if (retailerWalletError) throw retailerWalletError;

          // Log Retailer Commission
          await supabase.from('transactions').insert([{
            user_id: profile?.id,
            type: 'commission',
            amount: retailerCommAmount,
            status: 'success',
            details: {
              note: `Self Commission for recharge of ₹${amount}`,
              recharge_amount: amount,
              mobile: formData.mobile,
              txnId: `RCOM${Date.now()}`,
              closing_balance: closingBalance
            }
          }]);

          // 3. Handle Distributor
          if (profile?.distributor_id) {
            const { data: distributor } = await supabase
              .from('profiles')
              .select('id, wallet_balance')
              .eq('id', profile.distributor_id)
              .maybeSingle();

            if (distributor) {
              const distributorNewBalance = (distributor.wallet_balance || 0) + distributorCommAmount;
              // Credit Distributor
              await supabase
                .from('profiles')
                .update({ wallet_balance: distributorNewBalance })
                .eq('id', distributor.id);

              // Log Distributor Commission
              await supabase.from('transactions').insert([{
                user_id: distributor.id,
                type: 'commission',
                amount: distributorCommAmount,
                status: 'success',
                details: {
                  note: `Commission from ${profile.name} for recharge of ₹${amount}`,
                  retailer_id: profile.id,
                  recharge_amount: amount,
                  mobile: formData.mobile,
                  txnId: `DCOM${Date.now()}`,
                  closing_balance: distributorNewBalance
                }
              }]);
            } else {
              // If distributor not found, distributor share goes to Admin
              adminProfitAmount += distributorCommAmount;
              distributorCommAmount = 0;
            }
          } else {
            // If no distributor linked, distributor share goes to Admin
            adminProfitAmount += distributorCommAmount;
            distributorCommAmount = 0;
          }

          // 4. Log Admin Profit (Internal tracking via a specific transaction or log)
          // We can log this to a special 'admin_profits' table or just as a system transaction
          await supabase.from('transactions').insert([{
            user_id: 'SYSTEM_ADMIN', // Placeholder for admin tracking
            type: 'admin_profit',
            amount: adminProfitAmount,
            status: 'success',
            details: {
              note: `Profit from recharge of ₹${amount} by ${profile?.name}`,
              retailer_id: profile?.id,
              distributor_id: profile?.distributor_id,
              api_comm: amount * apiCommRate,
              retailer_comm: retailerCommAmount,
              distributor_comm: distributorCommAmount,
              txnId: `APRO${Date.now()}`
            }
          }]);

        } catch (commError) {
          console.error('Commission distribution failed:', commError);
          // We don't fail the recharge if commission fails, but we log it
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
      
      if (status === 'success') {
        toast.success('Recharge Successful!');
      } else if (status === 'pending') {
        toast.info('Recharge is Pending');
      } else {
        toast.error('Recharge Failed. Please try again later.');
      }
    } catch (error: any) {
      console.error(error);
      
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
    } finally {
      setLoading(false);
      setIsContinuing(false);
      // Removed setProcessingStep(0) to prevent flickering before transition
      setStep(3); // Always move to result screen when finished
    }
  };

  const reset = () => {
    setStep(1);
    setFormData({ mobile: '', operator: '', state: '', amount: '', mpin: '' });
    setResult(null);
    setProcessingStep(0);
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
                    {dynamicOperators.map((op) => (
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
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-50 bg-white flex flex-col p-6 pt-24"
            >
              {processingStep === -1 ? (
                <div className="w-full max-w-sm mx-auto space-y-8 text-center">
                  <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20" />
                    <div className="relative bg-red-50 rounded-full p-6 border-4 border-white shadow-xl">
                      <PlusCircle className="h-12 w-12 text-red-600" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-800">Insufficient Balance</h2>
                    <p className="text-slate-500 font-medium">You need ₹{addBalanceAmount} more to complete this recharge.</p>
                  </div>

                  <Card className="border-none bg-white shadow-xl rounded-3xl overflow-hidden">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Recharge Amount</span>
                        <span className="font-bold">₹{formData.amount}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Current Balance</span>
                        <span className="font-bold">₹{profile?.wallet_balance?.toFixed(2)}</span>
                      </div>
                      <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-slate-800 font-bold">Required to Add</span>
                        <span className="text-xl font-black text-red-600">₹{addBalanceAmount}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    <Button 
                      className="w-full h-14 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-3"
                      onClick={() => setShowAddBalance(true)}
                    >
                      <PlusCircle className="h-5 w-5" />
                      Add Balance Online
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full text-slate-500 font-bold"
                      onClick={() => setStep(1)}
                    >
                      Cancel & Go Back
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-sm mx-auto space-y-12">
                  <div className="text-center space-y-2 mb-8">
                    <h3 className="text-2xl font-black text-slate-900">Processing Recharge</h3>
                    <p className="text-slate-500 font-medium">Please do not close the app</p>
                  </div>

                  <div className="space-y-10">
                    {/* Step 1: Initiated */}
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: processingStep >= 1 ? 1 : 0.3, x: processingStep >= 1 ? 0 : -20 }}
                      className="flex items-center gap-5"
                    >
                      <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                        processingStep >= 1 ? "border-blue-600 bg-blue-50" : "border-slate-200"
                      )}>
                        {processingStep > 1 ? (
                          <CheckCircle2 className="h-7 w-7 text-blue-600" />
                        ) : (
                          <Loader2 className="h-7 w-7 text-blue-600 animate-spin" />
                        )}
                      </div>
                      <span className={cn(
                        "text-xl font-black transition-all duration-500",
                        processingStep >= 1 ? "text-slate-900" : "text-slate-300"
                      )}>Transaction Initiated</span>
                    </motion.div>

                    {/* Step 2: Wallet Deducted */}
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: processingStep >= 2 ? 1 : 0.3, x: processingStep >= 2 ? 0 : -20 }}
                      className="flex items-center gap-5"
                    >
                      <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                        processingStep >= 2 ? "border-green-600 bg-green-50" : "border-slate-200"
                      )}>
                        {processingStep > 2 ? (
                          <CheckCircle2 className="h-7 w-7 text-green-600" />
                        ) : processingStep === 2 ? (
                          <Loader2 className="h-7 w-7 text-green-600 animate-spin" />
                        ) : (
                          <div className="h-3 w-3 rounded-full bg-slate-200" />
                        )}
                      </div>
                      <span className={cn(
                        "text-xl font-black transition-all duration-500",
                        processingStep >= 2 ? "text-slate-900" : "text-slate-300"
                      )}>Wallet Deducted</span>
                    </motion.div>

                    {/* Step 3: Processing / Success / Failed */}
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: processingStep >= 4 ? 1 : 0.3, x: processingStep >= 4 ? 0 : -20 }}
                      className="flex items-center gap-5"
                    >
                      <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                        processingStep === 5 ? "border-green-600 bg-green-50" : 
                        processingStep === 6 ? "border-red-600 bg-red-50" :
                        processingStep === 4 ? "border-blue-600 bg-blue-50" : "border-slate-200"
                      )}>
                        {processingStep === 5 ? (
                          <CheckCircle2 className="h-7 w-7 text-green-600" />
                        ) : processingStep === 6 ? (
                          <XCircle className="h-7 w-7 text-red-600" />
                        ) : processingStep === 4 ? (
                          <Loader2 className="h-7 w-7 text-blue-600 animate-spin" />
                        ) : (
                          <div className="h-3 w-3 rounded-full bg-slate-200" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className={cn(
                          "text-xl font-black transition-all duration-500",
                          processingStep >= 4 ? "text-slate-900" : "text-slate-300"
                        )}>
                          {processingStep === 5 ? "Recharge Successful" : 
                           processingStep === 6 ? "Recharge Failed" : 
                           "Recharge Processing..."}
                        </span>
                      </div>
                    </motion.div>
                  </div>

                  <div className="pt-6">
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <motion.div 
                        initial={{ width: "0%" }}
                        animate={{ width: `${Math.min((processingStep / 5) * 100, 100)}%` }}
                        className={cn(
                          "h-full transition-all duration-500",
                          processingStep === 6 ? "bg-red-500" : "bg-blue-600"
                        )}
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {(processingStep === 3 || processingStep === 4) && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="pt-12"
                      >
                        <Button 
                          className="w-full h-16 bg-blue-700 hover:bg-blue-800 text-white text-2xl font-black rounded-3xl shadow-2xl flex items-center justify-center gap-4 border-4 border-blue-100/30"
                          onClick={() => continueRecharge(true)}
                        >
                          <CheckCircle2 className="h-8 w-8" />
                          OK
                        </Button>
                        <p className="text-center text-slate-400 text-sm mt-6 font-bold uppercase tracking-widest">Tap OK to Complete</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && result && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center space-y-8 py-6"
            >
              <div className="flex flex-col items-center gap-6 text-center w-full">
                <div className="relative">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12 }}
                    className={cn(
                      "relative rounded-full p-10 border-4 border-white shadow-2xl",
                      result.status === 'success' || result.status === 'pending' ? "bg-green-100" : 
                      result.status === 'processing' ? "bg-blue-50" : "bg-red-100"
                    )}
                  >
                    {result.status === 'success' || result.status === 'pending' ? (
                      <CheckCircle2 className="h-24 w-24 text-green-600" />
                    ) : result.status === 'processing' ? (
                      <Loader2 className="h-24 w-24 text-blue-600 animate-spin" />
                    ) : (
                      <XCircle className="h-24 w-24 text-red-600" />
                    )}
                  </motion.div>
                </div>
                <div className="space-y-2">
                  <h2 className={cn(
                    "text-4xl font-black tracking-tight",
                    result.status === 'success' || result.status === 'pending' ? "text-green-600" : 
                    result.status === 'processing' ? "text-blue-600" : "text-red-600"
                  )}>
                    {result.status === 'success' ? 'SUCCESSFUL!' : 
                     result.status === 'pending' ? 'PENDING' : 
                     result.status === 'processing' ? 'PROCESSING...' : 'FAILED!'}
                  </h2>
                  <p className="text-slate-500 font-bold text-lg">
                    {result.status === 'success' ? 'Recharge Completed' : 
                     result.status === 'pending' ? 'Processing with Operator' : 
                     result.status === 'processing' ? 'Verifying with Operator' : 'Transaction Failed'}
                  </p>
                </div>
                
                <Card className="w-full max-w-sm border-none bg-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-blue-600" />
                  <div className="text-center mb-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Receipt</p>
                  </div>
                  <div className="space-y-5">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                      <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Amount</span>
                      <span className="font-black text-3xl text-blue-700">₹{result.amount}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                      <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Mobile</span>
                      <span className="font-black text-xl text-slate-800">{result.mobile}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                      <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Operator</span>
                      <span className="font-black text-slate-800">{formData.operator}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                      <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Date</span>
                      <span className="text-xs font-black text-slate-600">{result.date}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Txn ID</span>
                      <span className="font-mono text-xs font-black text-slate-600">{result.txnId}</span>
                    </div>
                    {result.error && (
                      <div className="mt-6 p-4 bg-red-50 rounded-2xl border border-red-100">
                        <p className="text-[10px] text-red-600 font-black uppercase mb-1 tracking-wider">Failure Reason</p>
                        <p className="text-xs text-red-500 font-bold">{result.error}</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
              
              <div className="flex w-full max-w-sm gap-4 px-4">
                <Button 
                  variant="outline" 
                  className="flex-1 h-16 gap-3 rounded-3xl border-4 font-black text-xl text-blue-700 border-blue-50 hover:bg-blue-50 shadow-lg" 
                  disabled={result.status === 'processing'}
                  onClick={() => {
                    const statusText = result.status === 'success' ? 'Successful' : result.status === 'pending' ? 'Pending' : 'Failed';
                    const text = `*Recharge Receipt*\n\n*Status:* ${statusText}\n*Mobile:* ${result.mobile}\n*Amount:* ₹${result.amount}\n*Operator:* ${formData.operator}\n*Txn ID:* ${result.txnId}\n*Date:* ${result.date}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                >
                  <Share2 className="h-6 w-6" /> Share
                </Button>
                <Button 
                  className="flex-1 h-16 bg-blue-700 hover:bg-blue-800 font-black text-2xl rounded-3xl shadow-2xl border-4 border-blue-600" 
                  disabled={result.status === 'processing'}
                  onClick={reset}
                >
                  Done
                </Button>
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

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase">Wallet Balance</p>
                  <p className="text-xl font-black text-slate-900">₹{profile?.wallet_balance?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase">Recharge Amount</p>
                  <p className="text-xl font-black text-blue-700">₹{parseFloat(formData.amount).toFixed(2)}</p>
                </div>
              </div>

              {parseFloat(formData.amount) > (profile?.wallet_balance || 0) ? (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-red-900">Insufficient Balance</p>
                      <p className="text-xs text-red-700">You need ₹{(parseFloat(formData.amount) - (profile?.wallet_balance || 0)).toFixed(2)} more to complete this recharge.</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white h-12 rounded-xl font-bold flex items-center gap-2"
                    onClick={() => {
                      setAddBalanceAmount((parseFloat(formData.amount) - (profile?.wallet_balance || 0)).toFixed(2));
                      setShowAddBalance(true);
                    }}
                  >
                    <PlusCircle className="h-5 w-5" />
                    Add Money Online
                  </Button>
                </div>
              ) : (
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
              )}

              <div className="flex gap-4 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 h-14 rounded-2xl font-bold border-2 text-slate-600"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </Button>
                {parseFloat(formData.amount) <= (profile?.wallet_balance || 0) && (
                  <Button 
                    className="flex-1 h-14 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-2xl shadow-lg shadow-blue-200"
                    onClick={handleRecharge}
                  >
                    Confirm
                  </Button>
                )}
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
      {/* Add Balance Modal */}
      <AddBalanceModal 
        open={showAddBalance} 
        onClose={() => setShowAddBalance(false)} 
        initialAmount={addBalanceAmount}
      />
    </div>
  );
}

