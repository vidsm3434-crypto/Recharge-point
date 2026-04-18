import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Save, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function LogoManagement() {
  const [logos, setLogos] = useState<any>({
    airtel: '',
    jio: '',
    vi: '',
    bsnl: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLogos();
  }, []);

  async function fetchLogos() {
    setLoading(true);
    try {
      const response = await fetch('/api/config/operator_logos');
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setLogos(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching logos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'operator_logos', value: logos })
      });

      if (!response.ok) throw new Error('Failed to save logos');
      
      toast.success('Operator logos updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update logos');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          Operator Logo Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.keys(logos).map((op) => (
            <div key={op} className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between">
                <Label className="capitalize font-bold text-slate-700">{op}</Label>
                {logos[op] && (
                  <img 
                    src={logos[op]} 
                    alt={op} 
                    className="h-8 w-8 object-contain rounded bg-white p-1 border"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
              <Input
                placeholder={`Enter ${op} logo URL`}
                value={logos[op]}
                onChange={(e) => setLogos({ ...logos, [op]: e.target.value })}
                className="bg-white"
              />
            </div>
          ))}
        </div>

        <Button 
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 gap-2"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Update All Logos
        </Button>
      </CardContent>
    </Card>
  );
}
