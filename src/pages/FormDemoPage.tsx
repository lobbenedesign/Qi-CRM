import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useParams, Link } from 'react-router-dom';
import { useMarketingStore } from '../store/marketingStore';
import { useCustomPropertiesStore } from '../store/customPropertiesStore';
import { CheckCircle, AlertCircle, Send, Sparkles } from 'lucide-react';
import { repo } from '../lib/repo';
import { buildConsent, CONSENT_LABELS } from '../lib/consent';

export default function FormDemoPage() {
  const { id } = useParams<{ id: string }>();
  const { forms, submitForm } = useMarketingStore(
    useShallow((s) => ({ forms: s.forms, submitForm: s.submitForm }))
  );
  const customProperties = useCustomPropertiesStore((s) => s.properties);

  const form = forms.find((f) => f.id === id);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [consentMkt, setConsentMkt] = useState(false);

  if (!form) {
    return (
      <div className="min-h-screen bg-surface-100 dark:bg-surface-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 text-center max-w-sm shadow-xl">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-surface-900 dark:text-white">Modulo non trovato</h2>
          <p className="text-xs text-surface-550 dark:text-surface-450 mt-1 mb-4">
            Il link inserito potrebbe essere scaduto o errato.
          </p>
          <Link
            to="/marketing"
            className="inline-flex items-center gap-1 text-xs font-semibold bg-brand-600 text-white px-4 py-2 rounded-lg"
          >
            Torna alla Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const STANDARD_FIELDS = [
    { key: 'first_name', label: 'Nome' },
    { key: 'last_name', label: 'Cognome' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telefono' },
  ];

  const allAvailableFields = [
    ...STANDARD_FIELDS,
    ...customProperties.map((p) => ({ key: p.id, label: p.label })),
  ];

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptPrivacy) {
      setError('Per inviare devi leggere e accettare l\'informativa privacy.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Submit to Marketing store log
      submitForm(form.id, formData);

      // 2. Create/Update Contact in Repo
      // Separazione campi standard e campi custom
      const standardData: Record<string, string> = {};
      const customFields: Record<string, string> = {};

      Object.entries(formData).forEach(([k, v]) => {
        if (['first_name', 'last_name', 'email', 'phone'].includes(k)) {
          standardData[k] = v;
        } else {
          customFields[k] = v;
        }
      });

      // Email obbligatoria per identificazione
      const email = standardData.email || `inbound-${Date.now()}@anonymous.com`;

      const newContact = await repo.createContact({
        first_name: standardData.first_name || 'Inbound',
        last_name: standardData.last_name || 'Lead',
        email,
        phone: standardData.phone || null,
        lead_status: 'new',
        lifecycle_stage: 'lead',
        tags: ['Inbound Form', form.name],
        field_trust: {
          email: { source: 'import', confidence: 0.95, updatedAt: new Date().toISOString() },
          first_name: { source: 'import', confidence: 0.9, updatedAt: new Date().toISOString() },
        },
        custom_fields: customFields,
        consent: buildConsent({
          marketing: consentMkt,
          profiling: consentMkt,
          channels: consentMkt ? ['email'] : [],
          source: 'form',
          source_ref: form.id,
        }),
      });

      // 3. Create Activity
      await repo.createActivity({
        contact_id: newContact.id,
        type: 'ai_capture',
        subject: `Compilazione Modulo: ${form.name}`,
        body: `Il contatto ha compilato il form online.\n\nTemplate: ${form.template.toUpperCase()}\nDati acquisiti:\n${Object.entries(formData)
          .map(([k, v]) => `- ${allAvailableFields.find((f) => f.key === k)?.label || k}: ${v}`)
          .join('\n')}`,
        source: 'import',
        confidence: 0.95,
      });

      // Lead Generation → Pipeline: crea un Deal se il form è configurato
      if (form.createDeal) {
        await repo.createDeal({
          title: `${form.name} — ${newContact.first_name ?? 'Lead'} ${newContact.last_name ?? ''}`.trim(),
          value: form.dealValue ?? 0,
          stage: form.dealStage || 'lead',
          contact_id: newContact.id,
          company_id: newContact.company_id ?? null,
          tags: ['Inbound Form', form.name],
          next_action: 'Primo contatto commerciale',
          field_trust: { value: { source: 'import', confidence: 0.6, updatedAt: new Date().toISOString() } },
        });
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'invio del modulo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col justify-between">
      {/* Top Warning bar (Indicates it's a test demo page) */}
      <div className="bg-brand-500/10 dark:bg-brand-500/20 border-b border-brand-500/20 text-brand-700 dark:text-brand-300 text-xs px-4 py-2 text-center flex items-center justify-center gap-1.5 shrink-0">
        <Sparkles size={13} className="animate-pulse" />
        <span>Pagina di Demo e Test del Form di Cattura (Qi-CRM Marketing)</span>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-xl border border-surface-200 dark:border-surface-800 overflow-hidden">
          {/* Header styled with the themeColor */}
          <div
            className="px-6 py-5 text-white text-center"
            style={{ backgroundColor: form.themeColor }}
          >
            <h1 className="font-bold text-lg">{form.name}</h1>
            <p className="text-xs opacity-90 mt-1">Completa i campi per inoltrare la tua richiesta</p>
          </div>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 text-xs p-3 rounded-lg flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {form.fields.map((fKey) => {
                const fieldDef = allAvailableFields.find((f) => f.key === fKey);
                if (!fieldDef) return null;
                return (
                  <div key={fKey}>
                    <label className="block text-xs font-semibold text-surface-650 dark:text-surface-300 mb-1">
                      {fieldDef.label}
                    </label>
                    <input
                      type={fKey === 'email' ? 'email' : 'text'}
                      required={fKey === 'email' || fKey === 'first_name'}
                      value={formData[fKey] || ''}
                      onChange={(e) => handleInputChange(fKey, e.target.value)}
                      placeholder={`Inserisci ${fieldDef.label.toLowerCase()}...`}
                      className="w-full bg-surface-50 dark:bg-surface-800 text-xs text-surface-900 dark:text-white rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                );
              })}

              {/* Consenso privacy (GDPR) */}
              <div className="space-y-2 pt-1 border-t border-surface-100 dark:border-surface-800">
                <label className="flex items-start gap-2 text-[11px] text-surface-600 dark:text-surface-300 cursor-pointer">
                  <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} className="mt-0.5 shrink-0" />
                  <span>{CONSENT_LABELS.required}{' '}
                    <a href="/privacy" target="_blank" rel="noreferrer" className="text-brand-600 dark:text-brand-400 underline">Leggi l'informativa</a>. <span className="text-red-500">*</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-[11px] text-surface-600 dark:text-surface-300 cursor-pointer">
                  <input type="checkbox" checked={consentMkt} onChange={(e) => setConsentMkt(e.target.checked)} className="mt-0.5 shrink-0" />
                  <span>{CONSENT_LABELS.marketing}</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !acceptPrivacy}
                style={{ backgroundColor: form.themeColor }}
                className="w-full text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-lg hover:brightness-95 active:brightness-90 transition-all flex items-center justify-center gap-1.5 mt-2"
              >
                {loading ? (
                  'Invio in corso...'
                ) : (
                  <>
                    <Send size={13} /> {form.buttonText || 'Invia'}
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="p-6 text-center space-y-4 animate-fade-in">
              <CheckCircle size={44} className="text-emerald-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-bold text-surface-900 dark:text-white text-base">Inviato con Successo!</h3>
                <p className="text-xs text-surface-550 dark:text-surface-450 px-4">
                  {form.successMessage || 'Le tue informazioni sono state registrate.'}
                </p>
              </div>
              <div className="bg-surface-50 dark:bg-surface-800/30 rounded-lg p-3 border border-surface-150 dark:border-surface-800 text-[11px] text-surface-500 text-left space-y-1">
                <p className="font-semibold text-surface-700 dark:text-surface-300">Automazioni simulate in background:</p>
                <p>✓ Creato contatto commerciale in Qi-CRM</p>
                <p>✓ Registrata attività di tipo AI Capture</p>
                <p>✓ Inviata notifica a: <span className="font-mono">{form.notificationEmail || 'info@qi-crm.it'}</span></p>
                <p>✓ Pianificato invio email follow-up: <span className="italic">"{form.followUpSubject}"</span></p>
              </div>
              <button
                onClick={() => {
                  setFormData({});
                  setIsSubmitted(false);
                }}
                className="text-xs font-semibold text-brand-650 dark:text-brand-400 hover:underline pt-2 block mx-auto"
              >
                Compila di nuovo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Powered by tag in base to user requirements */}
      <footer className="py-4 text-center text-[10px] text-surface-400 shrink-0">
        Powered by Giuseppe Lobbene / Lobbenedesign
      </footer>
    </div>
  );
}
