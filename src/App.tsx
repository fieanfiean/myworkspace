import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { AboutMePage } from './pages/AboutMePage';
import { BudgetPage } from './pages/BudgetPage';
import { EnvironmentBadge } from './components/EnvironmentBadge';
import { Header } from './components/Header';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';

function AuthenticatedApp() {
  const [activeTab, setActiveTab] = useState<'profile' | 'budget'>('profile');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const { user, loading } = useAuth();

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        Loading your workspace…
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <EnvironmentBadge />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(current => !current)} />

      <main className={`min-w-0 flex-1 p-8 transition-[margin] duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <Header />
        {activeTab === 'profile' ? <AboutMePage /> : <BudgetPage />}
      </main>
    </div>
  );
}

export function App() {
  return <AuthProvider><AuthenticatedApp /></AuthProvider>;
}

export default App;
