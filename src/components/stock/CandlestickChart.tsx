import { useMemo, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import type { PricePoint } from '@/data/stockMockData';

type Timeframe = '1D' | '1W' | '1M' | '1Y' | 'ALL';

export function CandlestickChart({ ticker, priceHistory }: { ticker: string; priceHistory: PricePoint[] }) {
  const { t } = useTranslation();
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [indicators, setIndicators] = useState(['MA']);
  const chart = useMemo(() => {
    const width = 760, height = 300, padX = 28, padY = 22;
    const min = Math.min(...priceHistory.map(item => item.low)) - 1;
    const max = Math.max(...priceHistory.map(item => item.high)) + 1;
    const x = (index: number) => padX + index * ((width - padX * 2) / (priceHistory.length - 1));
    const y = (value: number) => padY + (max - value) / (max - min) * (height - padY * 2);
    const maPath = priceHistory.map((item, index) => `${index ? 'L' : 'M'}${x(index)},${y(item.ma)}`).join(' ');
    const maAreaPath = `${maPath} L${x(priceHistory.length - 1)},${height - padY} L${x(0)},${height - padY} Z`;
    return { width, height, x, y, maPath, maAreaPath, min, max };
  }, [priceHistory]);
  const toggleIndicator = (indicator: string) => setIndicators(current => current.includes(indicator) ? current.filter(value => value !== indicator) : [...current, indicator]);

  return <section className="rounded-2xl border border-slate-800 bg-[#111827] p-4 shadow-xl shadow-black/10 sm:p-5">
    <div className="flex flex-col gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-white">{t('stock.priceAction')}</h2><p className="mt-1 text-xs text-slate-500">{ticker} · {t('stock.delayedData')}</p></div><div className="scrollbar-none flex gap-2 overflow-x-auto" data-horizontal-scroll>{['MA','RSI','MACD'].map(item => <button key={item} type="button" aria-pressed={indicators.includes(item)} onClick={() => toggleIndicator(item)} className={`min-h-9 shrink-0 rounded-lg px-3 text-xs font-semibold transition ${indicators.includes(item) ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{item}</button>)}</div></div>
    <div className="mt-4 flex justify-end"><Tabs.Root value={timeframe} onValueChange={value => setTimeframe(value as Timeframe)}><Tabs.List aria-label={t('stock.timeframe')} className="inline-flex rounded-lg bg-slate-950 p-1">{(['1D','1W','1M','1Y','ALL'] as Timeframe[]).map(value => <Tabs.Trigger key={value} value={value} className="min-h-9 rounded-md px-3 text-xs font-semibold text-slate-500 transition hover:text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">{value}</Tabs.Trigger>)}</Tabs.List></Tabs.Root></div>
    <div className="trading-grid mt-3 overflow-x-auto rounded-xl" data-horizontal-scroll><svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-[300px] min-w-[720px] w-full" role="img" aria-label={t('stock.candlestickLabel')}>
      <defs><linearGradient id="priceAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366F1" stopOpacity="0.15"/><stop offset="100%" stopColor="#6366F1" stopOpacity="0"/></linearGradient></defs>
      {indicators.includes('MA') && <path d={chart.maAreaPath} fill="url(#priceAreaGradient)" stroke="none"/>}
      {[0,1,2,3,4].map(index => { const y = 22 + index * 64; const value = chart.max - index * ((chart.max-chart.min)/4); return <g key={index}><line x1="28" x2="732" y1={y} y2={y} stroke="#1e293b" strokeDasharray="4 4"/><text x="756" y={y+4} fill="#64748b" fontSize="11" textAnchor="end">${value.toFixed(0)}</text></g>; })}
      {priceHistory.map((item,index) => { const gain = item.close >= item.open; const color = gain ? '#10B981' : '#EF4444'; const x = chart.x(index); const bodyTop = chart.y(Math.max(item.open,item.close)); const bodyHeight = Math.max(3, Math.abs(chart.y(item.open)-chart.y(item.close))); return <g key={item.date}><line x1={x} x2={x} y1={chart.y(item.high)} y2={chart.y(item.low)} stroke={color}/><rect x={x-7} y={bodyTop} width="14" height={bodyHeight} rx="2" fill={color}/>{index%3===0 && <text x={x} y="292" textAnchor="middle" fill="#64748b" fontSize="10">{item.date}</text>}</g>; })}
      {indicators.includes('MA') && <path d={chart.maPath} fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
    </svg></div>
    <div className="h-28 border-t border-slate-800 pt-3"><ResponsiveContainer width="100%" height="100%"><BarChart data={priceHistory} margin={{top:4,right:5,left:-25,bottom:0}}><CartesianGrid stroke="#1e293b" vertical={false}/><XAxis dataKey="date" hide/><YAxis tick={{fill:'#64748b',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip cursor={{fill:'#1e293b',opacity:.45}} contentStyle={{background:'#0f172a',border:'1px solid #334155',borderRadius:10}}/><Bar dataKey="volume" name={t('stock.volume')} fill="#3B82F6" opacity={0.55} radius={[3,3,0,0]}/></BarChart></ResponsiveContainer></div>
  </section>;
}
