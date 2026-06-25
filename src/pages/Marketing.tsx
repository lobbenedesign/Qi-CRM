import { useState } from 'react';
import {
  Mail,
  Plus,
  Trash2,
  Code,
  ExternalLink,
  Eye,
  Send,
  Hash,
  FileCode,
  Bot,
  Play,
  X
} from 'lucide-react';
import { useMarketingStore, type QuantumForm } from '../store/marketingStore';
import { useCustomPropertiesStore } from '../store/customPropertiesStore';
import { useLandingStore, type LandingPage } from '../store/landingStore';
import { useCampaignsStore, type EmailCampaign } from '../store/campaignsStore';
import { useSnippetsStore, type Snippet, type EmailTemplate } from '../store/snippetsStore';
import { useChatflowStore } from '../store/chatflowStore';
import { useCan } from '../hooks/useCan';
import { useShallow } from 'zustand/shallow';
import { repo } from '../lib/repo';
import { EmailCampaignBuilder } from '../components/marketing/EmailCampaignBuilder';
import { CampaignStatsWidget } from '../components/marketing/CampaignStatsWidget';


export default function Marketing() {
  const canManage = useCan('marketing:manage');
  const { forms, submissions, addForm, updateForm, deleteForm } = useMarketingStore(
    useShallow((s) => ({ forms: s.forms, submissions: s.submissions, addForm: s.addForm, updateForm: s.updateForm, deleteForm: s.deleteForm }))
  );
  const { pages, addPage, updatePage, deletePage } = useLandingStore(
    useShallow((s) => ({ pages: s.pages, addPage: s.addPage, updatePage: s.updatePage, deletePage: s.deletePage }))
  );
  const { campaigns, addCampaign, updateCampaign, deleteCampaign, sendCampaign } = useCampaignsStore(
    useShallow((s) => ({ campaigns: s.campaigns, addCampaign: s.addCampaign, updateCampaign: s.updateCampaign, deleteCampaign: s.deleteCampaign, sendCampaign: s.sendCampaign }))
  );
  const { snippets, templates, addSnippet, updateSnippet, deleteSnippet, addTemplate, updateTemplate, deleteTemplate } = useSnippetsStore(
    useShallow((s) => ({ snippets: s.snippets, templates: s.templates, addSnippet: s.addSnippet, updateSnippet: s.updateSnippet, deleteSnippet: s.deleteSnippet, addTemplate: s.addTemplate, updateTemplate: s.updateTemplate, deleteTemplate: s.deleteTemplate }))
  );
  const { chatflows, updateChatflow } = useChatflowStore(
    useShallow((s) => ({ chatflows: s.chatflows, updateChatflow: s.updateChatflow }))
  );
  const customProperties = useCustomPropertiesStore(
    useShallow((s) => s.properties.filter(p => p.targetObject === 'contact'))
  );

  const [activeTab, setActiveTab] = useState<'forms' | 'landing' | 'emails' | 'snippets' | 'chatflow' | 'submissions'>('forms');
  const [editingForm, setEditingForm] = useState<Partial<QuantumForm> | null>(null);
  const [editingPage, setEditingPage] = useState<Partial<LandingPage> | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Partial<EmailCampaign> | null>(null);
  const [showEmbedCode, setShowEmbedCode] = useState<string | null>(null);

  // Snippets/Templates UI state
  const [activeSnippet, setActiveSnippet] = useState<Partial<Snippet> | null>(null);
  const [activeTmpl, setActiveTmpl] = useState<Partial<EmailTemplate> | null>(null);

  // Chatflow UI state
  const [selectedChatflowId, setSelectedChatflowId] = useState<string>('bot-lead-generation');
  const [simulatingBot, setSimulatingBot] = useState<boolean>(false);
  const [simMessages, setSimMessages] = useState<{ sender: 'bot' | 'user'; text: string }[]>([]);
  const [simStepIdx, setSimStepIdx] = useState<number>(0);
  const [simInputVal, setSimInputVal] = useState<string>('');

  const currentChatflow = chatflows.find((c) => c.id === selectedChatflowId) || chatflows[0];

  // Default fields for Contacts
  const STANDARD_FIELDS = [
    { key: 'first_name', label: 'Nome' },
    { key: 'last_name', label: 'Cognome' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telefono' },
  ];

  const allAvailableFields = [
    ...STANDARD_FIELDS,
    ...customProperties.map((p) => ({ key: p.id, label: `${p.label} (Custom)` })),
  ];

  // Forms Management
  const handleCreateForm = () => {
    setEditingForm({
      name: 'Nuovo Modulo di Contatto',
      template: 'newsletter',
      themeColor: '#6366f1',
      buttonText: 'Registrati Ora',
      fields: ['first_name', 'email'],
      successMessage: 'Registrazione completata con successo!',
      notificationEmail: 'info@qi-crm.it',
      followUpSubject: 'Grazie per l\'iscrizione',
      followUpBody: 'Ciao,\n\ngrazie per aver completato il form!\n\nA presto.'
    });
  };

  const handleSaveForm = () => {
    if (!editingForm) return;
    if (editingForm.id) {
      updateForm(editingForm.id, editingForm);
    } else {
      addForm(editingForm as Omit<QuantumForm, 'id' | 'submissionsCount'>);
    }
    setEditingForm(null);
  };

  const toggleFormField = (fieldKey: string) => {
    if (!editingForm) return;
    const currentFields = editingForm.fields || [];
    if (currentFields.includes(fieldKey)) {
      setEditingForm({ ...editingForm, fields: currentFields.filter((f) => f !== fieldKey) });
    } else {
      setEditingForm({ ...editingForm, fields: [...currentFields, fieldKey] });
    }
  };

  // Landing Page Management
  const handleCreatePage = () => {
    setEditingPage({
      name: 'Nuova Landing Page',
      title: 'Benvenuti nella nostra Landing Page',
      urlSlug: `pagina-${Math.random().toString(36).substring(2, 6)}`,
      metaDescription: 'Descrizione SEO per indicizzazione.',
      theme: 'glassmorphism',
      headerText: 'Titolo Accattivante Principalmente B2B',
      bodyText: 'Corpo del testo descrittivo per indurre il lead a compilare il modulo associato.',
      associatedFormId: forms[0]?.id || '',
      published: false
    });
  };

  const handleSavePage = () => {
    if (!editingPage) return;
    if (editingPage.id) {
      updatePage(editingPage.id, editingPage);
    } else {
      addPage(editingPage as Omit<LandingPage, 'id' | 'publishedAt'>);
    }
    setEditingPage(null);
  };

  // Campaigns Management
  const handleCreateCampaign = () => {
    setEditingCampaign({
      name: 'Nuova Campagna Email',
      subject: 'Oggetto dell\'email promozionale',
      template: 'newsletter',
      fromName: 'Team Qi-CRM',
      fromAddress: 'marketing@qi-crm.it',
      guardianAiActive: true
    });
  };

  // Campaign handlers are inline now

  // Chatflow Bot simulation launcher
  const startBotSimulation = () => {
    if (!currentChatflow || currentChatflow.steps.length === 0) return;
    setSimulatingBot(true);
    setSimStepIdx(0);
    const firstStep = currentChatflow.steps[0];
    setSimMessages([{ sender: 'bot', text: firstStep.message }]);
  };

  const handleBotInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simInputVal.trim()) return;

    const userText = simInputVal;
    setSimInputVal('');
    setSimMessages((prev) => [...prev, { sender: 'user', text: userText }]);

    const activeStep = currentChatflow.steps[simStepIdx];

    if (activeStep.type === 'input_email') {
      try {
        const email = userText;
        await repo.createContact({
          first_name: 'Inbound Bot',
          last_name: 'Lead',
          email,
          lead_status: 'new',
          lifecycle_stage: 'lead',
          tags: ['Chatbot Flow', currentChatflow.name]
        });
      } catch (err) { /* ignore */ }
    }

    if (activeStep.nextStepId) {
      const nextIdx = currentChatflow.steps.findIndex((s) => s.id === activeStep.nextStepId);
      if (nextIdx >= 0) {
        setSimStepIdx(nextIdx);
        const nextStep = currentChatflow.steps[nextIdx];
        setTimeout(() => {
          setSimMessages((prev) => [...prev, { sender: 'bot', text: nextStep.message }]);
        }, 800);
      }
    } else {
      setTimeout(() => {
        setSimMessages((prev) => [...prev, { sender: 'bot', text: 'Conversazione conclusa. Grazie!' }]);
      }, 800);
    }
  };

  const handleBotButtonSelect = (btnText: string) => {
    setSimMessages((prev) => [...prev, { sender: 'user', text: btnText }]);
    const activeStep = currentChatflow.steps[simStepIdx];

    if (activeStep.nextStepId) {
      const nextIdx = currentChatflow.steps.findIndex((s) => s.id === activeStep.nextStepId);
      if (nextIdx >= 0) {
        setSimStepIdx(nextIdx);
        const nextStep = currentChatflow.steps[nextIdx];
        setTimeout(() => {
          setSimMessages((prev) => [...prev, { sender: 'bot', text: nextStep.message }]);
        }, 800);
      }
    }
  };

  const handleTriggerSendCampaign = (campaignId: string) => {
    if (!confirm('Sei sicuro di voler avviare la spedizione simulata di questa campagna email?')) return;
    sendCampaign(campaignId);
  };

  const totalSubmissions = submissions.length;
  const conversionRate = totalSubmissions > 0 ? '3.8%' : '0%';

  return (
    <div className="flex flex-col h-full gap-4 p-1">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Mail className="text-brand-500" size={22} />
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">
            Quantum Marketing Portal
          </h1>
        </div>
        {activeTab === 'forms' && !editingForm && canManage && (
          <button
            onClick={handleCreateForm}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs rounded-lg transition-colors font-semibold shadow-sm"
          >
            <Plus size={14} />
            Crea Modulo
          </button>
        )}
        {activeTab === 'landing' && !editingPage && canManage && (
          <button
            onClick={handleCreatePage}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg transition-colors font-semibold shadow-sm"
          >
            <Plus size={14} />
            Crea Landing
          </button>
        )}
        {activeTab === 'emails' && !editingCampaign && canManage && (
          <button
            onClick={handleCreateCampaign}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs rounded-lg transition-colors font-semibold shadow-sm"
          >
            <Plus size={14} />
            Crea Campagna
          </button>
        )}
      </div>

      {/* Forms parameters editor panel */}
      {editingForm && (
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4 border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 rounded-xl overflow-hidden shadow-xl">
          <div className="w-full md:w-1/2 overflow-y-auto p-5 border-b md:border-b-0 md:border-r border-surface-200 dark:border-surface-800 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-surface-500 mb-1">Nome Modulo</label>
              <input
                type="text"
                value={editingForm.name || ''}
                onChange={(e) => setEditingForm({ ...editingForm, name: e.target.value })}
                className="w-full bg-surface-50 dark:bg-surface-800 text-xs text-surface-900 dark:text-white rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-surface-500 mb-1">Template Modulo</label>
                <select
                  value={editingForm.template || 'newsletter'}
                  onChange={(e) => setEditingForm({ ...editingForm, template: e.target.value as any })}
                  className="w-full bg-surface-50 dark:bg-surface-800 text-xs text-surface-900 dark:text-white rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none"
                >
                  <option value="newsletter">Iscrizione Newsletter</option>
                  <option value="contact_us">Contattaci / Discovery</option>
                  <option value="registration">Registrazione Evento</option>
                  <option value="ebook">Download eBook</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-surface-500 mb-1">Colore Tema</label>
                <input
                  type="color"
                  value={editingForm.themeColor || '#6366f1'}
                  onChange={(e) => setEditingForm({ ...editingForm, themeColor: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border border-surface-200 dark:border-surface-700"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-surface-500 mb-1">Testo Bottone Invio</label>
              <input
                type="text"
                value={editingForm.buttonText || ''}
                onChange={(e) => setEditingForm({ ...editingForm, buttonText: e.target.value })}
                className="w-full bg-surface-50 dark:bg-surface-800 text-xs text-surface-900 dark:text-white rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-surface-500 mb-1">Campi abilitati</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {allAvailableFields.map((af) => (
                  <label key={af.key} className="flex items-center gap-2 text-xs text-surface-700 dark:text-surface-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(editingForm.fields || []).includes(af.key)}
                      onChange={() => toggleFormField(af.key)}
                      className="rounded border-surface-300 text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                    />
                    <span>{af.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Lead Generation → Pipeline */}
            <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3 space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-surface-700 dark:text-surface-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!editingForm.createDeal}
                  onChange={(e) => setEditingForm({ ...editingForm, createDeal: e.target.checked })}
                  className="rounded border-surface-300 text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                />
                Crea automaticamente un Deal in Pipeline alla compilazione
              </label>
              {editingForm.createDeal && (
                <div className="grid grid-cols-2 gap-2 pl-6">
                  <div>
                    <label className="block text-[10px] font-semibold text-surface-500 mb-0.5">Stage iniziale</label>
                    <input
                      type="text"
                      value={editingForm.dealStage ?? 'lead'}
                      onChange={(e) => setEditingForm({ ...editingForm, dealStage: e.target.value })}
                      placeholder="lead"
                      className="w-full bg-surface-50 dark:bg-surface-800 text-xs rounded border border-surface-200 dark:border-surface-700 px-2 py-1.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-surface-500 mb-0.5">Valore stimato (€)</label>
                    <input
                      type="number"
                      value={editingForm.dealValue ?? 0}
                      onChange={(e) => setEditingForm({ ...editingForm, dealValue: Number(e.target.value) })}
                      className="w-full bg-surface-50 dark:bg-surface-800 text-xs rounded border border-surface-200 dark:border-surface-700 px-2 py-1.5 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-3 border-t border-surface-150">
              <button onClick={() => setEditingForm(null)} className="flex-1 py-2 text-xs font-semibold hover:bg-surface-100 rounded-lg text-surface-700">Annulla</button>
              <button onClick={handleSaveForm} className="flex-1 py-2 text-xs font-semibold bg-brand-600 text-white rounded-lg">Salva Modulo</button>
            </div>
          </div>
          <div className="w-full md:w-1/2 bg-surface-50 p-5 flex flex-col justify-center items-center">
            <p className="text-xs font-semibold text-surface-450 mb-2">Anteprima Grafica</p>
            <div className="w-full max-w-sm bg-white rounded-xl p-5 border border-surface-200 shadow-xl space-y-4">
              <h3 className="font-bold text-center text-sm">{editingForm.name}</h3>
              <button disabled style={{ backgroundColor: editingForm.themeColor }} className="w-full text-white text-xs font-bold py-2 rounded-lg">{editingForm.buttonText}</button>
            </div>
          </div>
        </div>
      )}

      {/* Pages parameters editor panel */}
      {editingPage && (
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4 border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 rounded-xl overflow-hidden shadow-xl">
          <div className="w-full md:w-1/2 overflow-y-auto p-5 border-b md:border-b-0 md:border-r border-surface-200 dark:border-surface-800 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-surface-500 mb-1">Nome Interno</label>
              <input
                type="text"
                value={editingPage.name || ''}
                onChange={(e) => setEditingPage({ ...editingPage, name: e.target.value })}
                className="w-full bg-surface-50 dark:bg-surface-800 text-xs text-surface-900 dark:text-white rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-surface-500 mb-1">Slug URL</label>
                <input
                  type="text"
                  value={editingPage.urlSlug || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, urlSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })}
                  className="w-full bg-surface-50 dark:bg-surface-800 text-xs text-surface-900 dark:text-white rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-surface-500 mb-1">Tema</label>
                <select
                  value={editingPage.theme || 'glassmorphism'}
                  onChange={(e) => setEditingPage({ ...editingPage, theme: e.target.value as any })}
                  className="w-full bg-surface-50 dark:bg-surface-800 text-xs text-surface-900 dark:text-white rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none"
                >
                  <option value="glassmorphism">Glassmorphism</option>
                  <option value="dark_gradient">Dark Gradient</option>
                  <option value="clean_tech">Clean Tech</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-surface-500 mb-1">Titolo Pubblico</label>
              <input
                type="text"
                value={editingPage.title || ''}
                onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                className="w-full bg-surface-50 dark:bg-surface-800 text-xs text-surface-900 dark:text-white rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-surface-500 mb-1">Modulo Associato</label>
                <select
                  value={editingPage.associatedFormId || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, associatedFormId: e.target.value })}
                  className="w-full bg-surface-50 dark:bg-surface-800 text-xs text-surface-900 dark:text-white rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none"
                >
                  <option value="">Seleziona...</option>
                  {forms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="pub"
                  checked={editingPage.published || false}
                  onChange={(e) => setEditingPage({ ...editingPage, published: e.target.checked })}
                />
                <label htmlFor="pub" className="text-xs font-semibold">Pubblicato</label>
              </div>
            </div>
            <div className="flex gap-2 pt-3 border-t border-surface-150">
              <button onClick={() => setEditingPage(null)} className="flex-1 py-2 text-xs font-semibold hover:bg-surface-100 rounded-lg text-surface-700">Annulla</button>
              <button onClick={handleSavePage} className="flex-1 py-2 text-xs font-semibold bg-brand-600 text-white rounded-lg">Salva Landing</button>
            </div>
          </div>
          <div className="w-full md:w-1/2 bg-surface-50 p-5 flex items-center justify-center">
            <p className="text-xs text-surface-400">Anteprima non disponibile in configurazione</p>
          </div>
        </div>
      )}

      {/* Campaigns Builder (Qi-Campaigns) */}
      {editingCampaign && (
        <EmailCampaignBuilder
          campaign={editingCampaign as EmailCampaign}
          onSave={(patch) => {
            setEditingCampaign({ ...editingCampaign, ...patch });
            if (editingCampaign.id) {
              updateCampaign(editingCampaign.id, { ...editingCampaign, ...patch });
            } else {
              const newId = addCampaign({ ...editingCampaign, ...patch } as Omit<EmailCampaign, 'id' | 'status' | 'sentAt' | 'stats'>);
              setEditingCampaign({ ...editingCampaign, ...patch, id: newId });
            }
          }}
          onSend={() => {
            if (editingCampaign.id) {
              sendCampaign(editingCampaign.id);
              setEditingCampaign(null);
            }
          }}
          onBack={() => setEditingCampaign(null)}
        />
      )}

      {/* Main Tab Lists Section */}
      {!editingForm && !editingPage && !editingCampaign && (
        <>
          {/* Navigation Tabs */}
          <div className="flex border-b border-surface-200 dark:border-surface-800 shrink-0 overflow-x-auto mb-4">
            <button
              onClick={() => setActiveTab('forms')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'forms' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700'
              }`}
            >
              Moduli
            </button>
            <button
              onClick={() => setActiveTab('landing')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'landing' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700'
              }`}
            >
              Landing Pages
            </button>
            <button
              onClick={() => setActiveTab('emails')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'emails' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700'
              }`}
            >
              Email Marketing
            </button>
            <button
              onClick={() => setActiveTab('snippets')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'snippets' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700'
              }`}
            >
              Templates & Snippets
            </button>
            <button
              onClick={() => setActiveTab('chatflow')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'chatflow' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700'
              }`}
            >
              Chatflow Bot
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'submissions' ? 'border-brand-600 text-brand-600 dark:text-brand-400' : 'border-transparent text-surface-500 hover:text-surface-700'
              }`}
            >
              Log Sottomissioni
            </button>
          </div>

          {/* Main Tab Views */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {activeTab === 'forms' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {forms.map((f) => (
                  <div key={f.id} className="bg-white dark:bg-surface-900 rounded-xl p-4 border border-surface-200 dark:border-surface-800 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-surface-900 dark:text-surface-50">{f.name}</h3>
                          <span className="inline-flex text-[10px] bg-surface-100 dark:bg-surface-800 text-surface-500 px-2 py-0.5 rounded mt-1 font-mono uppercase">
                            {f.template}
                          </span>
                        </div>
                        <span className="text-xs bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold px-2 py-1 rounded">
                          {f.submissionsCount} sottomissioni
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-surface-100 dark:border-surface-800 mt-4 pt-3 gap-2">
                      <a
                        href={`/form-demo/${f.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        <Eye size={12} /> Test Link <ExternalLink size={10} />
                      </a>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingForm(f)}
                            className="text-xs font-semibold px-2 py-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded transition-colors text-surface-700 dark:text-surface-300"
                          >
                            Modifica
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Eliminare questo modulo?')) deleteForm(f.id);
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'landing' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pages.map((p) => (
                  <div key={p.id} className="bg-white dark:bg-surface-900 rounded-xl p-4 border border-surface-200 dark:border-surface-800 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-surface-900 dark:text-surface-50">{p.name}</h3>
                          <span className="inline-flex text-[10px] bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded mt-1 font-mono uppercase">
                            {p.theme}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-surface-100 dark:border-surface-800 mt-4 pt-3 gap-2">
                      <a
                        href={`/landing/${p.urlSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        <Eye size={12} /> Live Page <ExternalLink size={10} />
                      </a>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingPage(p)}
                            className="text-xs font-semibold px-2 py-1 hover:bg-surface-100 rounded text-surface-700"
                          >
                            Modifica
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Eliminare questa Landing Page?')) deletePage(p.id);
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'emails' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campaigns.map((c) => (
                  <div key={c.id} className="bg-white dark:bg-surface-900 rounded-xl p-4 border border-surface-200 dark:border-surface-800 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-surface-900 dark:text-surface-50">{c.name}</h3>
                          <span className="inline-flex text-[10px] bg-pink-500/10 text-pink-600 px-2 py-0.5 rounded mt-1 font-mono uppercase">
                            {c.template}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-surface-500">
                        <p className="mb-3">Oggetto: {c.subject}</p>
                        {c.status === 'sent' && (
                          <div className="mt-3">
                            <CampaignStatsWidget campaign={c} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-surface-100 dark:border-surface-800 mt-4 pt-3 gap-2">
                      {c.status === 'draft' ? (
                        <button
                          onClick={() => handleTriggerSendCampaign(c.id)}
                          className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
                        >
                          <Send size={12} /> Invia Campagna
                        </button>
                      ) : (
                        <span className="text-[10px] text-surface-400">Completato</span>
                      )}
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingCampaign(c)}
                            className="text-xs font-semibold px-2 py-1 hover:bg-surface-100 rounded text-surface-700"
                          >
                            Modifica
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Eliminare questa campagna?')) deleteCampaign(c.id);
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Templates & Snippets Panel */}
            {activeTab === 'snippets' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 h-full">
                <div className="space-y-4">
                  <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-surface-900 dark:text-white flex items-center gap-1">
                        <Hash size={14} className="text-brand-500" />
                        <span>Snippet di Testo (Richiamabili con #)</span>
                      </h3>
                      <button
                        onClick={() => setActiveSnippet({ name: 'Nuovo Snippet', text: '', shortcut: '#nuovo' })}
                        className="text-[11px] font-bold text-brand-650 hover:underline flex items-center gap-0.5"
                      >
                        <Plus size={12} /> Crea Snippet
                      </button>
                    </div>
                    <div className="space-y-2">
                      {snippets.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setActiveSnippet(s);
                            setActiveTmpl(null);
                          }}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                            activeSnippet?.id === s.id
                              ? 'bg-brand-50/50 dark:bg-brand-950/20 border-brand-350'
                              : 'bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-800 hover:bg-surface-100'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-surface-900 dark:text-white">{s.name}</p>
                            <span className="text-[10px] text-brand-500 font-mono font-semibold">{s.shortcut}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSnippet(s.id);
                              if (activeSnippet?.id === s.id) setActiveSnippet(null);
                            }}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-surface-900 dark:text-white flex items-center gap-1">
                        <FileCode size={14} className="text-indigo-500" />
                        <span>Template Email (Max 5)</span>
                      </h3>
                      <button
                        onClick={() => setActiveTmpl({ name: 'Nuovo Template', subject: '', bodyText: '' })}
                        className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                      >
                        <Plus size={12} /> Crea Template
                      </button>
                    </div>
                    <div className="space-y-2">
                      {templates.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setActiveTmpl(t);
                            setActiveSnippet(null);
                          }}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                            activeTmpl?.id === t.id
                              ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-300'
                              : 'bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-800 hover:bg-surface-100'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-surface-900 dark:text-white">{t.name}</p>
                            <span className="text-[10px] text-surface-450 truncate block max-w-xs">{t.subject}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTemplate(t.id);
                              if (activeTmpl?.id === t.id) setActiveTmpl(null);
                            }}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-5 shadow-sm min-h-[300px]">
                  {activeSnippet && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-xs text-surface-900 dark:text-white pb-2 border-b border-surface-100 dark:border-surface-800">
                        Modifica Snippet
                      </h4>
                      <div>
                        <label className="block text-[10px] font-bold text-surface-500 mb-1">Nome Snippet</label>
                        <input
                          type="text"
                          value={activeSnippet.name || ''}
                          onChange={(e) => setActiveSnippet({ ...activeSnippet, name: e.target.value })}
                          className="w-full bg-surface-50 dark:bg-surface-800 text-xs text-surface-900 dark:text-white border border-surface-200 dark:border-surface-700 rounded px-2.5 py-1.5 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-surface-500 mb-1">Shortcut (Es: #prezzi)</label>
                        <input
                          type="text"
                          value={activeSnippet.shortcut || ''}
                          onChange={(e) => setActiveSnippet({ ...activeSnippet, shortcut: e.target.value })}
                          className="w-full bg-surface-50 dark:bg-surface-800 text-xs text-surface-900 dark:text-white border border-surface-200 dark:border-surface-700 rounded px-2.5 py-1.5 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-surface-500 mb-1">Testo Snippet (Max 2500 caratteri)</label>
                        <textarea
                          value={activeSnippet.text || ''}
                          onChange={(e) => setActiveSnippet({ ...activeSnippet, text: e.target.value })}
                          rows={5}
                          maxLength={2500}
                          className="w-full bg-surface-50 dark:bg-surface-800 text-xs text-surface-900 dark:text-white border border-surface-200 dark:border-surface-700 rounded px-2.5 py-1.5 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (!activeSnippet.name || !activeSnippet.text || !activeSnippet.shortcut) return;
                          if (activeSnippet.id) {
                            updateSnippet(activeSnippet.id, activeSnippet);
                          } else {
                            addSnippet(activeSnippet as any);
                          }
                          setActiveSnippet(null);
                        }}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs py-2 rounded-lg"
                      >
                        Salva Snippet
                      </button>
                    </div>
                  )}

                  {activeTmpl && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-xs text-surface-900 dark:text-white pb-2 border-b border-surface-100 dark:border-surface-800">
                        Modifica Template Email
                      </h4>
                      <div>
                        <label className="block text-[10px] font-bold text-surface-500 mb-1">Nome Template</label>
                        <input
                          type="text"
                          value={activeTmpl.name || ''}
                          onChange={(e) => setActiveTmpl({ ...activeTmpl, name: e.target.value })}
                          className="w-full bg-surface-50 dark:bg-surface-800 text-xs text-surface-900 dark:text-white border border-surface-200 dark:border-surface-700 rounded px-2.5 py-1.5 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-surface-500 mb-1">Oggetto Predefinito</label>
                        <input
                          type="text"
                          value={activeTmpl.subject || ''}
                          onChange={(e) => setActiveTmpl({ ...activeTmpl, subject: e.target.value })}
                          className="w-full bg-surface-50 dark:bg-surface-800 text-xs text-surface-900 dark:text-white border border-surface-200 dark:border-surface-700 rounded px-2.5 py-1.5 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-surface-500 mb-1">Testo Corpo Email</label>
                        <textarea
                          value={activeTmpl.bodyText || ''}
                          onChange={(e) => setActiveTmpl({ ...activeTmpl, bodyText: e.target.value })}
                          rows={5}
                          className="w-full bg-surface-50 dark:bg-surface-800 text-xs text-surface-900 dark:text-white border border-surface-200 dark:border-surface-700 rounded px-2.5 py-1.5 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (!activeTmpl.name || !activeTmpl.subject || !activeTmpl.bodyText) return;
                          if (activeTmpl.id) {
                            updateTemplate(activeTmpl.id, activeTmpl);
                          } else {
                            addTemplate(activeTmpl as any);
                          }
                          setActiveTmpl(null);
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 rounded-lg"
                      >
                        Salva Template
                      </button>
                    </div>
                  )}

                  {!activeSnippet && !activeTmpl && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-surface-400 space-y-2">
                      <Hash size={32} className="opacity-50 text-brand-500" />
                      <p className="text-xs font-bold">Nessun elemento in modifica</p>
                      <p className="text-[10px] max-w-xs">Seleziona uno snippet o un template dalla lista a sinistra, o creane uno da zero.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chatflow Builder Panel */}
            {activeTab === 'chatflow' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4 space-y-4 shadow-sm">
                    <h3 className="text-xs font-bold text-surface-900 dark:text-white flex items-center gap-1">
                      <Bot size={15} className="text-brand-500 animate-pulse" />
                      <span>Chatflow Bots Attivi</span>
                    </h3>
                    <div className="space-y-2">
                      {chatflows.map((cf) => (
                        <div
                          key={cf.id}
                          onClick={() => setSelectedChatflowId(cf.id)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col gap-2 ${
                            selectedChatflowId === cf.id
                              ? 'bg-brand-50/50 dark:bg-brand-950/20 border-brand-350'
                              : 'bg-surface-50 dark:bg-surface-900 border-surface-200 dark:border-surface-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-surface-955 dark:text-white truncate">
                              {cf.name}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              cf.active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-surface-200 text-surface-500'
                            }`}>
                              {cf.active ? 'Attivo' : 'Bozza'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-surface-150">
                            <span className="text-[10px] text-surface-450">{cf.steps.length} passi</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateChatflow(cf.id, { active: !cf.active });
                              }}
                              className="text-[10px] text-brand-650 font-bold hover:underline"
                            >
                              {cf.active ? 'Disattiva' : 'Attiva'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gradient-to-tr from-brand-600 to-indigo-600 rounded-xl p-4 text-white shadow-xl space-y-3">
                    <h4 className="font-bold text-xs flex items-center gap-1">
                      <Play size={13} />
                      <span>Simulatore Interattivo</span>
                    </h4>
                    <button
                      onClick={startBotSimulation}
                      className="w-full bg-white text-brand-700 font-bold text-xs py-2 rounded-lg hover:bg-surface-50 active:scale-95 transition-all shadow-md"
                    >
                      Avvia Simulazione Bot
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-8 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-xs text-surface-900 dark:text-white">
                    Struttura Sequenziale dei Passi
                  </h3>
                  <div className="space-y-4 max-w-lg">
                    {currentChatflow?.steps.map((step, index) => (
                      <div key={step.id} className="relative flex gap-3 items-start">
                        {index < currentChatflow.steps.length - 1 && (
                          <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-surface-200 dark:bg-surface-800" />
                        )}
                        <div className="h-8 w-8 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 font-bold text-xs flex items-center justify-center shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-3.5 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-surface-850 dark:text-surface-200 uppercase text-[9px] tracking-wider">
                              Tipo: {step.type.replace('_', ' ')}
                            </span>
                            <span className="text-[9px] text-surface-400 font-mono font-bold">ID: {step.id}</span>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-surface-400 block font-semibold">Testo inviato dal Bot:</label>
                            <input
                              type="text"
                              value={step.message}
                              onChange={(e) => {
                                const newSteps = currentChatflow.steps.map((s) =>
                                  s.id === step.id ? { ...s, message: e.target.value } : s
                                );
                                updateChatflow(currentChatflow.id, { steps: newSteps });
                              }}
                              className="w-full bg-white dark:bg-surface-850 border border-surface-200 dark:border-surface-750 rounded px-2 py-1 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'submissions' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-surface-50 dark:bg-surface-850 rounded-xl border border-surface-200 dark:border-surface-800">
                  <div>
                    <span className="block text-[11px] font-semibold text-surface-500 uppercase tracking-wider">Totale Sottomissioni</span>
                    <span className="text-xl font-bold text-surface-900 dark:text-white">{totalSubmissions}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-semibold text-surface-500 uppercase tracking-wider">Tasso Conversione Medio</span>
                    <span className="text-xl font-bold text-brand-650 dark:text-brand-400">{conversionRate}</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-50 dark:bg-surface-850 border-b border-surface-200 dark:border-surface-800 text-surface-400 font-semibold uppercase tracking-wider">
                        <th className="p-3">Modulo</th>
                        <th className="p-3">Data</th>
                        <th className="p-3">Dati Inseriti</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((sub) => {
                        const formName = forms.find(f => f.id === sub.formId)?.name || 'Modulo Eliminato';
                        return (
                          <tr key={sub.id} className="border-b border-surface-150 dark:border-surface-800 hover:bg-surface-50/50 dark:hover:bg-surface-850/30">
                            <td className="p-3 font-semibold text-surface-850 dark:text-surface-150">{formName}</td>
                            <td className="p-3 text-surface-450">{new Date(sub.submittedAt).toLocaleString('it-IT')}</td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(sub.data).map(([key, val]) => (
                                  <span key={key} className="inline-block bg-surface-100 dark:bg-surface-800 text-[10px] text-surface-700 dark:text-surface-300 px-1.5 py-0.5 rounded">
                                    <strong>{allAvailableFields.find(af => af.key === key)?.label || key}:</strong> {val}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Floating interactive chatbot simulator */}
      {simulatingBot && (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[400px] animate-fade-in">
          <div className="p-3 bg-brand-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bot size={18} />
              <div>
                <h4 className="text-xs font-bold leading-none">{currentChatflow.name}</h4>
                <span className="text-[9px] opacity-75">Simulazione Assistente AI</span>
              </div>
            </div>
            <button
              onClick={() => {
                setSimulatingBot(false);
                setSimMessages([]);
              }}
              className="text-white hover:opacity-75 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-surface-50 dark:bg-surface-950 flex flex-col justify-end">
            <div className="space-y-3">
              {simMessages.map((msg, idx) => {
                const isBot = msg.sender === 'bot';
                return (
                  <div key={idx} className={`flex gap-2 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
                    <div className={`text-xs px-3 py-2 rounded-xl shadow-sm ${
                      isBot
                        ? 'bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 rounded-tl-none border border-surface-150 dark:border-surface-800'
                        : 'bg-brand-600 text-white rounded-tr-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {currentChatflow.steps[simStepIdx]?.type === 'buttons' && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {currentChatflow.steps[simStepIdx].buttons?.map((btn, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleBotButtonSelect(btn)}
                    className="bg-white dark:bg-surface-900 hover:bg-brand-50 text-brand-650 border border-brand-200 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg shadow-sm"
                  >
                    {btn}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleBotInputSubmit} className="p-2 border-t border-surface-150 dark:border-surface-800 bg-white dark:bg-surface-900 flex items-center gap-2">
            <input
              type="text"
              placeholder={
                currentChatflow.steps[simStepIdx]?.type === 'input_email'
                  ? 'Digita la tua email...'
                  : 'Scrivi un messaggio...'
              }
              value={simInputVal}
              onChange={(e) => setSimInputVal(e.target.value)}
              className="flex-1 bg-surface-50 dark:bg-surface-800 text-xs px-3 py-2 rounded-lg border border-surface-250 dark:border-surface-750 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!simInputVal.trim() || currentChatflow.steps[simStepIdx]?.type === 'buttons'}
              className="bg-brand-600 hover:bg-brand-700 text-white p-2 rounded-lg disabled:opacity-50 transition-all"
            >
              <Send size={12} />
            </button>
          </form>
        </div>
      )}

      {/* Embed Code Modal overlay */}
      {showEmbedCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-900 rounded-xl p-5 max-w-lg w-full border border-surface-200 dark:border-surface-850 shadow-2xl">
            <h3 className="font-bold text-sm text-surface-900 dark:text-surface-50 mb-2 flex items-center gap-1.5">
              <Code size={18} className="text-brand-500" /> Codice Incorporabile Iframe
            </h3>
            <textarea
              readOnly
              value={showEmbedCode}
              rows={4}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              className="w-full bg-surface-50 dark:bg-surface-950 text-xs font-mono p-3 rounded-lg border border-surface-200 dark:border-surface-800 focus:outline-none"
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowEmbedCode(null)}
                className="px-4 py-1.5 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 text-xs font-semibold rounded-lg text-surface-800 dark:text-surface-200 transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
