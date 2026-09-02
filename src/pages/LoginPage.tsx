import { useState, type FormEvent } from 'react';
import { LockKeyhole, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function LoginPage() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    if (mode === 'signIn') {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError(authError.message);
    } else {
      const { data, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) {
        setError(authError.message);
      } else if (!data.session) {
        setSuccess('Registration successful! Please check your email for confirmation.');
      }
    }

    setSubmitting(false);
  };

  const switchMode = () => {
    setMode(current => current === 'signIn' ? 'signUp' : 'signIn');
    setError(null);
    setSuccess(null);
  };

  const signInWithGoogle = async () => {
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });

    if (authError) {
      setError(authError.message);
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-slate-100">
      <div aria-hidden="true" className="absolute inset-0">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <section className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-blue-950/30 backdrop-blur-xl sm:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/25">
            <LockKeyhole size={26} aria-hidden="true" />
          </div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">My Workspace</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {mode === 'signIn' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            {mode === 'signIn'
              ? 'Sign in to access your profile and dashboard.'
              : 'Register to create your personal workspace.'}
          </p>
        </div>

        <form onSubmit={submitEmailAuth} className="space-y-5">
          <label className="block text-sm font-medium text-slate-300">
            Email address
            <div className="relative mt-2">
              <Mail aria-hidden="true" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={event => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="you@example.com"
              />
            </div>
          </label>

          <label className="block text-sm font-medium text-slate-300">
            Password
            <div className="relative mt-2">
              <LockKeyhole aria-hidden="true" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={event => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter your password"
              />
            </div>
          </label>

          {error && (
            <p role="alert" className="rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {success && (
            <p role="status" className="rounded-xl border border-emerald-800 bg-emerald-950/50 p-3 text-sm text-emerald-300">
              {success}
            </p>
          )}

          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting
              ? mode === 'signIn' ? 'Signing in…' : 'Creating account…'
              : mode === 'signIn' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          {mode === 'signIn' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button type="button" onClick={switchMode} className="font-semibold text-blue-400 transition hover:text-blue-300">
            {mode === 'signIn' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-500">
          <span className="h-px flex-1 bg-slate-700" />
          <span>or continue with</span>
          <span className="h-px flex-1 bg-slate-700" />
        </div>

        <button type="button" disabled={submitting} onClick={() => void signInWithGoogle()} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">
          <span aria-hidden="true" className="text-lg font-bold text-blue-600">G</span>
          Sign in with Google
        </button>
      </section>
    </main>
  );
}
