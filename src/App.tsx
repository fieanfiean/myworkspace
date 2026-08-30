import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { AboutMePage } from './pages/AboutMePage';
import { BudgetPage } from './pages/BudgetPage';

export function App() {
  const [activeTab, setActiveTab] = useState<'profile' | 'budget'>('profile');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="ml-64 flex-1 p-8">
        {activeTab === 'profile' ? <AboutMePage /> : <BudgetPage />}
      </main>
    </div>
  );
}

export default App;