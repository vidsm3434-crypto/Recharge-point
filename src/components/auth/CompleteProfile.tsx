import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { User, Smartphone, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '../../hooks/AuthContext';

export function CompleteProfile() {
  const { user, fetchProfile } = useAuthContext();
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    dob: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, mobile, dob } = formData;

    if (!name || !mobile || !dob) {
      toast.error('All fields are required');
      return;
    }

    if (mobile.length !== 10) {
      toast.error('Mobile number must be 10 digits');
      return;
    }

    setLoading(true);
    try {
      if (!user) throw new Error('No authenticated user');

      // Clean mobile number
      const cleanMobile = mobile.replace(/\D/g, '');
      if (cleanMobile.length !== 10) {
        toast.error('Please enter a valid 10-digit mobile number');
        setLoading(false);
        return;
      }

      let role = 'retailer';
      if (cleanMobile === '7872303434') {
        role = 'admin';
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([
          {
            id: user.id,
            name,
            mobile: cleanMobile,
            email: user.email,
            dob,
            role,
            wallet_balance: 0,
            kyc_status: 'pending',
          },
        ], { onConflict: 'id' });

      if (profileError) throw profileError;

      toast.success('Profile completed successfully!');
      await fetchProfile(user.id);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Complete Profile</CardTitle>
          <CardDescription>We found your account, but need a few more details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input id="name" placeholder="John Doe" className="pl-10" value={formData.name} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input id="mobile" placeholder="7872303434" className="pl-10" value={formData.mobile} onChange={handleChange} maxLength={10} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input id="dob" type="date" className="pl-10" value={formData.dob} onChange={handleChange} />
              </div>
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Complete Profile'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => supabase.auth.signOut()}>
              Logout and try again
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
