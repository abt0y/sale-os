import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell, type PageKey } from '@/components/AppShell';
import { AppProvider, useApp } from '@/store/AppContext';
import { DashboardPage } from '@/pages/DashboardPage';
import { LeadsPage } from '@/pages/LeadsPage';
import { PackagesPage } from '@/pages/PackagesPage';
import { BookingsPage } from '@/pages/BookingsPage';
import { TasksPage } from '@/pages/TasksPage';
import { PipelinePage } from '@/pages/PipelinePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { registerSalesTools } from '@/webmcp/tools';

function AppContent() {
  const app = useApp();
  const appRef = useRef(app);
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');
  const [selectedTaskId, setSelectedTaskId] = useState<string>();
  appRef.current = app;

  useEffect(() => {
    void registerSalesTools(() => appRef.current);
  }, []);

  const openTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setCurrentPage('tasks');
  }, []);
  const clearSelectedTask = useCallback(() => setSelectedTaskId(undefined), []);

  if (app.loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500 dark:bg-slate-950 dark:text-slate-400">{app.i18n.t('common.loading')}</div>;
  }

  let page;
  switch (currentPage) {
    case 'dashboard': page = <DashboardPage onNavigate={setCurrentPage} onOpenTask={openTask} />; break;
    case 'leads': page = <LeadsPage />; break;
    case 'packages': page = <PackagesPage />; break;
    case 'bookings': page = <BookingsPage />; break;
    case 'tasks': page = <TasksPage selectedTaskId={selectedTaskId} onTaskOpened={clearSelectedTask} />; break;
    case 'pipeline': page = <PipelinePage />; break;
    case 'settings': page = <SettingsPage />; break;
  }

  return <AppShell current={currentPage} onNavigate={setCurrentPage}>{page}</AppShell>;
}

function App() {
  return <AppProvider><AppContent /></AppProvider>;
}

export default App;
