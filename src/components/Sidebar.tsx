import { useEffect, useRef, useState } from 'react';
import { ChevronUp, Clapperboard, LoaderCircle, LogOut, PanelLeftClose, PanelLeftOpen, User, Wallet, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { Profile } from './EditProfileModal';

export type Tab = 'profile' | 'budget' | 'anime';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
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
        className={`flex w-full items-center rounded-xl py-3 transition-colors ${collapsed ? 'gap-3 px-4 text-left md:justify-center md:px-2' : 'gap-3 px-4 text-left'} ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
      >
        <Icon className="shrink-0" size={20} />
        <span className={`truncate whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'md:pointer-events-none md:w-0 md:opacity-0' : 'opacity-100'}`}>{label}</span>
      </button>
      {collapsed && <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-100 opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 md:block">{label}</span>}
    </div>
  );
}

export function Sidebar({ activeTab, setActiveTab, isCollapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
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

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    onMobileClose();
  };

  return (<>
    <button type="button" aria-label={t('sidebar.closeMenu')} onClick={onMobileClose} className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity md:hidden ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
    <aside data-swipe-drawer="left" className={`fixed left-0 top-0 z-50 flex h-dvh w-72 touch-pan-y flex-col justify-between overscroll-x-contain border-r border-slate-800 bg-slate-900 p-6 text-white transition-[transform,width] duration-300 ease-in-out md:z-40 md:h-screen md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'md:w-16 md:px-2 md:py-6' : 'md:w-64 md:p-6'}`}>
      <div className="min-w-0">
        <div className={`mb-8 flex items-center justify-between gap-3 ${isCollapsed ? 'md:flex-col' : ''}`}>
          <h1 className="min-w-0 truncate font-bold text-blue-400" aria-label={t('sidebar.workspace')}>
            {isCollapsed ? <><span className="text-xl md:hidden">{t('sidebar.workspace')}</span><span className="hidden text-sm md:inline">MW</span></> : <span className="text-xl">{t('sidebar.workspace')}</span>}
          </h1>
          <button type="button" onClick={onMobileClose} className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white md:hidden" aria-label={t('sidebar.closeMenu')}><X size={20}/></button>
          <button type="button" onClick={onToggle} className="hidden shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white md:block" aria-label={t(isCollapsed ? 'sidebar.expand' : 'sidebar.collapse')} title={t(isCollapsed ? 'sidebar.expand' : 'sidebar.collapse')}>
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>

        <nav className="flex flex-col gap-2" aria-label={t('sidebar.navigation')}>
          <NavItem active={activeTab === 'profile'} collapsed={isCollapsed} icon={User} label={t('sidebar.profile')} onClick={() => selectTab('profile')} />
          <NavItem active={activeTab === 'budget'} collapsed={isCollapsed} icon={Wallet} label={t('sidebar.budget')} onClick={() => selectTab('budget')} />
          <NavItem active={activeTab === 'anime'} collapsed={isCollapsed} icon={Clapperboard} label={t('sidebar.anime')} onClick={() => selectTab('anime')} />
        </nav>
      </div>

      <div ref={accountRef} className="relative">
        {accountOpen && <div className={`absolute bottom-full mb-3 rounded-xl border border-slate-700 bg-slate-800 p-2 shadow-2xl ${isCollapsed ? 'left-0 w-64' : 'inset-x-0'}`}>
          <div className="border-b border-slate-700 px-3 py-2"><p className="truncate text-sm font-medium text-white">{displayName}</p><p className="truncate text-xs text-slate-400">{user?.email}</p></div>
          {signOutError && <p role="alert" className="px-3 py-2 text-xs text-red-400">{signOutError}</p>}
          <button type="button" disabled={signingOut} onClick={() => void handleSignOut()} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-60">{signingOut ? <LoaderCircle className="animate-spin" size={17} /> : <LogOut size={17} />}<span>{signingOut ? t('account.signingOut') : t('account.logout')}</span></button>
        </div>}
        <button type="button" onClick={() => setAccountOpen(open => !open)} aria-expanded={accountOpen} aria-label={t('account.manage')} className={`flex w-full items-center rounded-xl border border-slate-700 bg-slate-800 py-2 text-slate-300 transition hover:bg-slate-700 ${isCollapsed ? 'gap-3 px-2 md:justify-center md:px-1' : 'gap-3 px-2'}`}>
          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="size-9 shrink-0 rounded-lg object-cover" /> : <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">{accountInitials}</span>}
          <span className={`min-w-0 flex-1 text-left ${isCollapsed ? 'md:hidden' : ''}`}><span className="block truncate text-sm font-medium text-white">{displayName}</span><span className="block truncate text-xs text-slate-400">{user?.email}</span></span><ChevronUp size={16} className={`shrink-0 transition-transform ${isCollapsed ? 'md:hidden' : ''} ${accountOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </aside>
  </>);
}
