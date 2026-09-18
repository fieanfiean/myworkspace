import { RefreshCw, Sparkles, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWAUpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <aside
      aria-live="polite"
      aria-label="应用版本更新"
      className="animate-in slide-in-from-bottom-5 fixed bottom-24 left-4 right-4 z-[100] overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-4 text-slate-800 shadow-xl backdrop-blur-md duration-300 dark:border-slate-800 dark:bg-[#131927]/90 dark:text-slate-100 dark:shadow-2xl sm:bottom-6 sm:left-auto sm:right-6 sm:w-[390px]"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-indigo-500/15 blur-2xl" />

      <div className="relative flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 shadow-[0_0_24px_rgba(99,102,241,0.18)] dark:text-indigo-400">
          <Sparkles className="size-4" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold">紫微垣 有新版本可用</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            刷新后即可使用最新功能与改进。
          </p>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setNeedRefresh(false)}
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              稍后
            </button>
            <button
              type="button"
              onClick={() => void updateServiceWorker(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#131927]"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              立即刷新
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          aria-label="稍后提醒"
          className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
