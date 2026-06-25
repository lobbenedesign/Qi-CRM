import { useNavigate } from 'react-router-dom';
import { FileCheck2, ReceiptText, FolderOpen, ArrowRight, ShieldCheck } from 'lucide-react';
import { useContractsStore } from '../../store/contractsStore';
import { useInvoicesStore } from '../../store/invoicesStore';
import { useDocumentsStore } from '../../store/documentsStore';
import { useShallow } from 'zustand/shallow';

/** Documenti collegati a un deal: contratti, fatture e file ricevuti via email. */
export function DealDocumentsSection({ dealId }: { dealId: string }) {
  const navigate = useNavigate();
  const contracts = useContractsStore(useShallow((s) => s.contracts.filter((c) => c.deal_id === dealId)));
  const invoices = useInvoicesStore(useShallow((s) => s.invoices.filter((i) => i.deal_id === dealId)));
  const documents = useDocumentsStore(useShallow((s) => s.documents.filter((d) => d.deal_id === dealId)));

  const total = contracts.length + invoices.length + documents.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide flex items-center gap-1.5">
          <FolderOpen size={12} /> Documenti {total > 0 && <span className="text-surface-300">({total})</span>}
        </h3>
        <button onClick={() => navigate('/documents')} className="text-[11px] text-brand-500 hover:underline flex items-center gap-0.5">
          Apri Documenti <ArrowRight size={10} />
        </button>
      </div>

      {total === 0 ? (
        <p className="text-xs text-surface-400 py-3 text-center bg-surface-50 dark:bg-surface-800/50 rounded-lg">
          Nessun documento collegato a questo deal.
        </p>
      ) : (
        <div className="space-y-1">
          {contracts.map((c) => (
            <Row key={c.id} icon={<FileCheck2 size={14} className="text-purple-500" />} label={c.title}
              meta={c.status} verified={c.status === 'signed'} onClick={() => navigate('/contracts')} />
          ))}
          {invoices.map((i) => (
            <Row key={i.id} icon={<ReceiptText size={14} className="text-amber-500" />} label={i.number}
              meta={i.status} onClick={() => navigate('/invoices')} />
          ))}
          {documents.map((d) => (
            <Row key={d.id} icon={<FolderOpen size={14} className="text-brand-500" />} label={d.name}
              meta={d.from ?? 'ricevuto'} verified={d.verified} onClick={() => navigate('/documents')} />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, meta, verified, onClick }: { icon: React.ReactNode; label: string; meta: string; verified?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 p-2 rounded-lg bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-left">
      <span className="shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-surface-800 dark:text-surface-100 truncate">{label}</p>
        <p className="text-[11px] text-surface-400 capitalize">{meta}</p>
      </div>
      {verified && <ShieldCheck size={13} className="text-trust-high shrink-0" />}
    </button>
  );
}
