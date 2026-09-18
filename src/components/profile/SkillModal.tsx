import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import type { Skill, SkillCategory, SkillLevel } from '@/types/profile';

export type SkillSubmitValue =
  | { mode: 'existing'; categoryId: string; skill: Omit<Skill, 'id'> }
  | { mode: 'new'; categoryName: string; skill: Omit<Skill, 'id'> };

type SkillModalProps = {
  open: boolean;
  categories: SkillCategory[];
  initialValue?: Skill & { categoryId: string };
  onClose: () => void;
  onSubmit: (value: SkillSubmitValue) => void | Promise<void>;
};

const control = 'min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
const skillLevels: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export function SkillModal({ open, categories, initialValue, onClose, onSubmit }: SkillModalProps) {
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryId, setCategoryId] = useState(initialValue?.categoryId ?? categories[0]?.id ?? '');
  const [categoryName, setCategoryName] = useState('');
  const [name, setName] = useState(initialValue?.name ?? '');
  const [level, setLevel] = useState<SkillLevel>(initialValue?.level ?? 'Intermediate');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError('Skill name is required.');
    if (creatingCategory && !categoryName.trim()) return setError('Category name is required.');
    if (!creatingCategory && !categoryId) return setError('Please select a category.');

    setSubmitting(true);
    setError(null);
    try {
      const skill = { name: name.trim(), level };
      await onSubmit(creatingCategory
        ? { mode: 'new', categoryName: categoryName.trim(), skill }
        : { mode: 'existing', categoryId, skill });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <div role="dialog" aria-modal="true" aria-labelledby="skill-modal-title" className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <h2 id="skill-modal-title" className="text-lg font-bold">{initialValue ? 'Edit skill' : 'Add skill'}</h2>
        <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"><X size={20}/></button>
      </header>
      <form onSubmit={submit} className="space-y-4 p-4 sm:p-6">
        <label className="block text-sm text-slate-300">
          <span className="mb-1.5 block font-medium">Category <span className="text-red-400">*</span></span>
          <div className="flex flex-col gap-2 sm:flex-row">
            {creatingCategory
              ? <input autoFocus className={control} value={categoryName} onChange={event => setCategoryName(event.target.value)} placeholder="New category name"/>
              : <select disabled={Boolean(initialValue)} className={`${control} disabled:cursor-not-allowed disabled:opacity-60`} value={categoryId} onChange={event => setCategoryId(event.target.value)}>
                  <option value="" disabled>Select a category</option>
                  {categories.map(category => <option key={category.id} value={category.id}>{category.title}</option>)}
                </select>}
            {!initialValue && <button type="button" onClick={() => { setCreatingCategory(value => !value); setError(null); }} className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 px-3 text-sm text-slate-300 hover:border-blue-500 hover:text-blue-400"><Plus size={15}/>{creatingCategory ? 'Use existing' : '新建分类'}</button>}
          </div>
        </label>
        <label className="block text-sm text-slate-300"><span className="mb-1.5 block font-medium">Name <span className="text-red-400">*</span></span><input className={control} value={name} onChange={event => setName(event.target.value)}/></label>
        <label className="block text-sm text-slate-300"><span className="mb-1.5 block font-medium">Level <span className="text-red-400">*</span></span><select className={control} value={level} onChange={event => setLevel(event.target.value as SkillLevel)}>{skillLevels.map(skillLevel => <option key={skillLevel} value={skillLevel}>{skillLevel}</option>)}</select></label>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <footer className="flex justify-end gap-3 border-t border-slate-800 pt-4"><button type="button" disabled={submitting} onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50">Cancel</button><button disabled={submitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">{submitting ? 'Saving…' : initialValue ? 'Save' : 'Add'}</button></footer>
      </form>
    </div>
  </div>;
}
