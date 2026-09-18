import { BrainCircuit, CalendarClock, CircleCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { aiTakeaways } from '@/data/stockMockData';

export function AIInsights() {
  const { t } = useTranslation();
  return <section className="rounded-2xl border border-slate-800 bg-[#111827] p-5 shadow-xl shadow-black/10">
    <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-500/15 p-2.5 text-blue-400"><BrainCircuit size={20}/></span><div><h2 className="font-bold text-white">{t('stock.aiInsights')}</h2><p className="text-xs text-slate-500">{t('stock.aiSubtitle')}</p></div></div>
    <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4"><div className="flex items-center justify-between"><span className="text-sm text-slate-400">{t('stock.sentiment')}</span><span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-400">72% {t('stock.bullish')}</span></div><div className="relative mt-4 h-2 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500"><span className="absolute left-[72%] top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-500"/></div><div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-600"><span>{t('stock.bearish')}</span><span>{t('stock.bullish')}</span></div></div>
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4"><CalendarClock className="shrink-0 text-blue-400" size={22}/><div className="min-w-0 flex-1"><p className="text-xs text-slate-500">{t('stock.nextEarnings')}</p><p className="mt-1 font-semibold text-white">Aug 1, 2024</p></div><div className="text-right"><p className="text-xs text-slate-500">{t('stock.epsEstimate')}</p><p className="mt-1 font-semibold text-emerald-400">$1.34</p></div></div>
    <div className="mt-5"><h3 className="text-sm font-semibold text-white">{t('stock.keyTakeaways')}</h3><ul className="mt-3 space-y-3">{aiTakeaways.map(item => <li key={item} className="flex gap-2.5 text-sm leading-5 text-slate-400"><CircleCheck className="mt-0.5 shrink-0 text-blue-400" size={16}/><span>{t(`stock.${item}`)}</span></li>)}</ul></div>
  </section>;
}
