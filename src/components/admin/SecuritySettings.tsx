import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Shield, Smartphone, MessageSquare, Key, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Badge } from '../ui/badge';

interface SecuritySettingsProps {
  config: any;
  onUpdateConfig: (newConfig: any) => void;
}

export function SecuritySettings({ config, onUpdateConfig }: SecuritySettingsProps) {
  const [localConfig, setLocalConfig] = useState(config);

  // Mocked reset requests
  const resetRequests = [
    { id: '1', name: 'John Doe', mobile: '9876543210', type: 'Password', time: '10 mins ago' },
    { id: '2', name: 'Jane Smith', mobile: '8765432109', type: 'MPIN', time: '1 hour ago' },
  ];

  const handleToggleMode = (mode: 'whatsapp' | 'otp') => {
    const newConfig = { ...localConfig, passwordResetMethod: mode };
    setLocalConfig(newConfig);
    onUpdateConfig(newConfig);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">Security & Access Control</h3>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-900 text-white">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield size={16} /> Reset Mode Toggle
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-bold">Password Reset Method</p>
              <p className="text-[10px] text-slate-500">Choose how users receive their temporary credentials</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-lg">
              <Button 
                variant={localConfig.passwordResetMethod === 'whatsapp' ? 'default' : 'ghost'} 
                size="sm" 
                className="h-8 text-[10px] gap-1"
                onClick={() => handleToggleMode('whatsapp')}
              >
                <MessageSquare size={12} /> WhatsApp
              </Button>
              <Button 
                variant={localConfig.passwordResetMethod === 'otp' ? 'default' : 'ghost'} 
                size="sm" 
                className="h-8 text-[10px] gap-1"
                onClick={() => handleToggleMode('otp')}
              >
                <Smartphone size={12} /> OTP (SMS)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <RefreshCw size={16} className="text-blue-500" /> Pending Reset Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {resetRequests.map((req) => (
            <div key={req.id} className="flex items-center justify-between border-b pb-3 last:border-0">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-50 p-2 text-blue-600">
                  <Key size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold">{req.name}</p>
                  <p className="text-[10px] text-slate-500">{req.mobile} • <Badge variant="outline" className="text-[8px] h-4">{req.type}</Badge></p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-green-600 hover:text-green-700">
                  <CheckCircle2 size={16} />
                </Button>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                  <XCircle size={16} />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-none bg-amber-50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="rounded-full bg-amber-100 p-2 text-amber-600">
              <Shield size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-900">Admin Security Note</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                All reset actions are logged. Approving a request will automatically 
                generate a secure temporary password and send it via the selected 
                mode (WhatsApp/SMS).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
