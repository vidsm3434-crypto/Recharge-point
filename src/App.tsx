import { useState } from 'react';
import { useAuthContext } from './hooks/AuthContext';
import { Loading } from './components/ui/loading';
import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import { Help } from './components/auth/Help';
import { CompleteProfile } from './components/auth/CompleteProfile';
import { RetailerDashboard } from './components/dashboard/RetailerDashboard';
import { DistributorDashboard } from './components/dashboard/DistributorDashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';

export default function App() {
  const { user, profile, loading } = useAuthContext();
  const [view, setView] = useState<'login' | 'signup' | 'help'>('login');
  const [prefillMobile, setPrefillMobile] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isDistributorMode, setIsDistributorMode] = useState(false);

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    if (view === 'signup') return (
      <Signup 
        onBack={() => setView('login')} 
        onSwitchToLogin={(mobile) => {
          setPrefillMobile(mobile);
          setView('login');
        }}
      />
    );
    if (view === 'help') return <Help onBack={() => setView('login')} />;
    return (
      <Login 
        onSignup={() => setView('signup')} 
        onHelp={() => setView('help')} 
        initialMobile={prefillMobile}
      />
    );
  }

  if (!profile) {
    return <CompleteProfile />;
  }

  // Special handling for the specific admin mobile number
  if (profile.mobile === '7872303434') {
    if (isAdminMode) {
      return <AdminDashboard onBackToRetailer={() => setIsAdminMode(false)} />;
    }
    if (isDistributorMode) {
      return <DistributorDashboard onToggleDistributorMode={() => setIsDistributorMode(false)} />;
    }
    return (
      <RetailerDashboard 
        onToggleAdminMode={() => setIsAdminMode(true)} 
        onToggleDistributorMode={() => setIsDistributorMode(true)}
      />
    );
  }

  // Role-based routing
  if (profile.role === 'admin') {
    return <AdminDashboard />;
  }

  if (profile.role === 'distributor') {
    return <DistributorDashboard />;
  }

  return <RetailerDashboard />;
}
