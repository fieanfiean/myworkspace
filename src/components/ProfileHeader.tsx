import { useEffect, useMemo, useState } from 'react';
import { Link2, Mail, MapPin, Pencil } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { EditProfileModal, type Profile } from './EditProfileModal';

function fallbackProfile(userId: string, email: string, fullName?: string): Profile {
  return { id: userId, full_name: fullName || email.split('@')[0] || 'New User', headline: '', company: '', location: '', email, website: '', years_experience: 0, projects_count: 0, awards_count: 0 };
}

function initials(name: string) {
  const value = name.trim();
  if (!value) return '?';
  return value.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

export function ProfileHeader() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const email = user.email ?? '';
    const fallback = fallbackProfile(user.id, email, typeof user.user_metadata.full_name === 'string' ? user.user_metadata.full_name : undefined);

    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (!active) return;
      if (fetchError) {
        setProfile(fallback);
        setError(fetchError.message);
        setLoading(false);
        return;
      }
      if (data) {
        setProfile({ ...fallback, ...(data as Partial<Profile>), id: user.id });
        setLoading(false);
        return;
      }

      const { data: created, error: createError } = await supabase.from('profiles').upsert(fallback, { onConflict: 'id' }).select().single();
      if (!active) return;
      setProfile(created ? { ...fallback, ...(created as Partial<Profile>) } : fallback);
      if (createError) setError(createError.message);
      setLoading(false);
    };

    void loadProfile();
    return () => { active = false; };
  }, [user]);

  const stats = useMemo(() => profile ? [
    { label: String(profile.years_experience), value: 'Years experience' },
    { label: String(profile.projects_count), value: 'Projects' },
    { label: String(profile.awards_count), value: 'Awards' },
  ] : [], [profile]);

  if (loading || !profile) return <div className="profile-header-card min-h-52 animate-pulse" aria-label="Loading profile" />;

  return (
    <>
      <section className="profile-header-card">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-4xl font-bold text-white">{initials(profile.full_name)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="truncate text-4xl font-bold text-white">{profile.full_name}</h2>
                <button type="button" onClick={() => setEditing(true)} className="shrink-0 rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:border-blue-500 hover:bg-slate-800 hover:text-blue-400" aria-label="Edit profile"><Pencil size={17} /></button>
              </div>
              {(profile.headline || profile.company) && <p className="mt-1 text-lg text-slate-400">{profile.headline}{profile.headline && profile.company ? ' · ' : ''}{profile.company && <span className="text-slate-200">{profile.company}</span>}</p>}
            </div>
            <div className="flex flex-wrap gap-3">
              {stats.map(stat => <div key={stat.value} className="stat-box min-w-28"><div className="text-3xl font-extrabold text-blue-400">{stat.label}</div><div className="mt-1 text-xs uppercase tracking-wider text-slate-400">{stat.value}</div></div>)}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
            {profile.location && <span className="flex items-center gap-2"><MapPin size={16} />{profile.location}</span>}
            {profile.email && <a className="flex items-center gap-2 hover:text-blue-400" href={`mailto:${profile.email}`}><Mail size={16} />{profile.email}</a>}
            {profile.website && <a className="flex items-center gap-2 hover:text-blue-400" href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer"><Link2 size={16} />{profile.website}</a>}
          </div>
          {error && <p role="alert" className="mt-4 text-sm text-amber-400">Profile could not be synchronized: {error}</p>}
        </div>
      </section>
      {editing && <EditProfileModal profile={profile} onClose={() => setEditing(false)} onSaved={setProfile} />}
    </>
  );
}
