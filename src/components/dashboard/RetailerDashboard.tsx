import { useState } from 'react';
import { useAuthContext } from '../../hooks/AuthContext';
import { Home, History, HelpCircle, Menu, LayoutGrid, Gift, Bell, Info, X, ShieldCheck } from 'lucide-react';
import { HomeView } from './HomeView';
import { RechargeView } from '../recharge/RechargeView';
import { ReportsView } from '../reports/ReportsView';
import { ProfileView } from './ProfileView';
import { KycView } from './KycView';
import { MPINModal } from './MPINModal';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

interface RetailerDashboardProps {
  onToggleAdminMode?: () => void;
  onToggleDistributorMode?: () => void;
}

export function RetailerDashboard({ onToggleAdminMode, onToggleDistributorMode }: RetailerDashboardProps) {
  const { profile } = useAuthContext();
  const [activeTab, setActiveTab] = useState<'home' | 'services' | 'reports' | 'help' | 'refer' | 'kyc'>('home');
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMPINSetup, setShowMPINSetup] = useState(false);

  // Mock notifications for now
  const notifications = [
    { id: 1, title: 'System Update', message: 'New recharge operators added to the system.', time: '2 hours ago', unread: true },
    { id: 2, title: 'Wallet Credit', message: 'Your wallet has been credited with ₹500 by admin.', time: '5 hours ago', unread: false },
    { id: 3, title: 'Welcome', message: 'Welcome to the new Retailer Dashboard!', time: '1 day ago', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  // Check if MPIN is set or needs reset setup
  const needsMPINSetup = profile && (!profile.mpin || profile.mpin.startsWith('TEMP:'));

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeView onServiceSelect={() => setActiveTab('services')} />;
      case 'services':
        return <RechargeView onBack={() => setActiveTab('home')} />;
      case 'reports':
        return <ReportsView />;
      case 'help':
        return <div className="p-4">Help Content (Coming Soon)</div>;
      case 'refer':
        return <div className="p-4">Refer & Earn (Coming Soon)</div>;
      case 'kyc':
        return <KycView onBack={() => setActiveTab('home')} />;
      default:
        return <HomeView onServiceSelect={() => setActiveTab('services')} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-white sticky top-0 h-screen">
        <div className="p-6 bg-primary text-white">
          <h2 className="text-xl font-bold">RechargePoint</h2>
          <p className="text-xs opacity-80 mt-1">Retailer Panel</p>
        </div>
        
        <div className="p-4 border-b bg-slate-50/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {profile?.name?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm truncate">{profile?.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{profile?.mobile}</p>
            </div>
          </div>
          <div className="rounded-xl bg-primary p-3 text-white shadow-sm">
            <p className="text-[10px] opacity-80 uppercase font-bold tracking-wider">Wallet Balance</p>
            <p className="text-lg font-bold">₹{profile?.wallet_balance?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-1">
            <SidebarNavButton 
              icon={<Home className="h-5 w-5" />} 
              label="Home" 
              active={activeTab === 'home'} 
              onClick={() => setActiveTab('home')} 
            />
            <SidebarNavButton 
              icon={<LayoutGrid className="h-5 w-5" />} 
              label="Services" 
              active={activeTab === 'services'} 
              onClick={() => setActiveTab('services')} 
            />
            <SidebarNavButton 
              icon={<History className="h-5 w-5" />} 
              label="Reports" 
              active={activeTab === 'reports'} 
              onClick={() => setActiveTab('reports')} 
            />
            <SidebarNavButton 
              icon={<ShieldCheck className="h-5 w-5" />} 
              label="KYC Verification" 
              active={activeTab === 'kyc'} 
              onClick={() => setActiveTab('kyc')} 
            />
            <SidebarNavButton 
              icon={<HelpCircle className="h-5 w-5" />} 
              label="Help" 
              active={activeTab === 'help'} 
              onClick={() => setActiveTab('help')} 
            />
            <SidebarNavButton 
              icon={<Gift className="h-5 w-5" />} 
              label="Refer & Earn" 
              active={activeTab === 'refer'} 
              onClick={() => setActiveTab('refer')} 
            />
          </div>
        </ScrollArea>

        <div className="p-4 border-t space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-slate-600 hover:text-primary"
            onClick={() => setShowProfile(true)}
          >
            <Menu className="h-5 w-5" />
            <span>Settings</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-red-600 hover:bg-red-50"
            onClick={() => {}}
          >
            <X className="h-5 w-5" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header */}
        <header className={cn(
          "sticky top-0 z-10 flex items-center justify-between bg-primary px-4 py-4 text-white shadow-md lg:hidden",
          activeTab !== 'home' && "hidden"
        )}>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full text-white hover:bg-white/10"
              onClick={() => setShowProfile(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div>
              <p className="text-xs opacity-80">Welcome back,</p>
              <p className="font-bold">{profile?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative rounded-full text-white hover:bg-white/10"
              onClick={() => setShowNotifications(true)}
            >
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 border-2 border-primary" />
              )}
            </Button>
            <div className="rounded-lg bg-white/20 px-3 py-1 text-sm font-medium">
              ₹{profile?.wallet_balance?.toFixed(2) || '0.00'}
            </div>
          </div>
        </header>

        {/* Desktop Header (Simple) */}
        <header className="hidden lg:flex items-center justify-between bg-white border-b px-8 py-4 sticky top-0 z-10">
          <h1 className="text-xl font-bold text-slate-800 capitalize">{activeTab}</h1>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative rounded-full text-slate-600 hover:bg-slate-100"
              onClick={() => setShowNotifications(true)}
            >
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 border-2 border-white" />
              )}
            </Button>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800">{profile?.name}</p>
                <p className="text-[10px] text-slate-500">{profile?.role}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                {profile?.name?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">
          <div className="mx-auto max-w-7xl w-full">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-around border-t bg-white px-2 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] lg:hidden">
        <NavButton 
          icon={<Home className="h-5 w-5" />} 
          label="Home" 
          active={activeTab === 'home'} 
          onClick={() => setActiveTab('home')} 
        />
        <NavButton 
          icon={<LayoutGrid className="h-5 w-5" />} 
          label="Services" 
          active={activeTab === 'services'} 
          onClick={() => setActiveTab('services')} 
        />
        <NavButton 
          icon={<History className="h-5 w-5" />} 
          label="Reports" 
          active={activeTab === 'reports'} 
          onClick={() => setActiveTab('reports')} 
        />
        <NavButton 
          icon={<HelpCircle className="h-5 w-5" />} 
          label="Help" 
          active={activeTab === 'help'} 
          onClick={() => setActiveTab('help')} 
        />
        <NavButton 
          icon={<Gift className="h-5 w-5" />} 
          label="Refer" 
          active={activeTab === 'refer'} 
          onClick={() => setActiveTab('refer')} 
        />
      </nav>

      {/* Profile Sidebar */}
      <ProfileView 
        open={showProfile} 
        onClose={() => setShowProfile(false)} 
        onToggleAdminMode={onToggleAdminMode}
        onMenuClick={(id) => {
          if (id === 'distributor_panel' && onToggleDistributorMode) {
            onToggleDistributorMode();
          } else {
            setActiveTab(id as any);
          }
        }}
      />

      {/* Notifications Sheet */}
      <Sheet open={showNotifications} onOpenChange={setShowNotifications}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-4 border-b bg-primary text-white shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-white flex items-center gap-2">
                <Bell className="h-5 w-5" /> Notifications
              </SheetTitle>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setShowNotifications(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Bell className="h-12 w-12 mb-2 opacity-20" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={cn(
                      "relative rounded-xl p-4 border transition-all",
                      notif.unread ? "bg-blue-50/50 border-blue-100" : "bg-white border-slate-100"
                    )}
                  >
                    {notif.unread && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl" />
                    )}
                    <div className="flex gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                        notif.unread ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                      )}>
                        <Info className="h-4 w-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-800">{notif.title}</p>
                          <span className="text-[10px] text-slate-400">{notif.time}</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          {notifications.length > 0 && (
            <div className="p-4 border-t bg-slate-50">
              <Button variant="outline" className="w-full text-xs h-9" onClick={() => toast.info('All marked as read')}>
                Mark all as read
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* MPIN Setup Modal for New Users */}
      <MPINModal 
        open={!!needsMPINSetup} 
        onClose={() => {}} 
        mode="setup"
      />
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      className={cn(
        "flex flex-col items-center gap-1 px-3 py-1 transition-colors",
        active ? "text-primary" : "text-slate-400"
      )}
      onClick={onClick}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
      {active && <div className="h-1 w-1 rounded-full bg-primary" />}
    </button>
  );
}

function SidebarNavButton({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start gap-4 h-11 px-3 transition-all",
        active ? "bg-primary/10 text-primary font-bold" : "text-slate-600 hover:bg-slate-50"
      )}
      onClick={onClick}
    >
      <div className={cn(
        "transition-transform",
        active && "scale-110"
      )}>
        {icon}
      </div>
      <span className="text-sm">{label}</span>
      {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />}
    </Button>
  );
}
