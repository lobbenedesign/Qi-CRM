import { useMemo } from 'react';
import {
  X, Trash2, User, Building2, Calendar, Euro, TrendingUp,
  AlertTriangle, Sparkles, Loader2,
} from 'lucide-react';
import { useDealsStore } from '../../store/dealsStore';
import { useDeleteDeal, useUpdateDeal } from '../../hooks/useDeals';
import { useCan } from '../../hooks/useCan';
import { useProductsStore } from '../../store/productsStore';
import { useCustomPropertiesStore } from '../../store/customPropertiesStore';
import { formatCurrency, formatDate } from '../../lib/utils';
import { ActivityTimeline } from '../activities/ActivityTimeline';
import { DealDocumentsSection } from './DealDocumentsSection';
import { SalesPathGuide } from './SalesPathGuide';
import { PlaybookWidget } from './PlaybookWidget';
import { AssigneePicker, AssigneeAvatar } from '../team/AssigneePicker';
import type { QuantumDeal } from '../../types/crm';

interface Props {
  dealId: string;
  onClose: () => void;
}

export function DealDetailDrawer({ dealId, onClose }: Props) {
  const getQuantumDeals = useDealsStore((s) => s.getQuantumDeals);
  const deal = getQuantumDeals().find((d) => d.id === dealId) as QuantumDeal | undefined;
  const deleteDeal = useDeleteDeal();
  const updateDeal = useUpdateDeal();
  const canAssign = useCan('deals:edit');
  const catalogProducts = useProductsStore((s) => s.products);
  const stages = useDealsStore((s) => s.stages);
  // NB: filtrare DENTRO il selettore zustand crea un nuovo array a ogni render
  // ("getSnapshot should be cached" → loop infinito). Selezioniamo l'array stabile e filtriamo in useMemo.
  const allProperties = useCustomPropertiesStore((s: any) => s.properties);
  const dealProperties = useMemo(
    () => (allProperties as any[]).filter((p: any) => p.targetObject === 'deal'),
    [allProperties],
  );

  const onDelete = async () => {
    if (!deal) return;
    if (!confirm(`Eliminare il deal "${deal.title}"?`)) return;
    await deleteDeal.mutateAsync(deal.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white dark:bg-surface-900 h-full overflow-y-auto
                   shadow-2xl border-l border-surface-200 dark:border-surface-700"
        onClick={(e) => e.stopPropagation()}
      >
        {!deal ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-brand-500" size={28} />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-surface-900 border-b border-surface-200
                            dark:border-surface-700 px-5 py-4 z-10"
                 style={{ borderTop: `3px solid ${deal.visual_color}` }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-surface-900 dark:text-surface-50">{deal.title}</h2>
                  <p className="text-xl font-bold text-brand-600 dark:text-brand-400 mt-1">
                    {formatCurrency(deal.value, deal.currency)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={onDelete} className="p-1.5 text-risk-high hover:bg-risk-high/10 rounded-md transition-colors">
                    <Trash2 size={15} />
                  </button>
                  <button onClick={onClose} className="p-1.5 text-surface-400 hover:text-surface-600">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: `${deal.stage_meta.default_color}20`, color: deal.stage_meta.default_color }}>
                  {deal.stage_meta.name}
                </span>
                <span className="text-xs text-surface-400">{deal.stage_meta.probability}% prob.</span>
                {deal.is_stalled && (
                  <span className="flex items-center gap-1 text-xs text-risk-high">
                    <AlertTriangle size={11} /> Rischio {deal.risk_score}%
                  </span>
                )}
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Guided Selling / Sales Path */}
              <SalesPathGuide deal={deal} stages={stages} />

              {/* Qi-Playbook */}
              <PlaybookWidget dealId={deal.id} stage={deal.stage} />

              {/* AI insights */}
              {(deal.ai_insights ?? []).length > 0 && (
                <div className="space-y-2">
                  {deal.ai_insights!.map((ins) => (
                    <div key={ins.id} className="bg-brand-50 dark:bg-brand-900/20 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 text-xs font-medium mb-1">
                        <Sparkles size={13} /> {ins.insight_type.replace('_', ' ')} · {Math.round(ins.confidence * 100)}%
                      </div>
                      <p className="text-sm text-surface-700 dark:text-surface-300">{ins.reasoning}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Next action */}
              {deal.next_action && (
                <div className="flex items-start gap-2 text-sm bg-surface-50 dark:bg-surface-800/50 rounded-lg p-3">
                  <TrendingUp size={15} className="text-brand-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-surface-400 uppercase tracking-wide">Prossima azione</p>
                    <p className="text-surface-800 dark:text-surface-100">{deal.next_action}</p>
                  </div>
                </div>
              )}

              {/* Assegnatario */}
              <div>
                <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">Assegnato a</h3>
                {canAssign ? (
                  <AssigneePicker
                    value={deal.assignee_id}
                    allowAuto={false}
                    onChange={(v) => updateDeal.mutate({ id: deal.id, patch: { assignee_id: v === 'auto' ? null : (v || null) } })}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-200">
                    <AssigneeAvatar memberId={deal.assignee_id} size={28} />
                    {deal.assignee_id ? '' : 'Non assegnato'}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg px-3">
                <Row icon={<User size={14} />} label="Contatto"
                     value={deal.contact ? `${deal.contact.first_name} ${deal.contact.last_name}` : '—'} />
                <Row icon={<Building2 size={14} />} label="Azienda" value={deal.company?.name ?? '—'} />
                <Row icon={<Calendar size={14} />} label="Chiusura prevista"
                     value={deal.expected_close ? formatDate(deal.expected_close) : '—'} />
                <Row icon={<Euro size={14} />} label="Velocità" value={deal.velocity_days != null ? `${deal.velocity_days} giorni` : '—'} />
              </div>

              {/* Custom Properties */}
              {dealProperties.length > 0 && (
                <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg p-3 space-y-3">
                  <h4 className="text-[10px] font-bold text-surface-400 uppercase tracking-wide border-b border-surface-150 dark:border-surface-800 pb-1.5">Campi Personalizzati</h4>
                  {dealProperties.map((p: any) => {
                    const val = deal.custom_fields?.[p.id] ?? '';
                    return (
                      <div key={p.id} className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-surface-650 dark:text-surface-400 animate-fade-in" title={p.description}>
                          {p.label}
                        </label>
                        {p.type === 'select' ? (
                          <select
                            value={val as string}
                            onChange={(e) => {
                              const updatedCustom = { ...(deal.custom_fields || {}), [p.id]: e.target.value };
                              updateDeal.mutate({ id: deal.id, patch: { custom_fields: updatedCustom } });
                            }}
                            className="bg-white dark:bg-surface-800 text-xs rounded border border-surface-200 dark:border-surface-700 px-2.5 py-1.5 text-surface-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
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
                              const updatedCustom = { ...(deal.custom_fields || {}), [p.id]: e.target.value };
                              updateDeal.mutate({ id: deal.id, patch: { custom_fields: updatedCustom } });
                            }}
                            placeholder="Inserisci numero..."
                            className="bg-white dark:bg-surface-800 text-xs rounded border border-surface-200 dark:border-surface-700 px-2.5 py-1.5 text-surface-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        ) : p.type === 'date' ? (
                          <input
                            type="date"
                            value={val as string}
                            onChange={(e) => {
                              const updatedCustom = { ...(deal.custom_fields || {}), [p.id]: e.target.value };
                              updateDeal.mutate({ id: deal.id, patch: { custom_fields: updatedCustom } });
                            }}
                            className="bg-white dark:bg-surface-800 text-xs rounded border border-surface-200 dark:border-surface-700 px-2.5 py-1.5 text-surface-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={val as string}
                            onChange={(e) => {
                              const updatedCustom = { ...(deal.custom_fields || {}), [p.id]: e.target.value };
                              updateDeal.mutate({ id: deal.id, patch: { custom_fields: updatedCustom } });
                            }}
                            placeholder="Inserisci testo..."
                            className="bg-white dark:bg-surface-800 text-xs rounded border border-surface-200 dark:border-surface-700 px-2.5 py-1.5 text-surface-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Products and Line Items Editor */}
              <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
                <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>Prodotti e Line Items</span>
                </h3>
                
                <div className="space-y-2 mb-3">
                  {deal.products.length > 0 ? (
                    deal.products.map((p) => (
                      <div key={p.id} className="flex flex-col gap-1 p-2.5 bg-surface-50 dark:bg-surface-850 rounded-lg border border-surface-150 dark:border-surface-800">
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-semibold text-surface-800 dark:text-surface-200">{p.name}</span>
                          <button
                            onClick={() => {
                              const updatedProducts = deal.products.filter((item) => item.id !== p.id);
                              const total = updatedProducts.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
                              updateDeal.mutate({ id: deal.id, patch: { products: updatedProducts, value: total } });
                            }}
                            className="p-1 text-risk-high hover:bg-risk-high/10 rounded transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-1 gap-2">
                          <div className="text-[10px] text-surface-450 dark:text-surface-400">
                            Prezzo: {formatCurrency(p.unit_price, deal.currency)}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-surface-500">Q.tà:</span>
                            <input
                              type="number"
                              min="1"
                              value={p.quantity}
                              onChange={(e) => {
                                const q = parseInt(e.target.value) || 1;
                                const updatedProducts = deal.products.map((item) =>
                                  item.id === p.id ? { ...item, quantity: q } : item
                                );
                                const total = updatedProducts.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
                                updateDeal.mutate({ id: deal.id, patch: { products: updatedProducts, value: total } });
                              }}
                              className="w-12 bg-white dark:bg-surface-800 text-xs text-center border border-surface-200 dark:border-surface-700 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-500 text-surface-900 dark:text-surface-100"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-surface-400 italic py-3 text-center bg-surface-50/50 dark:bg-surface-800/10 rounded-lg">
                      Nessun prodotto associato a questo deal
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <select
                    onChange={(e) => {
                      const prodId = e.target.value;
                      if (!prodId) return;
                      const catalogProduct = catalogProducts.find((cp) => cp.id === prodId);
                      if (!catalogProduct) return;

                      const existing = deal.products.find((dp) => dp.id === prodId);
                      let updatedProducts = [];
                      if (existing) {
                        updatedProducts = deal.products.map((dp) =>
                          dp.id === prodId ? { ...dp, quantity: dp.quantity + 1 } : dp
                        );
                      } else {
                        updatedProducts = [
                          ...deal.products,
                          {
                            id: catalogProduct.id,
                            name: catalogProduct.name,
                            quantity: 1,
                            unit_price: catalogProduct.price,
                          },
                        ];
                      }

                      const total = updatedProducts.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
                      updateDeal.mutate({ id: deal.id, patch: { products: updatedProducts, value: total } });
                      e.target.value = '';
                    }}
                    className="flex-1 bg-surface-50 dark:bg-surface-800 text-xs text-surface-800 dark:text-surface-150 rounded-md border border-surface-200 dark:border-surface-700 p-1.5 focus:outline-none"
                  >
                    <option value="">Aggiungi prodotto dal catalogo...</option>
                    {catalogProducts
                      .filter((cp) => !deal.products.some((dp) => dp.id === cp.id))
                      .map((cp) => (
                        <option key={cp.id} value={cp.id}>
                          {cp.name} ({formatCurrency(cp.price, deal.currency)})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Documenti collegati */}
              <DealDocumentsSection dealId={deal.id} />

              {/* Timeline */}
              <div>
                <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <TrendingUp size={12} /> Attività
                </h3>
                <ActivityTimeline dealId={deal.id} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-surface-100 dark:border-surface-800 last:border-0">
      <div className="flex items-center gap-2 text-surface-400">
        {icon}<span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-sm text-surface-800 dark:text-surface-100 text-right">{value}</span>
    </div>
  );
}
