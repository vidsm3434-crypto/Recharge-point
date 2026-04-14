import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Smartphone, Mail, Lock, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface LoginProps {
  onSignup: () => void;
  onHelp: () => void;
  initialMobile?: string;
}

export function Login({ onSignup, onHelp, initialMobile = '' }: LoginProps) {
  const [loginMethod, setLoginMethod] = useState<'mobile' | 'email'>('mobile');
  const [identifier, setIdentifier] = useState(initialMobile);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error(`Please enter ${loginMethod === 'mobile' ? 'mobile number' : 'email'} and password`);
      return;
    }

    setLoading(true);
    try {
      let email = identifier;

      if (loginMethod === 'mobile') {
        const cleanMobile = identifier.replace(/\D/g, '');
        if (cleanMobile.length !== 10) {
          toast.error('Please enter a valid 10-digit mobile number');
          setLoading(false);
          return;
        }

        // Find email associated with mobile number in profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('mobile', cleanMobile)
          .maybeSingle();
        
        if (profileError || !profileData) {
          toast.error('User not found with this mobile number. Try logging in with Email if you have an account.');
          setLoading(false);
          return;
        }
        email = profileData.email;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          // Check if user exists in Auth at all
          toast.error('Invalid credentials. If you recently deleted your account, please Sign Up again.');
        } else {
          throw authError;
        }
        setLoading(false);
        return;
      }
      
      toast.success('Welcome back!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">RechargePoint</CardTitle>
          <CardDescription>Login to your account</CardDescription>
          
          <div className="mt-4 flex justify-center gap-2">
            <Button 
              variant={loginMethod === 'mobile' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setLoginMethod('mobile')}
              className="h-8 text-xs"
            >
              Mobile Login
            </Button>
            <Button 
              variant={loginMethod === 'email' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setLoginMethod('email')}
              className="h-8 text-xs"
            >
              Email Login
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">{loginMethod === 'mobile' ? 'Mobile Number' : 'Email Address'}</Label>
              <div className="relative">
                {loginMethod === 'mobile' ? (
                  <Smartphone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                ) : (
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                )}
                <Input
                  id="identifier"
                  placeholder={loginMethod === 'mobile' ? '7872303434' : 'your@email.com'}
                  className="pl-10"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  maxLength={loginMethod === 'mobile' ? 10 : undefined}
                  inputMode={loginMethod === 'mobile' ? 'numeric' : 'text'}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button variant="link" size="sm" className="px-0 font-normal" onClick={onHelp} type="button">
                  Forgot password?
                </Button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Button variant="link" className="p-0 font-semibold" onClick={onSignup}>
              Sign up
            </Button>
          </div>
          <Button variant="outline" className="w-full gap-2" onClick={onHelp}>
            <HelpCircle className="h-4 w-4" />
            Help & Support
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
