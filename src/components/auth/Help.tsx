import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Smartphone, ArrowLeft, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface HelpProps {
  onBack: () => void;
}

export function Help({ onBack }: HelpProps) {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminMobile, setAdminMobile] = useState('7872303434');

  useEffect(() => {
    const fetchConfig = async () => {
      const { data, error } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'global')
        .single();
      
      if (data && !error) {
        setAdminMobile(data.value.adminMobile || '7872303434');
      }
    };
    fetchConfig();
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || mobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('mobile', mobile)
        .single();
      
      if (error || !data) {
        toast.error('User not found');
        setLoading(false);
        return;
      }

      const whatsappUrl = `https://wa.me/91${adminMobile}?text=Help! I forgot my password for mobile number ${mobile}`;
      window.open(whatsappUrl, '_blank');
      toast.success('Redirecting to WhatsApp support...');
    } catch (error: any) {
      console.error(error);
      toast.error('Something went wrong');
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
          <CardTitle className="text-2xl font-bold tracking-tight">Help & Support</CardTitle>
          <CardDescription>Forgot password? Contact admin via WhatsApp</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mobile">Registered Mobile Number</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="mobile"
                  placeholder="7872303434"
                  className="pl-10"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  maxLength={10}
                />
              </div>
            </div>
            <Button className="w-full gap-2" type="submit" disabled={loading}>
              <MessageSquare className="h-4 w-4" />
              {loading ? 'Processing...' : 'Request Password via WhatsApp'}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-center text-xs text-slate-500">
            Admin will verify your details and send you the password on your registered WhatsApp number.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
