import { useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, type Node, type Edge, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { Network, Loader2, Building2, Users2 } from 'lucide-react';
import { useCompanies } from '../hooks/useCompanies';
import { useContacts } from '../hooks/useContacts';
import { useCompaniesStore } from '../store/companiesStore';
import { useContactsStore } from '../store/contactsStore';
import { useTeamStore } from '../store/teamStore';
import { useTeamGroupStore } from '../store/teamGroupStore';
import { ROLE_META } from '../lib/permissions';

export default function OrgChart() {
  const { isLoading: l1 } = useCompanies();
  const { isLoading: l2 } = useContacts();
  const companies = useCompaniesStore((s) => s.companies);
  const contacts = useContactsStore((s) => s.contacts);

  const { members } = useTeamStore();
  const { groups } = useTeamGroupStore();

  const [chartType, setChartType] = useState<'client' | 'internal'>('client');
  const [companyId, setCompanyId] = useState<string>('');

  const selectedCompany = companyId || companies[0]?.id || '';

  // Calcolo dei nodi e archi per React Flow
  const { nodes, edges } = useMemo(() => {
    if (chartType === 'client') {
      // --- ORGANIGRAMMA CLIENTI ---
      const company = companies.find((c) => c.id === selectedCompany);
      if (!company) return { nodes: [] as Node[], edges: [] as Edge[] };

      const members = contacts.filter((c) => c.company_id === company.id);
      const nodes: Node[] = [];
      const edges: Edge[] = [];

      // Nodo azienda (radice)
      nodes.push({
        id: company.id,
        position: { x: Math.max(0, (members.length - 1) * 110), y: 0 },
        data: { label: company.name },
        type: 'input',
        style: {
          background: '#6366f1', color: 'white', border: 'none', borderRadius: 12,
          padding: '10px 16px', fontWeight: 600, fontSize: 13, width: 180, textAlign: 'center',
        },
      });

      // Contatti clienti pendenti dal manager o dall'azienda
      members.forEach((m, i) => {
        nodes.push({
          id: m.id,
          position: { x: i * 220, y: 160 },
          data: { label: `${m.first_name} ${m.last_name}\n${m.job_title ?? ''}` },
          style: {
            background: 'var(--rf-node-bg, #fff)', borderRadius: 12, fontSize: 12,
            border: '1px solid #e2e8f0', padding: '8px 12px', width: 180, whiteSpace: 'pre-line', textAlign: 'center',
          },
        });
        const parent = m.reports_to_id && members.some((x) => x.id === m.reports_to_id) ? m.reports_to_id : company.id;
        edges.push({
          id: `e-${m.id}`, source: parent, target: m.id, type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#94a3b8' },
        });
      });

      return { nodes, edges };
    } else {
      // --- ORGANIGRAMMA INTERNO TEAM ---
      const nodes: Node[] = [];
      const edges: Edge[] = [];

      // 1. Troviamo CEO e Superadmin (i vertici dell'organigramma)
      const roots = members.filter(m => m.role === 'ceo' || m.role === 'superadmin');
      // Giuseppe Lobbene (Owner) è il top leader
      const owner = roots.find(m => m.id === 'tm-owner') || roots[0];
      const otherRoots = roots.filter(m => m.id !== owner?.id);

      if (!owner) return { nodes: [], edges: [] };

      // Nodo principale (Owner/CEO)
      nodes.push({
        id: owner.id,
        position: { x: 300, y: 0 },
        data: { label: `👑 ${owner.first_name} ${owner.last_name}\nCEO & Fondatore` },
        type: 'input',
        style: {
          background: '#ec4899', color: 'white', border: 'none', borderRadius: 12,
          padding: '12px 16px', fontWeight: 600, fontSize: 13, width: 220, textAlign: 'center',
          whiteSpace: 'pre-line', boxShadow: '0 4px 6px -1px rgb(236 72 153 / 0.3)',
        },
      });

      // Altri nodi root (es. altri amministratori/superadmin) disposti a fianco
      otherRoots.forEach((root, idx) => {
        nodes.push({
          id: root.id,
          position: { x: idx * 250 + (idx === 0 ? 30 : 570), y: 0 },
          data: { label: `🛡️ ${root.first_name} ${root.last_name}\nSuperadmin` },
          style: {
            background: '#6366f1', color: 'white', border: 'none', borderRadius: 12,
            padding: '10px 14px', fontWeight: 600, fontSize: 12, width: 180, textAlign: 'center',
            whiteSpace: 'pre-line',
          },
        });
        edges.push({
          id: `e-root-${root.id}`, source: owner.id, target: root.id, type: 'smoothstep',
          style: { stroke: '#cbd5e1', strokeDasharray: '5,5' },
        });
      });

      // 2. Nodi dei Team Leaders (Livello 1: y = 160)
      const leadersList: string[] = [];
      const subordinatesList: string[] = [];

      groups.forEach((group, gIdx) => {
        const leader = members.find(m => m.id === group.leader_id);
        if (!leader) return;

        leadersList.push(leader.id);
        const lMeta = ROLE_META[leader.role] || { color: '#64748b', label: leader.role };

        const posX = gIdx * 350 + 100;

        // Nodo del Leader del Team
        nodes.push({
          id: leader.id,
          position: { x: posX, y: 160 },
          data: { label: `💼 ${leader.first_name} ${leader.last_name}\nLeader del Team: ${group.name}` },
          style: {
            background: 'var(--rf-node-bg, #fff)', border: `2px solid ${lMeta.color}`, borderRadius: 12,
            padding: '10px 14px', fontWeight: 600, fontSize: 12, width: 220, textAlign: 'center',
            whiteSpace: 'pre-line',
          },
        });

        // Collegamento dal CEO/Owner al Leader del Team
        edges.push({
          id: `e-leader-${leader.id}`, source: owner.id, target: leader.id, type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#94a3b8', strokeWidth: 1.5 },
        });

        // 3. Subordinati del Team (Livello 2: y = 320)
        group.member_ids.forEach((mid, mIdx) => {
          const sub = members.find(m => m.id === mid);
          if (!sub) return;

          subordinatesList.push(sub.id);
          const subMeta = ROLE_META[sub.role] || { color: '#94a3b8', label: sub.role };

          nodes.push({
            id: sub.id,
            position: { x: posX + (mIdx * 200) - ((group.member_ids.length - 1) * 100), y: 320 },
            data: { label: `${sub.first_name} ${sub.last_name}\n${subMeta.label}` },
            style: {
              background: 'var(--rf-node-bg, #fff)', border: '1px solid #cbd5e1', borderRadius: 10,
              padding: '8px 12px', fontSize: 11, width: 165, textAlign: 'center',
              whiteSpace: 'pre-line',
            },
          });

          // Collegamento dal Leader del Team al Subordinato
          edges.push({
            id: `e-sub-${sub.id}`, source: leader.id, target: sub.id, type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#cbd5e1', strokeWidth: 1.2 },
          });
        });
      });

      // 4. Utenti orfani (senza team e non CEO/Superadmin) collegati direttamente all'Owner
      const assignedIds = [...roots.map(r => r.id), ...leadersList, ...subordinatesList];
      const orphans = members.filter(m => !assignedIds.includes(m.id) && m.status === 'active');

      orphans.forEach((orph, idx) => {
        const oMeta = ROLE_META[orph.role] || { label: orph.role };
        nodes.push({
          id: orph.id,
          position: { x: idx * 200 + 650, y: 160 },
          data: { label: `${orph.first_name} ${orph.last_name}\n${oMeta.label}` },
          style: {
            background: 'var(--rf-node-bg, #fff)', border: '1px dashed #cbd5e1', borderRadius: 10,
            padding: '8px 12px', fontSize: 11, width: 165, textAlign: 'center',
            whiteSpace: 'pre-line',
          },
        });
        edges.push({
          id: `e-orph-${orph.id}`, source: owner.id, target: orph.id, type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#cbd5e1', strokeWidth: 1 },
        });
      });

      return { nodes, edges };
    }
  }, [chartType, companies, contacts, selectedCompany, members, groups]);

  if (l1 || l2) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand-500" size={28} /></div>;
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top Header & Selector */}
      <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <Network className="text-brand-500" size={22} />
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Visualizzatore Organigramma</h1>
        </div>

        {/* Tab switch per tipo di organigramma */}
        <div className="flex bg-surface-100 dark:bg-surface-800 p-0.5 rounded-lg border border-surface-200 dark:border-surface-700">
          <button
            onClick={() => setChartType('client')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              chartType === 'client'
                ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-50 shadow-sm'
                : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
            }`}
          >
            <Building2 size={13} />
            Organigramma Clienti
          </button>
          <button
            onClick={() => setChartType('internal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              chartType === 'internal'
                ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-50 shadow-sm'
                : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
            }`}
          >
            <Users2 size={13} />
            Gerarchia Interna Team
          </button>
        </div>

        {/* Selettore azienda (visibile solo se visualizziamo i clienti) */}
        {chartType === 'client' && (
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-surface-400" />
            <select
              value={selectedCompany}
              onChange={(e) => setCompanyId(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-surface-200 dark:border-surface-700
                         bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 outline-none
                         focus:ring-2 focus:ring-brand-500/30"
            >
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* React Flow Container */}
      <div className="flex-1 min-h-[450px] bg-white dark:bg-surface-900 rounded-xl border
                      border-surface-200 dark:border-surface-700 overflow-hidden relative">
        {chartType === 'client' && nodes.length <= 1 ? (
          <div className="flex flex-col items-center justify-center h-full text-surface-400">
            <Network size={36} className="mb-2 text-surface-300" />
            <p className="text-sm">Nessun contatto registrato per questa azienda cliente</p>
          </div>
        ) : (
          <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
            <Background color="#94a3b8" gap={20} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
