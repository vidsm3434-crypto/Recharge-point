import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Check, X, Clock, User, IndianRupee, Hash, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

export function WalletRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to fetch with join, if it fails, we'll fetch separately
      const { data, error: supabaseError } = await supabase
        .from('transactions')
        .select(`
          *,
          profiles:user_id (name, mobile)
        `)
        .eq('type', 'wallet_add')
        .eq('status', 'pending')
        .order('timestamp', { ascending: false });

      if (supabaseError) {
        console.warn('Join query failed, trying separate fetch:', supabaseError);
        // Fallback: Fetch transactions first
        const { data: txns, error: txnsError } = await supabase
          .from('transactions')
          .select('*')
          .eq('type', 'wallet_add')
          .eq('status', 'pending')
          .order('timestamp', { ascending: false });
        
        if (txnsError) throw txnsError;

        if (!txns || txns.length === 0) {
          setRequests([]);
          return;
        }

        // Then fetch profiles for these transactions
        const userIds = [...new Set(txns.map(t => t.user_id))].filter(Boolean);
        
        let profiles: any[] = [];
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name, mobile')
            .in('id', userIds);
          
          if (profilesError) throw profilesError;
          profiles = profilesData || [];
        }

        const combined = txns.map(t => ({
          ...t,
          profiles: profiles.find(p => p.id === t.user_id)
        }));
        setRequests(combined);
      } else {
        console.log(`Fetched ${data?.length || 0} pending requests`);
        setRequests(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching wallet requests:', err);
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const channelRef = useRef<any>(null);

  useEffect(() => {
    fetchRequests();
    
    const channelName = 'wallet-requests-live';
    
    const setupSubscription = async () => {
      // Clean up any existing channel with this name first
      const existingChannels = supabase.getChannels();
      const existing = existingChannels.find(c => (c as any).name === channelName || (c as any).name === `realtime:${channelName}`);
      if (existing) {
        await supabase.removeChannel(existing);
      }

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: 'type=eq.wallet_add'
          },
          (payload) => {
            console.log('Real-time change detected:', payload);
            
            if (payload.eventType === 'UPDATE') {
              const updated = payload.new;
              if (updated.status !== 'pending') {
                setRequests(prev => prev.filter(r => r.id !== updated.id));
              }
            } else if (payload.eventType === 'INSERT') {
              if (payload.new.status === 'pending') {
                fetchRequests();
              }
            } else if (payload.eventType === 'DELETE') {
              setRequests(prev => prev.filter(r => r.id !== payload.old.id));
            }
          }
        );

      channel.subscribe();
      channelRef.current = channel;
    };

    setupSubscription();

    // Safety timeout to prevent infinite loading state in UI
    const timer = setTimeout(() => {
      if (loading && requests.length === 0) {
        setLoading(false);
        setError('Loading is taking longer than expected. Please check your connection or try refreshing.');
        console.warn('Wallet requests fetch taking too long...');
      }
    }, 30000);

    return () => {
      clearTimeout(timer);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  if (loading && requests.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-slate-500">Loading requests...</p>
      </div>
    );
  }

  if (error && requests.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center p-6">
        <X className="h-12 w-12 text-red-500 opacity-20" />
        <p className="text-sm text-slate-600 font-medium">{error}</p>
        <Button onClick={fetchRequests} variant="outline" size="sm" className="gap-2">
          <RefreshCw size={14} /> Retry
        </Button>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this request? This cannot be undone.')) return;
    
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Request deleted permanently');
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      console.error('Delete failed:', error);
      toast.error(`Delete failed: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAction = async (request: any, action: 'approve' | 'reject', reason?: string) => {
    if (processingId) return;
    
    const refNumber = request.details?.refNumber;
    setProcessingId(request.id);
    console.log(`Starting ${action} for request:`, request.id);
    
    try {
      // 1. Double check if this UTR was already approved in another transaction (Safety Check)
      if (action === 'approve' && refNumber) {
        const { data: existingSuccess, error: checkError } = await supabase
          .from('transactions')
          .select('id')
          .eq('type', 'wallet_add')
          .eq('status', 'success')
          .filter('details->>refNumber', 'eq', refNumber)
          .neq('id', request.id);

        if (checkError) {
          console.error('UTR check error:', checkError);
        } else if (existingSuccess && existingSuccess.length > 0) {
          toast.error('This Reference Number (UTR) has already been approved!');
          setProcessingId(null);
          setRequests(prev => prev.filter(r => r.id !== request.id));
          return;
        }
      }

      // 2. Update transaction status FIRST (Atomic-ish)
      const updatedDetails = {
        ...(request.details || {}),
        processedAt: new Date().toISOString(),
        processedBy: 'admin',
        adminAction: true,
        rejectReason: reason || null
      };

      console.log('Updating transaction status in DB...', { id: request.id, newStatus: action === 'approve' ? 'success' : 'failed' });
      
      const { data: updateResult, error: txnError, count } = await supabase
        .from('transactions')
        .update({ 
          status: action === 'approve' ? 'success' : 'failed',
          details: updatedDetails
        }, { count: 'exact' })
        .eq('id', request.id)
        .eq('status', 'pending')
        .select(); // Added select() to verify what was actually updated

      if (txnError) {
        console.error('Transaction update error:', txnError);
        toast.error(`Database Error: ${txnError.message}`);
        throw txnError;
      }

      console.log('Update result:', { count, updateResult });

      if (count === 0 || !updateResult || updateResult.length === 0) {
        console.warn('No rows updated. Request might already be processed or RLS blocked it.');
        toast.error('Failed to update database. The request might have been processed by someone else or you lack permissions.');
        setProcessingId(null);
        fetchRequests(); // Refresh to see actual state
        return;
      }

      // 3. If approved, update user balance AND auto-reject duplicates
      if (action === 'approve') {
        console.log('Updating user balance for user:', request.user_id);
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', request.user_id)
          .single();

        if (userError) {
          console.error('Error fetching user balance:', userError);
          toast.error('Transaction status updated, but failed to fetch user balance.');
        } else {
          const newBalance = (userData.wallet_balance || 0) + request.amount;
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ wallet_balance: newBalance })
            .eq('id', request.user_id);

          if (updateError) {
            console.error('Error updating balance:', updateError);
            toast.error('Transaction status updated, but balance update failed.');
          } else {
            console.log('Balance updated successfully to:', newBalance);
          }
        }

        // AUTO-REJECT DUPLICATES
        if (refNumber) {
          console.log('Auto-rejecting duplicates for UTR:', refNumber);
          const { error: autoRejectError } = await supabase
            .from('transactions')
            .update({ 
              status: 'failed',
              details: {
                autoRejected: true,
                rejectReason: 'Duplicate UTR - Another request approved.',
                processedAt: new Date().toISOString(),
                processedBy: 'system'
              }
            })
            .eq('type', 'wallet_add')
            .eq('status', 'pending')
            .filter('details->>refNumber', 'eq', refNumber)
            .neq('id', request.id);
          
          if (autoRejectError) console.error('Auto-reject error:', autoRejectError);
        }
      }

      toast.success(`Request ${action}ed successfully`);
      
      // Optimistic update
      setRequests(prev => prev.filter(r => r.id !== request.id));
      
      setRejectingRequest(null);
      setRejectReason('');
    } catch (error: any) {
      console.error('Action failed:', error);
      toast.error(`Action failed: ${error.message}`);
      fetchRequests();
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Wallet Load Requests</h3>
        <Button variant="ghost" size="sm" onClick={fetchRequests} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-250px)]">
        <div className="space-y-4 pr-4">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Clock className="h-12 w-12 mb-2 opacity-20" />
              <p>No pending requests</p>
            </div>
          ) : (
            requests.map((req) => (
              <Card key={req.id} className="border-none shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="bg-slate-50 p-4 md:w-1/3 border-b md:border-b-0 md:border-r">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-sm">
                            {Array.isArray(req.profiles) ? req.profiles[0]?.name : req.profiles?.name || 'Unknown User'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {req.id.slice(0, 8)}...</p>
                          <p className="text-xs text-slate-500">
                            {Array.isArray(req.profiles) ? req.profiles[0]?.mobile : req.profiles?.mobile || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold">
                          <span>Requested At</span>
                        </div>
                        <p className="text-xs">{new Date(req.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-bold">
                            <IndianRupee size={10} /> Amount
                          </div>
                          <p className="text-xl font-bold text-primary">₹{req.amount.toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-bold">
                            <Hash size={10} /> Ref Number
                          </div>
                          <p className="text-sm font-mono font-bold bg-slate-100 px-2 py-1 rounded inline-block">
                            {req.details?.refNumber || 'N/A'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-bold">
                            <AlertCircle size={10} /> Sender UPI
                          </div>
                          <p className="text-sm font-medium text-slate-700">
                            {req.details?.upiId || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                          onClick={() => handleAction(req, 'approve')}
                          disabled={!!processingId}
                        >
                          {processingId === req.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check size={16} />} 
                          Approve
                        </Button>
                        <Button 
                          variant="destructive" 
                          className="flex-1 gap-2"
                          onClick={() => setRejectingRequest(req)}
                          disabled={!!processingId}
                        >
                          <X size={16} /> Reject
                        </Button>
                        <Button 
                          variant="outline" 
                          className="bg-slate-100 hover:bg-red-50 hover:text-red-600 border-none px-3"
                          onClick={() => handleDelete(req.id)}
                          disabled={!!processingId}
                          title="Delete Request Permanently"
                        >
                          <RefreshCw className={`h-4 w-4 ${processingId === req.id ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Reject Reason Dialog */}
      <Dialog open={!!rejectingRequest} onOpenChange={(o) => !o && setRejectingRequest(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Wallet Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request. This will be visible to the retailer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea 
                id="reason"
                placeholder="e.g. Invalid reference number, Payment not received"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectingRequest(null)} disabled={!!processingId}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => handleAction(rejectingRequest, 'reject', rejectReason)}
              disabled={!rejectReason || !!processingId}
            >
              {processingId === rejectingRequest?.id ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
