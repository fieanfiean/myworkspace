import { useEffect } from 'react';
import { Download, FileText, Pencil, X } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { fileNameFromUrl, isPdfUrl } from '@/lib/achievementFiles';
import type { Achievement } from '@/types/profile';

interface AchievementDetailModalProps {
  item: Achievement;
  onClose: () => void;
  onEdit: () => void;
}

export function AchievementDetailModal({ item, onClose, onEdit }: AchievementDetailModalProps) {
  const { t } = useT();
  const pdf = isPdfUrl(item.imageUrl);
  const fileName = fileNameFromUrl(item.imageUrl, item.title);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <article role="dialog" aria-modal="true" aria-labelledby="achievement-detail-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-slate-800 p-6">
        <div className="min-w-0"><div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">{item.tag || t('achievements.noTag')}</span><span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{t(`achievements.categories.${item.category}`)}</span>{item.rank && <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">{item.rank}</span>}</div><h2 id="achievement-detail-title" className="text-2xl font-bold text-white sm:text-3xl">{item.title}</h2><p className="mt-2 text-sm text-slate-400">{item.year}</p></div>
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"><X size={20}/></button>
      </header>

      <div className="space-y-6 p-6">
        {item.imageUrl && (pdf
          ? <a href={item.imageUrl} download={fileName} target="_blank" rel="noreferrer" className="flex min-h-48 items-center justify-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-red-300 transition hover:bg-red-500/10"><FileText size={48}/><span className="min-w-0"><span className="block truncate text-base font-semibold" title={fileName}>{fileName}</span><span className="mt-1 flex items-center gap-2 text-sm"><Download size={16}/>{t('achievements.downloadPdf')}</span></span></a>
          : <img src={item.imageUrl} alt={item.title} className="max-h-[28rem] w-full rounded-2xl bg-slate-950 object-contain"/>)}

        <section><h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">{t('form.description')}</h3><p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">{item.description || t('achievements.noDescription')}</p></section>
      </div>

      <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-800 p-4 sm:p-6">
        {item.imageUrl && <a href={item.imageUrl} download={fileName} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"><Download size={16}/>{t(pdf ? 'achievements.downloadPdf' : 'achievements.downloadImage')}</a>}
        <button type="button" onClick={() => { onClose(); onEdit(); }} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"><Pencil size={16}/>{t('common.edit')}</button>
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800">{t('common.close')}</button>
      </footer>
    </article>
  </div>;
}
