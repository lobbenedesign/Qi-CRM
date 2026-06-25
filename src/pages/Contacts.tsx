import { useRef, useState, useMemo, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import { useSearchParams } from 'react-router-dom';
import {
  Users, Search, Plus, Loader2, Mail, Phone, Building2,
  Download, Upload, Sparkles, Trash2, Filter, X, Save, Send
} from 'lucide-react';
import { useContacts, useCreateContact, useDeleteContact } from '../hooks/useContacts';
import { useContactsStore } from '../store/contactsStore';
import { useSmartViewsStore, type FilterCondition } from '../store/smartViewsStore';
import { useCan } from '../hooks/useCan';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { initials, formatDate } from '../lib/utils';
import { aggregateTrust, buildMeta } from '../lib/trust';
import { toCsv, downloadCsv, parseCsv } from '../lib/csv';
import { TrustBadge } from '../components/trust/TrustBadge';
import { LeadScoreBadge } from '../components/trust/LeadScoreBadge';
import { CreateContactModal } from '../components/contacts/CreateContactModal';
import { ContactDetailDrawer } from '../components/contacts/ContactDetailDrawer';
import { ZeroEntryModal } from '../components/ai/ZeroEntryModal';
import { SkeletonRows } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { BulkActionBar } from '../components/common/BulkActionBar';
import { useSequencesStore } from '../store/sequencesStore';
import { useAutomationsStore } from '../store/automationsStore';
import { useToastStore } from '../store/toastStore';
import type { Contact } from '../types/crm';

const checkboxCls = 'w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500/30 cursor-pointer';

const FILTER_FIELDS = [
  { key: 'first_name', label: 'Nome' },
  { key: 'last_name', label: 'Cognome' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Telefono' },
  { key: 'job_title', label: 'Qualifica' },
  { key: 'company', label: 'Azienda' },
  { key: 'lead_score', label: 'Lead Score' },
  // Nuovi campi comportamentali per Segmentazione Dinamica
  { key: 'email_opens', label: 'Aperture Email' },
  { key: 'email_clicks', label: 'Click Email' },
  { key: 'page_views', label: 'Pagine Visitate' },
  { key: 'last_activity', label: 'Data Ultima Attività' },
  { key: 'tags', label: 'Tag (Contiene)' },
  { key: 'lead_status', label: 'Stato Lead' },
  { key: 'lifecycle_stage', label: 'Fase Ciclo di Vita' }
];

const OPERATORS = [
  { key: 'contains', label: 'contiene' },
  { key: 'equals', label: 'è uguale a' },
  { key: 'greater_than', label: 'è maggiore di' },
  { key: 'less_than', label: 'è minore di' },
  { key: 'is_known', label: 'è compilato' },
  { key: 'is_unknown', label: 'non è compilato' },
  { key: 'in_list', label: 'incluso in (lista)' }
];

function Avatar({ contact }: { contact: Contact }) {
  return (
    <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center
                    text-white text-xs font-semibold shrink-0">
      {initials(contact.first_name, contact.last_name)}
    </div>
  );
}

export default function Contacts() {
  const [searchParams] = useSearchParams();
  const { isLoading } = useContacts();
  const createContact = useCreateContact();
  const deleteContact = useDeleteContact();
  const canCreate = useCan('contacts:create');
  const canExport = useCan('contacts:export');
  const canDelete = useCan('contacts:delete');
  
  const { getFiltered, searchQuery, setSearchQuery } = useContactsStore(
    useShallow((s) => ({ getFiltered: s.getFiltered, searchQuery: s.searchQuery, setSearchQuery: s.setSearchQuery }))
  );
  const { views, saveView, deleteView } = useSmartViewsStore(
    useShallow((s) => ({ views: s.views, saveView: s.saveView, deleteView: s.deleteView }))
  );
  
  const [selectedViewId, setSelectedViewId] = useState<string>('view-all');
  const [showFiltersBuilder, setShowFiltersBuilder] = useState(false);
  const [currentConditions, setCurrentConditions] = useState<FilterCondition[]>([]);
  const [newViewName, setNewViewName] = useState('');
  const [newViewScope, setNewViewScope] = useState<'private' | 'team' | 'public'>('private');
  
  const sel = useBulkSelection();
  const [showCreate, setShowCreate] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  // Modale Enroll Massivo
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  useEffect(() => {
    const qid = searchParams.get('openContactId');
    if (qid) {
      setOpenId(qid);
    }
  }, [searchParams]);

  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const allContactsList = useContactsStore((s) => s.contacts);

  const getFieldValue = (c: Contact, field: string): any => {
    if (field === 'company') return c.company?.name || '';
    return (c as any)[field];
  };

  const applyConditions = (list: Contact[], conditions: FilterCondition[]) => {
    if (!conditions || conditions.length === 0) return list;
    return list.filter((c) => {
      return conditions.every((cond) => {
        const val = getFieldValue(c, cond.field);
        
        // Logica per array (es. tags)
        if (Array.isArray(val) && (cond.operator === 'contains' || cond.operator === 'in_list')) {
          const matchVal = cond.value.toLowerCase();
          return val.some(v => String(v).toLowerCase().includes(matchVal));
        }

        // Logica base per stringhe/numeri/date
        const stringVal = val ? String(val).toLowerCase() : '';
        const matchVal = cond.value.toLowerCase();
        
        switch (cond.operator) {
          case 'equals':
            return stringVal === matchVal;
          case 'contains':
            return stringVal.includes(matchVal);
          case 'greater_than':
            // Se è data
            if (cond.field.includes('date') || cond.field === 'last_activity' || cond.field === 'created_at') {
              return new Date(val).getTime() > new Date(cond.value).getTime();
            }
            return Number(val) > Number(cond.value);
          case 'less_than':
            if (cond.field.includes('date') || cond.field === 'last_activity' || cond.field === 'created_at') {
              return new Date(val).getTime() < new Date(cond.value).getTime();
            }
            return Number(val) < Number(cond.value);
          case 'is_known':
            return val !== null && val !== undefined && val !== '' && (!Array.isArray(val) || val.length > 0);
          case 'is_unknown':
            return val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0);
          case 'in_list':
            return stringVal.includes(matchVal); // selettore semplice
          default:
            return true;
        }
      });
    });
  };

  const contacts = useMemo(() => {
    const searchFiltered = getFiltered();
    const selectedView = views.find((v) => v.id === selectedViewId);
    if (!selectedView) return searchFiltered;
    return applyConditions(searchFiltered, selectedView.conditions);
    // `allContactsList` e `searchQuery` in deps: `getFiltered` è un riferimento stabile,
    // senza questi il memo resterebbe fermo allo stato iniziale (lista vuota al primo load).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getFiltered, selectedViewId, views, allContactsList, searchQuery]);

  const ids = contacts.map((c) => c.id);

  const buildRows = (list: Contact[]) => list.map((c) => ({
    first_name: c.first_name ?? '', last_name: c.last_name ?? '',
    email: c.email ?? '', phone: c.phone ?? '', job_title: c.job_title ?? '',
    company: c.company?.name ?? '', lead_score: c.lead_score,
  }));

  const onExport = () => downloadCsv('contatti-qi-crm.csv', toCsv(buildRows(contacts)));

  const onExportSelected = () => {
    downloadCsv('contatti-selezionati.csv', toCsv(buildRows(contacts.filter((c) => sel.isSelected(c.id)))));
  };

  const onDeleteSelected = async () => {
    if (!confirm(`Eliminare ${sel.count} contatti selezionati?`)) return;
    for (const id of sel.ids) await deleteContact.mutateAsync(id);
    sel.clear();
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      for (const r of rows) {
        if (!r.first_name && !r.email) continue;
        await createContact.mutateAsync({
          first_name: r.first_name || null, last_name: r.last_name || null,
          email: r.email || null, phone: r.phone || null, job_title: r.job_title || null,
          field_trust: { ...(r.email ? { email: buildMeta('import') } : {}), ...(r.phone ? { phone: buildMeta('import') } : {}) },
        });
      }
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSaveView = () => {
    if (!newViewName.trim() || currentConditions.length === 0) return;
    saveView({
      name: newViewName,
      target: 'contacts',
      conditions: currentConditions,
      scope: newViewScope,
      is_pinned: true,
    });
    setNewViewName('');
    setShowFiltersBuilder(false);
    const latestId = views[views.length - 1]?.id;
    if (latestId) setSelectedViewId(latestId);
  };

  const addFilterCondition = () => {
    setCurrentConditions([
      ...currentConditions,
      { field: 'first_name', operator: 'contains', value: '' }
    ]);
  };

  const updateCondition = (idx: number, patch: Partial<FilterCondition>) => {
    setCurrentConditions(
      currentConditions.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    );
  };

  const removeCondition = (idx: number) => {
    setCurrentConditions(currentConditions.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users className="text-brand-500" size={22} />
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Contatti (Qi-CRM)</h1>
          <span className="text-sm text-surface-400 ml-1">({contacts.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <button onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors">
              <Download size={15} /> Esporta
            </button>
          )}
          {canCreate && (
            <>
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onImport} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={importing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors disabled:opacity-60">
                {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Importa CSV
              </button>
              <button onClick={() => setShowCapture(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors font-medium text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-900/20">
                <Sparkles size={15} /> Cattura AI
              </button>
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg transition-colors font-medium">
                <Plus size={15} /> Nuovo
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dynamic Segments Row */}
      <div className="flex items-center gap-2 border-b border-surface-150 dark:border-surface-850 pb-2 overflow-x-auto shrink-0 scrollbar-none">
        {views.filter(v => v.target === 'contacts').map((v) => (
          <button
            key={v.id}
            onClick={() => setSelectedViewId(v.id)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all shrink-0 ${
              selectedViewId === v.id
                ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-850'
            }`}
          >
            <span>{v.name}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              selectedViewId === v.id ? 'bg-white/20 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-500'
            }`}>
              {applyConditions(allContactsList, v.conditions).length}
            </span>
            {v.id !== 'view-all' && v.id !== 'view-high-score' && (
              <X
                size={12}
                className="hover:text-risk-high cursor-pointer ml-1 text-surface-400 dark:text-surface-500"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Rimuovere il segmento "${v.name}"?`)) {
                    deleteView(v.id);
                    if (selectedViewId === v.id) setSelectedViewId('view-all');
                  }
                }}
              />
            )}
          </button>
        ))}
        <button
          onClick={() => {
            setShowFiltersBuilder(!showFiltersBuilder);
            if (!showFiltersBuilder && currentConditions.length === 0) {
              addFilterCondition();
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border shrink-0 transition-colors ${
            showFiltersBuilder
              ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-500/5'
              : 'border-surface-200 dark:border-surface-850 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          }`}
        >
          <Filter size={12} />
          Segmentazione Dinamica
        </button>
      </div>

      {/* Dynamic Segment Builder */}
      {showFiltersBuilder && (
        <div className="bg-surface-50 dark:bg-surface-800/40 p-4 rounded-xl border border-surface-200 dark:border-surface-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-surface-700 dark:text-surface-300">Segmentazione Dinamica Avanzata (AND logic)</span>
            <button onClick={() => setShowFiltersBuilder(false)} className="text-surface-400 hover:text-surface-600"><X size={15} /></button>
          </div>
          <div className="space-y-2">
            {currentConditions.map((cond, idx) => (
              <div key={idx} className="flex items-center gap-2 flex-wrap">
                <select
                  value={cond.field}
                  onChange={(e) => updateCondition(idx, { field: e.target.value })}
                  className="text-xs rounded-md border border-surface-200 dark:border-surface-750 bg-white dark:bg-surface-900 px-2.5 py-1.5 outline-none"
                >
                  {FILTER_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
                <select
                  value={cond.operator}
                  onChange={(e) => updateCondition(idx, { operator: e.target.value as any })}
                  className="text-xs rounded-md border border-surface-200 dark:border-surface-750 bg-white dark:bg-surface-900 px-2.5 py-1.5 outline-none"
                >
                  {OPERATORS.map(op => <option key={op.key} value={op.key}>{op.label}</option>)}
                </select>
                {cond.operator !== 'is_known' && cond.operator !== 'is_unknown' && (
                  <input
                    value={cond.value}
                    onChange={(e) => updateCondition(idx, { value: e.target.value })}
                    placeholder={cond.field === 'last_activity' ? 'es. 2026-06-20' : 'Valore...'}
                    className="text-xs rounded-md border border-surface-200 dark:border-surface-750 bg-white dark:bg-surface-900 px-2.5 py-1.5 outline-none flex-1 min-w-[120px]"
                  />
                )}
                <button
                  onClick={() => removeCondition(idx)}
                  className="p-1.5 hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-400 hover:text-risk-high rounded transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-between flex-wrap pt-2 border-t border-surface-150 dark:border-surface-750">
            <button
              onClick={addFilterCondition}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <Plus size={13} /> Aggiungi Condizione
            </button>
            <div className="flex gap-2 flex-wrap items-center">
              <input
                placeholder="Nome Segmento..."
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                className="text-xs rounded-md border border-surface-200 dark:border-surface-750 bg-white dark:bg-surface-900 px-2 py-1 outline-none"
              />
              <select
                value={newViewScope}
                onChange={(e) => setNewViewScope(e.target.value as any)}
                className="text-xs rounded-md border border-surface-200 dark:border-surface-750 bg-white dark:bg-surface-900 px-2 py-1 outline-none"
              >
                <option value="private">Privato</option>
                <option value="team">Membri Team</option>
                <option value="public">Pubblico (Tutti)</option>
              </select>
              <button
                onClick={handleSaveView}
                disabled={!newViewName.trim() || currentConditions.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                <Save size={12} /> Salva Segmento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2">
        <Search size={16} className="text-surface-400 shrink-0" />
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca per nome, email, azienda o qualifica..."
          className="flex-1 text-sm bg-transparent outline-none text-surface-900 dark:text-surface-100 placeholder:text-surface-400" />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
        {isLoading ? (
          <div className="p-3"><SkeletonRows rows={6} /></div>
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title={searchQuery ? `Nessun risultato per "${searchQuery}"` : 'Nessun contatto corrisponde al segmento.'}
            subtitle={searchQuery ? 'Prova a cambiare i termini di ricerca.' : 'Modifica le regole del segmento per includere contatti.'}
            action={!searchQuery && canCreate ? { label: 'Crea contatto', icon: <Plus size={15} />, onClick: () => setShowCreate(true) } : undefined}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 dark:border-surface-800">
                <th className="w-10 px-3 py-3">
                  <input type="checkbox" className={checkboxCls} checked={sel.allSelected(ids)} onChange={() => sel.toggleAll(ids)} />
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide">Contatto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide hidden md:table-cell">Azienda</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide hidden lg:table-cell">Contatti</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide">Affidabilità</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide" title="Quantum Lead Score: sales-readiness pesata per affidabilità del dato">Lead</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide hidden xl:table-cell">Aggiunto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {contacts.map((contact) => (
                <tr key={contact.id}
                  className={`transition-colors cursor-pointer ${sel.isSelected(contact.id) ? 'bg-brand-50/60 dark:bg-brand-900/10' : 'hover:bg-surface-50 dark:hover:bg-surface-800/50'}`}>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className={checkboxCls} checked={sel.isSelected(contact.id)} onChange={() => sel.toggle(contact.id)} />
                  </td>
                  <td className="px-4 py-3" onClick={() => setOpenId(contact.id)}>
                    <div className="flex items-center gap-3">
                      <Avatar contact={contact} />
                      <div>
                        <p className="font-medium text-surface-900 dark:text-surface-100">{contact.first_name} {contact.last_name}</p>
                        {contact.job_title && <p className="text-xs text-surface-400">{contact.job_title}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell" onClick={() => setOpenId(contact.id)}>
                    {contact.company ? (
                      <div className="flex items-center gap-1.5 text-surface-600 dark:text-surface-400">
                        <Building2 size={13} className="shrink-0" /><span className="text-sm">{contact.company.name}</span>
                      </div>
                    ) : <span className="text-surface-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell" onClick={() => setOpenId(contact.id)}>
                    <div className="flex flex-col gap-0.5">
                       {contact.email && <div className="flex items-center gap-1.5 text-surface-500 text-xs"><Mail size={12} /><span>{contact.email}</span></div>}
                       {contact.phone && <div className="flex items-center gap-1.5 text-surface-500 text-xs"><Phone size={12} /><span>{contact.phone}</span></div>}
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={() => setOpenId(contact.id)}>
                    <TrustBadge trust={aggregateTrust(contact.field_trust)} compact />
                  </td>
                  <td className="px-4 py-3" onClick={() => setOpenId(contact.id)}>
                    <LeadScoreBadge contact={contact} variant="chip" />
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs text-surface-400" onClick={() => setOpenId(contact.id)}>
                    {contact.created_at ? formatDate(contact.created_at) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BulkActionBar
        count={sel.count}
        onClear={sel.clear}
        actions={[
          { label: 'Esporta', icon: <Download size={15} />, onClick: onExportSelected },
          { label: 'Iscrivi a Sequenza/Journey', icon: <Send size={15} />, onClick: () => setShowEnrollModal(true) },
          ...(canDelete ? [{ label: 'Elimina', icon: <Trash2 size={15} />, onClick: onDeleteSelected, danger: true }] : []),
        ]}
      />

      {showCreate && <CreateContactModal onClose={() => setShowCreate(false)} />}
      {showCapture && <ZeroEntryModal onClose={() => setShowCapture(false)} />}
      {openId && <ContactDetailDrawer contactId={openId} onClose={() => setOpenId(null)} />}
      {showEnrollModal && <EnrollMassModal selectedIds={sel.ids} contacts={allContactsList} onClose={() => { setShowEnrollModal(false); sel.clear(); }} />}
    </div>
  );
}

function EnrollMassModal({ selectedIds, contacts, onClose }: { selectedIds: string[], contacts: Contact[], onClose: () => void }) {
  const [targetType, setTargetType] = useState<'sequence' | 'journey'>('sequence');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  
  const sequences = useSequencesStore((s) => s.sequences);
  const enrollSequence = useSequencesStore((s) => s.enroll);

  const journeys = useAutomationsStore((s) => s.journeys);
  const updateJourney = useAutomationsStore((s) => s.updateJourney);
  const pushToast = useToastStore((s) => s.push);

  const handleEnroll = () => {
    if (!selectedTargetId) return;

    if (targetType === 'sequence') {
      selectedIds.forEach((contactId) => {
        const c = contacts.find((x) => x.id === contactId);
        if (!c) return;
        enrollSequence({
          id: `enr-${Date.now()}-${contactId}`,
          sequenceId: selectedTargetId,
          contactId,
          contactName: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Contatto',
          contactEmail: c.email ?? '',
          status: 'active',
          currentStep: 0,
          enrolledAt: new Date().toISOString(),
          nextActionAt: new Date().toISOString(),
          completedAt: null,
          stepsLog: [],
        });
      });
      const seq = sequences.find((s) => s.id === selectedTargetId);
      pushToast({ title: 'Iscrizione completata', body: `${selectedIds.length} contatti iscritti alla sequenza "${seq?.name ?? ''}".`, kind: 'success' });
    } else {
      // Journey: registra le iscrizioni incrementando i run del journey.
      const j = journeys.find((x) => x.id === selectedTargetId);
      if (j) updateJourney(j.id, { runs: (j.runs ?? 0) + selectedIds.length });
      pushToast({ title: 'Journey avviato', body: `${selectedIds.length} contatti immessi nel journey "${j?.name ?? ''}".`, kind: 'success' });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
            <Send size={18} className="text-brand-500 dark:text-brand-400" />
            Iscrizione di Massa ({selectedIds.length} contatti)
          </h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">Destinazione</label>
            <div className="flex gap-2">
              <button
                onClick={() => { setTargetType('sequence'); setSelectedTargetId(''); }}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                  targetType === 'sequence' ? 'bg-brand-600/10 border-brand-500 text-brand-600 dark:text-brand-400 font-medium' : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-500 dark:text-surface-400'
                }`}
              >
                Sequenza (Email)
              </button>
              <button
                onClick={() => { setTargetType('journey'); setSelectedTargetId(''); }}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                  targetType === 'journey' ? 'bg-brand-600/10 border-brand-500 text-brand-600 dark:text-brand-400 font-medium' : 'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-500 dark:text-surface-400'
                }`}
              >
                Journey Completo
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">
              Seleziona {targetType === 'sequence' ? 'Sequenza' : 'Journey'}
            </label>
            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">-- Scegli --</option>
              {targetType === 'sequence' && sequences.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
              ))}
              {targetType === 'journey' && journeys.map(j => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-surface-500 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 transition-colors">Annulla</button>
          <button
            onClick={handleEnroll}
            disabled={!selectedTargetId}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors font-medium"
          >
            Iscrivi
          </button>
        </div>
      </div>
    </div>
  );
}
