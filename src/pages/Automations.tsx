import { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import type { Node, Edge, Connection, NodeChange, EdgeChange } from 'reactflow';
import { useShallow } from 'zustand/shallow';
import { Plus, Save, Zap, Split, Mail, Clock, Trash2, ArrowLeft } from 'lucide-react';
import { useAutomationsStore, type Journey } from '../store/automationsStore';
import { TriggerNode, ActionNode, ConditionNode, DelayNode } from '../components/automations/CustomNodes';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
};

export default function Automations() {
  const { journeys, addJourney, updateJourney, deleteJourney, toggleJourney } = useAutomationsStore(
    useShallow((s) => ({
      journeys: s.journeys,
      addJourney: s.addJourney,
      updateJourney: s.updateJourney,
      deleteJourney: s.deleteJourney,
      toggleJourney: s.toggleJourney,
    }))
  );

  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);

  if (selectedJourneyId) {
    const journey = journeys.find((j) => j.id === selectedJourneyId);
    if (!journey) {
      setSelectedJourneyId(null);
      return null;
    }
    return (
      <JourneyBuilder
        journey={journey}
        onBack={() => setSelectedJourneyId(null)}
        onSave={(updates) => updateJourney(journey.id, updates)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-50 dark:bg-surface-950 p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
            <Zap className="text-brand-500" /> Journey Builder
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            Crea automazioni complesse e percorsi personalizzati per i tuoi contatti.
          </p>
        </div>
        <button
          onClick={() => {
            const nj = addJourney({ name: 'Nuovo Journey', description: 'Descrizione...' });
            setSelectedJourneyId(nj.id);
          }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          <Plus size={16} /> Nuovo Journey
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {journeys.map((j) => (
          <div key={j.id} className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-5 hover:border-surface-200 dark:hover:border-surface-700 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">{j.name}</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleJourney(j.id);
                }}
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                  j.active ? 'bg-emerald-500' : 'bg-surface-200 dark:bg-surface-700'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  j.active ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
            <p className="text-sm text-surface-400 mb-4 line-clamp-2">{j.description}</p>
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-surface-200 dark:border-surface-800">
              <span className="text-xs text-surface-500">{j.nodes.length} Nodi • {j.runs} Esecuzioni</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedJourneyId(j.id)}
                  className="px-3 py-1.5 text-xs font-medium bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg transition-colors"
                >
                  Modifica Flow
                </button>
                <button
                  onClick={() => {
                    if (confirm('Sei sicuro di voler eliminare questo Journey?')) deleteJourney(j.id);
                  }}
                  className="p-1.5 text-surface-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {journeys.length === 0 && (
          <div className="col-span-full py-12 text-center text-surface-500 border-2 border-dashed border-surface-200 dark:border-surface-800 rounded-xl">
            <Zap size={48} className="mx-auto mb-4 opacity-20" />
            <p>Nessun Journey configurato.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Builder Canvas ─────────────────────────────────────────────────────────

function JourneyBuilder({ journey, onBack, onSave }: { journey: Journey; onBack: () => void; onSave: (u: Partial<Journey>) => void }) {
  const [nodes, setNodes] = useState<Node[]>(journey.nodes);
  const [edges, setEdges] = useState<Edge[]>(journey.edges);
  const [name, setName] = useState(journey.name);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true }, eds)), []);

  const handleSave = () => {
    onSave({ name, nodes, edges });
  };

  const onDragStart = (event: React.DragEvent, nodeType: string, nodeDataStr: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-data', nodeDataStr);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const dataStr = event.dataTransfer.getData('application/reactflow-data');
      if (!type || !dataStr) return;

      const data = JSON.parse(dataStr);
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 40,
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    []
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex h-full bg-surface-50 dark:bg-surface-950 overflow-hidden">
      {/* Sidebar Palette */}
      <div className="w-64 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-surface-200 dark:border-surface-800 flex items-center gap-2">
          <button onClick={onBack} className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-400 hover:text-surface-800 dark:hover:text-surface-200">
            <ArrowLeft size={18} />
          </button>
          <h2 className="font-bold text-surface-900 dark:text-surface-100 truncate flex-1">Nodi</h2>
        </div>
        <div className="p-4 space-y-6 overflow-y-auto flex-1">
          <div>
            <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Azioni</h3>
            <div className="space-y-2">
              <div
                className="flex items-center gap-3 p-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl cursor-grab hover:border-brand-500 transition-colors text-sm font-medium text-surface-800 dark:text-surface-200"
                onDragStart={(e) => onDragStart(e, 'action', JSON.stringify({ label: 'Invia Email', actionType: 'email' }))}
                draggable
              >
                <Mail size={16} className="text-brand-400" /> Invia Email
              </div>
              <div
                className="flex items-center gap-3 p-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl cursor-grab hover:border-brand-500 transition-colors text-sm font-medium text-surface-800 dark:text-surface-200"
                onDragStart={(e) => onDragStart(e, 'action', JSON.stringify({ label: 'Messaggio WhatsApp', actionType: 'whatsapp' }))}
                draggable
              >
                <MessageCircle size={16} className="text-green-400" /> WhatsApp
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Logica</h3>
            <div className="space-y-2">
              <div
                className="flex items-center gap-3 p-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl cursor-grab hover:border-purple-500 transition-colors text-sm font-medium text-surface-800 dark:text-surface-200"
                onDragStart={(e) => onDragStart(e, 'condition', JSON.stringify({ label: 'Ha aperto email?' }))}
                draggable
              >
                <Split size={16} className="text-purple-400" /> Condizione (If/Else)
              </div>
              <div
                className="flex items-center gap-3 p-3 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl cursor-grab hover:border-amber-500 transition-colors text-sm font-medium text-surface-800 dark:text-surface-200"
                onDragStart={(e) => onDragStart(e, 'delay', JSON.stringify({ label: 'Attendi 3 giorni' }))}
                draggable
              >
                <Clock size={16} className="text-amber-400" /> Ritardo (Wait)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0" ref={reactFlowWrapper}>
        <div className="h-14 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900/50 backdrop-blur flex items-center justify-between px-4 shrink-0 z-10">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-transparent border-none focus:outline-none focus:ring-0 text-lg font-bold text-surface-900 dark:text-surface-100 w-64"
          />
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Save size={14} /> Salva Flow
          </button>
        </div>
        
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={() => {}}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            className="bg-surface-50 dark:bg-surface-950"
            defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
          >
            <Background color="#3f3f46" gap={16} size={1} />
            <Controls className="bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 fill-surface-400" />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

// Icon non importata in alto, la definisco qui localmente per il componente ActionNode
function MessageCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}
