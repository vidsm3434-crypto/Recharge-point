import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { 
  Share2, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Copy,
  Smartphone,
  Calendar,
  Hash,
  Info,
  ArrowLeft,
  User
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useAuthContext } from '../../hooks/AuthContext';

interface TransactionDetailModalProps {
  transaction: any;
  open: boolean;
  onClose: () => void;
  getOperatorLogo: (operator: string) => string;
}

export function TransactionDetailModal({ transaction, open, onClose, getOperatorLogo }: TransactionDetailModalProps) {
  const { profile: currentUserProfile } = useAuthContext();
  if (!transaction) return null;

  // Retailer Visibility Rule
  // 1. Retailer Panel: Do NOT show "Retailer Name" field
  // 2. Distributor Panel: Show retailer details ONLY if the retailer is linked to that distributor
  // 3. Admin Panel: Admin can see all retailer details
  
  const retailerProfile = transaction.profiles || transaction.user_profile;
  const isRetailer = currentUserProfile?.role === 'retailer';
  const isAdmin = currentUserProfile?.role === 'admin';
  const isDistributor = currentUserProfile?.role === 'distributor';
  
  const isLinkedRetailer = isDistributor && retailerProfile?.distributor_id === currentUserProfile?.id;
  const showRetailerInfo = isAdmin || isLinkedRetailer;

  const handleShare = async () => {
    const text = `
Recharge Receipt
----------------
Operator: ${transaction.details?.operator || 'N/A'}
Mobile: ${transaction.details?.mobile || 'N/A'}
Amount: ₹${transaction.amount}
Status: ${transaction.status.toUpperCase()}
Order ID: ${transaction.details?.txnId || transaction.id}
Date: ${new Date(transaction.timestamp).toLocaleString()}
Ref ID: ${transaction.details?.opid || 'N/A'}
State: ${transaction.details?.state || 'N/A'}
${transaction.details?.closing_balance !== undefined ? `Closing Balance: ₹${transaction.details.closing_balance.toFixed(2)}\n` : ''}${transaction.details?.commission_earned !== undefined && transaction.details.commission_earned > 0 ? `Commission Earned: ₹${transaction.details.commission_earned.toFixed(2)}\n` : ''}${showRetailerInfo ? `Retailer: ${retailerProfile?.retailer_id || 'N/A'}\n${retailerProfile?.name || 'N/A'}\n(${retailerProfile?.mobile || 'N/A'})` : ''}
Message: ${transaction.details?.error_message || transaction.details?.api_response?.message || 'N/A'}
----------------
Generated via RechargePoint
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Recharge Receipt',
          text: text,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Receipt details copied to clipboard');
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('ID copied to clipboard');
  };

  const statusColors = {
    success: "bg-green-50 text-green-600 border-green-200",
    failed: "bg-red-50 text-red-600 border-red-200",
    pending: "bg-amber-50 text-amber-600 border-amber-200"
  };

  const statusIcons = {
    success: <CheckCircle2 className="h-12 w-12 text-green-500" />,
    failed: <XCircle className="h-12 w-12 text-red-500" />,
    pending: <Clock className="h-12 w-12 text-amber-500" />
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none rounded-2xl">
        <div className="bg-[#0033cc] p-4 flex items-center gap-4 text-white">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 h-8 w-8">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <DialogTitle className="text-lg font-bold">Transaction Details</DialogTitle>
        </div>

        <div className="p-6 space-y-6 bg-white">
          {/* Status Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="mb-2">
              {statusIcons[transaction.status as keyof typeof statusIcons] || statusIcons.pending}
            </div>
            <h3 className={cn(
              "text-2xl font-black",
              transaction.status === 'success' ? "text-green-600" : 
              transaction.status === 'failed' ? "text-red-600" : "text-amber-600"
            )}>
              ₹{transaction.amount}
            </h3>
            <div className={cn(
              "px-4 py-1 rounded-full border text-xs font-bold uppercase tracking-widest",
              statusColors[transaction.status as keyof typeof statusColors] || statusColors.pending
            )}>
              {transaction.status}
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {new Date(transaction.timestamp).toLocaleString('en-GB', { 
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
              })}
            </p>
          </div>

          <div className="space-y-4">
            {/* Operator Info */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="h-12 w-12 rounded-full overflow-hidden bg-white flex items-center justify-center border border-slate-100 shrink-0">
                <img 
                  src={getOperatorLogo(transaction.details?.operator)} 
                  alt={transaction.details?.operator}
                  className="h-8 w-8 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Operator</p>
                <p className="font-bold text-slate-800 truncate">{transaction.details?.operator || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mobile</p>
                <p className="font-bold text-slate-800">{transaction.details?.mobile || 'N/A'}</p>
              </div>
            </div>

            {/* Details List */}
            <div className="space-y-3 px-1">
              <DetailRow 
                icon={<Hash className="h-4 w-4" />} 
                label="Order ID" 
                value={transaction.details?.txnId || transaction.id} 
                onCopy={() => handleCopyId(transaction.details?.txnId || transaction.id)}
              />
              <DetailRow 
                icon={<Info className="h-4 w-4" />} 
                label="Operator Ref" 
                value={transaction.details?.opid || 'N/A'} 
                onCopy={transaction.details?.opid ? () => handleCopyId(transaction.details.opid) : undefined}
              />
              <DetailRow 
                icon={<Info className="h-4 w-4" />} 
                label="State (Circle)" 
                value={transaction.details?.state || 'N/A'} 
              />
              
              {transaction.details?.closing_balance !== undefined && (
                <DetailRow 
                  icon={<Info className="h-4 w-4" />} 
                  label="Closing Balance" 
                  value={`₹${transaction.details.closing_balance.toFixed(2)}`} 
                />
              )}
              
              {transaction.details?.commission_earned !== undefined && transaction.details.commission_earned > 0 && (
                <DetailRow 
                  icon={<Info className="h-4 w-4" />} 
                  label="Commission Earned" 
                  value={`₹${transaction.details.commission_earned.toFixed(2)}`} 
                />
              )}
              
              {showRetailerInfo && retailerProfile && (
                <div className="flex items-start gap-3 py-1">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Retailer Identity</p>
                    <div className="text-xs font-bold text-slate-700 leading-tight mt-0.5">
                      <p className="text-primary">{retailerProfile.retailer_id || 'N/A'}</p>
                      <p>{retailerProfile.name || 'N/A'}</p>
                      <p className="text-slate-500 font-medium">({retailerProfile.mobile || 'N/A'})</p>
                    </div>
                  </div>
                </div>
              )}

              {(transaction.details?.error_message || transaction.details?.api_response?.message) ? (
                <DetailRow 
                  icon={<Info className="h-4 w-4" />} 
                  label="Message" 
                  value={isRetailer ? 'Recharge Failed. Please try again later.' : (transaction.details?.error_message || transaction.details?.api_response?.message)} 
                />
              ) : null}
              {transaction.status === 'failed' && transaction.details?.rejectReason && (
                <div className="flex gap-3 items-start p-3 bg-red-50 rounded-xl border border-red-100">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-red-400 font-bold uppercase">Failure Reason</p>
                    <p className="text-xs text-red-600 font-medium">{transaction.details.rejectReason}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button 
              className="bg-[#0033cc] hover:bg-[#0022aa] text-white rounded-xl h-12 font-bold gap-2"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" /> Share
            </Button>
            <Button 
              variant="outline" 
              className="border-slate-200 text-slate-600 rounded-xl h-12 font-bold gap-2"
              onClick={() => toast.info('Receipt download coming soon')}
            >
              <Download className="h-4 w-4" /> Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ icon, label, value, onCopy }: { icon: any, label: string, value: string, onCopy?: () => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
          {icon}
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
          <p className="text-xs font-bold text-slate-700 break-all">{value}</p>
        </div>
      </div>
      {onCopy && (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={onCopy}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
