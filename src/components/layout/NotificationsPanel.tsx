import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/shallow';
import { X, Sparkles, AlertTriangle, Clock, Bell, TrendingUp } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useInsights } from '../../hooks/useInsights';
import { useActivities } from '../../hooks/useActivities';
import { formatDate } from '../../lib/utils';

export function NotificationsPanel() {
  const { notifOpen, toggleNotif } = useUiStore(
    useShallow((s) => ({ notifOpen: s.notifOpen, toggleNotif: s.toggleNotif }))
  );
  const { data: insights = [] } = useInsights();
  const { data: activities = [] } = useActivities();
  const navigate = useNavigate();

  if (!notifOpen) return null;

  const pendingInsights = insights.filter((i) => !i.is_executed);
  const dueTasks = activities.filter((a) => a.due_at && !a.completed);

  const go = (path: string) => { toggleNotif(); navigate(path); };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={toggleNotif}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative w-full max-w-sm bg-white dark:bg-surface-900 h-full overflow-y-auto
                   shadow-2xl border-l border-surface-200 dark:border-surface-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-surface-900 border-b border-surface-200
                        dark:border-surface-700 px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-brand-500" />
            <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Notifiche</h2>
            <span className="text-xs bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded-full">
              {pendingInsights.length + dueTasks.length}
            </span>
          </div>
          <button onClick={toggleNotif} className="text-surface-400 hover:text-surface-600"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-5">
          {/* AI insights */}
          {pendingInsights.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold text-surface-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Sparkles size={12} /> Micro-mosse AI
              </h3>
              <div className="space-y-2">
                {pendingInsights.map((ins) => {
                  const danger = ins.insight_type === 'churn_warning' || ins.insight_type === 'risk_alert';
                  return (
                    <button
                      key={ins.id}
                      onClick={() => go('/pipeline')}
                      className="w-full text-left p-3 rounded-lg border transition-colors
                                 border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800"
                    >
                      <div className={`flex items-center gap-1.5 text-xs font-medium mb-1 ${danger ? 'text-risk-high' : 'text-brand-600 dark:text-brand-400'}`}>
                        {danger ? <AlertTriangle size={12} /> : <TrendingUp size={12} />}
                        <span className="capitalize">{ins.insight_type.replace('_', ' ')}</span>
                        <span className="ml-auto text-surface-400 font-normal">{Math.round(ins.confidence * 100)}%</span>
                      </div>
                      <p className="text-sm text-surface-700 dark:text-surface-300 leading-snug">{ins.reasoning}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Task in scadenza */}
          {dueTasks.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold text-surface-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Clock size={12} /> Da fare
              </h3>
              <div className="space-y-2">
                {dueTasks.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg border border-surface-200 dark:border-surface-700">
                    <p className="text-sm text-surface-700 dark:text-surface-300">{t.subject}</p>
                    {t.due_at && (
                      <span className="text-[11px] text-amber-600 flex items-center gap-1 mt-1">
                        <Clock size={10} /> Scade il {formatDate(t.due_at)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {pendingInsights.length === 0 && dueTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-surface-400">
              <Bell size={32} className="mb-2 text-surface-300" />
              <p className="text-sm">Tutto sotto controllo ✅</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
