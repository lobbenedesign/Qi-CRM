import { Handle, Position } from 'reactflow';
import { Play, Mail, Clock, Split, Zap, MessageCircle } from 'lucide-react';

const NODE_STYLES = "bg-white dark:bg-surface-900 border-2 rounded-xl p-3 min-w-[200px] shadow-lg flex items-start gap-3 transition-colors";
const HANDLE_STYLE = "w-3 h-3 bg-brand-500 border-2 border-surface-900";

export function TriggerNode({ data }: { data: { label: string; type: string } }) {
  return (
    <div className={`${NODE_STYLES} border-emerald-500/50`}>
      <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
        <Play size={16} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">Trigger</p>
        <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{data.label}</p>
      </div>
      <Handle type="source" position={Position.Right} className={HANDLE_STYLE} />
    </div>
  );
}

export function ActionNode({ data }: { data: { label: string; actionType: string } }) {
  const getIcon = () => {
    switch (data.actionType) {
      case 'email': return <Mail size={16} />;
      case 'whatsapp': return <MessageCircle size={16} />;
      default: return <Zap size={16} />;
    }
  };

  return (
    <div className={`${NODE_STYLES} border-brand-500/50`}>
      <Handle type="target" position={Position.Left} className={HANDLE_STYLE} />
      <div className="p-2 bg-brand-500/20 text-brand-400 rounded-lg shrink-0">
        {getIcon()}
      </div>
      <div>
        <p className="text-[10px] font-bold text-brand-400 uppercase tracking-wider mb-0.5">Azione</p>
        <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{data.label}</p>
      </div>
      <Handle type="source" position={Position.Right} className={HANDLE_STYLE} />
    </div>
  );
}

export function ConditionNode({ data }: { data: { label: string } }) {
  return (
    <div className={`${NODE_STYLES} border-purple-500/50`}>
      <Handle type="target" position={Position.Left} className={HANDLE_STYLE} />
      <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg shrink-0">
        <Split size={16} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-0.5">Condizione</p>
        <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{data.label}</p>
      </div>
      <Handle type="source" position={Position.Right} id="true" style={{ top: '25%' }} className={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} id="false" style={{ top: '75%' }} className={HANDLE_STYLE} />
      {/* Labels for condition outcomes */}
      <span className="absolute -right-4 top-[15%] text-[8px] text-surface-400 font-bold uppercase">Sì</span>
      <span className="absolute -right-4 top-[65%] text-[8px] text-surface-400 font-bold uppercase">No</span>
    </div>
  );
}

export function DelayNode({ data }: { data: { label: string } }) {
  return (
    <div className={`${NODE_STYLES} border-amber-500/50`}>
      <Handle type="target" position={Position.Left} className={HANDLE_STYLE} />
      <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
        <Clock size={16} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">Attesa</p>
        <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{data.label}</p>
      </div>
      <Handle type="source" position={Position.Right} className={HANDLE_STYLE} />
    </div>
  );
}
