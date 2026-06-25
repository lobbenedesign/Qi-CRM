import { useMemo } from 'react';
import ReactFlow, { Background, Controls, type Node, type Edge, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { X, Network } from 'lucide-react';
import { useContactsStore } from '../../store/contactsStore';
import { useCompaniesStore } from '../../store/companiesStore';
import { useShallow } from 'zustand/shallow';

interface Props {
  companyId: string;
  onClose: () => void;
}

export function CompanyOrgChartModal({ companyId, onClose }: Props) {
  const company = useCompaniesStore(useShallow((s) => s.companies.find((c) => c.id === companyId)));
  const contacts = useContactsStore(useShallow((s) => s.contacts.filter((c) => c.company_id === companyId)));

  const { nodes, edges } = useMemo(() => {
    if (!company) return { nodes: [], edges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Root Company Node
    nodes.push({
      id: company.id,
      position: { x: Math.max(0, (contacts.length - 1) * 110), y: 20 },
      data: { label: company.name },
      type: 'input',
      style: {
        background: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: 12,
        padding: '10px 16px',
        fontWeight: 600,
        fontSize: 13,
        width: 180,
        textAlign: 'center',
      },
    });

    // Contacts: children hang from manager if reports_to_id is valid, otherwise root company
    contacts.forEach((m, i) => {
      nodes.push({
        id: m.id,
        position: { x: i * 220, y: 160 },
        data: { label: `${m.first_name} ${m.last_name}\n${m.job_title ?? 'Dipendente'}` },
        style: {
          background: 'var(--rf-node-bg, #fff)',
          borderRadius: 12,
          fontSize: 12,
          border: '1px solid #e2e8f0',
          padding: '8px 12px',
          width: 180,
          whiteSpace: 'pre-line',
          textAlign: 'center',
        },
      });

      const parent = m.reports_to_id && contacts.some((x) => x.id === m.reports_to_id) ? m.reports_to_id : company.id;
      
      edges.push({
        id: `e-${m.id}`,
        source: parent,
        target: m.id,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#94a3b8' },
      });
    });

    return { nodes, edges };
  }, [company, contacts]);

  if (!company) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 w-full max-w-4xl h-[80vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center bg-surface-50 dark:bg-surface-800 shrink-0">
          <div className="flex items-center gap-2">
            <Network className="text-brand-500" size={20} />
            <div>
              <h3 className="font-bold text-surface-900 dark:text-surface-100 text-sm">Organigramma Aziendale</h3>
              <p className="text-[10px] text-surface-400">Struttura gerarchica dei contatti di {company.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-surface-400 hover:text-surface-650 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Graph Canvas */}
        <div className="flex-1 min-h-0 bg-surface-50 dark:bg-surface-950 relative">
          {nodes.length <= 1 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-surface-400">
              <Network size={36} className="mb-2 text-surface-300" />
              <p className="text-sm">Nessun contatto collegato a questa azienda.</p>
            </div>
          ) : (
            <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
              <Background color="#94a3b8" gap={20} size={1} />
              <Controls showInteractive={false} />
            </ReactFlow>
          )}
        </div>
      </div>
    </div>
  );
}
