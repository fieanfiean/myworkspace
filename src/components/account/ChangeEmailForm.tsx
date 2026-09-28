import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';

interface ChangeEmailFormProps { onSuccess?: () => void }

export function ChangeEmailForm({ onSuccess }: ChangeEmailFormProps) {
  const { t } = useTranslation();
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error(t('account.notLoggedIn'));

      const { data: { user: updatedUser }, error: updateError } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (updateError) throw updateError;
      if (!updatedUser || updatedUser.id !== user.id) throw new Error(t('account.emailUpdateIdentityError'));

      setSuccess(t('account.emailConfirmation'));
      setNewEmail('');
      onSuccess?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block text-sm font-medium text-slate-300">{t('account.newEmail')}<input type="email" autoComplete="email" required autoFocus value={newEmail} onChange={event => setNewEmail(event.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" /></label>
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}
      {success && <p role="status" className="mt-4 rounded-xl border border-emerald-800 bg-emerald-950/50 p-3 text-sm text-emerald-300">{success}</p>}
      <button type="submit" disabled={submitting} className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">{t(submitting ? 'account.updating' : 'account.updateEmail')}</button>
    </form>
  );
}
