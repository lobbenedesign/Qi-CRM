import { useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from '../command/CommandPalette';
import { NotificationsPanel } from './NotificationsPanel';
import { TourOverlay } from '../tour/TourOverlay';
import { Toasts } from '../common/Toasts';
import { ReminderDispatcher } from '../reminders/ReminderDispatcher';
import { QuickCreateHost } from './QuickCreateHost';
import { useTourStore } from '../../store/tourStore';
import { TaskExecutionOverlay } from './TaskExecutionOverlay';

export function DashboardLayout() {
  const location = useLocation();
  const { hasSeenTour, start } = useTourStore(
    useShallow((s) => ({ hasSeenTour: s.hasSeenTour, start: s.start }))
  );

  // Avvia il tour automaticamente al primo accesso (solo sulla Dashboard)
  useEffect(() => {
    if (!hasSeenTour && location.pathname === '/') {
      const t = setTimeout(() => start(false), 700);
      return () => clearTimeout(t);
    }
  }, [hasSeenTour, location.pathname, start]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50 dark:bg-surface-950">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TaskExecutionOverlay />
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <NotificationsPanel />
      <TourOverlay />
      <Toasts />
      <ReminderDispatcher />
      <QuickCreateHost />
    </div>
  );
}

