import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import { useSearchParams } from 'react-router-dom';
import {
  Ticket as TicketIcon,
  Plus,
  Filter,
  User,
  CheckCircle2,
  Trash2,
  Bookmark,
  Pin,
  X
} from 'lucide-react';
import { useTickets, useUpdateTicket, useDeleteTicket } from '../hooks/useTickets';
import { useContacts } from '../hooks/useContacts';
import { useCan } from '../hooks/useCan';
import { useAuthStore } from '../store/authStore';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { useTicketViewsStore } from '../store/ticketViewsStore';
import { CreateTicketModal } from '../components/tickets/CreateTicketModal';
import { TicketDetailDrawer } from '../components/tickets/TicketDetailDrawer';
import { AssigneePicker, AssigneeAvatar } from '../components/team/AssigneePicker';
import { SkeletonRows } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { BulkActionBar } from '../components/common/BulkActionBar';
import { formatDate } from '../lib/utils';
import type { Ticket, TicketStatus, TicketPriority } from '../types/team';

const STATUS_META: Record<TicketStatus, { label: string; color: string }> = {
  open:        { label: 'Aperto',       color: '#3b82f6' },
  in_progress: { label: 'In corso',     color: '#f59e0b' },
  waiting:     { label: 'In attesa',    color: '#8b5cf6' },
  resolved:    { label: 'Risolto',      color: '#22c55e' },
  closed:      { label: 'Chiuso',       color: '#94a3b8' },
};

const PRIO_META: Record<TicketPriority, { label: string; color: string }> = {
  low:    { label: 'Bassa',   color: '#94a3b8' },
  medium: { label: 'Media',   color: '#3b82f6' },
  high:   { label: 'Alta',    color: '#f59e0b' },
  urgent: { label: 'Urgente', color: '#ef4444' },
};

const CAT_LABEL: Record<string, string> = {
  callback: 'Richiamo', sales: 'Commerciale', admin: 'Amministrativo', config: 'Configurazione', support: 'Supporto',
};

export default function Tickets() {
  const [searchParams] = useSearchParams();
  const { data: tickets = [], isLoading } = useTickets();
  const updateTicket = useUpdateTicket();
  const deleteTicket = useDeleteTicket();
  useContacts();

  const canCreate = useCan('tickets:create');
  const canAssign = useCan('tickets:assign');
  const canDelete = useCan('tickets:delete');
  const memberId = useAuthStore((s) => s.memberId);
  const sel = useBulkSelection();

  // Saved Views Store Integration
  const { views, activeViewId, setActiveViewId, addView, togglePinView, deleteView } = useTicketViewsStore(
    useShallow((s) => ({ views: s.views, activeViewId: s.activeViewId, setActiveViewId: s.setActiveViewId, addView: s.addView, togglePinView: s.togglePinView, deleteView: s.deleteView }))
  );

  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Active filters (sync with saved views on mount / selection)
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [mineOnly, setMineOnly] = useState(false);

  // Modal to save the current filter combination
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  // Sync state with active view
  useEffect(() => {
    const activeView = views.find((v) => v.id === activeViewId);
    if (activeView) {
      setStatusFilter(activeView.statusFilter);
      setMineOnly(activeView.mineOnly);
    }
  }, [activeViewId, views]);

  useEffect(() => {
    const qid = searchParams.get('openTicketId');
    if (qid && tickets.length > 0) {
      const found = tickets.find(t => t.id === qid);
      if (found) {
        setSelectedTicket(found);
      }
    }
  }, [searchParams, tickets]);


  const filtered = tickets.filter((t) =>
    (!statusFilter || t.status === statusFilter) &&
    (!mineOnly || t.assignee_id === memberId)
  );

  const ids = filtered.map((t) => t.id);
  const openCount = tickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved').length;

  const handleSaveCurrentView = () => {
    if (!newViewName.trim()) return;
    const viewId = addView({
      name: newViewName,
      statusFilter,
      mineOnly
    });
    setActiveViewId(viewId);
    setNewViewName('');
    setShowSaveViewModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TicketIcon className="text-brand-500" size={22} />
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Ticket</h1>
          <span className="text-sm text-surface-400 ml-1">{openCount} aperti</span>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg transition-colors font-medium"
          >
            <Plus size={15} /> Nuovo Ticket
          </button>
        )}
      </div>

      {/* Saved / Pinned Views Bar */}
      <div className="flex items-center gap-1.5 border-b border-surface-200 dark:border-surface-800 pb-1.5 overflow-x-auto shrink-0">
        {views.filter(v => v.pinned).map((v) => (
          <div key={v.id} className="flex items-center shrink-0">
            <button
              onClick={() => setActiveViewId(v.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-t-lg border-b-2 transition-all flex items-center gap-1 ${
                activeViewId === v.id
                  ? 'border-brand-550 text-brand-600 dark:text-brand-400 bg-brand-500/5'
                  : 'border-transparent text-surface-500 hover:text-surface-700 hover:bg-surface-100/50'
              }`}
            >
              <span>{v.name}</span>
            </button>
            {v.id !== 'view-all' && (
              <button
                onClick={() => togglePinView(v.id)}
                className="p-1 text-surface-400 hover:text-surface-600 transition-colors"
                title="Rimuovi dai preferiti"
              >
                <Pin size={10} className="rotate-45" />
              </button>
            )}
          </div>
        ))}

        {/* Action drop downs for other views */}
        <select
          value={activeViewId}
          onChange={(e) => setActiveViewId(e.target.value)}
          className="text-xs bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded px-2.5 py-1 focus:outline-none ml-auto"
        >
          <option value="view-all">Viste Salvate</option>
          {views.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>

      {/* Filters & Actions Bar */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-surface-400" />
          
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as TicketStatus | '');
              setActiveViewId(''); // Remove active view binding since query changed
            }}
            className="text-xs rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-1.5 outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value="">Tutti gli stati</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setMineOnly((v) => !v);
              setActiveViewId('');
            }}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              mineOnly
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 border border-surface-200 dark:border-surface-800'
            }`}
          >
            <User size={13} /> Assegnati a me
          </button>
        </div>

        {/* View actions: Save / Pin */}
        <div className="flex items-center gap-2">
          {!activeViewId && (
            <button
              onClick={() => setShowSaveViewModal(true)}
              className="flex items-center gap-1 text-xs text-brand-650 hover:underline font-semibold bg-brand-500/10 px-2.5 py-1.5 rounded-lg"
            >
              <Bookmark size={13} />
              <span>Salva Vista Filtro</span>
            </button>
          )}

          {activeViewId && activeViewId !== 'view-all' && (
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => togglePinView(activeViewId)}
                className="flex items-center gap-1 text-surface-500 hover:text-surface-700 bg-surface-100 px-2 py-1 rounded"
              >
                <Pin size={11} />
                <span>{views.find(v => v.id === activeViewId)?.pinned ? 'Rimuovi Pin' : 'Fissa in Alto'}</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Eliminare questa vista salvata?')) {
                    deleteView(activeViewId);
                  }
                }}
                className="text-red-500 hover:bg-red-50 p-1 rounded"
              >
                Elimina Vista
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Table */}
      <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-3"><SkeletonRows rows={5} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<TicketIcon size={28} />}
            title="Nessun ticket trovato"
            subtitle="Non ci sono ticket corrispondenti ai filtri attivi."
            action={canCreate ? { label: 'Nuovo Ticket', icon: <Plus size={15} />, onClick: () => setShowCreate(true) } : undefined}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 dark:border-surface-800 text-left bg-surface-50/50">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 cursor-pointer"
                    checked={sel.allSelected(ids)}
                    onChange={() => sel.toggleAll(ids)}
                  />
                </th>
                <th className="px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide">Ticket</th>
                <th className="px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide hidden md:table-cell">Priorità</th>
                <th className="px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide">Assegnato a</th>
                <th className="px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide">Stato</th>
                <th className="px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide hidden lg:table-cell">Scadenza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {filtered.map((t: Ticket) => {
                const pm = PRIO_META[t.priority] || { label: t.priority || 'Bassa', color: '#94a3b8' };
                const sm = STATUS_META[t.status] || { label: t.status || 'Aperto', color: '#3b82f6' };
                const canEditThis = canAssign || t.assignee_id === memberId;
                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`transition-colors cursor-pointer ${
                      sel.isSelected(t.id)
                        ? 'bg-brand-50/60 dark:bg-brand-900/10'
                        : 'hover:bg-surface-50 dark:hover:bg-surface-800/50'
                    }`}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 cursor-pointer"
                        checked={sel.isSelected(t.id)}
                        onChange={() => sel.toggle(t.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-surface-900 dark:text-surface-100">{t.title}</p>
                        <p className="text-xs text-surface-400">{t.code} · {CAT_LABEL[t.category] || t.category || 'Altro'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span
                        className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${pm.color}20`, color: pm.color }}
                      >
                        {pm.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold" onClick={(e) => e.stopPropagation()}>
                      {canAssign ? (
                        <AssigneePicker
                          value={t.assignee_id}
                          allowAuto={false}
                          onChange={(v) => updateTicket.mutate({ id: t.id, patch: { assignee_id: v === 'auto' ? null : (v || null) } })}
                          className="text-xs rounded-md border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-2 py-1 outline-none focus:ring-2 focus:ring-brand-500/30 max-w-[160px]"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <AssigneeAvatar memberId={t.assignee_id} size={24} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={t.status}
                        disabled={!canEditThis}
                        onChange={(e) => updateTicket.mutate({ id: t.id, patch: { status: e.target.value as TicketStatus } })}
                        className="text-xs font-bold rounded-md border px-2 py-1 outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60 bg-transparent"
                        style={{ borderColor: `${sm.color}55`, color: sm.color }}
                      >
                        {Object.entries(STATUS_META).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-surface-400">
                      {t.due_at ? formatDate(t.due_at) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <BulkActionBar
        count={sel.count}
        onClear={sel.clear}
        actions={[
          {
            label: 'Segna risolto',
            icon: <CheckCircle2 size={15} />,
            onClick: () => {
              sel.ids.forEach((id) => updateTicket.mutate({ id, patch: { status: 'resolved' } }));
              sel.clear();
            }
          },
          ...(canDelete
            ? [
                {
                  label: 'Elimina',
                  icon: <Trash2 size={15} />,
                  danger: true,
                  onClick: () => {
                    if (confirm(`Eliminare ${sel.count} ticket?`)) {
                      sel.ids.forEach((id) => deleteTicket.mutate(id));
                      sel.clear();
                    }
                  }
                }
              ]
            : [])
        ]}
      />

      {/* Save View Modal dialog */}
      {showSaveViewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-850 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-surface-100 dark:border-surface-800">
              <h3 className="font-bold text-sm text-surface-900 dark:text-white">Salva Vista Personalizzata</h3>
              <button onClick={() => setShowSaveViewModal(false)} className="text-surface-450 hover:text-surface-700">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-surface-400 block uppercase">Nome della Vista</label>
              <input
                type="text"
                placeholder="Es. I miei ticket in corso..."
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                className="w-full bg-surface-50 dark:bg-surface-800 text-xs px-3 py-2 border border-surface-250 dark:border-surface-750 rounded-lg focus:outline-none"
              />
            </div>
            <button
              onClick={handleSaveCurrentView}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs py-2 rounded-lg"
            >
              Salva e Applica Vista
            </button>
          </div>
        </div>
      )}

      {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} />}
      
      {/* 3-Pane Detail Drawer */}
      {selectedTicket && (
        <TicketDetailDrawer
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
}
