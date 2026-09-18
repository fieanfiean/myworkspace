import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ExchangeRateAttribution() {
  const { t } = useTranslation();
  return <span className="group relative inline-flex">
    <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer" aria-label={t('budget.exchange.sourceLabel')} className="flex size-11 items-center justify-center rounded-lg text-slate-500 transition hover:bg-indigo-500/10 hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
      <Info size={16}/>
    </a>
    <span role="tooltip" className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 shadow-xl group-hover:block group-focus-within:block">
      {t('budget.exchange.attribution')} ExchangeRate-API
    </span>
  </span>;
}
