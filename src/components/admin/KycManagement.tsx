import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ShieldCheck, FileText, CheckCircle2, XCircle, Eye, User, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface KycManagementProps {
  users: any[];
  onUpdateUser: (userId: string, data: any) => void;
}

export function KycManagement({ users, onUpdateUser }: KycManagementProps) {
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const pendingKyc = users.filter(u => u.kyc_status === 'pending');

  const handleStatusUpdate = async (userId: string, status: string) => {
    setUpdating(true);
    try {
      await onUpdateUser(userId, { kyc_status: status });
      setSelectedKyc(null);
    } catch (error) {
      // Error handled by parent
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">KYC Management</h3>
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" /> {pendingKyc.length} Pending
        </Badge>
      </div>

      <div className="space-y-3">
        {pendingKyc.map((user) => (
          <Card key={user.id} className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-slate-100 p-2 text-slate-600">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold">{user.name}</p>
                  <p className="text-[10px] text-slate-500">{user.mobile} • Submitted {user.kyc_details?.submittedAt ? new Date(user.kyc_details.submittedAt).toLocaleDateString() : 'recently'}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="gap-2 h-8 text-xs" onClick={() => setSelectedKyc(user)}>
                <Eye size={14} /> View KYC
              </Button>
            </CardContent>
          </Card>
        ))}
        {pendingKyc.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl border-dashed border-2">
            <ShieldCheck className="mx-auto h-12 w-12 text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">All KYC requests are processed.</p>
          </div>
        )}
      </div>

      <Dialog open={!!selectedKyc} onOpenChange={() => !updating && setSelectedKyc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>KYC Verification: {selectedKyc?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Aadhar Number</p>
                <p className="text-sm font-medium">{selectedKyc?.kyc_details?.aadhaar || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold">PAN Number</p>
                <p className="text-sm font-medium">{selectedKyc?.kyc_details?.pan || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Shop Name</p>
              <p className="text-sm font-medium">{selectedKyc?.kyc_details?.shopName || 'N/A'}</p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Address</p>
              <p className="text-sm font-medium">{selectedKyc?.kyc_details?.address || 'N/A'}</p>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Aadhaar Photo</p>
              {selectedKyc?.kyc_details?.aadhaarPhoto ? (
                <div className="aspect-video rounded-lg overflow-hidden border bg-slate-100">
                  <img 
                    src={selectedKyc.kyc_details.aadhaarPhoto} 
                    alt="Aadhaar Card" 
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-lg bg-slate-100 flex items-center justify-center border-2 border-dashed">
                  <FileText className="h-10 w-10 text-slate-300" />
                  <span className="text-[10px] text-slate-400 ml-2">No photo uploaded</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button 
                className="gap-2 bg-green-600 hover:bg-green-700" 
                onClick={() => handleStatusUpdate(selectedKyc.id, 'verified')}
                disabled={updating}
              >
                {updating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={16} />} 
                Approve
              </Button>
              <Button 
                variant="destructive" 
                className="gap-2" 
                onClick={() => handleStatusUpdate(selectedKyc.id, 'rejected')}
                disabled={updating}
              >
                {updating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <XCircle size={16} />} 
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
