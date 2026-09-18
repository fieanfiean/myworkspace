import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { BarChart3, Camera, Clapperboard, Home, Plus, Search, UserRound, WalletCards, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Tab } from '@/components/layout/Sidebar';

type NavigationAction = 'budget' | 'resume';

interface CommandPaletteProps {
  onNavigate: (tab: Tab, action?: NavigationAction) => void;
}

interface CommandItem {
  id: string;
  label: string;
  description: string;
  keywords: string;
  icon: typeof Home;
  run: () => void;
}

function fuzzyMatch(candidate: string, query: string): boolean {
  const haystack = candidate.toLocaleLowerCase().replace(/\s+/g, ' ');
  const needle = query.trim().toLocaleLowerCase();
  if (!needle || haystack.includes(needle)) return true;
  let position = 0;
  for (const character of haystack) {
    if (character === needle[position]) position += 1;
    if (position === needle.length) return true;
  }
  return false;
}

export function CommandPalette({ onNavigate }: CommandPaletteProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const openPalette = (event: KeyboardEvent) => {
      if (event.key.toLocaleLowerCase() !== 'k' || (!event.metaKey && !event.ctrlKey)) return;
      event.preventDefault();
      setOpen(current => !current);
    };
    window.addEventListener('keydown', openPalette);
    return () => window.removeEventListener('keydown', openPalette);
  }, []);

  const execute = (run: () => void) => {
    setOpen(false);
    setQuery('');
    run();
  };

  const commands = useMemo<CommandItem[]>(() => [
    { id: 'home', label: t('command.items.home'), description: t('command.items.homeHint'), keywords: 'home dashboard 首页 主页', icon: Home, run: () => onNavigate('dashboard') },
    { id: 'profile', label: t('command.items.profile'), description: t('command.items.profileHint'), keywords: 'profile resume cv 履历 个人资料', icon: UserRound, run: () => onNavigate('profile') },
    { id: 'budget', label: t('command.items.budget'), description: t('command.items.budgetHint'), keywords: 'budget money transaction 财务 预算', icon: WalletCards, run: () => onNavigate('budget') },
    { id: 'add', label: t('command.items.add'), description: t('command.items.addHint'), keywords: 'add transaction expense income 记账 收入 支出', icon: Plus, run: () => onNavigate('budget', 'budget') },
    { id: 'scan', label: t('command.items.scan'), description: t('command.items.scanHint'), keywords: 'scan receipt ocr camera 扫描 收据', icon: Camera, run: () => onNavigate('budget', 'budget') },
    { id: 'anime', label: t('command.items.anime'), description: t('command.items.animeHint'), keywords: 'anime watch stream 动漫 看戏', icon: Clapperboard, run: () => onNavigate('anime') },
    { id: 'stocks', label: t('command.items.stocks'), description: t('command.items.stocksHint'), keywords: 'stock market aapl nvda 股票 行情', icon: BarChart3, run: () => onNavigate('stocks') },
  ], [onNavigate, t]);
  const results = commands.filter(item => fuzzyMatch(`${item.label} ${item.description} ${item.keywords}`, query));

  return <Dialog.Root open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setQuery(''); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in" />
      <Dialog.Content
        className="fixed left-1/2 top-[12vh] z-[101] w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl outline-none backdrop-blur-xl dark:border-slate-700 dark:bg-[#101724]/95"
        aria-describedby="command-description"
      >
        <Dialog.Title className="sr-only">{t('command.title')}</Dialog.Title>
        <Dialog.Description id="command-description" className="sr-only">{t('command.description')}</Dialog.Description>
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
          <Search size={19} className="shrink-0 text-slate-400" aria-hidden="true" />
          <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder={t('command.placeholder')} className="min-h-14 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white" />
          <Dialog.Close className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label={t('common.close')}><X size={18}/></Dialog.Close>
        </div>
        <div className="max-h-[min(60vh,30rem)] overflow-y-auto p-2">
          {results.length ? results.map(({ id, label, description, icon: Icon, run }) => <button key={id} type="button" onClick={() => execute(run)} className="flex min-h-16 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100 focus:bg-slate-100 focus:outline-none dark:hover:bg-slate-800 dark:focus:bg-slate-800">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><Icon size={19}/></span>
            <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900 dark:text-white">{label}</strong><span className="mt-0.5 block truncate text-xs text-slate-500">{description}</span></span>
          </button>) : <p className="px-4 py-10 text-center text-sm text-slate-500">{t('command.empty')}</p>}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-[11px] text-slate-400 dark:border-slate-800"><span>{t('command.hint')}</span><kbd className="rounded-md border border-slate-200 px-2 py-1 dark:border-slate-700">ESC</kbd></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
