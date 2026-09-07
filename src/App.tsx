import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { AboutMePage } from './pages/AboutMePage';
import { BudgetPage } from './pages/BudgetPage';
import { EnvironmentBadge } from './components/EnvironmentBadge';
import { Header } from './components/Header';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { ThemeProvider } from './context/ThemeContext';

function AuthenticatedApp() {
  const [activeTab, setActiveTab] = useState<'profile' | 'budget'>('profile');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileSidebarOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMobileSidebarOpen]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-400">
        Loading your workspace…
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-[#0B0F17] dark:text-slate-100">
      <EnvironmentBadge />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(current => !current)} mobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />

      <main className={`w-full min-w-0 flex-1 px-4 py-4 transition-[margin] duration-300 ease-in-out sm:px-6 md:p-8 ${isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <Header onOpenMenu={() => setIsMobileSidebarOpen(true)} />
        {activeTab === 'profile' ? <AboutMePage /> : <BudgetPage />}
      </main>
    </div>
  );
}

export function App() {
  return <ThemeProvider><AuthProvider><AuthenticatedApp /></AuthProvider></ThemeProvider>;
}

export default App;
