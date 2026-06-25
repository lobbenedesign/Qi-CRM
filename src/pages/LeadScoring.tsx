import { useState, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import {
  Target, Plus, Trash2, ToggleLeft, ToggleRight, Settings2,
  TrendingUp, TrendingDown, Users, Zap, BarChart3,
  ChevronDown, ChevronUp, Save, RefreshCw, Info
} from 'lucide-react';
import { useLeadScoringStore, type ScoreRule, type ScoreRuleCategory } from '../store/leadScoringStore';
import { useContactsStore } from '../store/contactsStore';
import { useDealsStore } from '../store/dealsStore';
import { useContacts } from '../hooks/useContacts';
import { useDeals } from '../hooks/useDeals';

// ─── Grade Badge ─────────────────────────────────────────────
function GradeBadge({ grade, score }: { grade: string; score: number }) {
  const cfg: Record<string, { bg: string; text: string; ring: string }> = {
    A: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
    B: { bg: 'bg-brand-500/20', text: 'text-brand-400', ring: 'ring-brand-500/30' },
    C: { bg: 'bg-amber-500/20', text: 'text-amber-400', ring: 'ring-amber-500/30' },
    D: { bg: 'bg-orange-500/20', text: 'text-orange-400', ring: 'ring-orange-500/30' },
    F: { bg: 'bg-red-500/20', text: 'text-red-400', ring: 'ring-red-500/30' },
  };
  const c = cfg[grade] ?? cfg.F;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ${c.bg} ${c.text} ${c.ring}`}>
      {grade} <span className="opacity-70 font-normal">{score}pts</span>
    </span>
  );
}

// ─── Score Bar ────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'from-emerald-500 to-emerald-400' :
    score >= 60 ? 'from-brand-500 to-brand-400' :
    score >= 40 ? 'from-amber-500 to-amber-400' :
    score >= 20 ? 'from-orange-500 to-orange-400' :
    'from-red-500 to-red-400';

  return (
    <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

// ─── Category badge ───────────────────────────────────────────
const CAT_STYLE: Record<ScoreRuleCategory, string> = {
  engagement: 'bg-brand-500/15 text-brand-400',
  fit:        'bg-purple-500/15 text-purple-400',
  decay:      'bg-red-500/15 text-red-400',
};
const CAT_LABEL: Record<ScoreRuleCategory, string> = {
  engagement: 'Engagement',
  fit:        'Fit',
  decay:      'Decay',
};

// ─── Add/Edit Rule Modal ──────────────────────────────────────
function RuleModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<ScoreRule>;
  onSave: (r: ScoreRule) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<ScoreRule>>({
    name: '',
    type: 'email_open',
    category: 'engagement',
    points: 10,
    condition: '',
    enabled: true,
    ...initial,
  });

  const upd = (k: keyof ScoreRule, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-700">
          <h3 className="font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
            <Target size={16} className="text-brand-400" />
            {initial?.id ? 'Modifica Regola' : 'Nuova Regola'}
          </h3>
          <button onClick={onClose} className="p-1.5 text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">Nome regola</label>
            <input
              className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.name}
              onChange={(e) => upd('name', e.target.value)}
              placeholder="Es. Email aperta"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Categoria</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.category}
                onChange={(e) => upd('category', e.target.value)}
              >
                <option value="engagement">Engagement</option>
                <option value="fit">Fit</option>
                <option value="decay">Decay</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Punti</label>
              <input
                type="number"
                className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.points}
                onChange={(e) => upd('points', Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">Tipo trigger</label>
            <select
              className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={form.type}
              onChange={(e) => upd('type', e.target.value)}
            >
              <option value="email_open">Email aperta</option>
              <option value="email_click">Click su link email</option>
              <option value="form_submission">Form compilato</option>
              <option value="page_view">Visita pagina web</option>
              <option value="deal_created">Deal aperto</option>
              <option value="lifecycle_stage">Lifecycle stage</option>
              <option value="lead_status">Lead status</option>
              <option value="job_title_match">Corrispondenza job title</option>
              <option value="no_activity_decay">Decay per inattività</option>
            </select>
          </div>
          {(form.type === 'job_title_match' || form.type === 'lifecycle_stage' || form.type === 'lead_status') && (
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">
                Valori (separati da |)
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.condition}
                onChange={(e) => upd('condition', e.target.value)}
                placeholder="Es. ceo|cto|vp"
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 transition-colors">Annulla</button>
          <button
            onClick={() => {
              if (!form.name?.trim()) return;
              onSave({
                id: initial?.id ?? `rule-${Date.now()}`,
                name: form.name!,
                type: form.type!,
                category: form.category!,
                points: form.points ?? 0,
                condition: form.condition,
                enabled: form.enabled ?? true,
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-lg transition-colors"
          >
            <Save size={14} />
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function LeadScoring() {
  const { rules, snapshots, addRule, updateRule, deleteRule, toggleRule, computeScore } =
    useLeadScoringStore(
      useShallow((s) => ({
        rules: s.rules,
        snapshots: s.snapshots,
        addRule: s.addRule,
        updateRule: s.updateRule,
        deleteRule: s.deleteRule,
        toggleRule: s.toggleRule,
        computeScore: s.computeScore,
      }))
    );

  // Innesca il caricamento dati anche se la pagina è aperta direttamente
  // (popola contactsStore/dealsStore via TanStack Query).
  useContacts();
  useDeals();

  const contacts = useContactsStore(useShallow((s) => s.contacts));
  const deals = useDealsStore(useShallow((s) => s.deals));

  const [addModal, setAddModal] = useState(false);
  const [editRule, setEditRule] = useState<ScoreRule | null>(null);
  const [activeTab, setActiveTab] = useState<'contacts' | 'rules'>('contacts');
  const [expandedContact, setExpandedContact] = useState<string | null>(null);
  const [recalcing, setRecalcing] = useState(false);

  // Calcola/aggiorna score per tutti i contatti
  const recalcAll = () => {
    setRecalcing(true);
    contacts.forEach((c) => {
      computeScore(c.id, {
        email_opens: c.email_opens ?? 0,
        email_clicks: c.email_clicks ?? 0,
        form_submissions: c.form_submissions ?? 0,
        page_views: c.page_views ?? 0,
        lifecycle_stage: c.lifecycle_stage ?? 'subscriber',
        lead_status: c.lead_status ?? 'new',
        job_title: c.job_title,
        last_activity: c.last_activity,
        has_deal: deals.some((d) => d.contact_id === c.id),
      });
    });
    setTimeout(() => setRecalcing(false), 600);
  };

  // Contatti con score
  const scoredContacts = useMemo(() => {
    return contacts.map((c) => {
      const snap = snapshots[c.id];
      return { contact: c, snap };
    }).sort((a, b) => (b.snap?.score ?? 0) - (a.snap?.score ?? 0));
  }, [contacts, snapshots]);

  // Statistiche
  const stats = useMemo(() => {
    const withSnap = Object.values(snapshots);
    const avg = withSnap.length ? Math.round(withSnap.reduce((s, x) => s + x.score, 0) / withSnap.length) : 0;
    const hot = withSnap.filter((x) => x.score >= 60).length;
    const cold = withSnap.filter((x) => x.score < 20).length;
    return { avg, hot, cold, total: withSnap.length };
  }, [snapshots]);

  const grouped = useMemo(() => {
    const cats: Record<ScoreRuleCategory, ScoreRule[]> = { engagement: [], fit: [], decay: [] };
    rules.forEach((r) => cats[r.category].push(r));
    return cats;
  }, [rules]);

  return (
    <div className="flex flex-col h-full bg-surface-50 dark:bg-surface-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-500/15">
            <Target className="text-brand-400" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-surface-900 dark:text-surface-100 text-lg">Qi-Score</h1>
            <p className="text-xs text-surface-400">Lead Scoring intelligente — qualifica i tuoi prospect automaticamente</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={recalcAll}
            disabled={recalcing}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg border border-surface-200 dark:border-surface-700 transition-colors"
          >
            <RefreshCw size={14} className={recalcing ? 'animate-spin' : ''} />
            Ricalcola tutti
          </button>
          <button
            onClick={() => setAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors"
          >
            <Plus size={14} /> Nuova Regola
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-surface-200 dark:border-surface-800 shrink-0">
        {[
          { label: 'Score medio', value: stats.avg, suffix: 'pts', icon: BarChart3, color: 'text-brand-400', bg: 'bg-brand-500/10' },
          { label: 'Lead caldi (≥60)', value: stats.hot, suffix: '', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Lead freddi (<20)', value: stats.cold, suffix: '', icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Regole attive', value: rules.filter((r) => r.enabled).length, suffix: `/${rules.length}`, icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map(({ label, value, suffix, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${bg}`}>
              <Icon size={16} className={color} />
            </div>
            <div>
              <p className="text-xs text-surface-400">{label}</p>
              <p className="text-xl font-bold text-surface-900 dark:text-surface-100">{value}<span className="text-sm text-surface-400 ml-0.5">{suffix}</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 py-3 border-b border-surface-200 dark:border-surface-800 shrink-0">
        {(['contacts', 'rules'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800'}`}
          >
            {tab === 'contacts' ? `📋 Contatti (${contacts.length})` : `⚙️ Regole (${rules.length})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">

        {/* ── CONTACTS TAB ── */}
        {activeTab === 'contacts' && (
          <div className="space-y-2">
            {contacts.length === 0 && (
              <div className="text-center py-16 text-surface-400">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p>Nessun contatto. Aggiungine dalla sezione Contatti.</p>
              </div>
            )}
            {Object.values(snapshots).length === 0 && contacts.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <Info size={16} className="text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">Clicca <strong>Ricalcola tutti</strong> per calcolare il Qi-Score dei tuoi contatti.</p>
                </div>
                <button
                  onClick={recalcAll}
                  disabled={recalcing}
                  className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  <RefreshCw size={14} className={recalcing ? 'animate-spin' : ''} /> Ricalcola tutti
                </button>
              </div>
            )}
            {scoredContacts.map(({ contact, snap }) => {
              const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email || 'Contatto';
              const isExpanded = expandedContact === contact.id;
              return (
                <div key={contact.id} className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl overflow-hidden hover:border-surface-200 dark:hover:border-surface-700 transition-colors">
                  <button
                    className="w-full flex items-center gap-4 p-4 text-left"
                    onClick={() => setExpandedContact(isExpanded ? null : contact.id)}
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-300 font-bold text-sm shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-900 dark:text-surface-100 text-sm truncate">{name}</p>
                      <p className="text-xs text-surface-400 truncate">{contact.job_title ?? contact.email ?? '—'}</p>
                    </div>
                    {/* Score bar */}
                    {snap ? (
                      <div className="w-32 shrink-0">
                        <ScoreBar score={snap.score} />
                      </div>
                    ) : (
                      <span className="text-xs text-surface-500 shrink-0">non calcolato</span>
                    )}
                    {snap && <GradeBadge grade={snap.grade} score={snap.score} />}
                    {isExpanded ? <ChevronUp size={14} className="text-surface-500 shrink-0" /> : <ChevronDown size={14} className="text-surface-500 shrink-0" />}
                  </button>

                  {/* Breakdown */}
                  {isExpanded && snap && (
                    <div className="px-4 pb-4 border-t border-surface-200 dark:border-surface-800">
                      <p className="text-xs font-medium text-surface-400 mt-3 mb-2">Breakdown punti:</p>
                      <div className="space-y-1">
                        {snap.breakdown.map((b) => (
                          <div key={b.ruleId} className="flex items-center justify-between text-xs">
                            <span className="text-surface-700 dark:text-surface-300">{b.ruleName}</span>
                            <span className={`font-bold ${b.points > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {b.points > 0 ? '+' : ''}{b.points}
                            </span>
                          </div>
                        ))}
                        {snap.breakdown.length === 0 && (
                          <p className="text-surface-500 text-xs">Nessun punto guadagnato con le regole correnti.</p>
                        )}
                      </div>
                      <p className="text-[10px] text-surface-600 mt-3">
                        Calcolato: {new Date(snap.computedAt).toLocaleString('it-IT')}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── RULES TAB ── */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            {(['engagement', 'fit', 'decay'] as ScoreRuleCategory[]).map((cat) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${CAT_STYLE[cat]}`}>
                    {CAT_LABEL[cat]}
                  </span>
                  <span className="text-xs text-surface-500">{grouped[cat].length} regole</span>
                </div>
                <div className="space-y-2">
                  {grouped[cat].map((rule) => (
                    <div
                      key={rule.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${rule.enabled ? 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800' : 'bg-surface-50 dark:bg-surface-950 border-surface-200 dark:border-surface-800 opacity-50'}`}
                    >
                      <button onClick={() => toggleRule(rule.id)} className="shrink-0">
                        {rule.enabled
                          ? <ToggleRight size={20} className="text-brand-400" />
                          : <ToggleLeft size={20} className="text-surface-600" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-800 dark:text-surface-200">{rule.name}</p>
                        {rule.condition && (
                          <p className="text-xs text-surface-500 truncate">Condizione: {rule.condition}</p>
                        )}
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${rule.points > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {rule.points > 0 ? '+' : ''}{rule.points} pts
                      </span>
                      <button
                        onClick={() => setEditRule(rule)}
                        className="p-1.5 text-surface-500 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-colors shrink-0"
                      >
                        <Settings2 size={14} />
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="p-1.5 text-surface-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {grouped[cat].length === 0 && (
                    <p className="text-xs text-surface-500 pl-2">Nessuna regola in questa categoria.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-surface-200 dark:border-surface-800 text-center shrink-0">
        <p className="text-xs text-surface-600">Powered by Giuseppe Lobbene / Lobbenedesign</p>
      </div>

      {/* Modals */}
      {addModal && (
        <RuleModal
          onSave={(r) => { addRule(r); setAddModal(false); }}
          onClose={() => setAddModal(false)}
        />
      )}
      {editRule && (
        <RuleModal
          initial={editRule}
          onSave={(r) => { updateRule(r.id, r); setEditRule(null); }}
          onClose={() => setEditRule(null)}
        />
      )}
    </div>
  );
}
