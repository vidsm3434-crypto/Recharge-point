import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../hooks/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ShieldCheck, Upload, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export function KycView({ onBack }: { onBack: () => void }) {
  const { profile, fetchProfile } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    aadhaar: '',
    pan: '',
    shopName: '',
    address: '',
    aadhaarPhoto: '' as string | null
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024) {
      toast.error('File size must be less than 100KB');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, aadhaarPhoto: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.aadhaar || !formData.pan || !formData.shopName || !formData.address || !formData.aadhaarPhoto) {
      toast.error('Please fill all fields and upload Aadhaar photo');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'pending',
          kyc_details: {
            ...formData,
            submittedAt: new Date().toISOString()
          }
        })
        .eq('id', profile?.id);

      if (error) throw error;
      
      await fetchProfile(profile!.id);
      toast.success('KYC submitted successfully for verification');
    } catch (error) {
      toast.error('Failed to submit KYC');
    } finally {
      setLoading(false);
    }
  };

  if (profile?.kyc_status === 'verified') {
    return (
      <div className="p-6 flex flex-col items-center justify-center text-center space-y-4">
        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">KYC Verified</h2>
        <p className="text-slate-500">Your account is fully verified. You can now use all features.</p>
        <Button onClick={onBack}>Back to Home</Button>
      </div>
    );
  }

  if (profile?.kyc_status === 'pending') {
    return (
      <div className="p-6 flex flex-col items-center justify-center text-center space-y-4">
        <div className="h-20 w-20 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Verification Pending</h2>
        <p className="text-slate-500">Admin is reviewing your documents. Please wait for 24-48 hours.</p>
        <Button onClick={onBack}>Back to Home</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-50">
      <div className="bg-blue-700 text-white p-4 flex items-center gap-4 sticky top-0 z-20">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-lg font-medium">KYC Verification</h2>
      </div>

      <div className="p-4">
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
              <ShieldCheck className="h-5 w-5" /> Complete your KYC
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Shop Name</Label>
                <Input 
                  placeholder="Enter your shop name" 
                  value={formData.shopName}
                  onChange={(e) => setFormData({...formData, shopName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Aadhaar Number</Label>
                <Input 
                  placeholder="12-digit Aadhaar number" 
                  maxLength={12}
                  value={formData.aadhaar}
                  onChange={(e) => setFormData({...formData, aadhaar: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>PAN Number</Label>
                <Input 
                  placeholder="10-digit PAN number" 
                  maxLength={10}
                  className="uppercase"
                  value={formData.pan}
                  onChange={(e) => setFormData({...formData, pan: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="space-y-2">
                <Label>Full Address</Label>
                <Input 
                  placeholder="Shop/Home address" 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Aadhaar Card Photo (Max 100KB)</Label>
                <div className="relative">
                  <Input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  {formData.aadhaarPhoto && (
                    <div className="mt-2 relative aspect-video rounded-lg overflow-hidden border">
                      <img src={formData.aadhaarPhoto} alt="Aadhaar Preview" className="object-cover w-full h-full" />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <Button className="w-full bg-blue-700 hover:bg-blue-800 h-12 rounded-xl font-bold" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit KYC'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
