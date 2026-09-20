import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';

interface ChangePasswordFormProps { onSuccess?: () => void }

export function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(t('account.passwordMismatch'));
      return;
    }
    setSubmitting(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (userError || !email) {
      setError(userError?.message ?? t('account.verifyAccountError'));
      setSubmitting(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (verifyError) {
      setError(verifyError.message);
      setSubmitting(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSuccess?.();
  };

  const inputClass = 'mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium text-slate-300">{t('account.currentPassword')}<input type="password" autoComplete="current-password" required autoFocus value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className={inputClass} /></label>
      <label className="block text-sm font-medium text-slate-300">{t('account.newPassword')}<input type="password" autoComplete="new-password" required minLength={6} value={newPassword} onChange={event => setNewPassword(event.target.value)} className={inputClass} /></label>
      <label className="block text-sm font-medium text-slate-300">{t('account.confirmPassword')}<input type="password" autoComplete="new-password" required minLength={6} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className={inputClass} /></label>
      {error && <p role="alert" className="rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={submitting} className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60">{t(submitting ? 'account.updating' : 'account.updatePassword')}</button>
    </form>
  );
}
