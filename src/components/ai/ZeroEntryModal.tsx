import { useState } from 'react';
import { X, Sparkles, Loader2, Wand2, Check } from 'lucide-react';
import { extractFromText, type ExtractionResult } from '../../lib/ai/extract';
import { useCreateContact } from '../../hooks/useContacts';
import { buildMeta } from '../../lib/trust';
import { TrustBadge } from '../trust/TrustBadge';
import { computeTrust } from '../../lib/trust';

interface Props {
  onClose: () => void;
}

const SAMPLE = `Ciao, sono Federica Greco, Head of Marketing presso LumaTech.
Puoi scrivermi a federica.greco@lumatech.io o chiamarmi al +39 347 8896655.
Vorrei una demo della piattaforma entro fine mese.`;

export function ZeroEntryModal({ onClose }: Props) {
  const createContact = useCreateContact();
  const [text, setText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [saved, setSaved] = useState(false);

  const onExtract = async () => {
    setExtracting(true);
    try {
      setResult(await extractFromText(text));
    } finally {
      setExtracting(false);
    }
  };

  const onSave = async () => {
    if (!result) return;
    await createContact.mutateAsync({
      first_name: result.first_name?.value ?? null,
      last_name: result.last_name?.value ?? null,
      email: result.email?.value ?? null,
      phone: result.phone?.value ?? null,
      job_title: result.job_title?.value ?? null,
      field_trust: {
        ...(result.email ? { email: buildMeta('ai_extracted', result.email.confidence) } : {}),
        ...(result.phone ? { phone: buildMeta('ai_extracted', result.phone.confidence) } : {}),
        ...(result.job_title ? { job_title: buildMeta('ai_extracted', result.job_title.confidence) } : {}),
      },
    });
    setSaved(true);
    setTimeout(onClose, 900);
  };

  const fields = result ? ([
    ['Nome', result.first_name], ['Cognome', result.last_name],
    ['Email', result.email], ['Telefono', result.phone],
    ['Ruolo', result.job_title], ['Azienda', result.company_name],
  ] as const).filter(([, f]) => f) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-surface-900 rounded-xl shadow-2xl border
                   border-surface-200 dark:border-surface-700 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-brand-500" />
            <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">
              Zero-Entry Capture
            </h2>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Incolla un'email, una firma o un appunto. L'AI estrae i campi del contatto con un
            punteggio di fiducia per ciascuno — tu controlli e salvi.
          </p>

          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setResult(null); }}
              rows={5}
              placeholder="Incolla qui il testo…"
              className="w-full px-3 py-2 text-sm rounded-lg border border-surface-200 dark:border-surface-700
                         bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 outline-none
                         resize-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
            {!text && (
              <button
                onClick={() => setText(SAMPLE)}
                className="absolute bottom-2 right-2 text-[11px] text-brand-500 hover:underline"
              >
                Usa un esempio
              </button>
            )}
          </div>

          <button
            onClick={onExtract}
            disabled={!text.trim() || extracting}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700
                       text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {extracting ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
            {extracting ? 'Analisi in corso…' : 'Estrai campi con AI'}
          </button>

          {/* Results */}
          {result && (
            <div className="space-y-3">
              <p className="text-xs text-surface-500 dark:text-surface-400 flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-500" /> {result.summary}
              </p>
              {fields.length > 0 && (
                <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg divide-y divide-surface-100 dark:divide-surface-800">
                  {fields.map(([label, f]) => (
                    <div key={label} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <p className="text-[11px] text-surface-400 uppercase tracking-wide">{label}</p>
                        <p className="text-sm text-surface-800 dark:text-surface-100">{f!.value}</p>
                      </div>
                      <TrustBadge
                        trust={computeTrust({ source: 'ai_extracted', confidence: f!.confidence, updatedAt: new Date().toISOString() })}
                        compact
                      />
                    </div>
                  ))}
                </div>
              )}

              {fields.length > 0 && (
                <button
                  onClick={onSave}
                  disabled={createContact.isPending || saved}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-trust-high
                             hover:opacity-90 text-white text-sm font-medium rounded-lg transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: saved ? '#22c55e' : undefined }}
                >
                  {saved ? <><Check size={15} /> Contatto creato!</> :
                   createContact.isPending ? <Loader2 size={15} className="animate-spin" /> :
                   'Crea contatto dai campi estratti'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
