import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { RefreshCcw, Check, X, Search, User, Smartphone, ShieldAlert, Copy, ExternalLink } from 'lucide-react';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

export function MPINRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showManualResetDialog, setShowManualResetDialog] = useState(false);
  const [manualPin, setManualPin] = useState('');
  const [generatedPin, setGeneratedPin] = useState('');
  const [selectedUserForPin, setSelectedUserForPin] = useState<any>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('mpin', 'RESET_PENDING');

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleReset = async (user: any, customMpin?: string) => {
    const newTempMpin = customMpin || Math.floor(1000 + Math.random() * 9000).toString();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          mpin: `TEMP:${newTempMpin}`
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setGeneratedPin(newTempMpin);
      setSelectedUserForPin(user);
      setShowManualResetDialog(false);
      setShowPinDialog(true);

      const message = `Hello ${user.name}, your MPIN has been reset. Your temporary MPIN is: ${newTempMpin}. Please login and set your new MPIN using this code.`;
      
      const cleanMobile = (user.mobile || '').replace(/\D/g, '');
      const mobileWithCountry = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;
      const whatsappUrl = `https://wa.me/${mobileWithCountry}?text=${encodeURIComponent(message)}`;
      
      toast.success(`MPIN Reset Successfully!`);
      
      // Open WhatsApp in a new tab
      window.open(whatsappUrl, '_blank');

      fetchRequests();
    } catch (error) {
      console.error('Reset error:', error);
      toast.error('Reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ mpin: null }) // Setting to null forces them to set up a new one
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('Request rejected. User can now set a new MPIN.');
      fetchRequests();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const filteredRequests = requests.filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.mobile?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">MPIN Reset Requests</h2>
        <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Search by name or mobile" 
          className="pl-10" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <ScrollArea className="h-[500px]">
        <div className="space-y-4">
          {loading ? (
            <p className="text-center py-10 text-slate-500">Loading requests...</p>
          ) : filteredRequests.length === 0 ? (
            <Card className="border-dashed bg-slate-50">
              <CardContent className="py-10 text-center">
                <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No pending MPIN reset requests</p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((req) => (
              <Card key={req.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{req.name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Smartphone className="h-3 w-3" /> {req.mobile}
                          <Badge variant="outline" className="text-[10px] uppercase">{req.role}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleReject(req.id)}
                      >
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedUserForPin(req);
                          setManualPin('');
                          setShowManualResetDialog(true);
                        }}
                      >
                        <Check className="h-4 w-4 mr-1" /> Reset & Share
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Manual MPIN Entry Dialog */}
      <Dialog open={showManualResetDialog} onOpenChange={setShowManualResetDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Set Temporary MPIN</DialogTitle>
            <DialogDescription>
              Enter a 4-digit temporary MPIN for <strong>{selectedUserForPin?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase">Enter 4-Digit PIN</p>
              <Input 
                type="text" 
                maxLength={4}
                placeholder="e.g. 1234"
                className="text-center text-3xl tracking-[0.5em] font-bold h-16"
                value={manualPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 4) setManualPin(val);
                }}
              />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-primary hover:text-primary hover:bg-primary/5"
              onClick={() => {
                const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
                setManualPin(randomPin);
              }}
            >
              <RefreshCcw className="h-3 w-3 mr-2" /> Generate Random PIN
            </Button>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowManualResetDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700" 
              disabled={manualPin.length !== 4 || loading}
              onClick={() => handleReset(selectedUserForPin, manualPin)}
            >
              {loading ? "Processing..." : "Confirm & Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" /> MPIN Reset Successful
            </DialogTitle>
            <DialogDescription>
              A temporary MPIN has been generated for <strong>{selectedUserForPin?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <p className="text-sm text-slate-500 uppercase font-bold tracking-wider">Temporary MPIN</p>
            <div className="bg-slate-100 px-8 py-4 rounded-xl border-2 border-dashed border-slate-300">
              <span className="text-4xl font-black tracking-[0.5em] text-slate-800 ml-[0.5em]">{generatedPin}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => {
                navigator.clipboard.writeText(generatedPin);
                toast.success('MPIN copied to clipboard');
              }}
            >
              <Copy className="h-4 w-4" /> Copy MPIN
            </Button>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg text-xs text-blue-800 space-y-2">
            <p className="font-bold">Next Steps:</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Share this PIN with the user via WhatsApp.</li>
              <li>The user must use this as their "Old MPIN" to set a new one.</li>
              <li>This temporary PIN will expire once a new one is set.</li>
            </ul>
          </div>

          <DialogFooter>
            <Button className="w-full gap-2" onClick={() => {
              const message = `Hello ${selectedUserForPin?.name}, your MPIN has been reset. Your temporary MPIN is: ${generatedPin}. Please login and set your new MPIN using this code.`;
              const cleanMobile = (selectedUserForPin?.mobile || '').replace(/\D/g, '');
              const mobileWithCountry = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;
              const whatsappUrl = `https://wa.me/${mobileWithCountry}?text=${encodeURIComponent(message)}`;
              window.open(whatsappUrl, '_blank');
            }}>
              <ExternalLink className="h-4 w-4" /> Share on WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
