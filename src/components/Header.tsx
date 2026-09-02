import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setSignOutError(null);
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Unable to sign out.');
      setSigningOut(false);
    }
  };

  return (
    <header className="mb-6 flex min-h-12 items-center justify-end gap-4 border-b border-slate-800 pb-4">
      {signOutError && <p role="alert" className="text-sm text-red-400">{signOutError}</p>}
      <div className="flex items-center gap-3">
        <span className="hidden max-w-64 truncate text-sm text-slate-400 sm:block">{user?.email}</span>
        <button type="button" disabled={signingOut} onClick={() => void handleSignOut()} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60">
          <LogOut size={17} /> {signingOut ? 'Signing out…' : 'Logout'}
        </button>
      </div>
    </header>
  );
}
