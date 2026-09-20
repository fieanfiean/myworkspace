import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './components/layout/Sidebar';
import { EnvironmentBadge } from './components/common/EnvironmentBadge';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { CommandPalette } from './components/common/CommandPalette';
import { PWAUpdateToast } from './components/common/PWAUpdateToast';
import { Layout } from './components/layout/Layout';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ThemeProvider } from './context/ThemeContext';
import type { Tab } from './components/layout/Sidebar';

const AboutMePage = lazy(() => import('./pages/AboutMePage').then(module => ({ default: module.AboutMePage })));
const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const BudgetPage = lazy(() => import('./pages/BudgetPage').then(module => ({ default: module.BudgetPage })));
const AnimePage = lazy(() => import('./pages/AnimePage').then(module => ({ default: module.AnimePage })));
const StockAnalysisPage = lazy(() => import('./pages/StockAnalysisPage').then(module => ({ default: module.StockAnalysisPage })));

const EDGE_SWIPE_MIN = 16;
const EDGE_SWIPE_MAX = 80;

function AuthenticatedApp() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const [resumeExportToken, setResumeExportToken] = useState(0);
  const touch = useRef({ startX: 0, startY: 0, currentX: 0, currentY: 0, blocked: false, drawer: null as 'left' | 'right' | null });
  const { user, loading } = useAuth();
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (!isMobileSidebarOpen && !isMobileToolsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setIsMobileSidebarOpen(false); setIsMobileToolsOpen(false); }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMobileSidebarOpen, isMobileToolsOpen]);

  useEffect(() => {
    const handleTouchStart = (event: globalThis.TouchEvent) => {
      const point = event.touches[0];
      const target = event.target instanceof Element ? event.target : null;
      const drawer = target?.closest('[data-swipe-drawer="left"]') || (isMobileSidebarOpen && point.clientX <= 288)
        ? 'left'
        : target?.closest('[data-swipe-drawer="right"]') || (isMobileToolsOpen && point.clientX >= window.innerWidth - 352)
          ? 'right'
          : null;
      touch.current = { startX: point.clientX, startY: point.clientY, currentX: point.clientX, currentY: point.clientY, blocked: window.innerWidth >= 768 || Boolean(target?.closest('[data-horizontal-scroll]')), drawer };
    };
    const handleTouchMove = (event: globalThis.TouchEvent) => {
      const point = event.touches[0];
      touch.current.currentX = point.clientX;
      touch.current.currentY = point.clientY;
    };
    const handleTouchEnd = () => {
      const { startX, startY, currentX, currentY, blocked } = touch.current;
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      if (blocked || Math.abs(deltaX) <= 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

      // An open drawer owns every horizontal swipe. Dismiss it before considering
      // any gesture that could open the drawer on the opposite side.
      if (isMobileSidebarOpen || isMobileToolsOpen) {
        if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
        if (isMobileToolsOpen) setIsMobileToolsOpen(false);
        return;
      }

      const distanceFromRightEdge = window.innerWidth - startX;
      if (startX >= EDGE_SWIPE_MIN && startX <= EDGE_SWIPE_MAX && deltaX > 50) setIsMobileSidebarOpen(true);
      else if (distanceFromRightEdge >= EDGE_SWIPE_MIN && distanceFromRightEdge <= EDGE_SWIPE_MAX && deltaX < -50) setIsMobileToolsOpen(true);
    };
    document.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true, capture: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart, true);
      document.removeEventListener('touchmove', handleTouchMove, true);
      document.removeEventListener('touchend', handleTouchEnd, true);
    };
  }, [isMobileSidebarOpen, isMobileToolsOpen]);

  if (pathname === '/forgot-password') return <ForgotPasswordPage />;
  if (pathname === '/reset-password') return <ResetPasswordPage />;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-400">
        Loading your workspace…
      </div>
    );
  }

  if (!user || pathname === '/login') return <LoginPage />;

  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    setIsMobileToolsOpen(false);
  };

  const navigateFromHome = (tab: Tab, action?: 'budget' | 'resume') => {
    setActiveTab(tab);
    if (action === 'budget') setIsMobileToolsOpen(true);
    else if (action === 'resume') {
      setIsMobileToolsOpen(true);
      setResumeExportToken(token => token + 1);
    } else setIsMobileToolsOpen(false);
  };

  return (
    <Layout>
      <EnvironmentBadge />
      <Sidebar activeTab={activeTab} setActiveTab={changeTab} isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(current => !current)} mobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />

      <main className={`w-full min-w-0 flex-1 px-4 pb-24 pt-4 transition-[margin] duration-300 ease-in-out sm:px-6 sm:py-4 md:p-8 ${isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <Header onOpenMenu={() => setIsMobileSidebarOpen(true)} onOpenTools={() => setIsMobileToolsOpen(true)} />
        <Suspense fallback={<div className="flex min-h-72 items-center justify-center text-sm text-slate-500">{t('common.loadingWorkspace')}</div>}>
          {activeTab === 'dashboard' && <Home onNavigate={navigateFromHome} />}
          {activeTab === 'profile' && <AboutMePage toolsOpen={isMobileToolsOpen} onCloseTools={() => setIsMobileToolsOpen(false)} resumeExportToken={resumeExportToken} />}
          {activeTab === 'budget' && <BudgetPage toolsOpen={isMobileToolsOpen} onCloseTools={() => setIsMobileToolsOpen(false)} />}
          {activeTab === 'anime' && <AnimePage />}
          {activeTab === 'stocks' && <StockAnalysisPage />}
        </Suspense>
      </main>
      <BottomNav activeTab={activeTab} onTabChange={changeTab} />
      <CommandPalette onNavigate={navigateFromHome} />
      <PWAUpdateToast />
    </Layout>
  );
}

export function App() {
  return <ThemeProvider><AuthProvider><AuthenticatedApp /></AuthProvider></ThemeProvider>;
}

export default App;
