import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AIInsights } from '@/components/Stock/AIInsights';
import { CandlestickChart } from '@/components/Stock/CandlestickChart';
import { QuarterlyChart } from '@/components/Stock/QuarterlyChart';
import { StockTopBar } from '@/components/Stock/StockTopBar';
import { TickerBanner } from '@/components/Stock/TickerBanner';
import { Watchlist } from '@/components/Stock/Watchlist';
import { mockStocks } from '@/data/mockData';

export function StockAnalysisPage() {
  const { t } = useTranslation();
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const selectedStock = mockStocks[selectedTicker] ?? mockStocks.AAPL;
  return <div className="dashboard-light-page mx-auto max-w-[1600px] space-y-5 text-slate-900 dark:text-slate-100">
    <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">{t('stock.portfolio')}</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-white">{t('stock.title')}</h1></div><p className="hidden text-xs text-slate-500 sm:block">{t('stock.lastUpdated')}</p></div>
    <StockTopBar key={selectedTicker} selectedTicker={selectedTicker} onSelectTicker={setSelectedTicker}/>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <main className="min-w-0 space-y-5"><TickerBanner stockSummary={selectedStock.summary}/><CandlestickChart key={selectedTicker} ticker={selectedTicker} priceHistory={selectedStock.history}/><div className="grid gap-5 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]"><AIInsights/><QuarterlyChart/></div></main>
      <Watchlist selectedTicker={selectedTicker} onSelectTicker={setSelectedTicker}/>
    </div>
  </div>;
}
