import type { ReactNode } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  return <div className="ziwei-layout relative isolate flex min-h-screen w-full overflow-x-hidden bg-[#F8FAFC] text-slate-900 transition-colors duration-300 dark:bg-[#0B0F17] dark:text-slate-100">
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] opacity-25 [background-size:24px_24px] dark:bg-[radial-gradient(#38bdf8_1px,transparent_1px)] dark:opacity-10" />
      <div className="absolute -left-28 -top-28 h-[500px] w-[500px] rounded-full bg-indigo-200/40 blur-[100px] dark:bg-purple-600/15 dark:blur-[140px]" />
      <div className="absolute -bottom-28 -right-28 h-[600px] w-[600px] rounded-full bg-sky-200/40 blur-[120px] dark:bg-indigo-600/15 dark:blur-[140px]" />
    </div>
    {children}
  </div>;
}
