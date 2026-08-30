import React from 'react';
import { Upload, Download, FileText } from 'lucide-react';
import { useT } from '@/hooks/useT';

export const ExportPanel: React.FC = () => {
  const { t } = useT();

  return (
    <div className="export-panel-container">
      <div>
        {/* 面板标题 */}
        <h3 className="text-xl font-bold text-white mb-6">
          {t('exportPanel.title')}
        </h3>

        {/* 拖拽上传区 */}
        <div className="drop-zone mb-6">
          <Upload className="mx-auto text-blue-500 mb-2" size={24} />
          <p className="text-sm font-semibold text-slate-200">
            {t('exportPanel.dropZoneText')}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {t('exportPanel.dropZoneSubtext')}
          </p>
        </div>

        {/* 勾选模块 */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-500 tracking-wider">
            {t('exportPanel.selectSections')}
          </p>

          <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded accent-blue-600 w-4 h-4" />
            <span>{t('exportPanel.sections.experience')}</span>
          </label>

          <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded accent-blue-600 w-4 h-4" />
            <span>{t('exportPanel.sections.education')}</span>
          </label>

          <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded accent-blue-600 w-4 h-4" />
            <span>{t('exportPanel.sections.skills')}</span>
          </label>

          <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded accent-blue-600 w-4 h-4" />
            <span>{t('exportPanel.sections.achievements')}</span>
          </label>

          <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" className="rounded accent-blue-600 w-4 h-4" />
            <span>{t('exportPanel.sections.publications')}</span>
          </label>

          <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" className="rounded accent-blue-600 w-4 h-4" />
            <span>{t('exportPanel.sections.certifications')}</span>
          </label>
        </div>
      </div>

      {/* 底部导出按钮 */}
      <div className="space-y-3 mt-6">
        <button className="btn-primary-lg">
          <Download size={18} />
          <span>{t('exportPanel.btnExportCv')}</span>
        </button>

        <button className="btn-secondary-lg">
          <FileText size={18} />
          <span>{t('exportPanel.btnExportResume')}</span>
        </button>
      </div>
    </div>
  );
};