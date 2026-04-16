import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Bell, Send, Users, User, Info, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

export function NotificationSystem() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetMobile, setTargetMobile] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (type: 'all' | 'specific') => {
    if (!title || !message) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      let userId = null;

      if (type === 'specific') {
        if (!targetMobile) {
          toast.error('Please enter target mobile');
          setLoading(false);
          return;
        }

        // Find user by mobile
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('mobile', targetMobile)
          .maybeSingle();

        if (userError) throw userError;
        if (!userData) {
          toast.error('User not found with this mobile number');
          setLoading(false);
          return;
        }
        userId = userData.id;
      }

      const { error } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: userId,
            title,
            message,
            type: type === 'all' ? 'broadcast' : 'personal',
            created_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      toast.success(`Notification sent to ${type === 'all' ? 'all users' : targetMobile}`);
      setTitle('');
      setMessage('');
      setTargetMobile('');
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">Notification System</h3>

      <Tabs defaultValue="broadcast" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="broadcast" className="gap-2">
            <Users size={14} /> Broadcast
          </TabsTrigger>
          <TabsTrigger value="specific" className="gap-2">
            <User size={14} /> Specific User
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell size={16} className="text-primary" /> Create Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TabsContent value="specific" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Target Mobile Number</Label>
                <Input 
                  placeholder="Enter 10-digit mobile" 
                  value={targetMobile}
                  onChange={(e) => setTargetMobile(e.target.value)}
                  maxLength={10}
                />
              </div>
            </TabsContent>

            <div className="space-y-2">
              <Label className="text-xs">Notification Title</Label>
              <Input 
                placeholder="e.g. System Maintenance" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Message Content</Label>
              <Textarea 
                placeholder="Type your message here..." 
                className="min-h-[120px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="flex gap-4 pt-2">
              <TabsContent value="broadcast" className="mt-0 w-full">
                <Button className="w-full gap-2" onClick={() => handleSend('all')} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />} 
                  {loading ? 'Sending...' : 'Send Broadcast'}
                </Button>
              </TabsContent>
              <TabsContent value="specific" className="mt-0 w-full">
                <Button className="w-full gap-2" onClick={() => handleSend('specific')} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />} 
                  {loading ? 'Sending...' : 'Send to User'}
                </Button>
              </TabsContent>
            </div>
          </CardContent>
        </Card>
      </Tabs>

      <Card className="border-none bg-blue-50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="rounded-full bg-blue-100 p-2 text-blue-600">
              <Info size={20} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-blue-900">Push Notifications</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Broadcast notifications will be visible to all retailers and distributors 
                on their main dashboard. Specific notifications will only appear for 
                 the targeted user.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
