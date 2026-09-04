import { useEffect, useRef, useState } from 'react';
import { ChevronUp, LoaderCircle, LogOut, PanelLeftClose, PanelLeftOpen, User, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { Profile } from './EditProfileModal';

type Tab = 'profile' | 'budget';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavItemProps {
  active: boolean;
  collapsed: boolean;
  icon: typeof User;
  label: string;
  onClick: () => void;
}

function NavItem({ active, collapsed, icon: Icon, label, onClick }: NavItemProps) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={`flex w-full items-center rounded-xl py-3 transition-colors ${collapsed ? 'justify-center px-2' : 'gap-3 px-4 text-left'} ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
      >
        <Icon className="shrink-0" size={20} />
        <span className={`truncate whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'pointer-events-none w-0 opacity-0' : 'opacity-100'}`}>{label}</span>
      </button>
      {collapsed && <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-100 opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">{label}</span>}
    </div>
  );
}

export function Sidebar({ activeTab, setActiveTab, isCollapsed, onToggle }: SidebarProps) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Pick<Profile, 'full_name' | 'avatar_url'> | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const displayName = profile?.full_name || user?.email?.split('@')[0] || t('account.user');
  const accountInitials = displayName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';

  useEffect(() => {
    if (!user) return;
    void supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (data) setProfile(data as Pick<Profile, 'full_name' | 'avatar_url'>);
    });
    const updateProfile = (event: Event) => setProfile((event as CustomEvent<Profile>).detail);
    window.addEventListener('profile-updated', updateProfile);
    return () => window.removeEventListener('profile-updated', updateProfile);
  }, [user]);

  useEffect(() => {
    if (!accountOpen) return;
    const closeOutside = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, [accountOpen]);

  const handleSignOut = async () => {
    setSigningOut(true); setSignOutError(null);
    try { await signOut(); }
    catch (reason) { setSignOutError(reason instanceof Error ? reason.message : t('account.signOutError')); setSigningOut(false); }
  };

  return (
    <aside className={`fixed left-0 top-0 z-40 flex h-screen flex-col justify-between border-r border-slate-800 bg-slate-900 text-white transition-[width] duration-300 ease-in-out ${isCollapsed ? 'w-16 px-2 py-6' : 'w-64 p-6'}`}>
      <div className="min-w-0">
        <div className={`mb-8 flex items-center ${isCollapsed ? 'flex-col gap-3' : 'justify-between gap-3'}`}>
          <h1 className="min-w-0 truncate font-bold text-blue-400" aria-label={t('sidebar.workspace')}>
            {isCollapsed ? <span className="text-sm">MW</span> : <span className="text-xl">{t('sidebar.workspace')}</span>}
          </h1>
          <button type="button" onClick={onToggle} className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white" aria-label={t(isCollapsed ? 'sidebar.expand' : 'sidebar.collapse')} title={t(isCollapsed ? 'sidebar.expand' : 'sidebar.collapse')}>
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>

        <nav className="flex flex-col gap-2" aria-label={t('sidebar.navigation')}>
          <NavItem active={activeTab === 'profile'} collapsed={isCollapsed} icon={User} label={t('sidebar.profile')} onClick={() => setActiveTab('profile')} />
          <NavItem active={activeTab === 'budget'} collapsed={isCollapsed} icon={Wallet} label={t('sidebar.budget')} onClick={() => setActiveTab('budget')} />
        </nav>
      </div>

      <div ref={accountRef} className="relative">
        {accountOpen && <div className={`absolute bottom-full mb-3 rounded-xl border border-slate-700 bg-slate-800 p-2 shadow-2xl ${isCollapsed ? 'left-0 w-64' : 'inset-x-0'}`}>
          <div className="border-b border-slate-700 px-3 py-2"><p className="truncate text-sm font-medium text-white">{displayName}</p><p className="truncate text-xs text-slate-400">{user?.email}</p></div>
          {signOutError && <p role="alert" className="px-3 py-2 text-xs text-red-400">{signOutError}</p>}
          <button type="button" disabled={signingOut} onClick={() => void handleSignOut()} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-60">{signingOut ? <LoaderCircle className="animate-spin" size={17} /> : <LogOut size={17} />}<span>{signingOut ? t('account.signingOut') : t('account.logout')}</span></button>
        </div>}
        <button type="button" onClick={() => setAccountOpen(open => !open)} aria-expanded={accountOpen} aria-label={t('account.manage')} className={`flex w-full items-center rounded-xl border border-slate-700 bg-slate-800 py-2 text-slate-300 transition hover:bg-slate-700 ${isCollapsed ? 'justify-center px-1' : 'gap-3 px-2'}`}>
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="size-9 shrink-0 rounded-lg object-cover" /> : <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">{accountInitials}</span>}
          {!isCollapsed && <><span className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-medium text-white">{displayName}</span><span className="block truncate text-xs text-slate-400">{user?.email}</span></span><ChevronUp size={16} className={`shrink-0 transition-transform ${accountOpen ? 'rotate-180' : ''}`} /></>}
        </button>
      </div>
    </aside>
  );
}
