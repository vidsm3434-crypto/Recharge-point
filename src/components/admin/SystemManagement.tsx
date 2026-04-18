import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Settings, 
  Monitor, 
  Image as ImageIcon, 
  Save, 
  Plus, 
  Trash2, 
  Loader2, 
  Percent,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SettingItem {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: React.ReactNode;
}

export function SystemManagement({ config, onUpdateConfig }: { config: any, onUpdateConfig: (c: any) => void }) {
  const [settings, setSettings] = useState<SettingItem[]>([
    {
      id: 'showRetailerCommission',
      label: 'Show Commission Structure',
      description: 'Display fixed commission rates to retailers',
      enabled: true,
      icon: <Percent className="h-5 w-5" />
    },
    {
      id: 'enableUserRegistration',
      label: 'Public Registration',
      description: 'Allow new users to create accounts via login page',
      enabled: true,
      icon: <UserPlus className="h-5 w-5" />
    },
    {
      id: 'maintenanceMode',
      label: 'Maintenance Mode',
      description: 'Restrict access to all user features for maintenance',
      enabled: config?.maintenanceMode ?? false,
      icon: <ShieldAlert className="h-5 w-5" />
    }
  ]);
  
  const [banners, setBanners] = useState<{ url: string; id: string }[]>(
    (config?.banners || []).map((url: string, index: number) => ({
      url,
      id: `b-${index}-${Date.now()}`
    }))
  );
  const [bannerInput, setBannerInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setSettings(prev => prev.map(item => ({
        ...item,
        enabled: config[item.id] ?? item.enabled
      })));
      
      if (config.banners) {
        setBanners(config.banners.map((url: string, index: number) => ({
          url,
          id: `b-${index}-${Date.now()}`
        })));
      }
    }
  }, [config]);

  const toggleSetting = (id: string) => {
    setSettings(settings.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const addBanner = () => {
    if (!bannerInput) return;
    if (banners.length >= 5) {
      toast.error('Maximum 5 banners allowed');
      return;
    }
    setBanners([...banners, { url: bannerInput, id: Date.now().toString() }]);
    setBannerInput('');
  };

  const removeBanner = (id: string) => {
    setBanners(banners.filter(b => b.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedConfig = { ...config };
      settings.forEach(s => {
        updatedConfig[s.id] = s.enabled;
      });
      updatedConfig.banners = banners.map(b => b.url);
      
      await onUpdateConfig(updatedConfig);
      toast.success('Configuration saved successfully');
    } catch (err) {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">System Management</h2>
          <p className="text-slate-500 text-sm">Configure global application behavior and display</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Feature Access
            </CardTitle>
            <CardDescription>Toggle specific features for retailers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.map((setting) => (
              <div 
                key={setting.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100"
              >
                <div className="flex gap-3 items-center">
                  <div className="h-10 w-10 rounded-xl bg-white border flex items-center justify-center text-slate-500">
                    {setting.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{setting.label}</h4>
                    <p className="text-[10px] text-slate-500 font-medium">{setting.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleSetting(setting.id)}
                  className={cn(
                    "relative h-6 w-11 rounded-full p-1 transition-colors",
                    setting.enabled ? "bg-primary" : "bg-slate-200"
                  )}
                >
                  <div className={cn(
                    "h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                    setting.enabled ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-secondary" />
              Slider Banners
            </CardTitle>
            <CardDescription>Manage images on the home dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Image URL..." 
                value={bannerInput}
                onChange={(e) => setBannerInput(e.target.value)}
                className="rounded-xl font-mono text-xs h-11"
              />
              <Button onClick={addBanner} className="rounded-xl h-11 shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {banners.map((banner, index) => (
                  <motion.div
                    key={banner.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4"
                  >
                    <div className="h-12 w-20 rounded-lg overflow-hidden border bg-white flex-shrink-0">
                      <img 
                        src={banner.url} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-500 font-mono truncate">{banner.url}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-red-500"
                      onClick={() => removeBanner(banner.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {banners.length === 0 && (
                <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 font-medium">No banners configured</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
