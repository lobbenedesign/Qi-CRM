import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { X, User, Building2, TrendingUp, Send, Ticket as TicketIcon, Settings } from 'lucide-react';
import { useUpdateTicket } from '../../hooks/useTickets';
import { useContacts } from '../../hooks/useContacts';
import { useDeals } from '../../hooks/useDeals';
import { AssigneePicker } from '../team/AssigneePicker';
import { useToastStore } from '../../store/toastStore';
import { useTicketViewsStore } from '../../store/ticketViewsStore';
import type { Ticket, TicketStatus, TicketPriority } from '../../types/team';

interface Props {
  ticket: Ticket;
  onClose: () => void;
}


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

export function TicketDetailDrawer({ ticket, onClose }: Props) {
  const updateTicket = useUpdateTicket();
  const { data: contacts = [] } = useContacts();
  const { data: deals = [] } = useDeals();
  const pushToast = useToastStore((s) => s.push);
  const { visibleProperties, setVisibleProperties, resetPropertiesToDefault } = useTicketViewsStore(
    useShallow((s) => ({ visibleProperties: s.visibleProperties, setVisibleProperties: s.setVisibleProperties, resetPropertiesToDefault: s.resetPropertiesToDefault }))
  );

  const [commentText, setCommentText] = useState('');
  const [showPropSettings, setShowPropSettings] = useState(false);
  const [localComments, setLocalComments] = useState<{ id: string; author: string; text: string; time: string }[]>([
    {
      id: 'comm-1',
      author: 'Giuseppe Lobbene',
      text: 'Presa in carico del ticket effettuata. Verifico lo storico email del cliente.',
      time: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ]);

  const contact = contacts.find((c) => c.id === ticket.contact_id);
  const company = contact?.company;
  const contactDeals = contact ? deals.filter((d) => d.contact_id === contact.id) : [];

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment = {
      id: `comm-${Math.random().toString(36).substring(2, 6)}`,
      author: 'Giuseppe Lobbene',
      text: commentText,
      time: new Date().toISOString()
    };

    setLocalComments((prev) => [...prev, newComment]);
    setCommentText('');
    pushToast({
      title: 'Nota aggiunta',
      body: 'Commento registrato sulla timeline del ticket.',
      kind: 'success'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-6xl h-full bg-surface-50 dark:bg-surface-950 flex flex-col shadow-2xl animate-slide-in">
        
        {/* Header */}
        <div className="p-4 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TicketIcon size={18} className="text-brand-500" />
            <h2 className="text-sm font-bold text-surface-900 dark:text-white">
              {ticket.code} — {ticket.title}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface-100 rounded-lg text-surface-500">
            <X size={18} />
          </button>
        </div>

        {/* 3-Pane Body Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* PANE 1: Core details (Left - col-span-3) */}
          <div className="lg:col-span-3 bg-white dark:bg-surface-900/50 p-4 border-r border-surface-200 dark:border-surface-800 overflow-y-auto space-y-4 text-xs">
            <div className="flex justify-between items-center relative">
              <h3 className="font-bold text-[10px] tracking-wider uppercase text-surface-400">Dettagli Ticket</h3>
              <button 
                onClick={() => setShowPropSettings(!showPropSettings)}
                className="p-1 hover:bg-surface-150 dark:hover:bg-surface-800 rounded text-surface-450 hover:text-surface-800"
                title="Configura Proprietà"
              >
                <Settings size={13} />
              </button>

              {showPropSettings && (
                <div className="absolute right-0 top-full mt-1.5 z-40 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-3 rounded-lg shadow-xl w-48 space-y-2.5 text-xs animate-fade-in text-surface-800 dark:text-surface-100">
                  <div className="font-bold text-[10px] uppercase text-surface-400">Proprietà Visibili</div>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { key: 'status', label: 'Stato' },
                      { key: 'priority', label: 'Priorità' },
                      { key: 'category', label: 'Categoria' },
                      { key: 'assignee', label: 'Assegnatario' },
                      { key: 'description', label: 'Descrizione' },
                      { key: 'created_at', label: 'Data Creazione' }
                    ].map((p) => {
                      const isChecked = visibleProperties.includes(p.key);
                      return (
                        <label key={p.key} className="flex items-center gap-2 cursor-pointer text-xs">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setVisibleProperties(visibleProperties.filter(x => x !== p.key));
                              } else {
                                setVisibleProperties([...visibleProperties, p.key]);
                              }
                            }}
                            className="rounded border-surface-300 text-brand-600 w-3.5 h-3.5"
                          />
                          <span>{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <button 
                    type="button"
                    onClick={resetPropertiesToDefault}
                    className="w-full text-center py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 hover:bg-surface-100 rounded text-[10px] font-bold"
                  >
                    Ripristina Default
                  </button>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              {visibleProperties.includes('status') && (
                <div>
                  <label className="text-[10px] text-surface-500 block font-semibold mb-1">Stato Ticket</label>
                  <select
                    value={ticket.status}
                    onChange={(e) => updateTicket.mutate({ id: ticket.id, patch: { status: e.target.value as any } })}
                    className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-250 dark:border-surface-750 px-2 py-1.5 rounded focus:outline-none"
                  >
                    {Object.entries(STATUS_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {visibleProperties.includes('priority') && (
                <div>
                  <label className="text-[10px] text-surface-500 block font-semibold mb-1">Priorità</label>
                  <select
                    value={ticket.priority}
                    onChange={(e) => updateTicket.mutate({ id: ticket.id, patch: { priority: e.target.value as any } })}
                    className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-250 dark:border-surface-750 px-2 py-1.5 rounded focus:outline-none"
                  >
                    {Object.entries(PRIO_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {visibleProperties.includes('category') && (
                <div>
                  <label className="text-[10px] text-surface-500 block font-semibold mb-1">Categoria</label>
                  <span className="block font-bold text-surface-850 dark:text-surface-100 bg-surface-50 dark:bg-surface-800 px-2.5 py-1.5 rounded">
                    {CAT_LABEL[ticket.category] || ticket.category}
                  </span>
                </div>
              )}

              {visibleProperties.includes('assignee') && (
                <div>
                  <label className="text-[10px] text-surface-500 block font-semibold mb-1">Assegnatario</label>
                  <AssigneePicker
                    value={ticket.assignee_id}
                    allowAuto={false}
                    onChange={(v) => updateTicket.mutate({ id: ticket.id, patch: { assignee_id: v === 'auto' ? null : (v || null) } })}
                    className="w-full text-xs rounded border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-2 py-1.5 outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>
              )}

              {visibleProperties.includes('created_at') && (
                <div>
                  <label className="text-[10px] text-surface-500 block font-semibold mb-1">Data Creazione</label>
                  <span className="block text-surface-700 dark:text-surface-300 font-medium">
                    {new Date(ticket.created_at).toLocaleDateString('it-IT')} {new Date(ticket.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}

              {visibleProperties.includes('description') && ticket.description && (
                <div className="pt-2 border-t border-surface-100 dark:border-surface-800">
                  <label className="text-[10px] text-surface-500 block font-semibold mb-1">Descrizione Iniziale</label>
                  <p className="bg-surface-50 dark:bg-surface-800 p-2.5 rounded leading-relaxed text-surface-700 dark:text-surface-300">
                    {ticket.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* PANE 2: Timeline & Comments (Middle - col-span-6) */}
          <div className="lg:col-span-6 flex flex-col bg-surface-50 dark:bg-surface-950 border-r border-surface-200 dark:border-surface-800 overflow-hidden">
            {/* Timeline header */}
            <div className="p-3 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
              <span className="text-xs font-bold text-surface-850 dark:text-white">Attività e Comunicazioni</span>
            </div>

            {/* Comment Composer */}
            <form onSubmit={handleAddComment} className="p-4 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 flex items-end gap-2 shrink-0">
              <div className="flex-1">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Scrivi una nota interna o aggiornamento per questo ticket..."
                  rows={2}
                  className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-250 dark:border-surface-750 text-xs rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-2.5 transition-all shadow disabled:opacity-55"
              >
                <Send size={14} />
              </button>
            </form>

            {/* Chronological logs list */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {localComments.map((comm) => (
                <div key={comm.id} className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-3 shadow-sm text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-surface-900 dark:text-white">{comm.author}</span>
                    <time className="text-[10px] text-surface-400">{new Date(comm.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                  </div>
                  <p className="text-surface-700 dark:text-surface-300 leading-relaxed">
                    {comm.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* PANE 3: Associations (Right - col-span-3) */}
          <div className="lg:col-span-3 bg-white dark:bg-surface-900/50 p-4 overflow-y-auto space-y-5 text-xs">
            <h3 className="font-bold text-[10px] tracking-wider uppercase text-surface-400">Anagrafiche Collegate</h3>

            {/* Contact details */}
            {contact ? (
              <div className="space-y-3 pb-4 border-b border-surface-150 dark:border-surface-800">
                <div className="flex items-center gap-1.5 text-surface-900 dark:text-white font-bold">
                  <User size={14} className="text-brand-500" />
                  <span>Contatto Commerciale</span>
                </div>
                <div className="bg-surface-50 dark:bg-surface-900 border border-surface-150 dark:border-surface-800 rounded-xl p-3 space-y-2">
                  <p className="font-bold">{contact.first_name} {contact.last_name}</p>
                  <p className="text-surface-500 font-mono text-[10px] truncate">{contact.email}</p>
                  <p className="text-surface-500 font-mono text-[10px]">{contact.phone || 'Nessun telefono'}</p>
                </div>
              </div>
            ) : (
              <p className="text-surface-450 italic">Nessun contatto collegato.</p>
            )}

            {/* Company Details */}
            {company ? (
              <div className="space-y-3 pb-4 border-b border-surface-150 dark:border-surface-800">
                <div className="flex items-center gap-1.5 text-surface-900 dark:text-white font-bold">
                  <Building2 size={14} className="text-brand-500" />
                  <span>Azienda</span>
                </div>
                <div className="bg-surface-50 dark:bg-surface-900 border border-surface-150 dark:border-surface-800 rounded-xl p-3 space-y-1">
                  <p className="font-bold">{company.name}</p>
                  <p className="text-[10px] text-surface-500">{company.industry} · {company.size}</p>
                </div>
              </div>
            ) : (
              <p className="text-surface-450 italic">Nessuna azienda associata.</p>
            )}

            {/* Active deals list */}
            {contactDeals.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-surface-900 dark:text-white font-bold">
                  <TrendingUp size={14} className="text-brand-500" />
                  <span>Deal Opportunità</span>
                </div>
                <div className="space-y-1.5">
                  {contactDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="bg-surface-50 dark:bg-surface-900 border border-surface-150 dark:border-surface-800/80 rounded-lg p-2 flex items-center justify-between"
                    >
                      <div className="truncate pr-2">
                        <p className="font-bold truncate text-surface-850 dark:text-surface-100">{deal.title}</p>
                        <p className="text-[10px] text-surface-450 uppercase">{deal.stage}</p>
                      </div>
                      <span className="font-semibold shrink-0">
                        {deal.value.toLocaleString()} {deal.currency}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Powered by tag */}
        <div className="p-3 text-center text-[10px] text-surface-400 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800 shrink-0">
          Powered by Giuseppe Lobbene / Lobbenedesign
        </div>
      </div>
    </div>
  );
}
