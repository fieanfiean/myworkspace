import { useState, type ChangeEvent, type FormEvent } from 'react';
import { FileText, Link, Upload, X } from 'lucide-react';
import { uploadCertificateFile } from '@/lib/storage';
import type { Achievement, AchievementCategory } from '@/types/profile';

type AchievementFormValue = Omit<Achievement, 'id'>;

type AchievementModalProps = {
  open: boolean;
  initialValue?: Achievement;
  onClose: () => void;
  onSubmit: (value: AchievementFormValue) => void | Promise<void>;
};

const control = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

export function AchievementModal({ open, initialValue, onClose, onSubmit }: AchievementModalProps) {
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [category, setCategory] = useState<AchievementCategory>(initialValue?.category ?? 'project');
  const [year, setYear] = useState(initialValue?.year ?? '');
  const [tag, setTag] = useState(initialValue?.tag ?? '');
  const [rank, setRank] = useState(initialValue?.rank ?? '');
  const [certificateUrl, setCertificateUrl] = useState(initialValue?.imageUrl ?? '');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [useExternalUrl, setUseExternalUrl] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setFileName(file.name);
    setFileType(file.type);
    try {
      setCertificateUrl(await uploadCertificateFile(file));
    } catch (reason) {
      setCertificateUrl('');
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !year.trim() || !rank.trim()) {
      setError('Title, year and rank are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        category,
        title: title.trim(),
        year: year.trim(),
        tag: tag.trim(),
        rank: rank.trim(),
        imageUrl: certificateUrl.trim(),
      });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSubmitting(false);
    }
  };

  const isPdf = fileType === 'application/pdf' || /\.pdf(?:$|[?#])/i.test(certificateUrl);
  const busy = uploading || submitting;

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={event => event.target === event.currentTarget && !busy && onClose()}>
    <div role="dialog" aria-modal="true" aria-labelledby="achievement-modal-title" className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <h2 id="achievement-modal-title" className="text-lg font-bold">{initialValue ? 'Edit achievement' : 'Add achievement'}</h2>
        <button type="button" disabled={busy} aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 disabled:opacity-50"><X size={20}/></button>
      </header>

      <form onSubmit={submit} className="grid max-h-[80vh] grid-cols-2 gap-4 overflow-y-auto p-6">
        <label className="col-span-2 text-sm text-slate-300"><span className="mb-1.5 block font-medium">Category *</span><select className={control} value={category} onChange={event => setCategory(event.target.value as AchievementCategory)}><option value="project">Project</option><option value="award">Award &amp; Honor</option><option value="certification">Certification / Workshop</option></select></label>
        <label className="text-sm text-slate-300"><span className="mb-1.5 block font-medium">Title *</span><input className={control} value={title} onChange={event => setTitle(event.target.value)}/></label>
        <label className="text-sm text-slate-300"><span className="mb-1.5 block font-medium">Year *</span><input className={control} value={year} onChange={event => setYear(event.target.value)}/></label>
        <label className="text-sm text-slate-300"><span className="mb-1.5 block font-medium">Tag</span><input className={control} value={tag} onChange={event => setTag(event.target.value)}/></label>
        <label className="text-sm text-slate-300"><span className="mb-1.5 block font-medium">Rank *</span><input className={control} value={rank} onChange={event => setRank(event.target.value)}/></label>

        <div className="col-span-2 space-y-3">
          <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-300">Certificate</span><button type="button" disabled={uploading} onClick={() => { setUseExternalUrl(value => !value); setError(null); }} className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400"><Link size={13}/>{useExternalUrl ? 'Upload file' : 'Use external URL'}</button></div>

          {useExternalUrl
            ? <input type="url" className={control} placeholder="https://example.com/certificate" value={certificateUrl} onChange={event => { setCertificateUrl(event.target.value); setFileName(''); setFileType(''); }}/>
            : <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 bg-slate-950/50 px-4 py-5 text-sm text-slate-400 transition-colors hover:border-blue-500 hover:text-blue-400 ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                <Upload size={18}/><span>{uploading ? 'Uploading...' : 'Choose image or PDF'}</span>
                <input type="file" accept="image/*,.pdf,application/pdf" disabled={uploading} onChange={selectFile} className="sr-only"/>
              </label>}

          {certificateUrl && <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-950/60 p-3">
            {isPdf
              ? <div className="flex items-center gap-3 text-sm text-slate-300"><FileText size={28} className="shrink-0 text-red-400"/><span className="truncate">{fileName || 'Certificate PDF'}</span></div>
              : <img src={certificateUrl} alt="Certificate preview" className="h-32 w-full rounded-md object-cover"/>}
          </div>}
        </div>

        {error && <p role="alert" className="col-span-2 text-sm text-red-400">{error}</p>}
        <footer className="col-span-2 mt-2 flex justify-end gap-3 border-t border-slate-800 pt-4"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50">Cancel</button><button disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{uploading ? 'Uploading...' : submitting ? 'Saving...' : initialValue ? 'Save' : 'Add'}</button></footer>
      </form>
    </div>
  </div>;
}
