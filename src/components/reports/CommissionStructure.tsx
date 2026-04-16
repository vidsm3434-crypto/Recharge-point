import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Smartphone, Tv, Zap, Globe, Info, Loader2, Edit2, Save, X } from 'lucide-react';
import { useAuthContext } from '../../hooks/AuthContext';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';

interface CommissionStructureProps {
  config?: any;
  forcedRole?: 'admin' | 'distributor' | 'retailer';
  onUpdateConfig?: (newConfig: any) => void;
}

export function CommissionStructure({ config: initialConfig, forcedRole, onUpdateConfig }: CommissionStructureProps) {
  const { profile } = useAuthContext();
  const [config, setConfig] = useState(initialConfig);
  const [loading, setLoading] = useState(!initialConfig);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const role = forcedRole || profile?.role || 'retailer';

  useEffect(() => {
    if (!initialConfig) {
      fetchConfig();
    } else {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  async function fetchConfig() {
    try {
      const { data } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'global')
        .maybeSingle();
      
      if (data?.value) {
        setConfig(data.value);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleStartEdit = () => {
    setEditData(JSON.parse(JSON.stringify(config || {})));
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      if (onUpdateConfig) {
        await onUpdateConfig(editData);
      } else {
        const { error } = await supabase
          .from('config')
          .update({ value: editData })
          .eq('key', 'global');
        
        if (error) throw error;
        toast.success('Commission structure updated successfully');
        setConfig(editData);
      }
      setIsEditing(false);
    } catch (error: any) {
      toast.error('Failed to update commission: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateOperatorRate = (opName: string, field: string, value: string) => {
    const numValue = parseFloat(value);
    setEditData((prev: any) => ({
      ...prev,
      commissions: {
        ...prev.commissions,
        operators: {
          ...prev.commissions?.operators,
          [opName]: {
            ...prev.commissions?.operators?.[opName],
            [field]: isNaN(numValue) ? undefined : numValue
          }
        }
      }
    }));
  };

  if (loading && !isEditing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading commission structure...</p>
      </div>
    );
  }

  // Default rates if not in config
  const operators = [
    { name: 'Airtel', fullName: 'Airtel', logo: 'https://img.sanishtech.com/u/f1c9578535dfe829e17b81f1b35757bd.png', default: { api: 0.80, retailer: 0.50, distributor: 0.20 } },
    { name: 'Vodafone', fullName: 'Vodafone', logo: 'https://img.sanishtech.com/u/60bb10caa5dd136a40dba33d7eb5268e.jpg', default: { api: 3.50, retailer: 2.50, distributor: 0.70 } },
    { name: 'Idea', fullName: 'Idea', logo: 'https://img.sanishtech.com/u/60bb10caa5dd136a40dba33d7eb5268e.jpg', default: { api: 3.50, retailer: 2.50, distributor: 0.70 } },
    { name: 'Jio', fullName: 'Reliance Jio', logo: 'https://img.sanishtech.com/u/e53166a350f4b2ff2add92dab3fb8471.png', default: { api: 0.55, retailer: 0.35, distributor: 0.15 } },
    { name: 'BSNL', fullName: 'BSNL', logo: 'https://img.sanishtech.com/u/5500e251803fa7db0bb8ab9d037a72a9.webp', default: { api: 2.80, retailer: 2.00, distributor: 0.60 } },
  ];

  const currentConfig = isEditing ? editData : config;

  const mobileCommissions = operators.map(op => {
    const override = currentConfig?.commissions?.operators?.[op.name];
    
    return {
      id: op.name,
      name: op.fullName,
      logo: op.logo,
      api: override?.api ?? op.default.api,
      retailer: override?.retailer ?? op.default.retailer,
      distributor: override?.distributor ?? op.default.distributor
    };
  });

  const otherServices = [
    { name: 'DTH Recharge', icon: <Tv className="h-5 w-5" />, status: 'Coming Soon' },
    { name: 'Electricity Bill', icon: <Zap className="h-5 w-5" />, status: 'Coming Soon' },
    { name: 'Data Card', icon: <Globe className="h-5 w-5" />, status: 'Coming Soon' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-primary text-white p-6 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Commission Structure</h2>
          <p className="text-sm opacity-90 mt-1">View your earnings percentage for each operator</p>
        </div>
        {role === 'admin' && !isEditing && (
          <Button onClick={handleStartEdit} variant="secondary" className="gap-2 font-bold">
            <Edit2 size={16} /> Edit Commissions
          </Button>
        )}
        {role === 'admin' && isEditing && (
          <div className="flex gap-2">
            <Button onClick={() => setIsEditing(false)} variant="ghost" className="text-white hover:bg-white/10 gap-2">
              <X size={16} /> Cancel
            </Button>
            <Button onClick={handleSave} variant="secondary" className="gap-2 font-bold bg-white text-primary hover:bg-white/90">
              <Save size={16} /> Save Changes
            </Button>
          </div>
        )}
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Mobile Recharge Commissions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="px-4 py-3 text-left">Operator</th>
                  {role === 'admin' && <th className="px-4 py-3 text-center">API (%)</th>}
                  {role === 'retailer' && <th className="px-4 py-3 text-center">Commission (%)</th>}
                  {role === 'admin' && <th className="px-4 py-3 text-center">Retailer (%)</th>}
                  {(role === 'distributor' || role === 'admin') && <th className="px-4 py-3 text-center">Distributor (%)</th>}
                  {role === 'admin' && <th className="px-4 py-3 text-center">Admin Profit (%)</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {mobileCommissions.map((op) => (
                  <tr key={op.name} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                          <img src={op.logo} alt={op.name} className="h-7 w-7 object-contain" referrerPolicy="no-referrer" />
                        </div>
                        <span className="font-bold text-slate-700">{op.name}</span>
                      </div>
                    </td>
                    {role === 'admin' && (
                      <td className="px-4 py-4 text-center">
                        {isEditing ? (
                          <Input 
                            type="number" 
                            step="0.01"
                            className="w-20 h-8 text-center mx-auto"
                            value={op.api}
                            onChange={(e) => updateOperatorRate(op.id, 'api', e.target.value)}
                          />
                        ) : (
                          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md font-bold">{op.api.toFixed(2)}%</span>
                        )}
                      </td>
                    )}
                    {role === 'retailer' && (
                      <td className="px-4 py-4 text-center">
                        <span className="px-2 py-1 bg-green-50 text-green-600 rounded-md font-bold">{op.retailer.toFixed(2)}%</span>
                      </td>
                    )}
                    {role === 'admin' && (
                      <td className="px-4 py-4 text-center">
                        {isEditing ? (
                          <Input 
                            type="number" 
                            step="0.01"
                            className="w-20 h-8 text-center mx-auto"
                            value={op.retailer}
                            onChange={(e) => updateOperatorRate(op.id, 'retailer', e.target.value)}
                          />
                        ) : (
                          <span className="px-2 py-1 bg-green-50 text-green-600 rounded-md font-bold">{op.retailer.toFixed(2)}%</span>
                        )}
                      </td>
                    )}
                    {(role === 'distributor' || role === 'admin') && (
                      <td className="px-4 py-4 text-center">
                        {isEditing && role === 'admin' ? (
                          <Input 
                            type="number" 
                            step="0.01"
                            className="w-20 h-8 text-center mx-auto"
                            value={op.distributor}
                            onChange={(e) => updateOperatorRate(op.id, 'distributor', e.target.value)}
                          />
                        ) : (
                          <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded-md font-bold">{op.distributor.toFixed(2)}%</span>
                        )}
                      </td>
                    )}
                    {role === 'admin' && (
                      <td className="px-4 py-4 text-center">
                        <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-md font-bold">
                          {(op.api - op.retailer - op.distributor).toFixed(2)}%
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {otherServices.map((service) => (
          <Card key={service.name} className="border-none shadow-sm bg-white">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                {service.icon}
              </div>
              <div>
                <p className="font-bold text-slate-700">{service.name}</p>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                  {service.status}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none bg-indigo-50 shadow-sm">
        <CardContent className="p-4 flex gap-3">
          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Info size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-indigo-900">Important Note</p>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Commissions are automatically credited to your wallet upon successful transaction. 
              The rates shown above are subject to change based on operator policies.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
