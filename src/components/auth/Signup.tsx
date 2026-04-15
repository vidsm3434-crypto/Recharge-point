import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { User, Smartphone, Mail, Lock, Calendar, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface SignupProps {
  onBack: () => void;
  onSwitchToLogin: (mobile: string) => void;
}

export function Signup({ onBack, onSwitchToLogin }: SignupProps) {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    dob: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, mobile, email, password, dob } = formData;

    if (!name || !mobile || !email || !password || !dob) {
      toast.error('All fields are required');
      return;
    }

    if (mobile.length !== 10) {
      toast.error('Mobile number must be 10 digits');
      return;
    }

    setLoading(true);
    try {
      // 0. Clean mobile number (remove any non-digits)
      const cleanMobile = mobile.replace(/\D/g, '');
      if (cleanMobile.length !== 10) {
        toast.error('Please enter a valid 10-digit mobile number');
        setLoading(false);
        return;
      }

      // 1. Check if mobile number already exists in profiles
      const { data: existingProfile, error: mobileCheckError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('mobile', cleanMobile)
        .maybeSingle();
      
      if (mobileCheckError) {
        console.error('Mobile check error:', mobileCheckError);
      }

      if (existingProfile) {
        toast.error('This mobile number is already registered. Please login instead.', {
          action: {
            label: 'Login Now',
            onClick: () => onSwitchToLogin(cleanMobile)
          }
        });
        setLoading(false);
        return;
      }

      // 1.5 Generate Unique Retailer ID
      let retailer_id = 'MB1001';
      const { data: lastUser } = await supabase
        .from('profiles')
        .select('retailer_id')
        .not('retailer_id', 'is', null)
        .order('retailer_id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastUser && lastUser.retailer_id) {
        const lastNum = parseInt(lastUser.retailer_id.replace('MB', ''));
        retailer_id = `MB${lastNum + 1}`;
      }

      // 2. Sign up user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            mobile: cleanMobile,
          }
        }
      });

      if (authError) {
        if (authError.message.includes('User already registered')) {
          toast.error('This email is already registered.', {
            action: {
              label: 'Login Now',
              onClick: () => onSwitchToLogin(cleanMobile)
            }
          });
          setTimeout(() => onSwitchToLogin(cleanMobile), 2000);
          return;
        }
        throw authError;
      }
      
      if (!authData.user) throw new Error('Signup failed - No user data returned');

      // 3. Create profile in profiles table
      let role = 'retailer';
      if (cleanMobile === '7872303434') {
        role = 'admin';
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([
          {
            id: authData.user.id,
            name,
            mobile: cleanMobile,
            email,
            dob,
            role,
            retailer_id,
            created_by: 'Self',
            wallet_balance: 0,
            kyc_status: 'pending',
          },
        ], { onConflict: 'id' }); // Conflict on ID is safer for RLS

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // If profile creation fails but auth succeeded, the user might be stuck.
        // We should inform them to try "Complete Profile" or login.
        throw new Error(`Auth succeeded but profile creation failed: ${profileError.message}`);
      }

      toast.success('Account created successfully! Please login.');
      onSwitchToLogin(cleanMobile);
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes('security purposes')) {
        toast.error('Please wait a minute before trying again (Security Rate Limit)');
      } else {
        toast.error(error.message || 'Signup failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="space-y-1">
          <Button variant="ghost" size="sm" className="w-fit p-0 hover:bg-transparent" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
          <CardTitle className="text-2xl font-bold tracking-tight">Create Account</CardTitle>
          <CardDescription>Join RechargePoint as a Retailer</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
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
                <Input id="mobile" placeholder="7872303434" className="pl-10" value={formData.mobile} onChange={handleChange} maxLength={10} inputMode="numeric" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email ID</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input id="email" type="email" placeholder="john@example.com" className="pl-10" value={formData.email} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input id="password" type="password" className="pl-10" value={formData.password} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input id="dob" type="date" className="pl-10" value={formData.dob} onChange={handleChange} />
              </div>
              <p className="text-[10px] text-slate-500">Please enter correct DOB for future account recovery.</p>
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
