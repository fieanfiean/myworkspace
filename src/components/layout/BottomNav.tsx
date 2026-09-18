import { BarChart3, Clapperboard, Home, UserRound, WalletCards } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Tab } from '@/components/layout/Sidebar';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useTranslation();
  const items: Array<{ tab: Tab; label: string; icon: typeof Home }> = [
    { tab: 'dashboard', label: t('bottomNav.home'), icon: Home },
    { tab: 'profile', label: t('sidebar.profile'), icon: UserRound },
    { tab: 'budget', label: t('sidebar.budget'), icon: WalletCards },
    { tab: 'anime', label: t('sidebar.anime'), icon: Clapperboard },
    { tab: 'stocks', label: t('bottomNav.stock'), icon: BarChart3 },
  ];

  return <nav
    aria-label={t('bottomNav.label')}
    className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/80 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-lg sm:hidden dark:border-slate-800 dark:bg-[#0B0F17]/80"
  >
    <div className="grid min-h-16 grid-cols-5 px-1">
      {items.map(({ tab, label, icon: Icon }) => {
        const active = activeTab === tab;
        return <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          aria-current={active ? 'page' : undefined}
          className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-colors ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-200'}`}
        >
          <Icon size={20} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
          <span className="max-w-full truncate">{label}</span>
          {active && <span className="absolute top-0 h-0.5 w-7 rounded-full bg-blue-500" />}
        </button>;
      })}
    </div>
  </nav>;
}
