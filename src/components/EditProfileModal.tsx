import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  full_name: string;
  headline: string;
  company: string;
  location: string;
  email: string;
  website: string;
  avatar_url: string;
}

interface EditProfileModalProps { profile: Profile; onClose: () => void; onSaved: (profile: Profile) => void }
const textFields: { key: keyof Pick<Profile, 'full_name' | 'headline' | 'company' | 'location' | 'email' | 'website'>; label: string; type?: string }[] = [
  { key: 'full_name', label: 'Full name' }, { key: 'headline', label: 'Headline' }, { key: 'company', label: 'Company' }, { key: 'location', label: 'Location' }, { key: 'email', label: 'Email', type: 'email' }, { key: 'website', label: 'Website', type: 'url' },
];

export function EditProfileModal({ profile, onClose, onSaved }: EditProfileModalProps) {
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, saving]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError(null);
    const payload: Profile = {
      id: form.id,
      full_name: form.full_name,
      headline: form.headline,
      company: form.company,
      location: form.location,
      email: form.email,
      website: form.website,
      avatar_url: form.avatar_url,
    };
    const { data, error: saveError } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select().single();
    setSaving(false);
    if (saveError) { setError(saveError.message); return; }
    const savedProfile = { ...payload, ...(data as Partial<Profile>) };
    onSaved(savedProfile);
    window.dispatchEvent(new CustomEvent<Profile>('profile-updated', { detail: savedProfile }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" className="my-auto w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-6">
        <div className="mb-6 flex items-center justify-between"><div><h2 id="edit-profile-title" className="text-2xl font-semibold text-white">Edit profile</h2><p className="mt-1 text-sm text-slate-400">Update the information shown on your profile card.</p></div><button type="button" onClick={onClose} disabled={saving} aria-label="Close edit profile" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"><X size={20} /></button></div>
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {textFields.map(field => <label key={field.key} className="block text-sm font-medium text-slate-300">{field.label}<input type={field.type ?? 'text'} required={field.key === 'full_name' || field.key === 'email'} value={form[field.key]} onChange={event => setForm(current => ({ ...current, [field.key]: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" /></label>)}
          </div>
          {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-700 px-5 py-2.5 font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button></div>
        </form>
      </section>
    </div>
  );
}
