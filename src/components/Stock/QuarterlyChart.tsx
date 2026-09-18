import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { quarterlyData } from '@/data/stockMockData';

export function QuarterlyChart() {
  const { t } = useTranslation();
  return <section className="rounded-2xl border border-slate-800 bg-[#111827] p-5 shadow-xl shadow-black/10"><div><h2 className="font-bold text-white">{t('stock.quarterlyPerformance')}</h2><p className="mt-1 text-xs text-slate-500">{t('stock.usdBillions')}</p></div><div className="mt-5 h-[310px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={quarterlyData} margin={{top:5,right:5,left:-15,bottom:0}} barGap={5}><CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="4 4"/><XAxis dataKey="quarter" axisLine={false} tickLine={false} tick={{fill:'#64748b',fontSize:11}}/><YAxis axisLine={false} tickLine={false} tick={{fill:'#64748b',fontSize:11}} tickFormatter={value => `$${value}B`}/><Tooltip cursor={{fill:'#1e293b',opacity:.4}} contentStyle={{background:'#0f172a',border:'1px solid #334155',borderRadius:12}} formatter={value => `$${Number(value).toFixed(1)}B`}/><Legend wrapperStyle={{fontSize:12,paddingTop:12}}/><Bar dataKey="revenue" name={t('stock.revenue')} fill="#3B82F6" radius={[4,4,0,0]}/><Bar dataKey="income" name={t('stock.netIncome')} fill="#10B981" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></section>;
}
