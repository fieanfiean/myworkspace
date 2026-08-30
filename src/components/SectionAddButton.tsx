import { Plus } from 'lucide-react';
import { useT } from '@/hooks/useT';

export function SectionAddButton({ onClick }: { onClick: () => void }) {
  const { t } = useT();
  return <button type="button" onClick={onClick} className="ml-auto flex items-center gap-1.5 rounded-lg border border-blue-800 bg-blue-950/50 px-3 py-1.5 text-sm font-medium text-blue-400 hover:bg-blue-900/50 hover:text-blue-300"><Plus size={15} />{t('common.add')}</button>;
}
