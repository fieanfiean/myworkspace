import { useEffect } from 'react';
import { Mail, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChangeEmailForm } from './ChangeEmailForm';

interface ChangeEmailModalProps { onClose: () => void; onSuccess: () => void }

export function ChangeEmailModal({ onClose, onSuccess }: ChangeEmailModalProps) {
  const { t } = useTranslation();
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="change-email-title" className="my-auto w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl sm:p-6"><div className="mb-6 flex items-start gap-3"><span className="rounded-xl bg-blue-500/15 p-2.5 text-blue-400"><Mail size={19} /></span><div className="min-w-0 flex-1"><h2 id="change-email-title" className="text-xl font-semibold">{t('account.changeEmail')}</h2><p className="mt-1 text-sm text-slate-400">{t('account.changeEmailDescription')}</p></div><button type="button" onClick={onClose} aria-label={t('account.closeChangeEmail')} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"><X size={20} /></button></div><ChangeEmailForm onSuccess={onSuccess} /></section></div>;
}
