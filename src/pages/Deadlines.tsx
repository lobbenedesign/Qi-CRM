import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import {
  Calendar as CalendarIcon, List, Clock, CheckCircle2, AlertTriangle,
  Plus, CalendarDays, Bell, Trash2, Check
} from 'lucide-react';
import { useDeadlinesStore, type Deadline, type DeadlineCategory } from '../store/deadlinesStore';
import { useOrgSettingsStore } from '../store/orgSettingsStore';
import { useToastStore } from '../store/toastStore';

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 outline-none focus:ring-2 focus:ring-brand-500/30';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-surface-500 dark:text-surface-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

const CATEGORY_META = {
  tax:      { label: 'Fisco & Tasse',      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  vendor:   { label: 'Fornitori',          color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  client:   { label: 'Clienti',            color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  contract: { label: 'Rinnovo Contratti',  color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
  invoice:  { label: 'Fatturazione',       color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  other:    { label: 'Altro',              color: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400 border-surface-200 dark:border-surface-700' }
};

export default function Deadlines() {
  const { deadlines, addDeadline, toggleComplete, removeDeadline } = useDeadlinesStore(
    useShallow((s) => ({ deadlines: s.deadlines, addDeadline: s.addDeadline, toggleComplete: s.toggleComplete, removeDeadline: s.removeDeadline }))
  );
  const org = useOrgSettingsStore();
  const pushToast = useToastStore((s) => s.push);

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);

  // Form Nuovo Scadenzario
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState<DeadlineCategory>('tax');
  const [amount, setAmount] = useState<string>('');
  const [notifyTg, setNotifyTg] = useState(false);
  const [notifyMail, setNotifyMail] = useState(false);

  // Mese/Anno di visualizzazione del Calendario
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) {
      pushToast({ kind: 'info', title: 'Campi mancanti', body: 'Inserisci il titolo ed una data di scadenza valida.' });
      return;
    }
    addDeadline({
      title,
      description: desc,
      due_date: dueDate,
      category,
      amount: amount ? Number(amount) : null,
      contact_id: null,
      deal_id: null,
      notify_telegram: notifyTg,
      notify_email: notifyMail,
    });
    pushToast({ kind: 'success', title: 'Scadenza registrata', body: 'Salvata nel tuo scadenzario.' });
    setShowCreate(false);
    // Reset
    setTitle('');
    setDesc('');
    setDueDate('');
    setCategory('tax');
    setAmount('');
    setNotifyTg(false);
    setNotifyMail(false);
  };

  // TRIGGER NOTIFICA REALE (via Bot Telegram o Email Resend)
  const sendRealNotification = async (dl: Deadline) => {
    let triggered = false;

    // 1. Invio Telegram Reale
    if (dl.notify_telegram && org.telegram.bot_token) {
      // Invia a una chat ID salvata nelle impostazioni o chiedila in popup
      const targetChat = prompt("Inserisci il tuo Telegram Chat ID per ricevere l'alert in tempo reale:", "1048293");
      if (targetChat) {
        try {
          const text = `⚠️ *SCADENZA IMMINENTE* ⚠️\n\n*Titolo:* ${dl.title}\n*Data:* ${dl.due_date}\n*Importo:* ${dl.amount ? `€${dl.amount}` : 'N/A'}\n\n_Gestionale Qi-CRM_`;
          await fetch(`https://api.telegram.org/bot${org.telegram.bot_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: targetChat, text, parse_mode: 'Markdown' })
          });
          pushToast({ kind: 'success', title: 'Notifica Telegram inviata ✓', body: 'Alert inviato al tuo Bot.' });
          triggered = true;
        } catch (e: any) {
          pushToast({ kind: 'info', title: 'Errore Notifica Telegram', body: e.message });
        }
      }
    }

    // 2. Invio Email Reale
    if (dl.notify_email && org.email.api_key && org.email.from_address) {
      const targetEmail = prompt("Inserisci l'indirizzo email per ricevere la notifica:", "admin@xyz.it");
      if (targetEmail) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${org.email.api_key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: `${org.email.from_name} <${org.email.from_address}>`,
              to: [targetEmail],
              subject: `Scadenza CRM: ${dl.title}`,
              html: `<h3>Avviso di Scadenza Qi-CRM</h3>
                     <p>La scadenza <strong>${dl.title}</strong> è pianificata per il <strong>${dl.due_date}</strong>.</p>
                     <p>Descrizione: ${dl.description}</p>
                     <p>Importo: €${dl.amount ?? 'N/A'}</p>`
            })
          });
          pushToast({ kind: 'success', title: 'Email di notifica inviata ✓', body: `Recapitata a ${targetEmail}` });
          triggered = true;
        } catch (e: any) {
          pushToast({ kind: 'info', title: 'Errore Notifica Email', body: e.message });
        }
      }
    }

    if (!triggered) {
      pushToast({ kind: 'info', title: 'Nessun canale configurato', body: 'Configura API Keys in Integrazioni per inviare notifiche reali.' });
    }
  };

  // --- LOGICA CALENDARIO ---
  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayIndex = () => new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const renderCalendarCells = () => {
    const totalDays = daysInMonth(currentMonth, currentYear);
    const startOffset = (firstDayIndex() + 6) % 7; // Lunedì come inizio settimana
    const cells: React.ReactNode[] = [];

    // Vuoti iniziali
    for (let i = 0; i < startOffset; i++) {
      cells.push(<div key={`empty-${i}`} className="h-28 bg-surface-50/50 dark:bg-surface-900/10 border border-surface-100 dark:border-surface-800/40" />);
    }

    // Giorni mese
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayDeadlines = deadlines.filter((d) => d.due_date === dateStr && (filterCategory === 'all' || d.category === filterCategory));

      cells.push(
        <div key={`day-${day}`} className="h-28 border border-surface-200 dark:border-surface-800 p-1.5 flex flex-col gap-1 overflow-y-auto bg-white dark:bg-surface-900 hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${dateStr === today.toISOString().split('T')[0] ? 'bg-brand-600 text-white' : 'text-surface-500'}`}>
            {day}
          </span>
          <div className="flex flex-col gap-1 flex-1">
            {dayDeadlines.map((dl) => {
              const meta = CATEGORY_META[dl.category];
              const isOverdue = new Date(dl.due_date) < new Date() && dl.status === 'pending';
              return (
                <div
                  key={dl.id}
                  onClick={() => pushToast({ kind: 'info', title: dl.title, body: `${dl.description} — Scadenza: ${dl.due_date}` })}
                  className={`text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer font-medium leading-tight flex items-center gap-1
                    ${dl.status === 'completed' ? 'opacity-50 line-through' : ''} ${meta.color} ${isOverdue ? 'border-rose-600 bg-rose-600/10' : ''}`}
                >
                  {isOverdue && <AlertTriangle size={9} className="text-rose-600 animate-pulse shrink-0" />}
                  {dl.title}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return cells;
  };

  const filteredDeadlines = deadlines.filter((d) => {
    const isCatMatch = filterCategory === 'all' || d.category === filterCategory;
    return isCatMatch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2.5">
          <CalendarIcon className="text-brand-500" size={24} />
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Scadenzario Aziendale</h1>
            <p className="text-xs text-surface-400">Pianifica tasse, pagamenti ai fornitori e ricevi alert via email o bot Telegram</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle Vista */}
          <div className="bg-surface-100 dark:bg-surface-800 rounded-lg p-0.5 flex">
            <button onClick={() => setViewMode('calendar')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-white dark:bg-surface-700 shadow-sm text-brand-600' : 'text-surface-400'}`}>
              <CalendarDays size={16} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-surface-700 shadow-sm text-brand-600' : 'text-surface-400'}`}>
              <List size={16} />
            </button>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Nuova Scadenza
          </button>
        </div>
      </div>

      {/* Filtro Categoria */}
      <div className="flex gap-2 flex-wrap border-b border-surface-200 dark:border-surface-800 pb-3">
        <button onClick={() => setFilterCategory('all')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filterCategory === 'all' ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600' : 'text-surface-500 hover:bg-surface-100'}`}>Tutte</button>
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setFilterCategory(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all
              ${filterCategory === key 
                ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border border-brand-500/20' 
                : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 border border-transparent'}`}
          >
            {meta.label}
          </button>
        ))}
      </div>

      {/* CONTENUTO PRINCIPALE */}
      {viewMode === 'calendar' ? (
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-surface-100 dark:border-surface-800">
            <h2 className="text-base font-bold text-surface-800 dark:text-surface-100">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <div className="flex gap-1.5">
              <button onClick={handlePrevMonth} className="p-1 px-2.5 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 rounded text-xs transition-colors">Prec</button>
              <button onClick={handleNextMonth} className="p-1 px-2.5 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 rounded text-xs transition-colors">Succ</button>
            </div>
          </div>
          {/* Griglia Calendario */}
          <div className="grid grid-cols-7 text-center font-semibold text-xs text-surface-500 gap-1 mb-1">
            <div>Lun</div><div>Mar</div><div>Mer</div><div>Gio</div><div>Ven</div><div>Sab</div><div>Dom</div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {renderCalendarCells()}
          </div>
        </div>
      ) : (
        /* Vista Lista */
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 text-xs text-surface-500 uppercase">
                <tr>
                  <th className="p-4">Scadenza</th>
                  <th className="p-4">Data Scadenza</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4">Importo</th>
                  <th className="p-4">Stato</th>
                  <th className="p-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                {filteredDeadlines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-surface-400">Nessuna scadenza trovata.</td>
                  </tr>
                ) : (
                  filteredDeadlines.map((dl) => {
                    const meta = CATEGORY_META[dl.category];
                    const isOverdue = new Date(dl.due_date) < new Date() && dl.status === 'pending';
                    return (
                      <tr key={dl.id} className={`hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors ${dl.status === 'completed' ? 'opacity-60' : ''}`}>
                        <td className="p-4">
                          <p className={`font-semibold text-surface-900 dark:text-surface-100 ${dl.status === 'completed' ? 'line-through' : ''}`}>{dl.title}</p>
                          <p className="text-xs text-surface-400 mt-0.5">{dl.description}</p>
                        </td>
                        <td className="p-4 font-mono font-medium text-surface-800 dark:text-surface-200 flex items-center gap-1.5">
                          {dl.due_date}
                          {isOverdue && (
                            <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[9px] font-bold rounded flex items-center gap-1">
                              <AlertTriangle size={8} className="animate-pulse" /> SCADUTA
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.color}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-medium">
                          {dl.amount ? `€${dl.amount.toLocaleString('it-IT')}` : '-'}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold
                            ${dl.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {dl.status === 'completed' ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                            {dl.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button onClick={() => toggleComplete(dl.id)} className={`p-2 rounded-lg transition-colors border ${dl.status === 'completed' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : 'border-surface-200 dark:border-surface-850 hover:bg-surface-100 text-surface-500'}`} title="Completa">
                            <Check size={14} />
                          </button>
                          {(dl.notify_email || dl.notify_telegram) && (
                            <button onClick={() => sendRealNotification(dl)} className="p-2 border border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-lg transition-colors" title="Invia Notifica Reale">
                              <Bell size={14} />
                            </button>
                          )}
                          <button onClick={() => removeDeadline(dl.id)} className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors" title="Elimina">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NUOVA SCADENZA */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <CalendarIcon size={20} className="text-brand-500" />
              Pianifica Nuova Scadenza
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Titolo Scadenza *">
                <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es: Scadenza Acconto IVA" className={inputCls} />
              </Field>

              <Field label="Descrizione Dettagliata">
                <textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Aggiungi note importanti..." className={inputCls} />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Data di Scadenza *">
                  <input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Categoria">
                  <select value={category} onChange={(e) => setCategory(e.target.value as any)} className={inputCls}>
                    <option value="tax">Fisco & Tasse</option>
                    <option value="vendor">Fornitori</option>
                    <option value="client">Clienti</option>
                    <option value="contract">Rinnovo Contratti</option>
                    <option value="invoice">Fatturazione</option>
                    <option value="other">Altro</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Importo (€, Opzionale)">
                  <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Es: 1200.00" className={inputCls} />
                </Field>
              </div>

              <div className="border-t border-surface-100 dark:border-surface-800 pt-3 space-y-2">
                <span className="text-[11px] font-bold text-surface-400 block mb-1">IMPOSTAZIONI NOTIFICHE REAL-TIME</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-surface-700 dark:text-surface-300 cursor-pointer">
                    <input type="checkbox" checked={notifyTg} onChange={(e) => setNotifyTg(e.target.checked)} className="rounded text-brand-600 focus:ring-brand-500/30" />
                    Telegram Bot Alert
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-surface-700 dark:text-surface-300 cursor-pointer">
                    <input type="checkbox" checked={notifyMail} onChange={(e) => setNotifyMail(e.target.checked)} className="rounded text-brand-600 focus:ring-brand-500/30" />
                    Email Alert (Resend)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 font-semibold">Annulla</button>
                <button type="submit" className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors">Salva Scadenza</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
