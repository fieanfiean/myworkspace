import { Globe, Menu, Moon, SlidersHorizontal, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';

export function Header({ onOpenMenu, onOpenTools }: { onOpenMenu: () => void; onOpenTools: () => void }) {
  const { t, i18n } = useTranslation();
  const isChinese = i18n.language.startsWith('zh');
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 -mx-4 mb-6 flex min-h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 dark:border-slate-800 dark:bg-[#0B0F17]/80">
      <div className="flex min-w-0 items-center gap-3 md:hidden">
        <button type="button" onClick={onOpenMenu} aria-label={t('sidebar.openMenu')} className="shrink-0 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-[#161B26] dark:text-slate-300 dark:hover:bg-slate-800"><Menu size={19}/></button>
        <span className="truncate text-sm font-bold text-blue-500">{t('sidebar.workspace')}</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
      <button type="button" onClick={onOpenTools} aria-label={t('sidebar.openTools')} className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 md:hidden dark:border-slate-700 dark:bg-[#161B26] dark:text-slate-300"><SlidersHorizontal size={18}/></button>
      <button type="button" onClick={toggleTheme} aria-label={t(`theme.${theme === 'dark' ? 'switchToLight' : 'switchToDark'}`)} title={t(`theme.${theme === 'dark' ? 'switchToLight' : 'switchToDark'}`)} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-[#161B26] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
        {theme === 'dark' ? <Sun size={17} className="text-amber-400"/> : <Moon size={17} className="text-indigo-600"/>}
      </button>
      </div>
      <button type="button" onClick={() => void i18n.changeLanguage(isChinese ? 'en' : 'zh')} aria-label={t('sidebar.switchLanguage')} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-[#161B26] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
        <Globe size={17} className="text-blue-400" /><span>{isChinese ? '中文' : 'English'}</span><span className="text-xs text-slate-500">{isChinese ? 'EN' : 'ZH'}</span>
      </button>
    </header>
  );
}
