import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface InboxMessage {
  id: string;
  sender: 'contact' | 'agent';
  senderName: string;
  body: string;
  timestamp: string;
}

export interface InboxConversation {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  channel: 'email' | 'chat' | 'telegram';
  subject: string;
  lastMessage: string;
  unread: boolean;
  status: 'open' | 'waiting' | 'closed';
  messages: InboxMessage[];
  ticketId?: string;
}

interface InboxState {
  conversations: InboxConversation[];
  activeConversationId: string | null;
  selectConversation: (id: string | null) => void;
  sendMessage: (conversationId: string, body: string, sender: 'contact' | 'agent', senderName: string) => void;
  updateConversationStatus: (id: string, status: 'open' | 'waiting' | 'closed') => void;
  setTicketId: (id: string, ticketId: string) => void;
}

const DEFAULT_CONVERSATIONS: InboxConversation[] = [
  {
    id: 'conv-1',
    contactId: 'ct-verdi',
    contactName: 'Giulia Verdi',
    contactEmail: 'giulia@nexus.it',
    channel: 'chat',
    subject: 'Richiesta integrazione API custom',
    lastMessage: 'Potete spiegarmi come funziona la sincronizzazione dei lead?',
    unread: true,
    status: 'open',
    messages: [
      {
        id: 'msg-1-1',
        sender: 'contact',
        senderName: 'Giulia Verdi',
        body: 'Salve, stiamo configurando il CRM e avremmo bisogno di informazioni sulle API custom.',
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString()
      },
      {
        id: 'msg-1-2',
        sender: 'agent',
        senderName: 'Giuseppe Lobbene',
        body: 'Certamente Giulia! Il nostro sistema supporta webhooks e un\'API REST completa. Posso mandarti la documentazione?',
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
      },
      {
        id: 'msg-1-3',
        sender: 'contact',
        senderName: 'Giulia Verdi',
        body: 'Sì grazie. Inoltre, potete spiegarmi come funziona la sincronizzazione dei lead?',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
      }
    ]
  },
  {
    id: 'conv-2',
    contactId: 'ct-rossi',
    contactName: 'Mario Rossi',
    contactEmail: 'mario.rossi@acme.com',
    channel: 'email',
    subject: 'Info Rinnovo Licenze Enterprise',
    lastMessage: 'Resto in attesa della vostra migliore proposta commerciale.',
    unread: false,
    status: 'waiting',
    messages: [
      {
        id: 'msg-2-1',
        sender: 'contact',
        senderName: 'Mario Rossi',
        body: 'Buongiorno Giuseppe, ci stiamo avvicinando alla scadenza delle licenze di test. Vorremmo discutere del passaggio al piano Enterprise.',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: 'msg-2-2',
        sender: 'agent',
        senderName: 'Giuseppe Lobbene',
        body: 'Buongiorno Mario, ho preparato una bozza di accordo con uno sconto del 15% per pagamento annuale anticipato. La trovi nella sezione Contratti.',
        timestamp: new Date(Date.now() - 3600000 * 18).toISOString()
      },
      {
        id: 'msg-2-3',
        sender: 'contact',
        senderName: 'Mario Rossi',
        body: 'Grazie, la esamino oggi con il team finance. Resto in attesa della vostra migliore proposta commerciale.',
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString()
      }
    ]
  },
  {
    id: 'conv-3',
    contactId: 'ct-ferrari',
    contactName: 'Anna Ferrari',
    contactEmail: 'a.ferrari@globex.com',
    channel: 'telegram',
    subject: 'Problema visualizzazione dashboard KPI',
    lastMessage: 'Non vedo i grafici della pipeline dei rinnovi.',
    unread: true,
    status: 'open',
    messages: [
      {
        id: 'msg-3-1',
        sender: 'contact',
        senderName: 'Anna Ferrari',
        body: 'Ciao! C\'è un problema con la visualizzazione della dashboard KPI su mobile.',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'msg-3-2',
        sender: 'contact',
        senderName: 'Anna Ferrari',
        body: 'Non vedo i grafici della pipeline dei rinnovi.',
        timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString()
      }
    ]
  }
];

export const useInboxStore = create<InboxState>()(
  persist(
    (set) => ({
      conversations: DEFAULT_CONVERSATIONS,
      activeConversationId: 'conv-1',

      selectConversation: (id) =>
        set((s) => ({
          activeConversationId: id,
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, unread: false } : c
          )
        })),

      sendMessage: (conversationId, body, sender, senderName) =>
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id === conversationId) {
              const newMsg: InboxMessage = {
                id: `msg-${Math.random().toString(36).substring(2, 10)}`,
                sender,
                senderName,
                body,
                timestamp: new Date().toISOString()
              };
              return {
                ...c,
                lastMessage: body,
                unread: sender === 'contact' ? true : c.unread,
                messages: [...c.messages, newMsg]
              };
            }
            return c;
          })
        })),

      updateConversationStatus: (id, status) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, status } : c
          )
        })),

      setTicketId: (id, ticketId) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, ticketId } : c
          )
        }))
    }),
    {
      name: 'qi-crm-shared-inbox-v1'
    }
  )
);
