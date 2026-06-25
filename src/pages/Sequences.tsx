import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import {
  Mail, Play, Pause, Plus, Trash2, Copy, Edit2, Users, Clock,
  CheckCircle2, Eye, Send, Phone,
  ListTodo, Zap, Save,
  X
} from 'lucide-react';
import {
  useSequencesStore,
  type Sequence, type SequenceStep, type SequenceStepType,
  type SequenceStatus
} from '../store/sequencesStore';
import { useContactsStore } from '../store/contactsStore';

// ─── Helpers ──────────────────────────────────────────────────
const STATUS_CFG: Record<SequenceStatus, { label: string; color: string; dot: string }> = {
  active: { label: 'Attiva', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  paused: { label: 'In pausa', color: 'text-amber-400', dot: 'bg-amber-400' },
  draft:  { label: 'Bozza', color: 'text-surface-400', dot: 'bg-surface-500' },
};

const STEP_CFG: Record<SequenceStepType, { icon: typeof Mail; color: string; bg: string; label: string }> = {
  email: { icon: Mail,    color: 'text-brand-400',   bg: 'bg-brand-500/15',   label: 'Email' },
  task:  { icon: ListTodo,color: 'text-purple-400',  bg: 'bg-purple-500/15',  label: 'Task' },
  call:  { icon: Phone,   color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Chiamata' },
  wait:  { icon: Clock,   color: 'text-surface-400', bg: 'bg-surface-200 dark:bg-surface-700',    label: 'Attesa' },
};

function pct(v: number) { return `${Math.round(v * 100)}%`; }

// ─── Stat pill ────────────────────────────────────────────────
function Stat({ label, value, color = 'text-surface-700 dark:text-surface-300' }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center">
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-surface-500">{label}</p>
    </div>
  );
}

// ─── Step node in timeline ────────────────────────────────────
function StepNode({
  step,
  index,
  isLast,
  onEdit,
  onDelete,
}: {
  step: SequenceStep;
  index: number;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cfg = STEP_CFG[step.type];
  const Icon = cfg.icon;

  return (
    <div className="flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center shrink-0`}>
          <Icon size={14} className={cfg.color} />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-surface-200 dark:bg-surface-700 my-1 min-h-[20px]" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-3 group hover:border-surface-200 dark:hover:border-surface-700 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold ${cfg.color}`}>Step {index + 1} · {cfg.label}</span>
                {step.delayDays > 0 && (
                  <span className="text-[10px] bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded text-surface-400">
                    +{step.delayDays}g{step.delayHours > 0 ? ` ${step.delayHours}h` : ''}
                  </span>
                )}
                {step.type === 'email' && step.sendAt && step.sendAt !== 'anytime' && (
                  <span className="text-[10px] bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded text-surface-400">
                    {step.sendAt === 'morning' ? '🌅 mattina' : step.sendAt === 'afternoon' ? '☀️ pomeriggio' : '🌙 sera'}
                  </span>
                )}
              </div>
              {step.type === 'email' && (
                <p className="text-sm text-surface-800 dark:text-surface-200 font-medium truncate">{step.subject || '(nessun oggetto)'}</p>
              )}
              {step.type === 'task' && (
                <p className="text-sm text-surface-800 dark:text-surface-200 font-medium truncate">{step.taskTitle || '(task senza titolo)'}</p>
              )}
              {step.type === 'call' && (
                <p className="text-sm text-surface-700 dark:text-surface-300 truncate">{step.callScript ? `Script: ${step.callScript.slice(0, 60)}...` : '(nessuno script)'}</p>
              )}
              {step.type === 'wait' && (
                <p className="text-sm text-surface-400">Attesa di {step.delayDays} giorn{step.delayDays !== 1 ? 'i' : 'o'}</p>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={onEdit} className="p-1.5 text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-colors">
                <Edit2 size={12} />
              </button>
              <button onClick={onDelete} className="p-1.5 text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Add Step Modal ───────────────────────────────────────────
function AddStepModal({ onSave, onClose }: { onSave: (s: SequenceStep) => void; onClose: () => void }) {
  const [form, setForm] = useState<Partial<SequenceStep>>({
    type: 'email', delayDays: 1, delayHours: 0, sendAt: 'morning',
  });
  const upd = (k: keyof SequenceStep, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-700 shrink-0">
          <h3 className="font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
            <Plus size={16} className="text-brand-400" /> Nuovo Step
          </h3>
          <button onClick={onClose} className="p-1.5 text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"><X size={14} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">Tipo step</label>
            <div className="grid grid-cols-4 gap-2">
              {(['email', 'task', 'call', 'wait'] as SequenceStepType[]).map((t) => {
                const cfg = STEP_CFG[t];
                const Icon = cfg.icon;
                return (
                  <button
                    key={t}
                    onClick={() => upd('type', t)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors ${form.type === t ? 'border-brand-500 bg-brand-500/10' : 'border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 hover:border-surface-600'}`}
                  >
                    <Icon size={16} className={cfg.color} />
                    <span className="text-[10px] text-surface-700 dark:text-surface-300">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Ritardo (giorni)</label>
              <input type="number" min={0} className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.delayDays} onChange={(e) => upd('delayDays', Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Ore aggiuntive</label>
              <input type="number" min={0} max={23} className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={form.delayHours} onChange={(e) => upd('delayHours', Number(e.target.value))} />
            </div>
          </div>

          {form.type === 'email' && (
            <>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Oggetto email</label>
                <input className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.subject ?? ''} onChange={(e) => upd('subject', e.target.value)} placeholder="Es. Ciao {{first_name}}, ti scrivo per..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Corpo email</label>
                <textarea rows={4} className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  value={form.body ?? ''} onChange={(e) => upd('body', e.target.value)} placeholder="Corpo dell'email. Usa {{first_name}}, {{company}}, {{org_name}} come variabili." />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Orario di invio preferito</label>
                <select className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.sendAt} onChange={(e) => upd('sendAt', e.target.value)}>
                  <option value="anytime">Qualsiasi ora</option>
                  <option value="morning">🌅 Mattina (8–10)</option>
                  <option value="afternoon">☀️ Pomeriggio (13–15)</option>
                  <option value="evening">🌙 Sera (17–19)</option>
                </select>
              </div>
            </>
          )}

          {form.type === 'task' && (
            <>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Titolo task</label>
                <input className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.taskTitle ?? ''} onChange={(e) => upd('taskTitle', e.target.value)} placeholder="Es. Chiama {{first_name}} per follow-up" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Note task</label>
                <textarea rows={3} className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  value={form.taskNote ?? ''} onChange={(e) => upd('taskNote', e.target.value)} placeholder="Istruzioni per il sales..." />
              </div>
            </>
          )}

          {form.type === 'call' && (
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1.5">Script di chiamata</label>
              <textarea rows={4} className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                value={form.callScript ?? ''} onChange={(e) => upd('callScript', e.target.value)} placeholder="Ciao {{first_name}}, ti chiamo da {{org_name}}..." />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 transition-colors">Annulla</button>
          <button
            onClick={() => {
              onSave({
                id: `step-${Date.now()}`,
                type: form.type!,
                delayDays: form.delayDays ?? 0,
                delayHours: form.delayHours ?? 0,
                subject: form.subject,
                body: form.body,
                taskTitle: form.taskTitle,
                taskNote: form.taskNote,
                callScript: form.callScript,
                sendAt: form.sendAt as SequenceStep['sendAt'],
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-lg transition-colors"
          >
            <Save size={14} /> Aggiungi Step
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Enroll Modal ─────────────────────────────────────────────
function EnrollModal({ sequence, onClose }: { sequence: Sequence; onClose: () => void }) {
  const contacts = useContactsStore(useShallow((s) => s.contacts));
  const { enroll, enrollments } = useSequencesStore(
    useShallow((s) => ({ enroll: s.enroll, enrollments: s.enrollments }))
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const alreadyEnrolled = new Set(enrollments.filter((e) => e.sequenceId === sequence.id).map((e) => e.contactId));

  const filtered = contacts.filter((c) => {
    const name = [c.first_name, c.last_name, c.email].filter(Boolean).join(' ').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const handleEnroll = () => {
    selected.forEach((contactId) => {
      const c = contacts.find((x) => x.id === contactId)!;
      enroll({
        id: `enr-${Date.now()}-${contactId}`,
        sequenceId: sequence.id,
        contactId,
        contactName: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Contatto',
        contactEmail: c.email ?? '',
        status: 'active',
        currentStep: 0,
        enrolledAt: new Date().toISOString(),
        nextActionAt: new Date().toISOString(),
        completedAt: null,
        stepsLog: [],
      });
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-700 shrink-0">
          <div>
            <h3 className="font-semibold text-surface-900 dark:text-surface-100">Iscrivi contatti</h3>
            <p className="text-xs text-surface-400 mt-0.5">Sequenza: {sequence.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"><X size={14} /></button>
        </div>
        <div className="p-3 border-b border-surface-200 dark:border-surface-800 shrink-0">
          <input className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca contatto..." />
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filtered.map((c) => {
            const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Contatto';
            const enrolled = alreadyEnrolled.has(c.id);
            return (
              <label key={c.id} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${enrolled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-100 dark:hover:bg-surface-800'}`}>
                <input type="checkbox" disabled={enrolled}
                  checked={selected.has(c.id)} onChange={() => toggle(c.id)}
                  className="accent-brand-500" />
                <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-300 text-xs font-bold shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-surface-800 dark:text-surface-200 truncate">{name}</p>
                  <p className="text-xs text-surface-500 truncate">{c.email ?? c.job_title ?? '—'}</p>
                </div>
                {enrolled && <span className="ml-auto text-[10px] text-amber-400 shrink-0">già iscritto</span>}
              </label>
            );
          })}
        </div>
        <div className="flex items-center justify-between p-4 border-t border-surface-200 dark:border-surface-800 shrink-0">
          <span className="text-xs text-surface-400">{selected.size} selezionati</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 transition-colors">Annulla</button>
            <button disabled={selected.size === 0} onClick={handleEnroll}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
              <Send size={14} /> Iscrivi ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sequence Detail Panel ────────────────────────────────────
function SequenceDetail({ sequence }: { sequence: Sequence }) {
  const { addStep, deleteStep, updateSequence, getEnrollmentsForSequence } = useSequencesStore(
    useShallow((s) => ({
      addStep: s.addStep,
      deleteStep: s.deleteStep,
      updateSequence: s.updateSequence,
      getEnrollmentsForSequence: s.getEnrollmentsForSequence,
    }))
  );
  const [addStepModal, setAddStepModal] = useState(false);
  const [enrollModal, setEnrollModal] = useState(false);
  const enrollments = getEnrollmentsForSequence(sequence.id);

  const totalDays = sequence.steps.reduce((acc, s) => acc + s.delayDays, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="flex items-center gap-6 px-5 py-3 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950/50 shrink-0">
        <Stat label="Iscritti" value={String(enrollments.length)} />
        <div className="w-px h-6 bg-surface-100 dark:bg-surface-800" />
        <Stat label="Apertura" value={pct(sequence.openRate)} color="text-brand-400" />
        <Stat label="Risposta" value={pct(sequence.replyRate)} color="text-emerald-400" />
        <Stat label="Click" value={pct(sequence.clickRate)} color="text-purple-400" />
        <div className="w-px h-6 bg-surface-100 dark:bg-surface-800" />
        <Stat label="Durata totale" value={`${totalDays}g`} />
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setEnrollModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs rounded-lg transition-colors"
          >
            <Users size={12} /> Iscrivi contatti
          </button>
          <button
            onClick={() => updateSequence(sequence.id, {
              status: sequence.status === 'active' ? 'paused' : 'active',
            })}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors border ${
              sequence.status === 'active'
                ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            {sequence.status === 'active' ? <><Pause size={12} /> Pausa</> : <><Play size={12} /> Attiva</>}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Steps timeline */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">Timeline della sequenza</h3>
            <button
              onClick={() => setAddStepModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-lg border border-surface-200 dark:border-surface-700 transition-colors"
            >
              <Plus size={12} /> Aggiungi step
            </button>
          </div>

          {sequence.steps.length === 0 ? (
            <div className="text-center py-10 text-surface-500">
              <Zap size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nessuno step. Aggiungi il primo step per iniziare.</p>
            </div>
          ) : (
            <div>
              {sequence.steps.map((step, idx) => (
                <StepNode
                  key={step.id}
                  step={step}
                  index={idx}
                  isLast={idx === sequence.steps.length - 1}
                  onEdit={() => {}}
                  onDelete={() => deleteStep(sequence.id, step.id)}
                />
              ))}
              {/* End node */}
              <div className="flex gap-4 items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                </div>
                <p className="text-xs text-surface-500">Fine sequenza</p>
              </div>
            </div>
          )}
        </div>

        {/* Enrollments */}
        {enrollments.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">
              Contatti iscritti ({enrollments.length})
            </h3>
            <div className="space-y-2">
              {enrollments.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-2.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-300 text-xs font-bold shrink-0">
                    {e.contactName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-surface-800 dark:text-surface-200 font-medium truncate">{e.contactName}</p>
                    <p className="text-[10px] text-surface-500">Step {e.currentStep + 1}/{sequence.steps.length}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    e.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
                    e.status === 'completed' ? 'bg-surface-200 dark:bg-surface-700 text-surface-400' :
                    'bg-amber-500/15 text-amber-400'
                  }`}>{e.status}</span>
                </div>
              ))}
              {enrollments.length > 5 && (
                <p className="text-xs text-surface-500 text-center">+ {enrollments.length - 5} altri</p>
              )}
            </div>
          </div>
        )}
      </div>

      {addStepModal && (
        <AddStepModal
          onSave={(step) => { addStep(sequence.id, step); setAddStepModal(false); }}
          onClose={() => setAddStepModal(false)}
        />
      )}
      {enrollModal && <EnrollModal sequence={sequence} onClose={() => setEnrollModal(false)} />}
    </div>
  );
}

// ─── Create Sequence Modal ────────────────────────────────────
function CreateSequenceModal({ onSave, onClose }: { onSave: (s: Sequence) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-surface-200 dark:border-surface-700">
          <h3 className="font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
            <Zap size={16} className="text-brand-400" /> Nuova Sequenza
          </h3>
          <button onClick={onClose} className="p-1.5 text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"><X size={14} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">Nome sequenza *</label>
            <input className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. 🚀 Onboarding New Lead" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">Descrizione</label>
            <textarea rows={2} className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A cosa serve questa sequenza?" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-400 mb-1.5">Tag (separati da virgola)</label>
            <input className="w-full px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={tags} onChange={(e) => setTags(e.target.value)} placeholder="inbound, nuovo-lead, post-demo..." />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 transition-colors">Annulla</button>
          <button
            disabled={!name.trim()}
            onClick={() => onSave({
              id: `seq-${Date.now()}`,
              name: name.trim(),
              description: description.trim(),
              status: 'draft',
              steps: [],
              tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
              enrolledCount: 0,
              openRate: 0,
              replyRate: 0,
              clickRate: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            <Save size={14} /> Crea Sequenza
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function Sequences() {
  const { sequences, addSequence, deleteSequence, duplicateSequence } = useSequencesStore(
    useShallow((s) => ({
      sequences: s.sequences,
      addSequence: s.addSequence,
      deleteSequence: s.deleteSequence,
      duplicateSequence: s.duplicateSequence,
      updateSequence: s.updateSequence,
    }))
  );

  const [selected, setSelected] = useState<string | null>(sequences[0]?.id ?? null);
  const [createModal, setCreateModal] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = sequences.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedSeq = sequences.find((s) => s.id === selected) ?? null;

  const avgOpenRate = sequences.length ? sequences.reduce((a, s) => a + s.openRate, 0) / sequences.length : 0;

  return (
    <div className="flex h-full bg-surface-50 dark:bg-surface-950 overflow-hidden">
      {/* Left panel — list */}
      <div className="w-80 flex flex-col border-r border-surface-200 dark:border-surface-800 shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-surface-200 dark:border-surface-800 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-500/15">
                <Zap className="text-brand-400" size={16} />
              </div>
              <div>
                <h1 className="font-bold text-surface-900 dark:text-surface-100 text-sm">Qi-Flow</h1>
                <p className="text-[10px] text-surface-500">Email Sequences</p>
              </div>
            </div>
            <button
              onClick={() => setCreateModal(true)}
              className="p-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
          <input
            className="w-full px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca sequenza..."
          />
        </div>

        {/* Global stats mini */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-surface-200 dark:border-surface-800 shrink-0">
          <div className="text-center">
            <p className="text-xs font-bold text-surface-800 dark:text-surface-200">{sequences.length}</p>
            <p className="text-[10px] text-surface-500">Totali</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-emerald-400">{sequences.filter((s) => s.status === 'active').length}</p>
            <p className="text-[10px] text-surface-500">Attive</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-brand-400">{pct(avgOpenRate)}</p>
            <p className="text-[10px] text-surface-500">Open rate</p>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.map((seq) => {
            const sc = STATUS_CFG[seq.status];
            const isSelected = selected === seq.id;
            return (
              <button
                key={seq.id}
                onClick={() => setSelected(seq.id)}
                className={`w-full text-left p-3 rounded-xl transition-colors border ${
                  isSelected
                    ? 'bg-brand-500/10 border-brand-500/30 text-brand-300'
                    : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 hover:border-surface-200 dark:hover:border-surface-700 text-surface-700 dark:text-surface-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="font-medium text-sm leading-tight flex-1 truncate">{seq.name}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    <span className={`text-[10px] ${sc.color}`}>{sc.label}</span>
                  </div>
                </div>
                <p className="text-[11px] text-surface-500 mb-2 line-clamp-1">{seq.description || 'Nessuna descrizione'}</p>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-surface-500 flex items-center gap-1">
                    <Mail size={9} /> {seq.steps.filter((s) => s.type === 'email').length} email
                  </span>
                  <span className="text-[10px] text-surface-500 flex items-center gap-1">
                    <Users size={9} /> {seq.enrolledCount}
                  </span>
                  <span className="text-[10px] text-surface-500 flex items-center gap-1">
                    <Eye size={9} /> {pct(seq.openRate)}
                  </span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-surface-500">
              <Zap size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">Nessuna sequenza trovata</p>
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-surface-200 dark:border-surface-800 shrink-0">
          <p className="text-[10px] text-surface-600 text-center">Powered by Giuseppe Lobbene / Lobbenedesign</p>
        </div>
      </div>

      {/* Right panel — detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedSeq ? (
          <>
            {/* Detail header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800 shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="font-bold text-surface-900 dark:text-surface-100">{selectedSeq.name}</h2>
                  <div className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
                    selectedSeq.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
                    selectedSeq.status === 'paused' ? 'bg-amber-500/15 text-amber-400' :
                    'bg-surface-200 dark:bg-surface-700 text-surface-400'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[selectedSeq.status].dot}`} />
                    {STATUS_CFG[selectedSeq.status].label}
                  </div>
                </div>
                <p className="text-xs text-surface-400">{selectedSeq.description || 'Nessuna descrizione'}</p>
                {selectedSeq.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {selectedSeq.tags.map((t) => (
                      <span key={t} className="text-[10px] bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded text-surface-400">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => duplicateSequence(selectedSeq.id)}
                  className="p-2 text-surface-400 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
                  title="Duplica"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Eliminare questa sequenza?')) {
                      deleteSequence(selectedSeq.id);
                      setSelected(sequences.find((s) => s.id !== selectedSeq.id)?.id ?? null);
                    }
                  }}
                  className="p-2 text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Elimina"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <SequenceDetail sequence={selectedSeq} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-surface-500">
            <div className="text-center">
              <Zap size={48} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium">Seleziona una sequenza</p>
              <p className="text-xs mt-1">o crea la tua prima Qi-Flow</p>
              <button onClick={() => setCreateModal(true)} className="mt-4 flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-lg transition-colors mx-auto">
                <Plus size={14} /> Crea sequenza
              </button>
            </div>
          </div>
        )}
      </div>

      {createModal && (
        <CreateSequenceModal
          onSave={(s) => { addSequence(s); setSelected(s.id); setCreateModal(false); }}
          onClose={() => setCreateModal(false)}
        />
      )}
    </div>
  );
}
