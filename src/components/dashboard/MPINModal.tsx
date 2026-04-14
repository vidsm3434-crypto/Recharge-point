import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../hooks/AuthContext';
import { toast } from 'sonner';
import { ShieldCheck, Lock, RefreshCcw, Send } from 'lucide-react';

interface MPINModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'setup' | 'change' | 'reset-request';
}

export function MPINModal({ open, onClose, mode: initialMode }: MPINModalProps) {
  const { profile, fetchProfile } = useAuthContext();
  const [mode, setMode] = useState(initialMode);
  const [formData, setFormData] = useState({
    oldMpin: '',
    newMpin: '',
    confirmMpin: ''
  });
  const [loading, setLoading] = useState(false);

  const isResetSetup = profile?.mpin?.startsWith('TEMP:');
  const actualMpin = isResetSetup ? profile?.mpin?.split(':')[1] : profile?.mpin;

  const handleSetup = async () => {
    setLoading(true);
    try {
      // Fetch latest profile to ensure we have the correct MPIN (especially if it was just reset)
      await fetchProfile(profile!.id);
      
      // Get the latest values after fetch
      const currentProfile = profile; // This might still be the old one if fetchProfile is async and doesn't return data
      // Actually, fetchProfile in AuthContext updates the state. 
      // Let's use the direct supabase call to be 100% sure for validation
      const { data: latestProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('mpin')
        .eq('id', profile?.id)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      const isReset = latestProfile?.mpin?.startsWith('TEMP:');
      const actual = isReset ? latestProfile?.mpin?.split(':')[1] : latestProfile?.mpin;

      if (isReset && formData.oldMpin !== actual) {
        toast.error('Incorrect temporary MPIN');
        setLoading(false);
        return;
      }
      if (formData.newMpin.length !== 4 || formData.confirmMpin.length !== 4) {
        toast.error('MPIN must be 4 digits');
        setLoading(false);
        return;
      }
      if (formData.newMpin === actual) {
        toast.error('New MPIN cannot be same as temporary MPIN');
        setLoading(false);
        return;
      }
      if (formData.newMpin !== formData.confirmMpin) {
        toast.error('MPINs do not match');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          mpin: formData.newMpin
        })
        .eq('id', profile?.id);

      if (error) throw error;

      await fetchProfile(profile!.id);
      toast.success('MPIN set successfully');
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = async () => {
    setLoading(true);
    try {
      // Fetch latest profile for validation
      const { data: latestProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('mpin')
        .eq('id', profile?.id)
        .maybeSingle();
      
      if (fetchError) throw fetchError;

      const isReset = latestProfile?.mpin?.startsWith('TEMP:');
      const actual = isReset ? latestProfile?.mpin?.split(':')[1] : latestProfile?.mpin;

      if (formData.oldMpin !== actual) {
        toast.error('Incorrect old MPIN');
        setLoading(false);
        return;
      }
      if (formData.newMpin.length !== 4) {
        toast.error('New MPIN must be 4 digits');
        setLoading(false);
        return;
      }
      if (formData.newMpin !== formData.confirmMpin) {
        toast.error('New MPINs do not match');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ mpin: formData.newMpin })
        .eq('id', profile?.id);

      if (error) throw error;

      await fetchProfile(profile!.id);
      toast.success('MPIN changed successfully');
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ mpin: 'RESET_PENDING' })
        .eq('id', profile?.id);

      if (error) throw error;

      toast.success('Reset request sent to admin');
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && !o && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'setup' && <><ShieldCheck className="h-5 w-5 text-green-600" /> Set Transaction MPIN</>}
            {mode === 'change' && <><Lock className="h-5 w-5 text-blue-600" /> Change MPIN</>}
            {mode === 'reset-request' && <><RefreshCcw className="h-5 w-5 text-orange-600" /> Forgot MPIN?</>}
          </DialogTitle>
          <DialogDescription>
            {mode === 'setup' && (
              isResetSetup 
                ? "Your MPIN was reset by admin. Please use the temporary MPIN to set a new one."
                : "Create a 4-digit MPIN to secure your recharges and transactions."
            )}
            {mode === 'change' && "Enter your old MPIN and set a new one."}
            {mode === 'reset-request' && "Send a request to admin to reset your MPIN. Once reset, you can set a new one."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {(mode === 'change' || (mode === 'setup' && isResetSetup)) && (
            <div className="space-y-2">
              <Label htmlFor="oldMpin">{isResetSetup ? "Temporary MPIN" : "Old MPIN"}</Label>
              <Input
                id="oldMpin"
                type="password"
                maxLength={4}
                placeholder="****"
                className="text-center text-2xl tracking-[1em]"
                value={formData.oldMpin}
                onChange={(e) => setFormData({ ...formData, oldMpin: e.target.value })}
                inputMode="numeric"
              />
              {isResetSetup && <p className="text-[10px] text-slate-500">Enter the temporary MPIN provided by admin</p>}
            </div>
          )}

          {(mode === 'setup' || mode === 'change') && (
            <>
              <div className="space-y-2">
                <Label htmlFor="newMpin">New MPIN</Label>
                <Input
                  id="newMpin"
                  type="password"
                  maxLength={4}
                  placeholder="****"
                  className="text-center text-2xl tracking-[1em]"
                  value={formData.newMpin}
                  onChange={(e) => setFormData({ ...formData, newMpin: e.target.value })}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmMpin">Confirm New MPIN</Label>
                <Input
                  id="confirmMpin"
                  type="password"
                  maxLength={4}
                  placeholder="****"
                  className="text-center text-2xl tracking-[1em]"
                  value={formData.confirmMpin}
                  onChange={(e) => setFormData({ ...formData, confirmMpin: e.target.value })}
                  inputMode="numeric"
                />
              </div>
            </>
          )}

          {mode === 'reset-request' && (
            <div className="rounded-lg bg-orange-50 p-4 text-sm text-orange-800">
              Your request will be sent to the admin. Please wait for the admin to reset your MPIN.
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {mode === 'setup' && (
            <Button className="w-full" onClick={handleSetup} disabled={loading}>
              {loading ? "Setting..." : "Set MPIN"}
            </Button>
          )}
          {mode === 'change' && (
            <>
              <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setMode('reset-request')}>
                Forgot MPIN?
              </Button>
              <Button className="w-full sm:w-auto" onClick={handleChange} disabled={loading}>
                {loading ? "Changing..." : "Change MPIN"}
              </Button>
            </>
          )}
          {mode === 'reset-request' && (
            <Button className="w-full gap-2" onClick={handleResetRequest} disabled={loading}>
              <Send className="h-4 w-4" /> {loading ? "Sending..." : "Send Request to Admin"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
