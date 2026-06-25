import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useInboxStore } from '../store/inboxStore';
import { useContacts } from '../hooks/useContacts';
import { useDeals } from '../hooks/useDeals';
import { useCreateTicket, useTickets } from '../hooks/useTickets';
import { useToastStore } from '../store/toastStore';
import { SnippetHelper } from '../components/common/SnippetHelper';
import {
  MessageSquare,
  Mail,
  Send,
  Ticket,
  User,
  CheckCircle
} from 'lucide-react';

export default function QuantumInbox() {
  const { conversations, activeConversationId, selectConversation, sendMessage, updateConversationStatus, setTicketId } = useInboxStore(
    useShallow((s) => ({ conversations: s.conversations, activeConversationId: s.activeConversationId, selectConversation: s.selectConversation, sendMessage: s.sendMessage, updateConversationStatus: s.updateConversationStatus, setTicketId: s.setTicketId }))
  );
  const { data: contacts = [] } = useContacts();
  const { data: deals = [] } = useDeals();
  const { data: tickets = [] } = useTickets();
  const createTicketMutation = useCreateTicket();
  const pushToast = useToastStore((s) => s.push);

  const [replyText, setReplyText] = useState('');
  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  // Find linked contact details
  const linkedContact = activeConversation
    ? contacts.find((ct) => ct.id === activeConversation.contactId)
    : null;

  // Find linked active deals
  const linkedDeals = linkedContact
    ? deals.filter((d) => d.contact_id === linkedContact.id && d.stage !== 'won' && d.stage !== 'lost')
    : [];

  // Check if conversation already has an active ticket
  const linkedTicket = activeConversation?.ticketId
    ? tickets.find((t) => t.id === activeConversation.ticketId)
    : null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversationId || !replyText.trim()) return;

    // Send user reply
    sendMessage(activeConversationId, replyText, 'agent', 'Giuseppe Lobbene');
    setReplyText('');

    // Simulate standard response after 2 seconds for interactivity
    setTimeout(() => {
      sendMessage(
        activeConversationId,
        "Grazie per il feedback, ho inoltrato la richiesta al team competente. Ti aggiorneremo a breve.",
        'contact',
        activeConversation?.contactName || 'Contatto'
      );
    }, 2000);
  };

  const handleCreateTicket = async () => {
    if (!activeConversation) return;

    try {
      const ticketTitle = `Ticket da Inbox: ${activeConversation.subject}`;
      const ticketDesc = `Creato automaticamente dalla chat di canale ${activeConversation.channel.toUpperCase()}.\n\nUltimo messaggio: "${activeConversation.lastMessage}"`;

      createTicketMutation.mutate(
        {
          title: ticketTitle,
          description: ticketDesc,
          status: 'open',
          priority: 'medium',
          category: activeConversation.channel === 'email' ? 'support' : 'callback',
          contact_id: activeConversation.contactId,
        },
        {
          onSuccess: (newTicket) => {
            setTicketId(activeConversation.id, newTicket.id);
            pushToast({
              title: 'Ticket Creato con Successo!',
              body: `Assegnato il codice ${newTicket.code} per la richiesta di ${activeConversation.contactName}.`,
              kind: 'success',
            });
          },
        }
      );
    } catch (err) {
      pushToast({
        title: 'Errore',
        body: 'Impossibile convertire la conversazione in Ticket.',
        kind: 'info',
      });
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-surface-50 dark:bg-surface-950 overflow-hidden">
      {/* 1. Conversations List (Left Sidebar) */}
      <div className="w-80 border-r border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-surface-200 dark:border-surface-800">
          <h2 className="text-base font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="text-brand-500" size={18} />
            <span>Quantum Inbox</span>
          </h2>
          <p className="text-[11px] text-surface-500 mt-1">Canali Omnicanale Condivisi</p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-surface-100 dark:divide-surface-800">
          {conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            return (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`w-full text-left p-4 transition-all flex flex-col gap-1.5 hover:bg-surface-50 dark:hover:bg-surface-800/40 ${
                  isActive ? 'bg-brand-50/50 dark:bg-brand-950/20 border-l-2 border-brand-500' : ''
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold text-surface-900 dark:text-white truncate">
                    {conv.contactName}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {conv.channel === 'email' && <Mail size={12} className="text-blue-500" />}
                    {conv.channel === 'chat' && <MessageSquare size={12} className="text-emerald-500" />}
                    {conv.channel === 'telegram' && <span className="text-[10px] bg-sky-500/10 text-sky-500 px-1 py-0.5 rounded font-mono">TG</span>}
                    {conv.unread && (
                      <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse"></span>
                    )}
                  </div>
                </div>

                <div className="text-xs font-bold text-surface-800 dark:text-surface-200 truncate">
                  {conv.subject}
                </div>

                <p className="text-[11px] text-surface-500 dark:text-surface-450 truncate">
                  {conv.lastMessage}
                </p>

                <div className="flex items-center justify-between text-[10px] text-surface-400 mt-1">
                  <span className="capitalize">{conv.status}</span>
                  {conv.ticketId && (
                    <span className="flex items-center gap-0.5 text-emerald-500 font-semibold bg-emerald-500/10 px-1 py-0.5 rounded">
                      <Ticket size={8} /> Collegato
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Active Chat (Middle Panel) */}
      <div className="flex-1 flex flex-col bg-surface-50 dark:bg-surface-950 border-r border-surface-200 dark:border-surface-800">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-surface-900 dark:text-white">
                  {activeConversation.subject}
                </h3>
                <p className="text-[11px] text-surface-550 dark:text-surface-450 mt-0.5">
                  Con: <span className="font-semibold">{activeConversation.contactName}</span> ({activeConversation.contactEmail})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={activeConversation.status}
                  onChange={(e) => updateConversationStatus(activeConversation.id, e.target.value as any)}
                  className="bg-surface-50 dark:bg-surface-800 text-[11px] font-semibold text-surface-700 dark:text-surface-200 border border-surface-200 dark:border-surface-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="open">Aperto</option>
                  <option value="waiting">In Attesa</option>
                  <option value="closed">Chiuso</option>
                </select>
              </div>
            </div>

            {/* Messages body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {activeConversation.messages.map((msg) => {
                const isAgent = msg.sender === 'agent';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[70%] ${
                      isAgent ? 'ml-auto items-end' : 'mr-auto items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-surface-500">
                      <span className="font-semibold">{msg.senderName}</span>
                      <span>•</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div
                      className={`text-xs px-3.5 py-2.5 rounded-2xl shadow-sm ${
                        isAgent
                          ? 'bg-brand-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-800 dark:text-surface-200 rounded-tl-none'
                      }`}
                    >
                      {msg.body}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSend} className="p-4 border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 flex items-center gap-3">
              <SnippetHelper onSelect={(txt) => setReplyText((prev) => prev ? prev + ' ' + txt : txt)} />
              <input
                type="text"
                placeholder="Digita la tua risposta per l'operatore..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 bg-surface-50 dark:bg-surface-800 border border-surface-250 dark:border-surface-750 text-xs text-surface-900 dark:text-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg p-2.5 transition-all shadow-md flex items-center justify-center"
              >
                <Send size={14} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-surface-450 dark:text-surface-550">
            <MessageSquare size={36} className="mb-2 opacity-50 text-brand-500" />
            <p className="text-xs font-bold">Nessuna conversazione selezionata</p>
            <p className="text-[11px] opacity-75 mt-1">Scegli un canale o un thread dalla colonna a sinistra per iniziare.</p>
          </div>
        )}
      </div>

      {/* 3. Contact Context Card (Right Panel) */}
      <div className="w-80 bg-white dark:bg-surface-900/60 p-4 overflow-y-auto space-y-5 flex flex-col justify-between border-l border-surface-200 dark:border-surface-800 shrink-0">
        {activeConversation && (
          <div className="space-y-5">
            {/* Contact Info Header */}
            <div className="text-center space-y-2 pb-4 border-b border-surface-100 dark:border-surface-800">
              <div className="h-12 w-12 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto">
                <User size={24} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-surface-900 dark:text-white">
                  {activeConversation.contactName}
                </h4>
                <p className="text-[10px] text-surface-400 font-mono mt-0.5">
                  ID: {activeConversation.contactId}
                </p>
              </div>
            </div>

            {/* Profile Bio Details */}
            <div className="space-y-2">
              <h5 className="text-[10px] font-bold tracking-wider text-surface-400 uppercase">Informazioni Contatto</h5>
              <div className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-3 space-y-2.5 text-xs">
                {linkedContact ? (
                  <>
                    <div>
                      <span className="text-[10px] opacity-75 block">Job Title</span>
                      <span className="font-semibold">{linkedContact.job_title || 'Nessuno'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] opacity-75 block">Department</span>
                      <span className="font-semibold">{linkedContact.department || 'Nessuno'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] opacity-75 block">Email</span>
                      <span className="font-mono">{linkedContact.email || 'Nessuna'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] opacity-75 block">Telefono</span>
                      <span className="font-mono">{linkedContact.phone || 'Nessuno'}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-surface-500">Contatto ospite non sincronizzato.</p>
                )}
              </div>
            </div>

            {/* Connected active deals */}
            <div className="space-y-2">
              <h5 className="text-[10px] font-bold tracking-wider text-surface-400 uppercase">Deal Attivi</h5>
              {linkedDeals.length > 0 ? (
                <div className="space-y-1.5">
                  {linkedDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="bg-surface-50 dark:bg-surface-900 border border-surface-150 dark:border-surface-800/80 rounded-lg p-2 flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <p className="font-bold text-surface-850 dark:text-surface-100 truncate">{deal.title}</p>
                        <p className="text-[10px] text-surface-450 uppercase">{deal.stage}</p>
                      </div>
                      <span className="font-semibold shrink-0">
                        {deal.value.toLocaleString()} {deal.currency}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-surface-500 italic pl-1">Nessun deal attivo trovato.</p>
              )}
            </div>

            {/* Ticket Management Panel */}
            <div className="space-y-2 pt-2 border-t border-surface-100 dark:border-surface-800">
              <h5 className="text-[10px] font-bold tracking-wider text-surface-400 uppercase">Gestione Supporto</h5>
              {linkedTicket ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle size={14} />
                    <span>Richiesta Collegata a Ticket</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-surface-500 block">Codice Ticket</span>
                    <span className="font-mono font-bold text-surface-900 dark:text-white">{linkedTicket.code}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-surface-500 block">Stato / Priorità</span>
                    <span className="capitalize">{linkedTicket.status} ({linkedTicket.priority})</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-surface-500">Converti questa chat in un ticket di supporto tracciabile nel sistema.</p>
                  <button
                    onClick={handleCreateTicket}
                    disabled={createTicketMutation.isPending}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow transition-all"
                  >
                    <Ticket size={13} />
                    {createTicketMutation.isPending ? 'Creazione in corso...' : 'Converti in Ticket'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer info brand */}
        <div className="text-[9px] text-center text-surface-400 pt-4 border-t border-surface-100 dark:border-surface-850">
          Powered by Giuseppe Lobbene / Lobbenedesign
        </div>
      </div>
    </div>
  );
}
