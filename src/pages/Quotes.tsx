import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import {
  FileText, Plus, Printer, CheckCircle, Clock,
  Trash2, Send, XCircle, ArrowRight
} from 'lucide-react';
import { useQuotesStore, type Quote } from '../store/quotesStore';
import { useInvoicesStore, type InvoiceItem } from '../store/invoicesStore';
import { useContacts } from '../hooks/useContacts';
import { useDeals } from '../hooks/useDeals';
import { useCreateActivity } from '../hooks/useActivities';
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

export default function Quotes() {
  const { quotes, addQuote, updateQuote, removeQuote } = useQuotesStore(
    useShallow((s) => ({ quotes: s.quotes, addQuote: s.addQuote, updateQuote: s.updateQuote, removeQuote: s.removeQuote }))
  );
  const addInvoice = useInvoicesStore((s) => s.addInvoice);
  const { data: contacts = [] } = useContacts();
  const { data: deals = [] } = useDeals();
  const createActivity = useCreateActivity();
  const pushToast = useToastStore((s) => s.push);

  const [showCreate, setShowCreate] = useState(false);
  const [showPreview, setShowPreview] = useState<Quote | null>(null);

  // Form Nuovo Preventivo
  const [number, setNumber] = useState(`PREV-2026-${String(quotes.length + 1).padStart(3, '0')}`);
  const [contactId, setContactId] = useState('');
  const [dealId, setDealId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('Offerta valida per 30 giorni dalla data di emissione.');
  
  // Linee preventivo
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: 'Licenza Software annuale', quantity: 1, unit_price: 1500, vat_rate: 22 }
  ]);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newItemVat, setNewItemVat] = useState(22);

  const handleAddItem = () => {
    if (!newItemDesc) return;
    setItems([...items, {
      description: newItemDesc,
      quantity: Number(newItemQty),
      unit_price: Number(newItemPrice),
      vat_rate: Number(newItemVat)
    }]);
    setNewItemDesc('');
    setNewItemQty(1);
    setNewItemPrice(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = (items: InvoiceItem[]) => {
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const vat = items.reduce((acc, item) => acc + ((item.quantity * item.unit_price) * (item.vat_rate / 100)), 0);
    const total = subtotal + vat;
    return { subtotal, vat, total };
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId || items.length === 0) {
      pushToast({ kind: 'info', title: 'Campi obbligatori', body: 'Seleziona un cliente ed inserisci almeno una riga.' });
      return;
    }

    addQuote({
      number,
      contact_id: contactId,
      deal_id: dealId || null,
      issue_date: new Date().toISOString().split('T')[0],
      expiry_date: expiryDate || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      items,
      notes,
    });

    pushToast({ kind: 'success', title: 'Preventivo generato', body: 'Salvato in bozza con successo.' });
    setShowCreate(false);

    // Reset
    setContactId('');
    setDealId('');
    setExpiryDate('');
    setItems([{ description: 'Licenza Software annuale', quantity: 1, unit_price: 1500, vat_rate: 22 }]);
    setNumber(`PREV-2026-${String(quotes.length + 2).padStart(3, '0')}`);
  };

  const handleConvertToInvoice = (quote: Quote) => {
    const invoice = addInvoice({
      number: `FATT-2026-${Math.floor(Math.random() * 1000)}`, // Auto-generated for demo
      contact_id: quote.contact_id,
      deal_id: quote.deal_id,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      items: quote.items,
      notes: 'Fattura generata da preventivo ' + quote.number,
    });
    
    updateQuote(quote.id, { status: 'accepted' });
    
    if (quote.deal_id) {
      createActivity.mutate({
        deal_id: quote.deal_id,
        contact_id: quote.contact_id,
        type: 'stage_change',
        subject: `Preventivo Accettato e Fatturato — ${quote.number}`,
        body: `Il preventivo ${quote.number} è stato accettato e convertito nella fattura ${invoice.number}.`,
        source: 'user',
        confidence: 1
      });
    }

    pushToast({ kind: 'success', title: 'Convertito in Fattura', body: `Generata fattura bozza ${invoice.number}.` });
    setShowPreview(null);
  };

  const { total } = calculateTotals(quotes.flatMap((q) => q.items));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="text-brand-500" />
            Qi-Quote
          </h1>
          <p className="text-surface-500 dark:text-surface-400 text-sm mt-1">
            Crea, invia e converti preventivi in fatture in un clic.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary gap-2">
          <Plus size={16} /> Nuovo Preventivo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-4 rounded-xl shadow-sm">
          <p className="text-xs text-surface-500 dark:text-surface-400 font-medium uppercase">Preventivi Emessi</p>
          <p className="text-2xl font-bold mt-1">{quotes.length}</p>
        </div>
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-4 rounded-xl shadow-sm">
          <p className="text-xs text-surface-500 dark:text-surface-400 font-medium uppercase">Bozze</p>
          <p className="text-2xl font-bold mt-1 text-surface-400">{quotes.filter(q => q.status === 'draft').length}</p>
        </div>
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-4 rounded-xl shadow-sm">
          <p className="text-xs text-surface-500 dark:text-surface-400 font-medium uppercase">Accettati</p>
          <p className="text-2xl font-bold mt-1 text-trust-high">{quotes.filter(q => q.status === 'accepted').length}</p>
        </div>
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-4 rounded-xl shadow-sm">
          <p className="text-xs text-surface-500 dark:text-surface-400 font-medium uppercase">Valore Totale</p>
          <p className="text-2xl font-bold mt-1">€ {total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-500 dark:text-surface-400 border-b border-surface-200 dark:border-surface-800">
            <tr>
              <th className="px-4 py-3 font-medium">Numero</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Data / Scadenza</th>
              <th className="px-4 py-3 font-medium text-right">Totale</th>
              <th className="px-4 py-3 font-medium">Stato</th>
              <th className="px-4 py-3 font-medium text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
            {quotes.map((quote) => {
              const contact = contacts.find(c => c.id === quote.contact_id);
              const { total } = calculateTotals(quote.items);
              const isOverdue = new Date(quote.expiry_date) < new Date() && quote.status !== 'accepted';
              
              return (
                <tr key={quote.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                  <td className="px-4 py-3 font-medium cursor-pointer" onClick={() => setShowPreview(quote)}>
                    <span className="text-brand-600 dark:text-brand-400 hover:underline">{quote.number}</span>
                  </td>
                  <td className="px-4 py-3">
                    {contact ? (
                      <div>
                        <div className="font-medium text-surface-900 dark:text-surface-50">{contact.first_name} {contact.last_name}</div>
                        <div className="text-[10px] text-surface-500">{typeof contact.company === 'string' ? contact.company : contact.company?.name || ''}</div>
                      </div>
                    ) : 'Sconosciuto'}
                  </td>
                  <td className="px-4 py-3 text-surface-600 dark:text-surface-300">
                    {quote.issue_date} <br/> 
                    <span className={isOverdue ? 'text-red-500 font-medium' : 'text-surface-400 text-[10px]'}>
                      scade {quote.expiry_date}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-right">€ {total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      quote.status === 'draft' ? 'bg-surface-200 text-surface-700 dark:bg-surface-700 dark:text-surface-300' :
                      quote.status === 'sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      quote.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {quote.status === 'draft' && <Clock size={12} />}
                      {quote.status === 'sent' && <Send size={12} />}
                      {quote.status === 'accepted' && <CheckCircle size={12} />}
                      {quote.status === 'rejected' && <XCircle size={12} />}
                      {quote.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setShowPreview(quote)} className="p-1.5 text-surface-400 hover:text-brand-500 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                      <Printer size={16} />
                    </button>
                    <button onClick={() => removeQuote(quote.id)} className="p-1.5 text-surface-400 hover:text-red-500 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {quotes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-surface-500">
                  Nessun preventivo trovato. Creane uno per iniziare.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Creazione Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-900 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800">
              <h2 className="text-xl font-bold flex items-center gap-2"><Plus className="text-brand-500" /> Crea Nuovo Preventivo</h2>
              <button onClick={() => setShowCreate(false)} className="text-surface-500 hover:text-surface-900 dark:hover:text-white">Chiudi</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="quote-form" onSubmit={handleCreate} className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Field label="Numero Preventivo">
                    <input value={number} onChange={(e) => setNumber(e.target.value)} className={inputCls} required />
                  </Field>
                  <Field label="Cliente (Obbligatorio)">
                    <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inputCls} required>
                      <option value="">Seleziona...</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                    </select>
                  </Field>
                  <Field label="Deal Associato (Opzionale)">
                    <select value={dealId} onChange={(e) => setDealId(e.target.value)} className={inputCls}>
                      <option value="">Nessuno...</option>
                      {deals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                    </select>
                  </Field>
                  <Field label="Data di Scadenza">
                    <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputCls} />
                  </Field>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-surface-500 dark:text-surface-400">Linee Preventivo</label>
                  <div className="border border-surface-200 dark:border-surface-800 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-surface-50 dark:bg-surface-800/50 text-xs text-surface-500">
                        <tr>
                          <th className="px-3 py-2 font-medium">Descrizione</th>
                          <th className="px-3 py-2 font-medium w-24">Q.tà</th>
                          <th className="px-3 py-2 font-medium w-32">Prezzo U. (€)</th>
                          <th className="px-3 py-2 font-medium w-24">IVA (%)</th>
                          <th className="px-3 py-2 font-medium w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                        {items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">{it.description}</td>
                            <td className="px-3 py-2">{it.quantity}</td>
                            <td className="px-3 py-2">€ {it.unit_price}</td>
                            <td className="px-3 py-2">{it.vat_rate}%</td>
                            <td className="px-3 py-2 text-right">
                              <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-600"><Trash2 size={14}/></button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-surface-50 dark:bg-surface-800/30">
                          <td className="px-3 py-2"><input placeholder="Nuova voce..." value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)} className={inputCls} /></td>
                          <td className="px-3 py-2"><input type="number" min="1" value={newItemQty} onChange={(e) => setNewItemQty(Number(e.target.value))} className={inputCls} /></td>
                          <td className="px-3 py-2"><input type="number" min="0" step="0.01" value={newItemPrice} onChange={(e) => setNewItemPrice(Number(e.target.value))} className={inputCls} /></td>
                          <td className="px-3 py-2"><input type="number" min="0" max="100" value={newItemVat} onChange={(e) => setNewItemVat(Number(e.target.value))} className={inputCls} /></td>
                          <td className="px-3 py-2 text-right">
                            <button type="button" onClick={handleAddItem} className="btn bg-surface-200 hover:bg-surface-300 dark:bg-surface-700 dark:hover:bg-surface-600 text-surface-900 dark:text-white px-3 py-2 rounded-lg text-xs font-semibold">Aggiungi</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <Field label="Note e Termini">
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} />
                </Field>

              </form>
            </div>
            <div className="px-6 py-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setShowCreate(false)} className="btn btn-secondary">Annulla</button>
              <button form="quote-form" type="submit" className="btn btn-primary">Salva Bozza</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (() => {
        const c = contacts.find(x => x.id === showPreview.contact_id);
        const { subtotal, vat, total } = calculateTotals(showPreview.items);
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-900 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800">
                <h2 className="text-xl font-bold">Preventivo {showPreview.number}</h2>
                <div className="flex items-center gap-2">
                  {showPreview.status !== 'accepted' && (
                    <button 
                      onClick={() => handleConvertToInvoice(showPreview)} 
                      className="btn bg-brand-500 hover:bg-brand-600 text-white gap-2 border-0"
                    >
                      Converti in Fattura <ArrowRight size={16} />
                    </button>
                  )}
                  <button onClick={() => window.print()} className="btn btn-secondary gap-2"><Printer size={16} /> Stampa</button>
                  <button onClick={() => setShowPreview(null)} className="text-surface-500 hover:text-surface-900 dark:hover:text-white px-2">Chiudi</button>
                </div>
              </div>
              <div className="p-8 overflow-y-auto flex-1 text-surface-900 dark:text-surface-100 print-area space-y-8">
                <div className="flex justify-between items-start border-b border-surface-200 dark:border-surface-800 pb-8">
                  <div>
                    <h1 className="text-4xl font-extrabold text-brand-500 tracking-tight">PREVENTIVO</h1>
                    <p className="text-surface-500 font-medium mt-1">N. {showPreview.number}</p>
                    <p className="text-sm mt-4">Data Emissione: <strong>{showPreview.issue_date}</strong></p>
                    <p className="text-sm">Data Scadenza: <strong>{showPreview.expiry_date}</strong></p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">Qi-CRM S.p.A.</p>
                    <p className="text-sm text-surface-500">Via Milano 123, 20100 MI</p>
                    <p className="text-sm text-surface-500">P.IVA: IT12345678901</p>
                  </div>
                </div>

                <div className="bg-surface-50 dark:bg-surface-800/50 p-6 rounded-xl border border-surface-200 dark:border-surface-800">
                  <p className="text-xs font-bold text-surface-500 uppercase tracking-wide mb-2">Spett.le Cliente</p>
                  <p className="font-bold text-lg">{typeof c?.company === 'string' ? c?.company : c?.company?.name || 'Privato'}</p>
                  <p className="text-surface-600 dark:text-surface-300">Attn: {c?.first_name} {c?.last_name}</p>
                  <p className="text-surface-600 dark:text-surface-300">{c?.email}</p>
                </div>

                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-surface-200 dark:border-surface-700 text-sm">
                      <th className="py-3 font-bold">Descrizione</th>
                      <th className="py-3 font-bold text-center w-20">Q.tà</th>
                      <th className="py-3 font-bold text-right w-32">Prezzo Un.</th>
                      <th className="py-3 font-bold text-right w-24">IVA</th>
                      <th className="py-3 font-bold text-right w-32">Importo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                    {showPreview.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-4">{it.description}</td>
                        <td className="py-4 text-center text-surface-500">{it.quantity}</td>
                        <td className="py-4 text-right text-surface-500">€ {it.unit_price.toFixed(2)}</td>
                        <td className="py-4 text-right text-surface-500">{it.vat_rate}%</td>
                        <td className="py-4 text-right font-medium">€ {(it.quantity * it.unit_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end pt-4">
                  <div className="w-64 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-surface-500">Imponibile</span>
                      <span>€ {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-surface-500">Imposta (IVA)</span>
                      <span>€ {vat.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t border-surface-200 dark:border-surface-700 pt-3 text-brand-600 dark:text-brand-400">
                      <span>Totale</span>
                      <span>€ {total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-surface-200 dark:border-surface-800 text-sm text-surface-500">
                  <p className="font-bold mb-1 text-surface-900 dark:text-surface-100">Note e Condizioni</p>
                  <p className="whitespace-pre-line">{showPreview.notes}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
