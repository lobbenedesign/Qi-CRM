import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import {
  FileSpreadsheet, Plus, Printer, CheckCircle, Clock,
  Trash2, Send, Euro
} from 'lucide-react';
import { useInvoicesStore, type Invoice, type InvoiceItem } from '../store/invoicesStore';
import { useContacts } from '../hooks/useContacts';
import { useDeals } from '../hooks/useDeals';
import { useCreateActivity } from '../hooks/useActivities';
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

export default function Invoices() {
  const { invoices, addInvoice, updateInvoice, removeInvoice } = useInvoicesStore(
    useShallow((s) => ({ invoices: s.invoices, addInvoice: s.addInvoice, updateInvoice: s.updateInvoice, removeInvoice: s.removeInvoice }))
  );
  const { data: contacts = [] } = useContacts();
  const { data: deals = [] } = useDeals();
  const createActivity = useCreateActivity();
  const org = useOrgSettingsStore();
  const pushToast = useToastStore((s) => s.push);

  const [showCreate, setShowCreate] = useState(false);
  const [showPreview, setShowPreview] = useState<Invoice | null>(null);

  // Form Nuovo Documento
  const [number, setNumber] = useState(`FATT-2026-${String(invoices.length + 1).padStart(3, '0')}`);
  const [contactId, setContactId] = useState('');
  const [dealId, setDealId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('Bonifico bancario entro 30 giorni. IBAN: IT00 X 12345 67890 000000001234');
  
  // Linee fattura
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: 'Prestazione professionale setup CRM', quantity: 1, unit_price: 1500, vat_rate: 22 }
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

  const calculateInvoiceTotals = (invoiceItems: InvoiceItem[]) => {
    const subtotal = invoiceItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const vat = invoiceItems.reduce((acc, item) => acc + ((item.quantity * item.unit_price) * (item.vat_rate / 100)), 0);
    const total = subtotal + vat;
    return { subtotal, vat, total };
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId || items.length === 0) {
      pushToast({ kind: 'info', title: 'Campi obbligatori', body: 'Seleziona un cliente ed inserisci almeno una riga di dettaglio.' });
      return;
    }

    addInvoice({
      number,
      contact_id: contactId,
      deal_id: dealId || null,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: dueDate || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      items,
      notes,
    });

    pushToast({ kind: 'success', title: 'Fattura generata', body: 'Salvata in bozza con successo.' });
    setShowCreate(false);

    // Reset
    setContactId('');
    setDealId('');
    setDueDate('');
    setItems([{ description: 'Prestazione professionale setup CRM', quantity: 1, unit_price: 1500, vat_rate: 22 }]);
    setNumber(`FATT-2026-${String(invoices.length + 2).padStart(3, '0')}`);
  };

  // INVIA FATTURA REALE PER EMAIL (Resend)
  const handleSendInvoice = async (invoice: Invoice) => {
    const contactObj = contacts.find(c => c.id === invoice.contact_id);
    const emailTo = contactObj?.email;

    if (!emailTo) {
      pushToast({ kind: 'info', title: 'Nessun destinatario', body: 'Il contatto non possiede un indirizzo email impostato.' });
      return;
    }

    updateInvoice(invoice.id, { status: 'sent', sent_at: new Date().toISOString() });

    const { subtotal, vat, total } = calculateInvoiceTotals(invoice.items);

    // Registra attività sul Deal se presente
    if (invoice.deal_id) {
      createActivity.mutate({
        deal_id: invoice.deal_id,
        contact_id: invoice.contact_id,
        type: 'email',
        subject: `Fattura Inviata — ${invoice.number}`,
        body: `Spedita fattura n. ${invoice.number} del valore totale di €${total.toFixed(2)} all'indirizzo email ${emailTo}.`,
        source: 'user',
        confidence: 1
      });
    }

    if (!org.email.api_key || !org.email.from_address) {
      pushToast({ kind: 'info', title: 'Inviata (Demo Mode)', body: `Email inviata a ${emailTo}. Per invio reale compila le chiavi in Integrazioni.` });
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${org.email.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${org.email.from_name} <${org.email.from_address}>`,
          to: [emailTo],
          subject: `Invio Documento Fatturazione ${invoice.number} — ${org.company_name}`,
          html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px;">
            <h2 style="color: #6366f1;">Fattura N. ${invoice.number}</h2>
            <p>Spettabile cliente, le inviamo in allegato i dettagli del documento emesso il ${invoice.issue_date}.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Descrizione</th>
                  <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">Totale Imponibile</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map(item => `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #cbd5e1;">${item.description} (x${item.quantity})</td>
                    <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">€${(item.quantity * item.unit_price).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div style="text-align: right; font-weight: bold; margin-top: 15px;">
              <p>Totale Imponibile: €${subtotal.toFixed(2)}</p>
              <p>IVA totale: €${vat.toFixed(2)}</p>
              <p style="font-size: 16px; color: #6366f1;">Totale da saldare: €${total.toFixed(2)}</p>
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #64748b;">${invoice.notes}</p>
          </div>`
        })
      });

      if (response.ok) {
        pushToast({ kind: 'success', title: 'Fattura spedita ✓', body: `Inviata via Resend a ${emailTo}.` });
      } else {
        pushToast({ kind: 'info', title: 'Errore API Resend', body: 'Fattura registrata come inviata ma non recapitata via SMTP.' });
      }
    } catch (err: any) {
      pushToast({ kind: 'info', title: 'Errore di rete', body: err.message });
    }
  };

  // STATS
  const stats = invoices.reduce((acc, inv) => {
    const { total } = calculateInvoiceTotals(inv.items);
    acc.total += total;
    if (inv.status === 'paid') acc.paid += total;
    else if (inv.status === 'sent') acc.outstanding += total;
    else if (inv.status === 'late') acc.late += total;
    return acc;
  }, { total: 0, paid: 0, outstanding: 0, late: 0 });

  return (
    <div className="space-y-6 pb-12 print:p-0 print:m-0">
      {/* Visualizzazione Stampa (@media print renderizzata in overlay fullpage) */}
      <div className="print:block hidden bg-white text-black p-8 font-serif leading-relaxed text-sm w-[210mm] h-[297mm]">
        {showPreview && (
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b border-gray-300 pb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-800">{org.company_name}</h1>
                <p className="text-xs text-gray-500">{org.website}</p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold uppercase text-gray-700">FATTURA</h2>
                <p className="text-xs text-gray-500">N. {showPreview.number}</p>
                <p className="text-xs text-gray-500">Data emissione: {showPreview.issue_date}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 text-xs text-gray-600">
              <div>
                <span className="font-semibold block text-gray-700 uppercase">Emittente</span>
                <p>{org.company_name}</p>
                <p>{org.website}</p>
              </div>
              <div>
                <span className="font-semibold block text-gray-700 uppercase">Destinatario</span>
                <p>{contacts.find(c => c.id === showPreview.contact_id)?.first_name} {contacts.find(c => c.id === showPreview.contact_id)?.last_name}</p>
                <p>{contacts.find(c => c.id === showPreview.contact_id)?.email}</p>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50">
                  <th className="p-2">Descrizione servizio</th>
                  <th className="p-2 text-center">Quantità</th>
                  <th className="p-2 text-right">Prezzo Unitario</th>
                  <th className="p-2 text-right">IVA %</th>
                  <th className="p-2 text-right">Totale Riga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {showPreview.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2">{item.description}</td>
                    <td className="p-2 text-center">{item.quantity}</td>
                    <td className="p-2 text-right">€{item.unit_price.toFixed(2)}</td>
                    <td className="p-2 text-right">{item.vat_rate}%</td>
                    <td className="p-2 text-right">€{(item.quantity * item.unit_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-4">
              <div className="w-64 text-right text-xs space-y-1.5 border-t border-gray-300 pt-3">
                <div className="flex justify-between"><span>Totale imponibile:</span><span>€{calculateInvoiceTotals(showPreview.items).subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>IVA Totale:</span><span>€{calculateInvoiceTotals(showPreview.items).vat.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-sm border-t border-gray-300 pt-1"><span>Totale da Saldare:</span><span>€{calculateInvoiceTotals(showPreview.items).total.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 text-[10px] text-gray-500">
              <p className="font-semibold text-gray-700">Note & Dettagli Pagamento</p>
              <p className="mt-1">{showPreview.notes}</p>
            </div>
          </div>
        )}
      </div>

      <div className="print:hidden space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="text-brand-500" size={24} />
            <div>
              <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Fatturazione Aziendale</h1>
              <p className="text-xs text-surface-400">Genera ed invia documenti contabili collegate a pipeline commerciali</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Emetti Fattura
          </button>
        </div>

        {/* Stats Financials */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-surface-900 p-4 rounded-xl border border-surface-200 dark:border-surface-800 flex items-center justify-between">
            <div><p className="text-xs text-surface-400">Fatturato Emesso</p><p className="text-xl font-bold mt-1">€{stats.total.toLocaleString('it-IT')}</p></div>
            <Euro className="text-brand-500" size={20} />
          </div>
          <div className="bg-white dark:bg-surface-900 p-4 rounded-xl border border-surface-200 dark:border-surface-800 flex items-center justify-between">
            <div><p className="text-xs text-surface-400">Incassato</p><p className="text-xl font-bold text-emerald-500 mt-1">€{stats.paid.toLocaleString('it-IT')}</p></div>
            <CheckCircle className="text-emerald-500" size={20} />
          </div>
          <div className="bg-white dark:bg-surface-900 p-4 rounded-xl border border-surface-200 dark:border-surface-800 flex items-center justify-between">
            <div><p className="text-xs text-surface-400">In Attesa Saldo</p><p className="text-xl font-bold text-amber-500 mt-1">€{stats.outstanding.toLocaleString('it-IT')}</p></div>
            <Clock className="text-amber-500" size={20} />
          </div>
          <div className="bg-white dark:bg-surface-900 p-4 rounded-xl border border-surface-200 dark:border-surface-800 flex items-center justify-between">
            <div><p className="text-xs text-surface-400">Scaduto insoluto</p><p className="text-xl font-bold text-rose-500 mt-1">€{stats.late.toLocaleString('it-IT')}</p></div>
            <Euro className="text-rose-500" size={20} />
          </div>
        </div>

        {/* Elenco Documenti */}
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 text-xs text-surface-500 uppercase">
                <tr>
                  <th className="p-4">Numero</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Emissione</th>
                  <th className="p-4">Importo Totale</th>
                  <th className="p-4">Stato</th>
                  <th className="p-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-surface-400">Nessuna fattura emessa.</td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const { total } = calculateInvoiceTotals(inv.items);
                    const contact = contacts.find((c) => c.id === inv.contact_id);
                    return (
                      <tr key={inv.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors">
                        <td className="p-4 font-mono font-semibold text-surface-900 dark:text-surface-100">{inv.number}</td>
                        <td className="p-4 text-surface-600 dark:text-surface-400">
                          {contact ? `${contact.first_name || ''} ${contact.last_name || ''}` : 'Anonimo'}
                        </td>
                        <td className="p-4 font-mono text-xs">{inv.issue_date}</td>
                        <td className="p-4 font-mono font-semibold">€{total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                            ${inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                              inv.status === 'sent' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                              inv.status === 'late' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                              'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {inv.status === 'draft' && (
                            <button onClick={() => handleSendInvoice(inv)} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 text-brand-600 rounded-lg transition-colors" title="Spedisci per Email">
                              <Send size={14} />
                            </button>
                          )}
                          <button onClick={() => setShowPreview(inv)} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 rounded-lg transition-colors" title="Visualizza Anteprima">
                            <Printer size={14} />
                          </button>
                          {inv.status !== 'paid' && (
                            <button onClick={() => updateInvoice(inv.id, { status: 'paid' })} className="p-2 hover:bg-emerald-500/10 text-emerald-500 rounded-lg transition-colors" title="Segna come Pagato">
                              <CheckCircle size={14} />
                            </button>
                          )}
                          <button onClick={() => removeInvoice(inv.id)} className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors" title="Elimina">
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

        {/* MODAL NUOVA FATTURA */}
        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 max-w-2xl w-full rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-brand-500" />
                Emissione Nuovo Documento
              </h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Numero Fattura *">
                    <input required value={number} onChange={(e) => setNumber(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Scadenza Saldo *">
                    <input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Cliente Destinatario *">
                    <select required value={contactId} onChange={(e) => setContactId(e.target.value)} className={inputCls}>
                      <option value="">Seleziona Cliente...</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>{`${c.first_name || ''} ${c.last_name || ''}`.trim()}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Collega a Deal (Consigliato)">
                    <select value={dealId} onChange={(e) => setDealId(e.target.value)} className={inputCls}>
                      <option value="">Nessun Deal...</option>
                      {deals.map((d) => (
                        <option key={d.id} value={d.id}>{d.title} (Value: {d.value})</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* Linee di dettaglio */}
                <div className="border border-surface-200 dark:border-surface-800 rounded-lg p-3.5 space-y-3">
                  <span className="text-[11px] font-bold text-surface-400 block uppercase">Righe di dettaglio fattura</span>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-surface-400 text-left border-b border-surface-200 dark:border-surface-800">
                        <th className="pb-2">Descrizione</th>
                        <th className="pb-2 text-center">Q.tà</th>
                        <th className="pb-2 text-right">Prezzo Unitario</th>
                        <th className="pb-2 text-right">Aliquota IVA</th>
                        <th className="pb-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                      {items.map((it, i) => (
                        <tr key={i}>
                          <td className="py-2">{it.description}</td>
                          <td className="py-2 text-center">{it.quantity}</td>
                          <td className="py-2 text-right">€{it.unit_price.toFixed(2)}</td>
                          <td className="py-2 text-right">{it.vat_rate}%</td>
                          <td className="py-2 text-right">
                            <button type="button" onClick={() => handleRemoveItem(i)} className="text-rose-500 hover:opacity-80">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Form per aggiungere riga */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-surface-150 dark:border-surface-800/60">
                    <input value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)} placeholder="Descrizione riga..." className={`${inputCls} text-xs sm:col-span-2`} />
                    <input type="number" min="1" value={newItemQty} onChange={(e) => setNewItemQty(Number(e.target.value))} placeholder="Q.tà" className={`${inputCls} text-xs`} />
                    <input type="number" step="0.01" value={newItemPrice} onChange={(e) => setNewItemPrice(Number(e.target.value))} placeholder="Prezzo" className={`${inputCls} text-xs`} />
                    <select value={newItemVat} onChange={(e) => setNewItemVat(Number(e.target.value))} className={`${inputCls} text-xs`}>
                      <option value="22">22% VAT</option>
                      <option value="10">10% VAT</option>
                      <option value="4">4% VAT</option>
                      <option value="0">Esente IVA</option>
                    </select>
                    <button type="button" onClick={handleAddItem} className="sm:col-span-5 w-full py-1 bg-brand-50 hover:bg-brand-100 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 text-xs font-semibold rounded transition-colors">
                      + Aggiungi Riga di Dettaglio
                    </button>
                  </div>
                </div>

                {/* Calcoli Realtime */}
                <div className="flex justify-end">
                  <div className="w-64 text-xs space-y-1 bg-surface-50 dark:bg-surface-800/40 p-3 rounded-lg border border-surface-150 dark:border-surface-850">
                    <div className="flex justify-between"><span>Imponibile:</span><span>€{calculateInvoiceTotals(items).subtotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between"><span>IVA Totale:</span><span>€{calculateInvoiceTotals(items).vat.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between font-bold text-sm border-t border-surface-200 dark:border-surface-700 pt-1.5">
                      <span>Totale da Pagare:</span>
                      <span>€{calculateInvoiceTotals(items).total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <Field label="Note & Coordinate Bancarie (Piè di pagina)">
                  <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
                </Field>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 font-semibold">Annulla</button>
                  <button type="submit" className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors">Emetti Documento</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL ANTEPRIMA GRAFICA INVOICE SHEET (STAMPABILE CON DIALOG DI STAMPA) */}
        {showPreview && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
              {/* Toolbar */}
              <div className="bg-surface-50 dark:bg-surface-800 p-4 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center shrink-0">
                <span className="font-bold text-surface-900 dark:text-surface-100 text-sm">Anteprima Documento Contabile {showPreview.number}</span>
                <div className="flex gap-2">
                  <button onClick={() => window.print()} className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors">
                    Printer
                  </button>
                  <button onClick={() => handleSendInvoice(showPreview)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors">
                    <Send size={13} />
                    Invia per Email
                  </button>
                  <button onClick={() => setShowPreview(null)} className="px-3 py-1.5 bg-surface-200 dark:bg-surface-700 hover:opacity-90 text-surface-700 dark:text-surface-200 text-xs font-semibold rounded-lg transition-all">
                    Chiudi
                  </button>
                </div>
              </div>

              {/* Foglio Fattura Premium */}
              <div className="p-8 overflow-y-auto bg-white text-surface-900 font-sans space-y-6">
                <div className="flex justify-between items-start border-b border-surface-200 pb-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-brand-600 tracking-tight">{org.company_name}</h2>
                    <p className="text-xs text-surface-500 mt-1">{org.website}</p>
                  </div>
                  <div className="text-right">
                    <h1 className="text-base font-bold text-surface-800 uppercase tracking-wider">FATTURA COMMERCIALE</h1>
                    <p className="text-xs text-surface-500 mt-0.5">N. {showPreview.number}</p>
                    <p className="text-xs text-surface-500">Data emissione: {showPreview.issue_date}</p>
                    <p className="text-xs text-surface-500 font-semibold">Scadenza: {showPreview.due_date}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">Fornitore</span>
                    <p className="font-semibold">{org.company_name}</p>
                    <p className="text-surface-500">{org.website}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">Fatturato A</span>
                    <p className="font-semibold">
                      {contacts.find(c => c.id === showPreview.contact_id)?.first_name} {contacts.find(c => c.id === showPreview.contact_id)?.last_name}
                    </p>
                    <p className="text-surface-500">{contacts.find(c => c.id === showPreview.contact_id)?.email}</p>
                    <p className="text-surface-500">{contacts.find(c => c.id === showPreview.contact_id)?.phone}</p>
                  </div>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-surface-200 bg-surface-50">
                      <th className="p-3 font-semibold text-surface-600">Descrizione servizio o bene fornito</th>
                      <th className="p-3 font-semibold text-surface-600 text-center">Quantità</th>
                      <th className="p-3 font-semibold text-surface-600 text-right">Prezzo Unitario</th>
                      <th className="p-3 font-semibold text-surface-600 text-right">Aliquota IVA</th>
                      <th className="p-3 font-semibold text-surface-600 text-right">Totale Imponibile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-150">
                    {showPreview.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-surface-50/30">
                        <td className="p-3 text-surface-800">{item.description}</td>
                        <td className="p-3 text-surface-800 text-center">{item.quantity}</td>
                        <td className="p-3 text-surface-800 text-right">€{item.unit_price.toFixed(2)}</td>
                        <td className="p-3 text-surface-800 text-right">{item.vat_rate}%</td>
                        <td className="p-3 text-surface-800 text-right font-semibold">€{(item.quantity * item.unit_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end pt-4">
                  <div className="w-72 text-xs space-y-2 border-t border-surface-200 pt-3 text-right">
                    <div className="flex justify-between text-surface-600"><span>Totale imponibile:</span><span>€{calculateInvoiceTotals(showPreview.items).subtotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between text-surface-600"><span>IVA Totale:</span><span>€{calculateInvoiceTotals(showPreview.items).vat.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between font-bold text-sm text-brand-600 border-t border-surface-200 pt-2">
                      <span>Totale da Saldare:</span>
                      <span>€{calculateInvoiceTotals(showPreview.items).total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-surface-150 pt-6 text-[10px] text-surface-500">
                  <p className="font-bold text-surface-700 uppercase tracking-wider">Note & Dettagli Pagamento</p>
                  <p className="mt-1 leading-relaxed">{showPreview.notes}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
