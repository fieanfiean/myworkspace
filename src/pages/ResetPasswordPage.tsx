import { useEffect, useState, type FormEvent } from 'react';
import { LockKeyhole } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function ResetPasswordPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const prepareSession = async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      const result = accessToken && refreshToken
        ? await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        : await supabase.auth.getSession();
      if (!active) return;
      if (result.error) {
        setError(result.error.message);
        return;
      }
      if (!result.data.session) {
        setError('This password reset link is invalid or has expired.');
        return;
      }
      window.history.replaceState({}, document.title, '/reset-password');
      setSessionReady(true);
    };
    void prepareSession();
    return () => { active = false; };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    window.location.assign('/login');
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-slate-100">
      <div aria-hidden="true" className="absolute inset-0"><div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" /><div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" /></div>
      <section className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-blue-950/30 backdrop-blur-xl sm:p-10">
        <div className="mb-8 text-center"><div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/25"><LockKeyhole size={26} aria-hidden="true" /></div><h1 className="text-3xl font-bold tracking-tight text-white">Reset password</h1><p className="mt-3 text-sm text-slate-400">Choose a new password for your account.</p></div>
        {!sessionReady && !error ? <p role="status" className="text-center text-sm text-slate-400">Verifying reset link…</p> : (
          <form onSubmit={submit} className="space-y-5">
            <label className="block text-sm font-medium text-slate-300">New password<input type="password" autoComplete="new-password" required minLength={6} disabled={!sessionReady} value={newPassword} onChange={event => setNewPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60" /></label>
            <label className="block text-sm font-medium text-slate-300">Confirm password<input type="password" autoComplete="new-password" required minLength={6} disabled={!sessionReady} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60" /></label>
            {error && <p role="alert" className="rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={!sessionReady || submitting} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Updating…' : 'Update password'}</button>
          </form>
        )}
      </section>
    </main>
  );
}
