import React, { useState } from 'react';
import { ShieldAlert, X, Calendar, Euro, Tag } from 'lucide-react';
import type { Deal, DealStage } from '../../types/crm';

interface Props {
  deal: Deal;
  targetStageKey: DealStage;
  targetStageName: string;
  onClose: () => void;
  onConfirm: (updatedPatch: Partial<Deal>) => void;
}

export function TransitionGateModal({
  deal,
  targetStageKey,
  targetStageName,
  onClose,
  onConfirm,
}: Props) {
  const [value, setValue] = useState(deal.value.toString());
  const [expectedClose, setExpectedClose] = useState(deal.expected_close?.split('T')[0] || '');
  const [acquisitionChannel, setAcquisitionChannel] = useState(
    (deal.custom_fields?.['prop-canale-acquisizione'] as string) || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patch: Partial<Deal> = {
      stage: targetStageKey,
      value: parseFloat(value) || 0,
      expected_close: expectedClose ? new Date(expectedClose).toISOString() : null,
      custom_fields: {
        ...(deal.custom_fields || {}),
        'prop-canale-acquisizione': acquisitionChannel,
      },
    };
    onConfirm(patch);
  };

  // Determina quali campi mostrare in base alla fase di destinazione
  const needsValue = ['proposal', 'negotiation', 'won'].includes(targetStageKey);
  const needsCloseDate = ['proposal', 'negotiation', 'won'].includes(targetStageKey);
  const needsChannel = ['negotiation', 'won'].includes(targetStageKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-xl shadow-2xl border border-surface-200 dark:border-surface-700 overflow-hidden transform transition-all">
        {/* Header con gradiente premium */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 flex items-center gap-3 text-white">
          <ShieldAlert size={20} className="text-violet-100 animate-pulse" />
          <div className="flex-1">
            <h3 className="font-bold text-sm tracking-wide uppercase">Gate di Controllo Fase</h3>
            <p className="text-[11px] text-violet-200">Completa le informazioni richieste per procedere</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-surface-50 dark:bg-surface-800/30 rounded-lg p-3 border border-surface-150 dark:border-surface-800 text-xs text-surface-600 dark:text-surface-300">
            Stai spostando il deal <span className="font-bold text-surface-800 dark:text-surface-100">"{deal.title}"</span> alla fase <span className="font-bold text-brand-600 dark:text-brand-400">"{targetStageName}"</span>. Questa transizione richiede la compilazione obbligatoria dei seguenti campi commerciali.
          </div>

          {/* Valore Deal */}
          {needsValue && (
            <div>
              <label className="block text-xs font-semibold text-surface-550 dark:text-surface-400 mb-1 flex items-center gap-1">
                <Euro size={12} className="text-surface-400" /> Valore Economico (€)
              </label>
              <input
                type="number"
                required
                min="1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Inserisci il valore..."
                className="w-full bg-surface-50 dark:bg-surface-800 text-sm text-surface-900 dark:text-white rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          )}

          {/* Data Chiusura */}
          {needsCloseDate && (
            <div>
              <label className="block text-xs font-semibold text-surface-550 dark:text-surface-400 mb-1 flex items-center gap-1">
                <Calendar size={12} className="text-surface-400" /> Data Chiusura Prevista
              </label>
              <input
                type="date"
                required
                value={expectedClose}
                onChange={(e) => setExpectedClose(e.target.value)}
                className="w-full bg-surface-50 dark:bg-surface-800 text-sm text-surface-900 dark:text-white rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          )}

          {/* Canale Acquisizione (Custom Property) */}
          {needsChannel && (
            <div>
              <label className="block text-xs font-semibold text-surface-550 dark:text-surface-400 mb-1 flex items-center gap-1">
                <Tag size={12} className="text-surface-400" /> Canale Acquisizione (Proprietà Custom)
              </label>
              <select
                required
                value={acquisitionChannel}
                onChange={(e) => setAcquisitionChannel(e.target.value)}
                className="w-full bg-surface-50 dark:bg-surface-800 text-sm text-surface-900 dark:text-white rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">Seleziona un canale...</option>
                <option value="Inbound Form">Inbound Form</option>
                <option value="Fiera / Evento">Fiera / Evento</option>
                <option value="Outreach LinkedIn">Outreach LinkedIn</option>
                <option value="Referral">Referral</option>
                <option value="Altro">Altro</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-surface-100 dark:border-surface-800 pt-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors shadow-lg shadow-brand-500/25"
            >
              Conferma e Sposta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
