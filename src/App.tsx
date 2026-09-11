import { useEffect, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { AboutMePage } from './pages/AboutMePage';
import { BudgetPage } from './pages/BudgetPage';
import { AnimePage } from './pages/AnimePage';
import { EnvironmentBadge } from './components/EnvironmentBadge';
import { Header } from './components/Header';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { ThemeProvider } from './context/ThemeContext';
import type { Tab } from './components/Sidebar';

const EDGE_SWIPE_MIN = 16;
const EDGE_SWIPE_MAX = 80;

function AuthenticatedApp() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const touch = useRef({ startX: 0, startY: 0, currentX: 0, currentY: 0, blocked: false, drawer: null as 'left' | 'right' | null });
  const { user, loading } = useAuth();

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-400">
        Loading your workspace…
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    setIsMobileToolsOpen(false);
  };

  return (
    <div className="flex min-h-screen w-full overflow-x-clip bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-[#0B0F17] dark:text-slate-100">
      <EnvironmentBadge />
      <Sidebar activeTab={activeTab} setActiveTab={changeTab} isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(current => !current)} mobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />

      <main className={`w-full min-w-0 flex-1 px-4 py-4 transition-[margin] duration-300 ease-in-out sm:px-6 md:p-8 ${isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <Header onOpenMenu={() => setIsMobileSidebarOpen(true)} onOpenTools={() => setIsMobileToolsOpen(true)} />
        {activeTab === 'profile' && <AboutMePage toolsOpen={isMobileToolsOpen} onCloseTools={() => setIsMobileToolsOpen(false)} />}
        {activeTab === 'budget' && <BudgetPage toolsOpen={isMobileToolsOpen} onCloseTools={() => setIsMobileToolsOpen(false)} />}
        {activeTab === 'anime' && <AnimePage />}
      </main>
    </div>
  );
}

export function App() {
  return <ThemeProvider><AuthProvider><AuthenticatedApp /></AuthProvider></ThemeProvider>;
}

export default App;
