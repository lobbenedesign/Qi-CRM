import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useParams, Link } from 'react-router-dom';
import { useLandingStore } from '../store/landingStore';
import { useMarketingStore } from '../store/marketingStore';
import { useCustomPropertiesStore } from '../store/customPropertiesStore';
import { CheckCircle, AlertCircle, Send, Globe, ArrowLeft } from 'lucide-react';
import { repo } from '../lib/repo';
import { buildConsent, CONSENT_LABELS } from '../lib/consent';

export default function PublicLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { pages } = useLandingStore();
  const { forms, submitForm } = useMarketingStore(
    useShallow((s) => ({ forms: s.forms, submitForm: s.submitForm }))
  );
  const customProperties = useCustomPropertiesStore((s) => s.properties);

  const page = pages.find((p) => p.urlSlug === slug);
  const form = page ? forms.find((f) => f.id === page.associatedFormId) : null;

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [consentMkt, setConsentMkt] = useState(false);

  if (!page) {
    return (
      <div className="min-h-screen bg-surface-100 dark:bg-surface-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 text-center max-w-sm shadow-xl">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-surface-900 dark:text-white">Pagina non trovata</h2>
          <p className="text-xs text-surface-550 dark:text-surface-450 mt-1 mb-4">
            La Landing Page richiesta non è attiva o l'URL è errato.
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
    if (!form) return;
    if (!acceptPrivacy) {
      setError('Per inviare devi leggere e accettare l\'informativa privacy.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      submitForm(form.id, formData);

      const standardData: Record<string, string> = {};
      const customFields: Record<string, string> = {};

      Object.entries(formData).forEach(([k, v]) => {
        if (['first_name', 'last_name', 'email', 'phone'].includes(k)) {
          standardData[k] = v;
        } else {
          customFields[k] = v;
        }
      });

      const email = standardData.email || `inbound-${Date.now()}@anonymous.com`;

      const newContact = await repo.createContact({
        first_name: standardData.first_name || 'Inbound',
        last_name: standardData.last_name || 'Lead',
        email,
        phone: standardData.phone || null,
        lead_status: 'new',
        lifecycle_stage: 'lead',
        tags: ['Landing Page', page.name],
        field_trust: {
          email: { source: 'import', confidence: 0.95, updatedAt: new Date().toISOString() },
          first_name: { source: 'import', confidence: 0.9, updatedAt: new Date().toISOString() },
        },
        custom_fields: customFields,
        consent: buildConsent({
          marketing: consentMkt,
          profiling: consentMkt,
          channels: consentMkt ? ['email'] : [],
          source: 'landing',
          source_ref: page.id,
        }),
      });

      await repo.createActivity({
        contact_id: newContact.id,
        type: 'ai_capture',
        subject: `Lead da Landing: ${page.name}`,
        body: `Il contatto si è registrato tramite la landing page "${page.name}".\n\nDati acquisiti:\n${Object.entries(formData)
          .map(([k, v]) => `- ${allAvailableFields.find((f) => f.key === k)?.label || k}: ${v}`)
          .join('\n')}`,
        source: 'import',
        confidence: 0.95,
      });

      // Lead Generation → Pipeline: crea un Deal se il form collegato è configurato
      if (form.createDeal) {
        await repo.createDeal({
          title: `${page.name} — ${newContact.first_name ?? 'Lead'} ${newContact.last_name ?? ''}`.trim(),
          value: form.dealValue ?? 0,
          stage: form.dealStage || 'lead',
          contact_id: newContact.id,
          company_id: newContact.company_id ?? null,
          tags: ['Landing Page', page.name],
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

  // Theme styling definitions
  let containerClass = '';
  let cardClass = '';
  let titleClass = '';
  let bodyClass = '';

  if (page.theme === 'glassmorphism') {
    containerClass = 'bg-gradient-to-tr from-indigo-900 via-purple-900 to-pink-800 text-white';
    cardClass = 'bg-white/10 dark:bg-black/30 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-6 text-white';
    titleClass = 'text-4xl font-extrabold tracking-tight text-white mb-4';
    bodyClass = 'text-base text-purple-100 leading-relaxed';
  } else if (page.theme === 'dark_gradient') {
    containerClass = 'bg-gradient-to-b from-gray-950 via-slate-900 to-black text-gray-100';
    cardClass = 'bg-slate-900/80 border border-purple-500/20 rounded-3xl shadow-[0_0_50px_-12px_rgba(168,85,247,0.3)] p-6';
    titleClass = 'text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-4';
    bodyClass = 'text-base text-slate-400 leading-relaxed';
  } else {
    // clean_tech
    containerClass = 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100';
    cardClass = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6';
    titleClass = 'text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-4';
    bodyClass = 'text-base text-slate-600 dark:text-slate-400 leading-relaxed';
  }

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-500 ${containerClass}`}>
      {/* Mini top bar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 dark:border-slate-800/80 shrink-0">
        <Link to="/marketing" className="flex items-center gap-1.5 text-xs opacity-75 hover:opacity-100 transition-opacity">
          <ArrowLeft size={14} />
          <span>Torna alla Dashboard</span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs opacity-75">
          <Globe size={14} />
          <span>Live URL: /landing/{page.urlSlug}</span>
        </div>
      </div>

      {/* Main hero grid */}
      <div className="flex-1 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center px-6 py-12">
        <div className="space-y-6">
          <h1 className={titleClass}>{page.title}</h1>
          <p className={bodyClass}>{page.bodyText}</p>
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-ping"></span>
            <span className="text-xs font-semibold opacity-75">Piattaforma protetta da Crittografia Locale</span>
          </div>
        </div>

        <div className={cardClass}>
          {form ? (
            <>
              <h2 className="text-xl font-bold mb-4">{form.name}</h2>
              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex items-start gap-2">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {form.fields.map((fKey) => {
                    const fieldDef = allAvailableFields.find((f) => f.key === fKey);
                    if (!fieldDef) return null;
                    return (
                      <div key={fKey}>
                        <label className="block text-xs font-semibold mb-1 opacity-80">
                          {fieldDef.label}
                        </label>
                        <input
                          type={fKey === 'email' ? 'email' : 'text'}
                          required={fKey === 'email' || fKey === 'first_name'}
                          value={formData[fKey] || ''}
                          onChange={(e) => handleInputChange(fKey, e.target.value)}
                          placeholder={`Inserisci ${fieldDef.label.toLowerCase()}...`}
                          className="w-full bg-black/10 dark:bg-white/5 border border-white/20 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-inherit placeholder:opacity-50"
                        />
                      </div>
                    );
                  })}

                  {/* Consenso privacy (GDPR) */}
                  <div className="space-y-2 pt-1 border-t border-white/15">
                    <label className="flex items-start gap-2 text-[11px] opacity-90 cursor-pointer">
                      <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} className="mt-0.5 shrink-0" />
                      <span>{CONSENT_LABELS.required}{' '}
                        <a href="/privacy" target="_blank" rel="noreferrer" className="underline">Informativa</a>. *
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-[11px] opacity-90 cursor-pointer">
                      <input type="checkbox" checked={consentMkt} onChange={(e) => setConsentMkt(e.target.checked)} className="mt-0.5 shrink-0" />
                      <span>{CONSENT_LABELS.marketing}</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !acceptPrivacy}
                    style={{ backgroundColor: form.themeColor }}
                    className="w-full text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-lg hover:brightness-110 active:brightness-90 transition-all flex items-center justify-center gap-1.5 mt-2"
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
                <div className="text-center py-6 space-y-4">
                  <CheckCircle size={48} className="text-emerald-500 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="font-bold text-base">Inviato con Successo!</h3>
                    <p className="text-xs opacity-80">
                      {form.successMessage || 'Le tue informazioni sono state registrate.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFormData({});
                      setIsSubmitted(false);
                    }}
                    className="text-xs font-semibold hover:underline pt-2 block mx-auto opacity-75"
                  >
                    Compila di nuovo
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <AlertCircle size={36} className="text-yellow-500 mx-auto mb-2" />
              <p className="text-xs font-semibold">Nessun modulo configurato</p>
              <p className="text-[11px] opacity-75 mt-1">Collega un modulo a questa landing page per raccogliere iscritti.</p>
            </div>
          )}
        </div>
      </div>

      <footer className="py-6 text-center text-[10px] opacity-60 border-t border-white/5 dark:border-slate-900 shrink-0">
        Powered by Giuseppe Lobbene / Lobbenedesign
      </footer>
    </div>
  );
}
