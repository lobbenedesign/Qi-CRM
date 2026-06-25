import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { Navigate } from 'react-router-dom';
import {
  FolderOpen, Mail, FileText, ReceiptText, FileCheck2, Upload, Copy, Check,
  ShieldCheck, ShieldAlert, Trash2, Inbox, Zap, Loader2, Link, Share2, Eye
} from 'lucide-react';
import { useDocumentsStore, type DocKind, type CrmDocument } from '../store/documentsStore';
import { useContractsStore } from '../store/contractsStore';
import { useInvoicesStore } from '../store/invoicesStore';
import { useDealsStore } from '../store/dealsStore';
import { useDeals } from '../hooks/useDeals';
import { useContacts } from '../hooks/useContacts';
import { useToastStore } from '../store/toastStore';
import { useCan } from '../hooks/useCan';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { EmptyState } from '../components/common/EmptyState';
import { BulkActionBar } from '../components/common/BulkActionBar';
import { logAudit } from '../lib/audit';

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 outline-none focus:ring-2 focus:ring-brand-500/30';

interface UnifiedDoc {
  id: string;
  name: string;
  kind: DocKind;
  source: string;
  deal_id: string | null;
  from: string | null;
  date: string;
  verified: boolean | null;
  size_kb: number | null;
  sha256: string | null;
  origin: 'received' | 'contract' | 'invoice';
}

const KIND_ICON: Record<string, React.ReactNode> = {
  contract: <FileCheck2 size={15} />, invoice: <ReceiptText size={15} />,
  id_document: <FileText size={15} />, po: <FileText size={15} />,
  receipt: <ReceiptText size={15} />, other: <FileText size={15} />,
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function Documents() {
  const canView = useCan('contracts:view');
  useDeals(); useContacts();
  const { documents, addDocument, removeDocument, generateSharedLink } = useDocumentsStore(
    useShallow((s) => ({ documents: s.documents, addDocument: s.addDocument, removeDocument: s.removeDocument, generateSharedLink: s.generateSharedLink }))
  );
  const contracts = useContractsStore((s) => s.contracts);
  const invoices = useInvoicesStore((s) => s.invoices);
  const deals = useDealsStore((s) => s.deals);
  const pushToast = useToastStore((s) => s.push);

  const [dealFilter, setDealFilter] = useState('');
  const [sim, setSim] = useState({ deal_id: '', from: '', name: '', kind: 'contract' as DocKind });
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const sel = useBulkSelection();

  // Tracked link state
  const [sharingDoc, setSharingDoc] = useState<CrmDocument | null>(null);
  const [requireEmailForShare, setRequireEmailForShare] = useState(true);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Selected document for analytics details
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const dealName = (id: string | null) => {
    if (!id) return 'Senza deal';
    const d = deals.find((x) => x.id === id);
    return d?.title ?? id;
  };

  // Vista unificata: ricevuti + contratti firmati/inviati + fatture
  const unified: UnifiedDoc[] = useMemo(() => {
    const recv: UnifiedDoc[] = documents.map((d) => ({
      id: d.id, name: d.name, kind: d.kind, source: 'Email in entrata', deal_id: d.deal_id,
      from: d.from, date: d.received_at, verified: d.verified, size_kb: d.size_kb, sha256: d.sha256, origin: 'received',
    }));
    const ctr: UnifiedDoc[] = contracts.map((c) => ({
      id: c.id, name: `${c.title} (${c.status})`, kind: 'contract', source: 'Contratto Qi-CRM', deal_id: c.deal_id,
      from: null, date: c.signed_at ?? c.sent_at ?? c.created_at, verified: c.status === 'signed' ? true : null,
      size_kb: null, sha256: c.signature_metadata?.hash ?? null, origin: 'contract',
    }));
    const inv: UnifiedDoc[] = invoices.map((i) => ({
      id: i.id, name: `${i.number} (${i.status})`, kind: 'invoice', source: 'Fattura Qi-CRM', deal_id: i.deal_id,
      from: null, date: i.sent_at ?? i.issue_date, verified: null, size_kb: null, sha256: null, origin: 'invoice',
    }));
    return [...recv, ...ctr, ...inv].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [documents, contracts, invoices]);

  if (!canView) return <Navigate to="/" replace />;

  const filtered = dealFilter ? unified.filter((d) => d.deal_id === dealFilter) : unified;
  const receivedIds = filtered.filter((d) => d.origin === 'received').map((d) => d.id);

  // Indirizzo email-to-CRM (per deal selezionato o generale)
  const inboxAddr = sim.deal_id ? `deal-${sim.deal_id}@in.qi-crm.app` : 'documenti@in.qi-crm.app';

  const copyAddr = async () => { await navigator.clipboard.writeText(inboxAddr); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const simulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sim.name.trim() || !sim.deal_id) return;
    setSending(true);
    try {
      const contact = deals.find((d) => d.id === sim.deal_id)?.contact_id ?? null;
      addDocument({
        name: sim.name.endsWith('.pdf') ? sim.name : `${sim.name}.pdf`,
        kind: sim.kind, source: 'email_inbound', deal_id: sim.deal_id, contact_id: contact,
        from: sim.from || 'mittente@cliente.it', size_kb: Math.floor(80 + Math.random() * 600),
        verified: true, sha256: null, note: 'Ricevuto via email e agganciato automaticamente al deal.',
      });
      logAudit('create', 'deal', `Documento ricevuto: ${sim.name}`, { deal: sim.deal_id });
      pushToast({ kind: 'success', title: '📎 Documento ricevuto', body: `"${sim.name}" agganciato a ${dealName(sim.deal_id)}` });
      setSim({ deal_id: '', from: '', name: '', kind: 'contract' });
    } finally { setSending(false); }
  };

  const handleOpenSharing = (docId: string) => {
    const d = documents.find(x => x.id === docId);
    if (d) {
      setSharingDoc(d);
      setRequireEmailForShare(d.requireEmail ?? true);
      if (d.sharedLinkToken) {
        setGeneratedLink(`${window.location.origin}/#/document/${d.sharedLinkToken}`);
      } else {
        setGeneratedLink('');
      }
    }
  };

  const handleGenerateLink = () => {
    if (!sharingDoc) return;
    const token = generateSharedLink(sharingDoc.id, requireEmailForShare);
    const linkUrl = `${window.location.origin}/#/document/${token}`;
    setGeneratedLink(linkUrl);
    pushToast({ kind: 'success', title: 'Link Tracciato Generato', body: 'Il link di condivisione è ora pronto per essere copiato.' });
  };

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(generatedLink);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 1500);
  };

  // Find analytics details for selected document
  const selectedCrmDoc = documents.find(d => d.id === selectedDocId);
  const viewsLog = selectedCrmDoc?.viewsLog || [];
  const totalViews = viewsLog.length;
  const avgDuration = totalViews > 0 
    ? Math.round(viewsLog.reduce((acc, curr) => acc + curr.durationSeconds, 0) / totalViews) 
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FolderOpen className="text-brand-500" size={22} />
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Documenti</h1>
          <span className="text-sm text-surface-400 ml-1">{filtered.length}</span>
        </div>
        <select value={dealFilter} onChange={(e) => setDealFilter(e.target.value)} className={`${inputCls} max-w-xs`}>
          <option value="">Tutti i deal</option>
          {deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
      </div>

      <p className="text-sm text-surface-500 dark:text-surface-400">
        Vista unificata di tutti i documenti per deal: contratti, fatture e <strong>documenti ricevuti via email</strong>,
        agganciati automaticamente al cliente corretto.
      </p>

      {/* Inbox email-to-CRM + simulatore */}
      <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-4 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Inbox size={16} className="text-brand-500" />
          <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-100">Ricezione documenti via email</h2>
        </div>
        <p className="text-xs text-surface-500 dark:text-surface-400">
          Inoltra (o fai inoltrare al cliente) le email con allegati a questo indirizzo: il documento entra nel gestionale
          e si collega al deal giusto. In produzione sarà un'inbound route reale (Resend Inbound / Mailgun) verso una Edge Function.
        </p>
        <div className="flex gap-2 items-center">
          <code className="flex-1 px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 text-sm font-mono text-brand-700 dark:text-brand-300">{inboxAddr}</code>
          <button onClick={copyAddr} className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg">{copied ? <Check size={15} /> : <Copy size={15} />}</button>
        </div>

        {/* Simulatore di ricezione */}
        <div className="bg-cyan-50 dark:bg-cyan-900/10 border border-cyan-200 dark:border-cyan-900/30 rounded-lg p-3">
          <p className="text-xs font-medium text-cyan-700 dark:text-cyan-400 mb-2 flex items-center gap-1.5"><Zap size={13} /> Simula un documento ricevuto via email</p>
          <form onSubmit={simulate} className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select required value={sim.deal_id} onChange={(e) => setSim((s) => ({ ...s, deal_id: e.target.value }))} className={inputCls}>
                <option value="">Collega al deal… *</option>
                {deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              <select value={sim.kind} onChange={(e) => setSim((s) => ({ ...s, kind: e.target.value as DocKind }))} className={inputCls}>
                <option value="contract">Contratto firmato</option>
                <option value="id_document">Documento identità / visura</option>
                <option value="po">Ordine d'acquisto</option>
                <option value="receipt">Ricevuta</option>
                <option value="other">Altro</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input value={sim.from} onChange={(e) => setSim((s) => ({ ...s, from: e.target.value }))} placeholder="Email mittente" className={inputCls} />
              <input required value={sim.name} onChange={(e) => setSim((s) => ({ ...s, name: e.target.value }))} placeholder="Nome file (es. contratto.pdf) *" className={inputCls} />
            </div>
            <button type="submit" disabled={sending || !sim.name.trim() || !sim.deal_id}
              className="w-full flex items-center justify-center gap-2 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg transition-colors disabled:opacity-60 font-medium">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Ricevi documento e collega al deal
            </button>
          </form>
        </div>
      </div>

      {/* Lista documenti */}
      <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <EmptyState icon={<FolderOpen size={28} />} title="Nessun documento"
            subtitle="I contratti, le fatture e i documenti ricevuti via email compariranno qui, collegati al deal." />
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-surface-150 dark:border-surface-800 bg-surface-50 dark:bg-surface-850/60">
                <th className="w-10 px-3 py-3">
                  <input type="checkbox" className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 cursor-pointer"
                    checked={sel.allSelected(receivedIds)} onChange={() => sel.toggleAll(receivedIds)} />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide">Documento</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide hidden md:table-cell">Deal</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide hidden lg:table-cell">Origine</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide">Integrità</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide hidden sm:table-cell">Data</th>
                <th className="w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-150 dark:divide-surface-800">
              {filtered.map((d) => {
                const hasSharedLink = documents.find(x => x.id === d.id)?.sharedLinkToken;
                const isSelected = selectedDocId === d.id;
                return (
                  <tr key={`${d.origin}-${d.id}`} className={`transition-colors cursor-pointer ${
                    isSelected ? 'bg-brand-500/5 dark:bg-brand-900/10 border-l-2 border-brand-500' : 'hover:bg-surface-50/50 dark:hover:bg-surface-800/30'
                  }`} onClick={() => d.origin === 'received' && setSelectedDocId(isSelected ? null : d.id)}>
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      {d.origin === 'received' && (
                        <input type="checkbox" className="w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 cursor-pointer"
                          checked={sel.isSelected(d.id)} onChange={() => sel.toggle(d.id)} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-surface-400">{KIND_ICON[d.kind] ?? <FileText size={15} />}</span>
                        <div>
                          <p className="font-semibold text-surface-900 dark:text-surface-100">{d.name}</p>
                          {d.from && <p className="text-xs text-surface-400">da {d.from}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-surface-600 dark:text-surface-400">{dealName(d.deal_id)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400">{d.source}</span>
                    </td>
                    <td className="px-4 py-3">
                      {d.verified === true ? (
                        <span className="inline-flex items-center gap-1 text-xs text-trust-high" title={d.sha256 ? `SHA-256: ${d.sha256.slice(0, 16)}…` : 'Mittente verificato'}>
                          <ShieldCheck size={13} /> Verificato
                        </span>
                      ) : d.verified === false ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600"><ShieldAlert size={13} /> Da verificare</span>
                      ) : <span className="text-xs text-surface-300">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-surface-400">{fmt(d.date)}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {d.origin === 'received' && (
                          <>
                            <button 
                              onClick={() => handleOpenSharing(d.id)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                hasSharedLink 
                                  ? 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20' 
                                  : 'bg-surface-50 dark:bg-surface-800 text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 border-surface-200 dark:border-surface-700'
                              }`}
                              title="Condividi Link Tracciato"
                            >
                              <Share2 size={13} />
                            </button>
                            <button onClick={() => removeDocument(d.id)} className="text-surface-400 hover:text-risk-high p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"><Trash2 size={13} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Analytics view panel for selected document */}
      {selectedDocId && selectedCrmDoc && (
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4 shadow-sm space-y-4 animate-slide-up">
          <div className="flex justify-between items-center pb-2 border-b border-surface-150 dark:border-surface-800">
            <div className="flex items-center gap-2">
              <Eye className="text-brand-500" size={18} />
              <h2 className="text-sm font-bold">Analytics Accessi Condivisi: <span className="text-brand-600 dark:text-brand-400">{selectedCrmDoc.name}</span></h2>
            </div>
            <button onClick={() => setSelectedDocId(null)} className="text-surface-400 hover:text-surface-600"><XIcon size={14} /></button>
          </div>

          {!selectedCrmDoc.sharedLinkToken ? (
            <p className="text-xs text-surface-450 text-center py-4">Nessun link generato. Clicca sul tasto condividi per iniziare a tracciare.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-50 dark:bg-surface-850 p-3 rounded-lg border border-surface-150 dark:border-surface-800 text-center">
                  <span className="block text-[10px] font-bold text-surface-400 uppercase tracking-wider">Aperture Totali</span>
                  <span className="text-xl font-bold text-surface-900 dark:text-white">{totalViews}</span>
                </div>
                <div className="bg-surface-50 dark:bg-surface-850 p-3 rounded-lg border border-surface-150 dark:border-surface-800 text-center">
                  <span className="block text-[10px] font-bold text-surface-400 uppercase tracking-wider">Tempo Medio Lettura</span>
                  <span className="text-xl font-bold text-surface-900 dark:text-white">{avgDuration} secondi</span>
                </div>
                <div className="bg-surface-50 dark:bg-surface-850 p-3 rounded-lg border border-surface-150 dark:border-surface-800 text-center">
                  <span className="block text-[10px] font-bold text-surface-400 uppercase tracking-wider">Email Gate Richiesta</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                    selectedCrmDoc.requireEmail 
                      ? 'bg-green-500/15 text-green-600 border border-green-500/20' 
                      : 'bg-surface-100 text-surface-500 border border-surface-200'
                  }`}>
                    {selectedCrmDoc.requireEmail ? 'Abilitata' : 'Disabilitata'}
                  </span>
                </div>
              </div>

              {viewsLog.length === 0 ? (
                <p className="text-xs text-surface-450 text-center py-4">Nessun accesso registrato finora.</p>
              ) : (
                <div className="overflow-x-auto border border-surface-150 dark:border-surface-850 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface-50 dark:bg-surface-850 border-b border-surface-150 dark:border-surface-800 text-surface-500 uppercase tracking-wider">
                      <tr>
                        <th className="p-2.5">Email Lettore</th>
                        <th className="p-2.5">Data & Ora Accesso</th>
                        <th className="p-2.5">Durata Lettura</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-850">
                      {viewsLog.map((log) => (
                        <tr key={log.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-850/10">
                          <td className="p-2.5 font-semibold text-surface-850 dark:text-surface-100">{log.email || 'Anonimo'}</td>
                          <td className="p-2.5 text-surface-450">{new Date(log.viewedAt).toLocaleString('it-IT')}</td>
                          <td className="p-2.5 font-bold text-brand-650 dark:text-brand-400">{log.durationSeconds} secondi</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Share Gated Link Generator */}
      {sharingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-900 p-5 rounded-2xl border border-surface-200 dark:border-surface-800 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-surface-150 dark:border-surface-800">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Share2 size={16} className="text-brand-500" />
                Condividi Link Tracciato
              </h3>
              <button type="button" onClick={() => setSharingDoc(null)} className="text-surface-400 hover:text-surface-600"><XIcon size={16} /></button>
            </div>

            <div className="space-y-4">
              <div className="bg-surface-50 dark:bg-surface-850 p-3 rounded-lg border border-surface-150 dark:border-surface-800 text-xs">
                File: <strong className="text-surface-800 dark:text-white">{sharingDoc.name}</strong> ({sharingDoc.size_kb} KB)
              </div>

              {/* Toggle Gate Email option */}
              <label className="flex items-center gap-2.5 text-xs text-surface-750 dark:text-surface-300 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={requireEmailForShare}
                  onChange={(e) => setRequireEmailForShare(e.target.checked)}
                  className="rounded border-surface-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
                />
                <div className="flex flex-col">
                  <span className="font-bold">Richiedi Email per Visualizzare</span>
                  <span className="text-[10px] text-surface-450">L'utente dovrà verificare il proprio indirizzo email prima di leggere il PDF.</span>
                </div>
              </label>

              <button
                type="button"
                onClick={handleGenerateLink}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-brand-650 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                <Link size={13} />
                {generatedLink ? 'Rigenera Link di Condivisione' : 'Genera Link Tracciato'}
              </button>

              {generatedLink && (
                <div className="space-y-2 pt-2 border-t border-surface-150 dark:border-surface-800">
                  <span className="block text-[10px] font-bold text-surface-400 uppercase tracking-wider">Link di condivisione pronto</span>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly
                      value={generatedLink}
                      className="flex-1 bg-surface-100 dark:bg-surface-800 px-3 py-2 border border-surface-200 dark:border-surface-750 rounded-lg text-xs font-mono text-brand-700 dark:text-brand-300 outline-none"
                    />
                    <button 
                      onClick={copyShareLink} 
                      className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold"
                    >
                      {copiedShareLink ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button 
                type="button" 
                onClick={() => setSharingDoc(null)} 
                className="px-4 py-2 border border-surface-250 dark:border-surface-750 text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 text-xs font-semibold rounded-lg"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
      
      <p className="text-[11px] text-surface-400 flex items-center gap-1.5">
        <Upload size={12} /> Upload manuale e firma certificata lato server (DKIM/SPF + marca temporale) arriveranno con il backend Supabase.
      </p>

      <BulkActionBar
        count={sel.count}
        onClear={sel.clear}
        actions={[{
          label: 'Elimina', icon: <Trash2 size={15} />, danger: true,
          onClick: () => { if (confirm(`Eliminare ${sel.count} documenti?`)) { sel.ids.forEach(removeDocument); sel.clear(); } },
        }]}
      />
    </div>
  );
}

function XIcon({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
