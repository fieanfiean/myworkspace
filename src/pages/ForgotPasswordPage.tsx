import { useState, type FormEvent } from 'react';
import { ArrowLeft, LockKeyhole, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-slate-100">
      <div aria-hidden="true" className="absolute inset-0">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />
      </div>
      <section className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-blue-950/30 backdrop-blur-xl sm:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/25"><LockKeyhole size={26} aria-hidden="true" /></div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Forgot password?</h1>
          <p className="mt-3 text-sm text-slate-400">Enter your email and we’ll send you a password reset link.</p>
        </div>
        {sent ? (
          <div className="space-y-5">
            <p role="status" className="rounded-xl border border-emerald-800 bg-emerald-950/50 p-4 text-center text-sm text-emerald-300">Check your email</p>
            <a href="/login" className="flex items-center justify-center gap-2 text-sm font-semibold text-blue-400 transition hover:text-blue-300"><ArrowLeft size={16} />Back to sign in</a>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <label className="block text-sm font-medium text-slate-300">Email address<span className="relative mt-2 block"><Mail aria-hidden="true" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" /><input type="email" autoComplete="email" required autoFocus value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="you@example.com" /></span></label>
            {error && <p role="alert" className="rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Sending…' : 'Send reset link'}</button>
            <a href="/login" className="flex items-center justify-center gap-2 text-sm font-semibold text-blue-400 transition hover:text-blue-300"><ArrowLeft size={16} />Back to sign in</a>
          </form>
        )}
      </section>
    </main>
  );
}
