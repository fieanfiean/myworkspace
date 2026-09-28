import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Camera, Link2, LoaderCircle, Mail, MapPin, Pencil } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { EditProfileModal, type Profile } from './EditProfileModal';
import type { Achievement, Experience } from '@/types/profile';
import { calculateProfileStats } from '@/lib/profileStats';
import { useT } from '@/hooks/useT';
import { MAX_UPLOAD_SIZE_BYTES, uploadProfileAvatar } from '@/services/storageService';
import { getProfile, saveProfile } from '@/services/profileService';

function fallbackProfile(userId: string, email: string, fullName?: string, nickname?: string): Profile {
  const fallbackNickname = nickname || email;
  return { id: userId, full_name: fullName || fallbackNickname, nickname: fallbackNickname, headline: '', company: '', location: '', email, website: '', avatar_url: '' };
}

function initials(name: string) {
  const value = name.trim();
  if (!value) return '?';
  return value.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

export function ProfileHeader({ experiences, achievements }: { experiences: Experience[]; achievements: Achievement[] }) {
  const { user } = useAuth();
  const { t } = useT();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const email = user.email ?? '';
    const metadata = user.user_metadata;
    const metadataNickname = [metadata.nickname, metadata.display_name, metadata.name].find(value => typeof value === 'string' && value.trim());
    const fallback = fallbackProfile(
      user.id,
      email,
      typeof metadata.full_name === 'string' ? metadata.full_name : undefined,
      typeof metadataNickname === 'string' ? metadataNickname : undefined,
    );

    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getProfile(user.id);
        if (!active) return;
        if (data) {
          setProfile({
            ...fallback,
            ...data,
            id: user.id,
            full_name: data.full_name || data.nickname || fallback.full_name,
            nickname: data.nickname || data.email || fallback.nickname,
          });
          setLoading(false);
          return;
        }
        const created = await saveProfile(fallback);
        if (!active) return;
        setProfile({ ...fallback, ...created });
      } catch (reason) {
        if (!active) return;
        setProfile(fallback);
        setError(reason instanceof Error ? reason.message : String(reason));
      }
      setLoading(false);
    };

    void loadProfile();
    return () => { active = false; };
  }, [user]);

  const changeAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user || !profile) return;
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setError(t('upload.fileTooLarge'));
      return;
    }
    setUploadingAvatar(true);
    setError(null);
    try {
      const avatarUrl = await uploadProfileAvatar(file, user.id);
      const updatedProfile = { ...profile, avatar_url: avatarUrl };
      setProfile(updatedProfile);
      window.dispatchEvent(new CustomEvent<Profile>('profile-updated', { detail: updatedProfile }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('profile.avatar.uploadError'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const stats = useMemo(() => {
    const computed = calculateProfileStats(experiences, achievements);
    return [
      { label: String(computed.experienceYears), value: t('profile.stats.experience') },
      { label: String(computed.projects), value: t('profile.stats.projects') },
      { label: String(computed.awards), value: t('profile.stats.awards') },
      { label: String(computed.certificatesCount), value: t('profile.stats.certificates') },
    ];
  }, [achievements, experiences, t]);

  if (loading || !profile) return <div className="profile-header-card min-h-52 animate-pulse" aria-label="Loading profile" />;
  const headerName = profile.full_name || profile.nickname || profile.email;

  return (
    <>
      <section className="profile-header-card">
        <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-6">
          <div className="group relative size-24 shrink-0 justify-self-center rounded-[1.15rem] bg-gradient-to-tr from-indigo-100 to-purple-100 p-1 dark:from-indigo-500/20 dark:to-purple-500/20 sm:size-32 sm:justify-self-auto">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={t('profile.avatar.alt', { name: headerName })} className="size-full rounded-2xl object-cover" />
              : <div className="flex size-full items-center justify-center rounded-2xl bg-blue-600 text-4xl font-bold text-white sm:text-5xl">{initials(headerName)}</div>}
            <input ref={avatarInputRef} type="file" accept="image/*" className="sr-only" onChange={event => void changeAvatar(event)} />
            <button type="button" disabled={uploadingAvatar} onClick={() => avatarInputRef.current?.click()} aria-label={t('profile.avatar.change')} className="absolute inset-1 flex items-center justify-center rounded-2xl bg-slate-950/65 text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 disabled:cursor-wait">
              {uploadingAvatar ? <LoaderCircle className="animate-spin" size={22} /> : <Camera size={22} />}
            </button>
          </div>
          <div className="flex min-h-28 min-w-0 flex-col justify-between gap-2 sm:min-h-32">
            <div className="flex min-w-0 items-center gap-3">
              <h2 className="min-w-0 truncate text-2xl font-bold text-white sm:text-4xl" title={headerName}>{headerName}</h2>
              <button type="button" onClick={() => setEditing(true)} className="shrink-0 rounded-lg border border-slate-700 p-2 text-slate-400 transition hover:border-blue-500 hover:bg-slate-800 hover:text-blue-400" aria-label="Edit profile"><Pencil size={17} /></button>
            </div>
            {(profile.headline || profile.company) && <p className="truncate text-sm text-slate-400 sm:text-lg">{profile.headline}{profile.headline && profile.company ? ' · ' : ''}{profile.company && <span className="text-slate-200">{profile.company}</span>}</p>}
            <div className="flex min-w-0 flex-col items-start gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:gap-x-3 sm:overflow-hidden sm:text-sm">
              {profile.location && <span className="flex shrink-0 items-center gap-1.5"><MapPin className="shrink-0" size={16} /><span className="max-w-36 truncate sm:max-w-52">{profile.location}</span></span>}
              {profile.location && profile.email && <span aria-hidden="true" className="shrink-0 text-slate-600">·</span>}
              {profile.email && <a className="flex min-w-0 items-center gap-1.5 hover:text-blue-400" href={`mailto:${profile.email}`} title={profile.email}><Mail className="shrink-0" size={16} /><span className="truncate">{profile.email}</span></a>}
              {profile.website && (profile.location || profile.email) && <span aria-hidden="true" className="hidden shrink-0 text-slate-600 lg:inline">·</span>}
              {profile.website && <a className="hidden min-w-0 items-center gap-1.5 hover:text-blue-400 lg:flex" href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer" title={profile.website}><Link2 className="shrink-0" size={16} /><span className="truncate">{profile.website}</span></a>}
            </div>
          </div>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-amber-400">Profile could not be synchronized: {error}</p>}
        <div className="mt-6 grid grid-cols-1 gap-3 min-[375px]:grid-cols-2 md:grid-cols-4 md:gap-4">
          {stats.map(stat => <div key={stat.value} className="stat-box min-w-0 px-2 py-4 sm:px-6"><div className="text-2xl font-extrabold text-blue-400 sm:text-3xl">{stat.label}</div><div className="mt-1 truncate text-[0.625rem] uppercase tracking-wider text-slate-400 sm:text-xs" title={stat.value}>{stat.value}</div></div>)}
        </div>
      </section>
      {editing && <EditProfileModal profile={profile} onClose={() => setEditing(false)} onSaved={setProfile} />}
    </>
  );
}
