import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/hooks/useT';
import type { Achievement, EducationItem, Experience, Skill, SkillCategory, SkillLevel } from '@/types/profile';

type WithoutId<T> = Omit<T, 'id'>;
type SubmitResult = void | Promise<void>;
type Props =
  | { kind: 'experience'; open: boolean; initialValue?: Experience; onClose: () => void; onSubmit: (value: WithoutId<Experience>) => SubmitResult }
  | { kind: 'education'; open: boolean; initialValue?: EducationItem; onClose: () => void; onSubmit: (value: WithoutId<EducationItem>) => SubmitResult }
  | { kind: 'skill'; open: boolean; categories: SkillCategory[]; initialValue?: Skill & { categoryId: string }; onClose: () => void; onSubmit: (categoryId: string, value: WithoutId<Skill>) => SubmitResult }
  | { kind: 'achievement'; open: boolean; initialValue?: Achievement; onClose: () => void; onSubmit: (value: WithoutId<Achievement>) => SubmitResult };
const control = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) { return <label className="block text-sm text-slate-300"><span className="mb-1.5 block font-medium">{label}{required && <span className="text-red-400"> *</span>}</span>{children}{error && <span className="mt-1 block text-xs text-red-400">{error}</span>}</label> }

export function AddItemModal(props: Props) {
  const { t } = useT();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { open, kind, onClose } = props;
  const initialCategoryId = props.kind === 'skill' ? (props.categories[0]?.id ?? '') : '';
  useEffect(() => {
    if (!open) return;
    const item = props.initialValue;
    let nextValues: Record<string, string> = kind === 'skill' ? { categoryId: initialCategoryId, level: 'Intermediate' } : {};
    if (item) nextValues = Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'id').map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : String(value)]));
    setValues(nextValues); setErrors({}); setSubmitError(null); setSubmitting(false);
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, [open, kind, initialCategoryId, onClose, props.initialValue]);
  if (!props.open) return null;
  const set = (key: string, value: string) => setValues(old => ({ ...old, [key]: value }));
  const required: Record<Props['kind'], string[]> = { experience: ['title', 'organization', 'dateRange'], education: ['degree', 'school', 'dateRange'], skill: ['categoryId', 'name', 'level'], achievement: ['title', 'year', 'rank'] };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); const next = Object.fromEntries(required[props.kind].filter(k => !values[k]?.trim()).map(k => [k, t('form.required')]));
    setErrors(next); if (Object.keys(next).length) return;
    const list = (key: string) => (values[key] ?? '').split(',').map(v => v.trim()).filter(Boolean);
    setSubmitting(true); setSubmitError(null);
    try {
      if (props.kind === 'experience') await props.onSubmit({ type: 'work', title: values.title, organization: values.organization, location: values.location ?? '', dateRange: values.dateRange, details: values.details ?? '', tags: list('tags'), isCurrent: values.isCurrent === 'true' });
      else if (props.kind === 'education') await props.onSubmit({ degree: values.degree, school: values.school, location: values.location ?? '', dateRange: values.dateRange, gpa: values.gpa ?? '', description: values.description ?? '', badges: list('badges') });
      else if (props.kind === 'skill') await props.onSubmit(values.categoryId, { name: values.name, level: values.level as SkillLevel });
      else await props.onSubmit({ title: values.title, year: values.year, tag: values.tag ?? '', rank: values.rank, imageUrl: values.imageUrl ?? '' });
      props.onClose();
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : String(reason));
    } finally { setSubmitting(false); }
  };
  const input = (name: string, needed = false, type = 'text') => <Field label={t(`form.${name}`)} required={needed} error={errors[name]}><input className={control} type={type} value={values[name] ?? ''} onChange={e => set(name, e.target.value)} /></Field>;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && props.onClose()}><div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
    <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4"><h2 id="modal-title" className="text-lg font-bold">{props.initialValue ? 'Edit item' : t(`form.titles.${props.kind}`)}</h2><button type="button" aria-label={t('common.close')} onClick={props.onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"><X size={20} /></button></header>
    <form onSubmit={submit} className="grid max-h-[75vh] grid-cols-2 gap-4 overflow-y-auto p-6">
      {props.kind === 'experience' && <>{input('title', true)}{input('organization', true)}{input('location')}{input('dateRange', true)}<div className="col-span-2">{input('tags')}</div><div className="col-span-2"><Field label={t('form.details')}><textarea className={`${control} min-h-24`} value={values.details ?? ''} onChange={e => set('details', e.target.value)} /></Field></div><label className="col-span-2 flex gap-2 text-sm"><input type="checkbox" checked={values.isCurrent === 'true'} onChange={e => set('isCurrent', String(e.target.checked))} />{t('form.isCurrent')}</label></>}
      {props.kind === 'education' && <>{input('degree', true)}{input('school', true)}{input('location')}{input('dateRange', true)}{input('gpa')}<div className="col-span-2">{input('badges')}</div><div className="col-span-2"><Field label={t('form.description')}><textarea className={`${control} min-h-24`} value={values.description ?? ''} onChange={e => set('description', e.target.value)} /></Field></div></>}
      {props.kind === 'skill' && <><Field label={t('form.category')} required error={errors.categoryId}><select disabled={Boolean(props.initialValue)} className={`${control} disabled:cursor-not-allowed disabled:opacity-60`} value={values.categoryId ?? ''} onChange={e => set('categoryId', e.target.value)}>{props.categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>{input('name', true)}<Field label={t('form.level')} required error={errors.level}><select className={control} value={values.level ?? 'Intermediate'} onChange={e => set('level', e.target.value)}>{['Beginner', 'Intermediate', 'Advanced', 'Expert'].map(level => <option key={level}>{level}</option>)}</select></Field></>}
      {props.kind === 'achievement' && <>{input('title', true)}{input('year', true)}{input('tag')}{input('rank', true)}<div className="col-span-2">{input('imageUrl')}</div></>}
      {submitError && <p role="alert" className="col-span-2 text-sm text-red-400">{submitError}</p>}
      <footer className="col-span-2 mt-2 flex justify-end gap-3 border-t border-slate-800 pt-4"><button type="button" disabled={submitting} onClick={props.onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50">{t('common.cancel')}</button><button disabled={submitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{submitting ? 'Saving…' : props.initialValue ? 'Save' : t('common.add')}</button></footer>
    </form></div></div>;
}
