import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/shallow';
import { useSearchParams } from 'react-router-dom';
import { Building2, Search, Plus, Loader2, TrendingUp, Ticket, Globe } from 'lucide-react';
import { useCompanies } from '../hooks/useCompanies';
import { useCompaniesStore } from '../store/companiesStore';
import { useContactsStore } from '../store/contactsStore';
import { useDealsStore } from '../store/dealsStore';
import { useTeamStore } from '../store/teamStore';
import { useTickets } from '../hooks/useTickets';
import { formatCurrency } from '../lib/utils';
import { CreateCompanyModal } from '../components/companies/CreateCompanyModal';
import { CompanyDetailDrawer } from '../components/companies/CompanyDetailDrawer';
import { ContactDetailDrawer } from '../components/contacts/ContactDetailDrawer';
import { useContacts } from '../hooks/useContacts';
import { useDeals } from '../hooks/useDeals';
import { useCan } from '../hooks/useCan';

export default function Companies() {
  const [searchParams] = useSearchParams();
  const { isLoading } = useCompanies();
  useContacts();  // popola lo store per il drawer (contatti collegati)
  useDeals();     // popola lo store per il drawer (deal collegati)
  const { data: tickets = [] } = useTickets();

  const { getFiltered, searchQuery, setSearchQuery } = useCompaniesStore(
    useShallow((s) => ({ getFiltered: s.getFiltered, searchQuery: s.searchQuery, setSearchQuery: s.setSearchQuery }))
  );
  const allContacts = useContactsStore((s) => s.contacts);
  const allDeals = useDealsStore((s) => s.deals);
  const teamMembers = useTeamStore((s) => s.members);

  const canCreate = useCan('companies:create');
  const [showCreate, setShowCreate] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openContactId, setOpenContactId] = useState<string | null>(null);

  useEffect(() => {
    const qid = searchParams.get('openCompanyId');
    if (qid) {
      setOpenId(qid);
    }
  }, [searchParams]);


  const companies = getFiltered();

  // Helper per mappare la provenienza della fonte (field_trust)
  const getProvenanceBadgeColor = (source: string) => {
    switch (source) {
      case 'user': return 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400';
      case 'ai_extracted': return 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400';
      case 'enrichment': return 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400';
      default: return 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="text-brand-500" size={22} />
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Clienti</h1>
          <span className="text-sm text-surface-400 ml-1">({companies.length})</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={!canCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700
                     text-white text-sm rounded-lg transition-colors font-medium
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={15} />
          Nuovo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white dark:bg-surface-900 border
                      border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2">
        <Search size={16} className="text-surface-400 shrink-0" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca per nome, dominio, settore o contatti associati…"
          className="flex-1 text-sm bg-transparent outline-none
                     text-surface-900 dark:text-surface-100 placeholder:text-surface-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-surface-900 rounded-xl border
                      border-surface-200 dark:border-surface-700 overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-brand-500" size={28} />
          </div>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-surface-400">
            <Building2 size={36} className="mb-3 text-surface-300" />
            <p className="text-sm">
              {searchQuery ? `Nessun risultato per "${searchQuery}"` : 'Nessun cliente ancora. Crea il primo!'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/40">
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide w-[25%]">
                  Cliente (Azienda)
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide w-[30%]">
                  Contatti & Provenienza
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide w-[25%]">
                  Deal & Ticket Attivi
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wide w-[20%]">
                  Team Assegnato
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {companies.map((company) => {
                // Filtra contatti dell'azienda
                const companyContacts = allContacts.filter((c) => c.company_id === company.id);
                // Filtra deal dell'azienda
                const companyDeals = allDeals.filter((d) => d.company_id === company.id);
                // Filtra ticket dell'azienda
                const companyTickets = tickets.filter((t) => t.company_id === company.id);

                // Trova tutti gli assegnatari unici per deal e ticket
                const uniqueAssignees = new Set<string>();
                companyDeals.forEach((d) => { if (d.assignee_id) uniqueAssignees.add(d.assignee_id); });
                companyTickets.forEach((t) => { if (t.assignee_id) uniqueAssignees.add(t.assignee_id); });
                if (company.owner_id) uniqueAssignees.add(company.owner_id);

                const assignedMembers = teamMembers.filter((m) => uniqueAssignees.has(m.id));

                return (
                  <tr
                    key={company.id}
                    onClick={() => setOpenId(company.id)}
                    className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors cursor-pointer"
                  >
                    {/* 1. Cliente (Azienda) */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20
                                        flex items-center justify-center shrink-0 mt-0.5">
                          <Building2 size={14} className="text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-surface-900 dark:text-surface-100 text-sm">
                            {company.name}
                          </p>
                          {company.address?.city && (
                            <p className="text-xs text-surface-500 mt-0.5">
                              {company.address.city}{company.address.country ? `, ${company.address.country}` : ''}
                            </p>
                          )}
                          {(company.website || company.domain) && (
                            <a
                              href={company.website ?? `https://${company.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 mt-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe size={11} className="shrink-0" />
                              <span>{company.website || company.domain}</span>
                            </a>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {company.industry && (
                              <span className="text-[10px] bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 px-1.5 py-0.5 rounded">
                                {company.industry}
                              </span>
                            )}
                            {company.size && (
                              <span className="text-[10px] bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 px-1.5 py-0.5 rounded">
                                {company.size} dipendenti
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Contatti & Provenienza */}
                    <td className="px-4 py-3.5 align-top">
                      {companyContacts.length === 0 ? (
                        <span className="text-xs text-surface-400 italic">Nessun contatto associato</span>
                      ) : (
                        <div className="space-y-2">
                          {companyContacts.slice(0, 3).map((c) => {
                            // Leggi la provenienza (es. dal campo first_name o company_id)
                            const prov = c.field_trust?.email?.source ?? 'user';
                            return (
                              <div key={c.id} className="text-xs">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-medium text-surface-800 dark:text-surface-200">
                                    {c.first_name} {c.last_name}
                                  </span>
                                  <span className={`text-[9px] font-semibold px-1 rounded uppercase tracking-wide ${getProvenanceBadgeColor(prov)}`}>
                                    {prov.replace('_', ' ')}
                                  </span>
                                </div>
                                {c.job_title && (
                                  <p className="text-[11px] text-surface-400">{c.job_title}</p>
                                )}
                                {c.email && (
                                  <a
                                    href={`mailto:${c.email}`}
                                    className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline block"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {c.email}
                                  </a>
                                )}
                                {c.ai_summary && (
                                  <p className="text-[10px] text-surface-500 dark:text-surface-400 italic mt-0.5 line-clamp-1">
                                    "{c.ai_summary}"
                                  </p>
                                )}
                              </div>
                            );
                          })}
                          {companyContacts.length > 3 && (
                            <p className="text-[10px] text-brand-600 dark:text-brand-400 font-medium">
                              + altri {companyContacts.length - 3} contatti
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 3. Deal & Ticket Attivi */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="space-y-2">
                        {/* Deals */}
                        {companyDeals.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider flex items-center gap-1">
                              <TrendingUp size={10} /> Deal ({companyDeals.length})
                            </p>
                            {companyDeals.slice(0, 2).map((d) => (
                              <div key={d.id} className="flex justify-between items-center gap-2 bg-surface-50 dark:bg-surface-800/40 px-1.5 py-0.5 rounded text-[11px]">
                                <span className="text-surface-700 dark:text-surface-300 truncate max-w-[120px]">{d.title}</span>
                                <span className="font-semibold text-brand-600 dark:text-brand-400">{formatCurrency(d.value, d.currency)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Tickets */}
                        {companyTickets.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider flex items-center gap-1">
                              <Ticket size={10} /> Ticket ({companyTickets.length})
                            </p>
                            {companyTickets.slice(0, 2).map((t) => (
                              <div key={t.id} className="flex justify-between items-center gap-2 bg-surface-50 dark:bg-surface-800/40 px-1.5 py-0.5 rounded text-[11px]">
                                <span className="text-surface-600 dark:text-surface-300 font-mono text-[9px]">{t.code}</span>
                                <span className="text-surface-700 dark:text-surface-300 truncate max-w-[100px]">{t.title}</span>
                                <span className={`text-[9px] font-medium px-1 rounded ${
                                  t.status === 'resolved' || t.status === 'closed' ? 'bg-success-100 text-success-700 dark:bg-success-950/20 dark:text-success-400' : 'bg-warning-100 text-warning-700 dark:bg-warning-950/20 dark:text-warning-400'
                                }`}>
                                  {t.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {companyDeals.length === 0 && companyTickets.length === 0 && (
                          <span className="text-xs text-surface-400 italic">Nessun deal o ticket attivo</span>
                        )}
                      </div>
                    </td>

                    {/* 4. Team Assegnato */}
                    <td className="px-4 py-3.5 align-top">
                      {assignedMembers.length === 0 ? (
                        <span className="text-xs text-surface-400 italic">Non assegnato</span>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {assignedMembers.map((m) => (
                            <div key={m.id} className="flex items-center gap-2 text-xs">
                              <div className="w-5 h-5 rounded-full bg-brand-500 text-white font-semibold text-[9px] flex items-center justify-center shrink-0">
                                {m.first_name[0]}{m.last_name[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-surface-800 dark:text-surface-200 truncate">
                                  {m.first_name} {m.last_name}
                                </p>
                                <p className="text-[9px] text-surface-400 uppercase tracking-wider">
                                  {m.role}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateCompanyModal onClose={() => setShowCreate(false)} />}
      {openId && (
        <CompanyDetailDrawer
          companyId={openId}
          onClose={() => setOpenId(null)}
          onOpenContact={(id) => { setOpenId(null); setOpenContactId(id); }}
        />
      )}
      {openContactId && <ContactDetailDrawer contactId={openContactId} onClose={() => setOpenContactId(null)} />}
    </div>
  );
}
