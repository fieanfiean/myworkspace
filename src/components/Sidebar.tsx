import React from 'react';
import { User, Wallet, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  activeTab: 'profile' | 'budget';
  setActiveTab: (tab: 'profile' | 'budget') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { t, i18n } = useTranslation();

  // 切换语言函数
  const toggleLanguage = () => {
    const nextLang = i18n.language.startsWith('zh') ? 'en' : 'zh';
    i18n.changeLanguage(nextLang);
  };

  return (
    <div className="w-64 h-screen bg-slate-900 text-white flex flex-col p-6 fixed left-0 top-0 border-r border-slate-800 justify-between">
      <div>
        <h1 className="text-xl font-bold mb-8 text-blue-400">My Workspace</h1>
        
        <nav className="flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
              activeTab === 'profile' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <User size={20} />
            <span>{t('sidebar.profile')}</span>
          </button>

          <button
            onClick={() => setActiveTab('budget')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
              activeTab === 'budget' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <Wallet size={20} />
            <span>{t('sidebar.budget')}</span>
          </button>
        </nav>
      </div>

      {/* 底部语言切换按钮 */}
      <button
        onClick={toggleLanguage}
        className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-sm font-medium border border-slate-700"
      >
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-blue-400" />
          <span>{i18n.language.startsWith('zh') ? '中文' : 'English'}</span>
        </div>
        <span className="text-xs text-slate-500 uppercase">
          {i18n.language.startsWith('zh') ? 'EN' : 'ZH'}
        </span>
      </button>
    </div>
  );
};