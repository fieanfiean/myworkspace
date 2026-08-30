import { TriangleAlert } from 'lucide-react';

const isStaging = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'staging';

export function EnvironmentBadge() {
  if (!isStaging) return null;

  return (
    <div
      role="status"
      aria-label="Staging environment"
      className="fixed right-4 top-4 z-[100] flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300 shadow-lg shadow-black/20 backdrop-blur"
    >
      <TriangleAlert size={14} aria-hidden="true" />
      Staging
    </div>
  );
}
