import { useState, lazy, Suspense } from 'react';
import { X, Globe, Phone, MapPin, Users, TrendingUp, Trash2, Sparkles, Network } from 'lucide-react';
import { useCompaniesStore } from '../../store/companiesStore';
import { useContactsStore } from '../../store/contactsStore';
import { useDealsStore } from '../../store/dealsStore';
import { useDeleteCompany, useUpdateCompany } from '../../hooks/useCompanies';
import { useCustomPropertiesStore } from '../../store/customPropertiesStore';
import { useShallow } from 'zustand/shallow';
import { formatCurrency, initials } from '../../lib/utils';

// Lazy: reactflow (~130kB) viene caricato solo all'apertura dell'org-chart,
// così non appesantisce il bundle della pagina Clienti.
const CompanyOrgChartModal = lazy(() =>
  import('./CompanyOrgChartModal').then((m) => ({ default: m.CompanyOrgChartModal })));

interface Props {
  companyId: string;
  onClose: () => void;
  onOpenContact?: (id: string) => void;
}

export function CompanyDetailDrawer({ companyId, onClose, onOpenContact }: Props) {
  const allContacts = useContactsStore((s) => s.contacts);
  const allDeals = useDealsStore((s) => s.deals);
  const allCompanies = useCompaniesStore((s) => s.companies);
  const company = allCompanies.find((c) => c.id === companyId);
  const contacts = allContacts.filter((c) => c.company_id === companyId);
  const deals = allDeals.filter((d) => d.company_id === companyId);
  const deleteCompany = useDeleteCompany();
  const updateCompany = useUpdateCompany();
  const companyProperties = useCustomPropertiesStore(useShallow((s) => s.properties.filter((p) => p.targetObject === 'company')));
  const [showOrgChart, setShowOrgChart] = useState(false);

  const onDelete = async () => {
    if (!company) return;
    if (!confirm(`Eliminare ${company.name}?`)) return;
    await deleteCompany.mutateAsync(company.id);
    onClose();
  };

  const pipelineValue = deals.filter((d) => d.stage !== 'lost').reduce((s, d) => s + d.value, 0);

  if (!company) return null;

  // Calcoli per la gerarchia aziendale
  const parentCompany = allCompanies.find((c) => c.id === company.parent_id);
  const subsidiaries = allCompanies.filter((c) => c.parent_id === company.id);
  const potentialParents = allCompanies.filter(
    (c) => c.id !== company.id && c.parent_id !== company.id
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white dark:bg-surface-900 h-full overflow-y-auto
                   shadow-2xl border-l border-surface-200 dark:border-surface-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-surface-900 border-b border-surface-200
                        dark:border-surface-700 px-5 py-4 z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50">{company.name}</h2>
              {company.industry && (
                <span className="inline-flex text-xs bg-brand-50 dark:bg-brand-900/20 text-brand-600
                                 dark:text-brand-400 px-2 py-0.5 rounded-full mt-1">{company.industry}</span>
              )}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setShowOrgChart(true)} className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-md transition-colors" title="Visualizza Organigramma">
                <Network size={15} />
              </button>
              <button onClick={onDelete} className="p-1.5 text-risk-high hover:bg-risk-high/10 rounded-md transition-colors">
                <Trash2 size={15} />
              </button>
              <button onClick={onClose} className="p-1.5 text-surface-400 hover:text-surface-650">
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {company.ai_summary && (
            <div className="bg-brand-50 dark:bg-brand-900/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 text-xs font-medium mb-1">
                <Sparkles size={13} /> Sintesi AI
              </div>
              <p className="text-sm text-surface-700 dark:text-surface-300">{company.ai_summary}</p>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg p-3">
              <p className="text-lg font-bold text-surface-900 dark:text-surface-100">{formatCurrency(pipelineValue)}</p>
              <p className="text-[10px] text-surface-400 uppercase tracking-wide">Pipeline attiva</p>
            </div>
            <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg p-3">
              <p className="text-lg font-bold text-surface-900 dark:text-surface-100">{contacts.length}</p>
              <p className="text-[10px] text-surface-400 uppercase tracking-wide">Contatti</p>
            </div>
          </div>

          {/* Info */}
          <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg px-3">
            <Row icon={<Globe size={14} />} value={company.domain ?? company.website ?? '—'} />
            <Row icon={<Phone size={14} />} value={company.phone ?? '—'} />
            <Row icon={<MapPin size={14} />} value={company.address?.city ? `${company.address.city}, ${company.address.country ?? ''}` : '—'} />
          </div>

          {/* Corporate Tree */}
          <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
            <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Network size={12} /> Albero Societario
            </h3>
            
            {/* Selettore Parent */}
            <div className="mb-3">
              <label className="block text-[11px] text-surface-500 dark:text-surface-400 mb-1">Società Controllante (Parent):</label>
              <select
                value={company.parent_id ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  updateCompany.mutate({ id: company.id, patch: { parent_id: val === '' ? null : val } });
                }}
                className="w-full bg-surface-50 dark:bg-surface-800 text-xs text-surface-800 dark:text-surface-150 rounded-md border border-surface-200 dark:border-surface-700 p-1.5 focus:outline-none"
              >
                <option value="">— Nessuna (Capogruppo) —</option>
                {potentialParents.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Visualizzazione Tree */}
            <div className="bg-surface-50 dark:bg-surface-850 rounded-lg p-3 space-y-2 border border-surface-150 dark:border-surface-800">
              {parentCompany && (
                <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                  <span>Controllante:</span>
                  <span className="font-semibold text-brand-600 dark:text-brand-400">{parentCompany.name}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-xs font-bold text-surface-900 dark:text-surface-50 bg-brand-500/10 dark:bg-brand-500/20 px-2 py-1 rounded border border-brand-500/30">
                <div className="w-2 h-2 rounded-full bg-brand-500" />
                <span>{company.name} <span className="text-[10px] opacity-70 font-normal">(Corrente)</span></span>
              </div>
              
              {subsidiaries.length > 0 ? (
                <div className="pl-4 border-l border-surface-300 dark:border-surface-700 space-y-1.5 mt-1">
                  {subsidiaries.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 text-xs text-surface-700 dark:text-surface-300">
                      <span className="text-surface-350">└─</span>
                      <span className="font-medium">{sub.name}</span>
                      <span className="text-[10px] text-surface-400">(Controllata)</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pl-4 text-[10px] text-surface-400 italic">Nessuna controllata</div>
              )}
            </div>
          </div>

          {/* Custom Properties */}
          {companyProperties.length > 0 && (
            <div className="border-t border-surface-200 dark:border-surface-700 pt-4 space-y-3">
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">
                Campi Personalizzati Azienda
              </h3>
              <div className="bg-surface-50 dark:bg-surface-850 rounded-lg p-3 space-y-3 border border-surface-150 dark:border-surface-800">
                {companyProperties.map((p: any) => {
                  const val = company.custom_fields?.[p.id] ?? '';
                  return (
                    <div key={p.id} className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-surface-650 dark:text-surface-400" title={p.description}>
                        {p.label}
                      </label>
                      {p.type === 'select' ? (
                        <select
                          value={val as string}
                          onChange={(e) => {
                            const updatedCustom = { ...(company.custom_fields || {}), [p.id]: e.target.value };
                            updateCompany.mutate({ id: company.id, patch: { custom_fields: updatedCustom } });
                          }}
                          className="bg-white dark:bg-surface-800 text-xs rounded border border-surface-200 dark:border-surface-700 px-2.5 py-1.5 text-surface-900 dark:text-white focus:outline-none"
                        >
                          <option value="">Seleziona...</option>
                          {p.options?.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : p.type === 'number' ? (
                        <input
                          type="number"
                          value={val as string}
                          onChange={(e) => {
                            const updatedCustom = { ...(company.custom_fields || {}), [p.id]: e.target.value };
                            updateCompany.mutate({ id: company.id, patch: { custom_fields: updatedCustom } });
                          }}
                          className="bg-white dark:bg-surface-800 text-xs rounded border border-surface-200 dark:border-surface-700 px-2.5 py-1.5 text-surface-900 dark:text-white focus:outline-none"
                        />
                      ) : p.type === 'date' ? (
                        <input
                          type="date"
                          value={val as string}
                          onChange={(e) => {
                            const updatedCustom = { ...(company.custom_fields || {}), [p.id]: e.target.value };
                            updateCompany.mutate({ id: company.id, patch: { custom_fields: updatedCustom } });
                          }}
                          className="bg-white dark:bg-surface-800 text-xs rounded border border-surface-200 dark:border-surface-700 px-2.5 py-1.5 text-surface-900 dark:text-white focus:outline-none"
                        />
                      ) : (
                        <input
                          type="text"
                          value={val as string}
                          onChange={(e) => {
                            const updatedCustom = { ...(company.custom_fields || {}), [p.id]: e.target.value };
                            updateCompany.mutate({ id: company.id, patch: { custom_fields: updatedCustom } });
                          }}
                          className="bg-white dark:bg-surface-800 text-xs rounded border border-surface-200 dark:border-surface-700 px-2.5 py-1.5 text-surface-900 dark:text-white focus:outline-none"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contacts */}
          {contacts.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Users size={12} /> Contatti
              </h3>
              <div className="space-y-1">
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onOpenContact?.(c.id)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-surface-50
                               dark:hover:bg-surface-800 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-[10px] font-semibold">
                      {initials(c.first_name, c.last_name)}
                    </div>
                    <div>
                      <p className="text-sm text-surface-800 dark:text-surface-100">{c.first_name} {c.last_name}</p>
                      {c.job_title && <p className="text-[11px] text-surface-400">{c.job_title}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Deals */}
          {deals.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <TrendingUp size={12} /> Deal
              </h3>
              <div className="space-y-1">
                {deals.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                    <span className="text-sm text-surface-700 dark:text-surface-300">{d.title}</span>
                    <span className="text-xs font-medium text-brand-600 dark:text-brand-400">{formatCurrency(d.value, d.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {showOrgChart && (
        <Suspense fallback={null}>
          <CompanyOrgChartModal companyId={company.id} onClose={() => setShowOrgChart(false)} />
        </Suspense>
      )}
    </div>
  );
}

function Row({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-surface-100 dark:border-surface-800 last:border-0">
      <span className="text-surface-400">{icon}</span>
      <span className="text-sm text-surface-800 dark:text-surface-100">{value}</span>
    </div>
  );
}
