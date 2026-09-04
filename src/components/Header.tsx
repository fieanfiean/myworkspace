import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Header() {
  const { t, i18n } = useTranslation();
  const isChinese = i18n.language.startsWith('zh');

  return (
    <header className="mb-6 flex min-h-12 items-center justify-end border-b border-slate-800 pb-4">
      <button type="button" onClick={() => void i18n.changeLanguage(isChinese ? 'en' : 'zh')} aria-label={t('sidebar.switchLanguage')} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white">
        <Globe size={17} className="text-blue-400" /><span>{isChinese ? '中文' : 'English'}</span><span className="text-xs text-slate-500">{isChinese ? 'EN' : 'ZH'}</span>
      </button>
    </header>
  );
}
