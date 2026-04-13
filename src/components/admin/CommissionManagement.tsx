import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Percent, Save, Smartphone, Tv, Zap, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface CommissionManagementProps {
  config: any;
  onUpdateConfig: (newConfig: any) => void;
}

export function CommissionManagement({ config, onUpdateConfig }: CommissionManagementProps) {
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    onUpdateConfig(localConfig);
  };

  const ServiceCommission = ({ icon, label, field }: { icon: any, label: string, field: string }) => (
    <div className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 border-b pb-2">
        <div className="rounded-full bg-primary/10 p-1.5 text-primary">{icon}</div>
        <p className="text-sm font-bold">{label}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase text-slate-500">Retailer (%)</Label>
          <Input 
            type="number" 
            value={localConfig.commissions?.[field]?.retailer || 0} 
            onChange={(e) => setLocalConfig({
              ...localConfig, 
              commissions: {
                ...localConfig.commissions,
                [field]: { ...localConfig.commissions?.[field], retailer: parseFloat(e.target.value) }
              }
            })}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase text-slate-500">Distributor (%)</Label>
          <Input 
            type="number" 
            value={localConfig.commissions?.[field]?.distributor || 0} 
            onChange={(e) => setLocalConfig({
              ...localConfig, 
              commissions: {
                ...localConfig.commissions,
                [field]: { ...localConfig.commissions?.[field], distributor: parseFloat(e.target.value) }
              }
            })}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Commission Management</h3>
        <Button size="sm" className="gap-2" onClick={handleSave}>
          <Save size={16} /> Save Changes
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ServiceCommission icon={<Smartphone size={16} />} label="Mobile Recharge" field="mobile" />
        <ServiceCommission icon={<Tv size={16} />} label="DTH Recharge" field="dth" />
        <ServiceCommission icon={<Zap size={16} />} label="Electricity Bill" field="electricity" />
        <ServiceCommission icon={<Globe size={16} />} label="Data Card" field="datacard" />
      </div>

      <Card className="border-none bg-blue-50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="rounded-full bg-blue-100 p-2 text-blue-600">
              <Percent size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-blue-900">Commission Logic</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Commissions are automatically calculated during each transaction. 
                The specified percentage is credited to the respective user's wallet 
                immediately upon successful recharge.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
