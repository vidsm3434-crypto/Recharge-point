import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Globe, Key, Save, Database, CreditCard, QrCode, Zap, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

interface ApiSettingsProps {
  config: any;
  onUpdateConfig: (newConfig: any) => void;
}

export function ApiSettings({ config, onUpdateConfig }: ApiSettingsProps) {
  const [localConfig, setLocalConfig] = useState(config);

  const [testDebug, setTestDebug] = useState<any>(null);

  const handleSave = () => {
    onUpdateConfig(localConfig);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">API & Gateway Settings</h3>
        <Button size="sm" className="gap-2" onClick={handleSave}>
          <Save size={16} /> Save Config
        </Button>
      </div>

      <Tabs defaultValue="recharge" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recharge" className="gap-2">
            <Globe size={14} /> Recharge API
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard size={14} /> Payment Gateway
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recharge" className="mt-4 space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Database size={16} className="text-blue-500" /> Primary API Provider
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">API Base URL</Label>
                  <Input 
                    placeholder="https://business.a1topup.com" 
                    value={localConfig.api?.url || ''}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      api: { ...localConfig.api, url: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">API Username</Label>
                  <Input 
                    placeholder="505717" 
                    value={localConfig.api?.userId || ''}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      api: { ...localConfig.api, userId: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">API Password</Label>
                  <Input 
                    type="password"
                    placeholder="fp3999bg" 
                    value={localConfig.api?.password || ''}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      api: { ...localConfig.api, password: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">API Key (Optional)</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input 
                      type="password"
                      placeholder="Enter API key if required" 
                      className="pl-10"
                      value={localConfig.api?.key || ''}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        api: { ...localConfig.api, key: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">API Method</Label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={localConfig.api?.method || 'GET'}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      api: { ...localConfig.api, method: e.target.value }
                    })}
                  >
                    <option value="GET">GET (Query Params)</option>
                    <option value="POST">POST (JSON Body)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Success Status Key</Label>
                  <Input 
                    placeholder="status" 
                    value={localConfig.api?.successKey || ''}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      api: { ...localConfig.api, successKey: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Success Status Value</Label>
                  <Input 
                    placeholder="Success" 
                    value={localConfig.api?.successValue || ''}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      api: { ...localConfig.api, successValue: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">API Balance</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={async () => {
                        setTestDebug(null);
                        const loadingToast = toast.loading('Fetching balance...');
                        try {
                          const res = await fetch('/api/recharge/balance');
                          const data = await res.json();
                          toast.dismiss(loadingToast);
                          setTestDebug(data.debug || data);
                          
                          if (data.balance !== undefined) {
                            toast.success(`API Balance: ₹${data.balance}`);
                          } else if (data.error) {
                            toast.error(data.error);
                          } else {
                            toast.info(`API Response received`);
                          }
                        } catch (err) {
                          toast.dismiss(loadingToast);
                          toast.error('Failed to fetch API balance');
                        }
                      }}
                    >
                      Check API Balance
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold flex items-center gap-2">
                  <Zap size={14} className="text-yellow-500" /> Test API Connection
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input placeholder="Mobile" className="text-xs" id="test-mobile" />
                  <Input placeholder="Amount" className="text-xs" id="test-amount" />
                  <Button 
                    size="sm" 
                    className="bg-yellow-600 hover:bg-yellow-700"
                    onClick={async () => {
                      const mobile = (document.getElementById('test-mobile') as HTMLInputElement).value;
                      const amount = (document.getElementById('test-amount') as HTMLInputElement).value;
                      if (!mobile || !amount) return toast.error('Enter mobile and amount');
                      
                      setTestDebug(null);
                      const loadingToast = toast.loading('Sending test recharge...');
                      try {
                        const res = await fetch('/api/recharge/process', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            mobile,
                            amount,
                            operator: 'Reliance Jio',
                            circle: 'West Bengal'
                          })
                        });
                        const data = await res.json();
                        toast.dismiss(loadingToast);
                        setTestDebug(data.debug || data);
                        
                        if (data.normalizedStatus === 'success') {
                          toast.success('Test successful!');
                        } else if (data.error) {
                          toast.error(`Test failed: ${data.error}`);
                        } else {
                          toast.error(`Test failed: ${data.status || 'Unknown error'}`);
                        }
                        console.log('Test API Response:', data);
                      } catch (err) {
                        toast.dismiss(loadingToast);
                        toast.error('API connection failed');
                      }
                    }}
                  >
                    Run Test
                  </Button>
                </div>

                {testDebug && (
                  <div className="mt-4 space-y-3 text-[10px] font-mono bg-slate-900 text-slate-300 p-3 rounded border border-slate-700 overflow-auto max-h-[300px]">
                    <div className="space-y-1">
                      <p className="text-yellow-500 font-bold">REQUEST URL:</p>
                      <p className="break-all bg-slate-800 p-1 rounded">{testDebug.url || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-blue-400 font-bold">RAW RESPONSE:</p>
                      <pre className="whitespace-pre-wrap bg-slate-800 p-1 rounded">{testDebug.raw || JSON.stringify(testDebug, null, 2)}</pre>
                    </div>
                    {testDebug.parsed && (
                      <div className="space-y-1">
                        <p className="text-green-400 font-bold">PARSED RESULT:</p>
                        <pre className="whitespace-pre-wrap bg-slate-800 p-1 rounded">{JSON.stringify(testDebug.parsed, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Callback URL (Provide this to API Provider)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={`${window.location.origin}/api/callback`}
                    readOnly
                    className="bg-slate-50 font-mono text-[10px]"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/callback`);
                      toast.success('Callback URL copied');
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  Note: The provider will send status updates to this URL.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Operator Codes (JSON Format)</Label>
                <Input 
                  placeholder='{"JIO": "1", "AIRTEL": "2"}' 
                  value={localConfig.api?.operatorCodes || ''}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    api: { ...localConfig.api, operatorCodes: e.target.value }
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="mt-4 space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <QrCode size={16} className="text-purple-500" /> UPI & QR Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Business UPI ID</Label>
                <Input 
                  placeholder="yourname@bank" 
                  value={localConfig.payment?.upiId || ''}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    payment: { ...localConfig.payment, upiId: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">QR Code Image URL</Label>
                <Input 
                  placeholder="https://example.com/qr.png" 
                  value={localConfig.payment?.qrUrl || ''}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    payment: { ...localConfig.payment, qrUrl: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Razorpay Key ID</Label>
                <Input 
                  placeholder="rzp_live_..." 
                  value={localConfig.payment?.razorpayKeyId || ''}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    payment: { ...localConfig.payment, razorpayKeyId: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Razorpay Key Secret</Label>
                <Input 
                  type="password"
                  placeholder="Enter secret key" 
                  value={localConfig.payment?.razorpayKeySecret || ''}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    payment: { ...localConfig.payment, razorpayKeySecret: e.target.value }
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
