import { useState, type FormEvent } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { quickTickers, searchableTickers } from '@/data/mockData';

export function StockTopBar({ selectedTicker, onSelectTicker }: { selectedTicker: string; onSelectTicker: (ticker: string) => void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(selectedTicker);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const ticker = query.trim().toUpperCase();
    if (searchableTickers.includes(ticker)) onSelectTicker(ticker);
  };
  return <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-[#111827]/90 p-3 shadow-xl shadow-black/10 sm:flex-row sm:items-center">
    <form onSubmit={submit} className="relative min-w-0 flex-1"><label><span className="sr-only">{t('stock.search')}</span><Search className="pointer-events-none absolute left-3 top-3 text-slate-500" size={18}/><input value={query} onChange={event => setQuery(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-700 bg-[#0B0F17] py-2 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500" placeholder={t('stock.searchPlaceholder')}/></label></form>
    <div className="scrollbar-none flex gap-2 overflow-x-auto" data-horizontal-scroll>{quickTickers.map(symbol => <button type="button" key={symbol} aria-pressed={selectedTicker === symbol} onClick={() => { setQuery(symbol); onSelectTicker(symbol); }} className={`min-h-10 shrink-0 rounded-lg border px-3 text-xs font-semibold transition ${selectedTicker === symbol ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:border-blue-500 hover:text-white'}`}>{symbol}</button>)}</div>
    <span className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300"><Sparkles size={15}/>{t('stock.marketOpen')}</span>
  </div>;
}
