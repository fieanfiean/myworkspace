import { ArrowUpRight, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { StockSnapshot } from '@/data/mockData';

export function TickerBanner({ stockSummary }: { stockSummary: StockSnapshot }) {
  const { t } = useTranslation();
  const rangePosition = (stockSummary.price - stockSummary.weekLow) / (stockSummary.weekHigh - stockSummary.weekLow) * 100;
  const positive = stockSummary.changePercent >= 0;
  return <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-[#161F30] to-[#111827] p-5 shadow-xl shadow-black/10">
    <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-start gap-4"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-400"><Building2 size={24}/></span><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold text-white">{stockSummary.company}</h1><span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-400">{stockSummary.exchange}</span></div><p className="mt-1 text-sm text-slate-500">{stockSummary.ticker} · {t('stock.equity')}</p><div className="mt-3 flex flex-wrap items-end gap-3"><strong className="text-4xl font-bold tracking-tight text-white">${stockSummary.price.toFixed(2)}</strong><span className={`mb-1 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-bold ${positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}><ArrowUpRight className={positive ? '' : 'rotate-90'} size={15}/>{positive?'+':''}{stockSummary.changePercent}%</span><span className={`mb-1 text-sm ${positive ? 'text-emerald-400' : 'text-red-400'}`}>{positive?'+':''}${stockSummary.change.toFixed(2)}</span></div></div></div>
      <div className="grid grid-cols-3 gap-3 sm:min-w-[360px]">{[[t('stock.marketCap'),stockSummary.marketCap],[t('stock.peRatio'),stockSummary.peRatio],[t('stock.volume'),stockSummary.volume]].map(([label,value]) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/35 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-100">{value}</p></div>)}</div>
    </div>
    <div className="mt-6"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium text-slate-400">{t('stock.weekRange')}</span><span className="text-slate-500">${stockSummary.weekLow} — ${stockSummary.weekHigh}</span></div><div className="relative h-2 rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400" style={{width:`${rangePosition}%`}}/><span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-500 shadow-lg shadow-blue-950" style={{left:`${rangePosition}%`}}/></div></div>
  </section>;
}
