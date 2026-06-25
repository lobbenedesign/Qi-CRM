import { useState, useRef, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import {
  Phone, Mail, Calendar, StickyNote, Sparkles, ArrowRightLeft,
  Loader2, Clock, Bot, CheckSquare, Plus,
  CheckCheck, MousePointerClick
} from 'lucide-react';
import { useActivities, useCreateActivity } from '../../hooks/useActivities';
import { useTeamStore } from '../../store/teamStore';
import { useDeadlinesStore } from '../../store/deadlinesStore';
import { useRemindersStore } from '../../store/remindersStore';
import { useTasksStore } from '../../store/tasksStore';
import { formatDate } from '../../lib/utils';
import { SnippetHelper } from '../common/SnippetHelper';
import type { Activity, QiTrackData, QiTrackEvent } from '../../types/crm';
import { QiTrackDetailsModal } from './QiTrackDetailsModal';

const ICONS: Record<ActivityType | 'task', React.ReactNode> = {
  call:         <Phone size={13} />,
  email:        <Mail size={13} />,
  meeting:      <Calendar size={13} />,
  note:         <StickyNote size={13} />,
  ai_capture:   <Sparkles size={13} />,
  stage_change: <ArrowRightLeft size={13} />,
  task:         <CheckSquare size={13} />
};

const COLORS: Record<ActivityType, string> = {
  call:         'bg-blue-500',
  email:        'bg-brand-500',
  meeting:      'bg-purple-500',
  note:         'bg-surface-400',
  ai_capture:   'bg-amber-500',
  stage_change: 'bg-green-500',
};

interface Props {
  contactId?: string;
  dealId?: string;
}

const CALL_OUTCOMES = [
  { value: 'connected', label: 'Connesso' },
  { value: 'left_voicemail', label: 'Segreteria Telefonica' },
  { value: 'no_answer', label: 'Nessuna Risposta' },
  { value: 'busy', label: 'Occupato' },
  { value: 'wrong_number', label: 'Numero Errato' },
];

export function ActivityTimeline({ contactId, dealId }: Props) {
  const { data: activities = [], isLoading } = useActivities({ contactId, dealId });
  const createActivity = useCreateActivity();
  const updateActivityHook = useUpdateActivity();
  
  const { members } = useTeamStore();
  const { addDeadline } = useDeadlinesStore();
  const { add: addReminder } = useRemindersStore();
  const { tasks, executingQueueId, executingTaskIds, currentExecIdx } = useTasksStore(
    useShallow((s) => ({ tasks: s.tasks, executingQueueId: s.executingQueueId, executingTaskIds: s.executingTaskIds, currentExecIdx: s.currentExecIdx }))
  );

  const [activeTab, setActiveTab] = useState<'note' | 'call' | 'email' | 'task'>('note');
  const [selectedTrackActivity, setSelectedTrackActivity] = useState<Activity | null>(null);

  useEffect(() => {
    if (executingQueueId && currentExecIdx >= 0) {
      const taskId = executingTaskIds[currentExecIdx];
      const runningTask = tasks.find(t => t.id === taskId);
      if (runningTask) {
        const isMatchedContact = runningTask.associatedType === 'contact' && runningTask.associatedId === contactId;
        const isMatchedDeal = runningTask.associatedType === 'deal' && runningTask.associatedId === dealId;
        if (isMatchedContact || isMatchedDeal) {
          if (runningTask.type === 'call') {
            setActiveTab('call');
          } else if (runningTask.type === 'email') {
            setActiveTab('email');
          } else if (runningTask.type === 'todo') {
            setActiveTab('note');
          }
        }
      }
    }
  }, [executingQueueId, executingTaskIds, currentExecIdx, tasks, contactId, dealId]);

  // Common/Note states
  const [noteText, setNoteText] = useState('');
  const [planFollowUp, setPlanFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');


  // Call states
  const [callOutcome, setCallOutcome] = useState('connected');
  const [callNotes, setCallNotes] = useState('');

  // Email states
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Task states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskNotes, setTaskNotes] = useState('');

  // Mentions autocomplete logic
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const filteredMembers = useMemo(() => {
    if (mentionSearch === null) return [];
    const query = mentionSearch.toLowerCase();
    return members.filter(
      m => m.status === 'active' && 
      (`${m.first_name} ${m.last_name}`).toLowerCase().includes(query)
    );
  }, [mentionSearch, members]);

  // Handle autocomplete input
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNoteText(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

    if (lastAtIdx >= 0) {
      const textAfterAt = textBeforeCursor.slice(lastAtIdx + 1);
      // If there is no space between @ and the cursor, treat it as a mention query
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt);
        return;
      }
    }
    setMentionSearch(null);
  };

  const insertMention = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member || !textRef.current) return;

    const val = noteText;
    const cursorPos = textRef.current.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');

    const mentionText = `${member.first_name} ${member.last_name} `;
    const newVal = val.slice(0, lastAtIdx) + '@' + mentionText + val.slice(cursorPos);
    
    setNoteText(newVal);
    setMentionSearch(null);
    
    // Reset focus and cursor position
    setTimeout(() => {
      if (textRef.current) {
        textRef.current.focus();
        const nextPos = lastAtIdx + mentionText.length + 1;
        textRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 50);
  };

  const onAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    // 1. Registra attività nota
    const act = await createActivity.mutateAsync({
      contact_id: contactId ?? null,
      deal_id: dealId ?? null,
      type: 'note',
      subject: noteText.split('\n')[0].slice(0, 80),
      body: noteText,
      source: 'user',
      confidence: 1,
    });

    // 2. Crea follow-up se spuntato
    if (planFollowUp && followUpDate) {
      addDeadline({
        title: `Follow-up: ${act.subject || 'Nota'}`,
        description: `Controllare la nota caricata il ${new Date().toLocaleDateString('it-IT')}`,
        due_date: followUpDate,
        category: 'client',
        amount: null,
        contact_id: contactId ?? null,
        deal_id: dealId ?? null,
        notify_telegram: true,
        notify_email: true,
      });
    }

    // 3. Scan per @mentions per inviare promemoria reali a quel collaboratore
    members.forEach((m) => {
      const fullName = `${m.first_name} ${m.last_name}`;
      if (noteText.includes(`@${fullName}`)) {
        addReminder({
          title: `Menzione in nota`,
          note: `Sei stato menzionato in una nota del contatto. Contenuto: "${act.subject}"`,
          remind_at: new Date(Date.now() + 5000).toISOString(),
          channels: ['visual', 'email'],
          user_id: m.id,
          contact_id: contactId ?? null,
          deal_id: dealId ?? null,
          ticket_id: null,
        });
      }
    });

    setNoteText('');
    setPlanFollowUp(false);
    setFollowUpDate('');
  };

  const onAddCall = async (e: React.FormEvent) => {
    e.preventDefault();
    const outcomeLabel = CALL_OUTCOMES.find(o => o.value === callOutcome)?.label || callOutcome;

    await createActivity.mutateAsync({
      contact_id: contactId ?? null,
      deal_id: dealId ?? null,
      type: 'call',
      subject: `Telefonata registrata - Esito: ${outcomeLabel}`,
      body: callNotes || `Registrata telefonata con esito: ${outcomeLabel}`,
      source: 'user',
      confidence: 1,
    });

    // Simulazione AI Insight (Qi-Call)
    if (callOutcome === 'connected' && callNotes.length > 10) {
      setTimeout(() => {
        createActivity.mutate({
          contact_id: contactId ?? null,
          deal_id: dealId ?? null,
          type: 'ai_capture',
          subject: 'AI Insight: Prossimo Step suggerito',
          body: `💡 In base alle note della chiamata, l'AI suggerisce di inviare un'email di follow-up con la proposta aggiornata entro 24 ore. Vuoi che prepari la bozza?`,
          source: 'ai_extracted',
          confidence: 0.95,
        });
      }, 1500); // 1.5s delay to simulate thinking
    } else if (callOutcome === 'left_voicemail' || callOutcome === 'no_answer') {
      setTimeout(() => {
        createActivity.mutate({
          contact_id: contactId ?? null,
          deal_id: dealId ?? null,
          type: 'ai_capture',
          subject: 'AI Insight: Riprova strategica',
          body: `💡 Il contatto non ha risposto. L'AI suggerisce di riprovare domani mattina tra le 10:00 e le 11:30, orario in cui è solitamente più reattivo.`,
          source: 'ai_extracted',
          confidence: 0.88,
        });
      }, 1500);
    }

    setCallNotes('');
    setCallOutcome('connected');
  };

  const onAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim()) return;

    const newAct = await createActivity.mutateAsync({
      type: 'email',
      subject: `Email registrata: ${emailSubject}`,
      body: emailBody,
      contact_id: contactId,
      deal_id: dealId,
      qi_track: { opened: false, openedAt: null, clickCount: 0, lastClickedAt: null, history: [] }
    });
    setEmailSubject('');
    setEmailBody('');
  };

  const onAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDueDate) return;

    // Crea attività meeting/task
    await createActivity.mutateAsync({
      contact_id: contactId ?? null,
      deal_id: dealId ?? null,
      type: 'meeting',
      subject: `Task programmato: ${taskTitle}`,
      body: taskNotes || `Scadenza il ${taskDueDate}`,
      source: 'user',
      confidence: 1,
      due_at: taskDueDate,
    });

    // Crea scadenziario
    addDeadline({
      title: `Task: ${taskTitle}`,
      description: taskNotes || 'Compito da completare associato al cliente.',
      due_date: taskDueDate.split('T')[0],
      category: 'client',
      amount: null,
      contact_id: contactId ?? null,
      deal_id: dealId ?? null,
      notify_telegram: true,
      notify_email: true,
      qi_track: { opened: false, openedAt: null, clickCount: 0, lastClickedAt: null, history: [] }
    });

    setTaskTitle('');
    setTaskDueDate('');
    setTaskNotes('');
  };

  const handleSimulateTracking = async (activity: Activity, type: 'open' | 'click') => {
    if (!activity.qi_track) return;
    const history = [...activity.qi_track.history];
    const timestamp = new Date().toISOString();
    
    const event: QiTrackEvent = {
      type,
      timestamp,
      ip: `192.168.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
    };
    history.push(event);

    const patch: Partial<Activity> = {
      qi_track: {
        opened: true,
        openedAt: activity.qi_track.openedAt || timestamp,
        clickCount: activity.qi_track.clickCount + (type === 'click' ? 1 : 0),
        lastClickedAt: type === 'click' ? timestamp : activity.qi_track.lastClickedAt,
        history
      }
    };
    await updateActivityHook.mutateAsync({ id: activity.id, patch });
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Logger Tabs */}
      <div className="bg-surface-50 dark:bg-surface-850 p-3 rounded-xl border border-surface-200 dark:border-surface-800 space-y-3 relative">
        <div className="flex gap-1 border-b border-surface-200 dark:border-surface-750 pb-2">
          {(['note', 'call', 'email', 'task'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTab(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${
                activeTab === t
                  ? 'bg-white dark:bg-surface-800 text-brand-600 dark:text-brand-400 shadow-sm border border-surface-200 dark:border-surface-700'
                  : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800'
              }`}
            >
              {t === 'note' && <StickyNote size={13} />}
              {t === 'call' && <Phone size={13} />}
              {t === 'email' && <Mail size={13} />}
              {t === 'task' && <Calendar size={13} />}
              {t === 'note' ? 'Nota' : t === 'call' ? 'Telefonata' : t === 'email' ? 'Email' : 'Task / Follow-up'}
            </button>
          ))}
        </div>

        {/* Tab content: NOTE */}
        {activeTab === 'note' && (
          <form onSubmit={onAddNote} className="space-y-3">
            <div className="relative">
              <textarea
                ref={textRef}
                value={noteText}
                onChange={handleNoteChange}
                placeholder="Aggiungi una nota... digita @ per menzionare un collaboratore."
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-lg border border-surface-200
                           dark:border-surface-750 bg-white dark:bg-surface-900
                           text-surface-900 dark:text-surface-100 outline-none resize-none
                           focus:ring-2 focus:ring-brand-500/30"
              />
              {/* Mentions Dropdown */}
              {filteredMembers.length > 0 && (
                <div className="absolute left-0 bottom-full mb-1 w-64 bg-white dark:bg-surface-900 border
                                border-surface-200 dark:border-surface-750 rounded-lg shadow-xl py-1 z-35 max-h-40 overflow-y-auto">
                  <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-surface-400 border-b border-surface-100 dark:border-surface-800 mb-1">Menziona collaboratore</div>
                  {filteredMembers.map((m: any) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => insertMention(m.id)}
                      className="w-full flex items-center justify-between text-left px-3 py-1.5 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-xs text-surface-700 dark:text-surface-200"
                    >
                      <span className="font-semibold">{m.first_name} {m.last_name}</span>
                      <span className="text-[10px] text-surface-400">{m.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-surface-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planFollowUp}
                    onChange={(e) => setPlanFollowUp(e.target.checked)}
                    className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                  />
                  Pianifica follow-up
                </label>
                {planFollowUp && (
                  <input
                    type="date"
                    required
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="text-xs rounded-md border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-2 py-1 outline-none"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <SnippetHelper onSelect={(txt) => setNoteText((prev) => prev ? prev + ' ' + txt : txt)} />
                <button
                  type="submit"
                  disabled={!noteText.trim() || createActivity.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
                >
                  {createActivity.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  Salva Nota
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab content: CALL */}
        {activeTab === 'call' && (
          <form onSubmit={onAddCall} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-surface-500 shrink-0 font-medium">Esito telefonata:</span>
              <select
                value={callOutcome}
                onChange={(e) => setCallOutcome(e.target.value)}
                className="text-xs rounded-md border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-2.5 py-1.5 outline-none"
              >
                {CALL_OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <textarea
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              placeholder="Inserisci i dettagli e le note della chiamata..."
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-lg border border-surface-200
                         dark:border-surface-750 bg-white dark:bg-surface-900
                         text-surface-900 dark:text-surface-100 outline-none resize-none
                         focus:ring-2 focus:ring-brand-500/30"
            />
            <div className="flex justify-end items-center gap-2">
              <SnippetHelper onSelect={(txt) => setCallNotes((prev) => prev ? prev + ' ' + txt : txt)} />
              <button
                type="submit"
                disabled={createActivity.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                {createActivity.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Registra Chiamata
              </button>
            </div>
          </form>
        )}

        {/* Tab content: EMAIL */}
        {activeTab === 'email' && (
          <form onSubmit={onAddEmail} className="space-y-3">
            <input
              required
              placeholder="Oggetto dell'email..."
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-surface-200
                         dark:border-surface-750 bg-white dark:bg-surface-900
                         text-surface-900 dark:text-surface-100 outline-none
                         focus:ring-2 focus:ring-brand-500/30"
            />
            <textarea
              required
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Contenuto dell'email inviata..."
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-lg border border-surface-200
                         dark:border-surface-750 bg-white dark:bg-surface-900
                         text-surface-900 dark:text-surface-100 outline-none resize-none
                         focus:ring-2 focus:ring-brand-500/30"
            />
            <div className="flex justify-end items-center gap-2">
              <SnippetHelper onSelect={(txt) => setEmailBody((prev) => prev ? prev + ' ' + txt : txt)} />
              <button
                type="submit"
                disabled={!emailSubject.trim() || createActivity.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                {createActivity.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Registra Email
              </button>
            </div>
          </form>
        )}

        {/* Tab content: TASK */}
        {activeTab === 'task' && (
          <form onSubmit={onAddTask} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                required
                placeholder="Titolo del task/appuntamento..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-surface-200
                           dark:border-surface-750 bg-white dark:bg-surface-900
                           text-surface-900 dark:text-surface-100 outline-none
                           focus:ring-2 focus:ring-brand-500/30"
              />
              <input
                type="date"
                required
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-surface-200
                           dark:border-surface-750 bg-white dark:bg-surface-900
                           text-surface-900 dark:text-surface-100 outline-none
                           focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <textarea
              value={taskNotes}
              onChange={(e) => setTaskNotes(e.target.value)}
              placeholder="Eventuali note integrative..."
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-lg border border-surface-200
                         dark:border-surface-750 bg-white dark:bg-surface-900
                         text-surface-900 dark:text-surface-100 outline-none resize-none
                         focus:ring-2 focus:ring-brand-500/30"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!taskTitle.trim() || !taskDueDate || createActivity.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                {createActivity.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Crea Task
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Timeline List */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="animate-spin text-brand-500" size={20} />
        </div>
      ) : activities.length === 0 ? (
        <p className="text-xs text-surface-400 text-center py-6">Nessuna attività registrata</p>
      ) : (
        <ol className="relative border-l border-surface-200 dark:border-surface-700 ml-1.5 space-y-4 pt-1">
          {activities.map((a) => (
            <li key={a.id} className="ml-4">
              <span className={`absolute -left-[7px] w-3.5 h-3.5 rounded-full flex items-center
                                justify-center text-white ${COLORS[a.type] || 'bg-surface-400'}`}>
              </span>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-surface-400">{ICONS[a.type] || ICONS.note}</span>
                    <p className="text-xs font-bold text-surface-800 dark:text-surface-100">
                      {a.subject ?? a.type}
                    </p>
                    {a.source === 'ai_extracted' && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-600
                                       bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">
                        <Bot size={9} /> AI
                      </span>
                    )}
                  </div>
                  {a.body && a.body !== a.subject && (
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 leading-relaxed whitespace-pre-wrap">
                      {a.body}
                    </p>
                  )}
                  {a.type === 'email' && (
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-3 text-[10px]">
                        {a.qi_track ? (
                          <>
                            {a.qi_track.opened ? (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
                                <CheckCheck size={10} /> Aperto
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-surface-500 font-medium bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded">
                                <CheckCheck size={10} /> Inviato
                              </span>
                            )}
                            <span className={`flex items-center gap-1 font-medium px-1.5 py-0.5 rounded ${
                              a.qi_track.clickCount > 0 
                                ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' 
                                : 'text-surface-500 bg-surface-100 dark:bg-surface-800'
                            }`}>
                              <MousePointerClick size={10} /> 
                              {a.qi_track.clickCount > 0 ? `Cliccato ${a.qi_track.clickCount} volte` : 'Nessun click'}
                            </span>
                            <button 
                              onClick={() => setSelectedTrackActivity(a as Activity)}
                              className="flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium underline"
                            >
                              Vedi Analytics
                            </button>
                          </>
                        ) : (
                          <span className="text-surface-400">Tracking non abilitato per questa email.</span>
                        )}
                      </div>
                      
                      {/* Simulators (Solo per Demo) */}
                      {a.qi_track && (
                        <div className="flex gap-2">
                          <button onClick={() => handleSimulateTracking(a as Activity, 'open')} disabled={updateActivityHook.isPending} className="text-[9px] px-2 py-1 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 text-surface-600 rounded">
                            Simula Apertura
                          </button>
                          <button onClick={() => handleSimulateTracking(a as Activity, 'click')} disabled={updateActivityHook.isPending} className="text-[9px] px-2 py-1 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 text-surface-600 rounded">
                            Simula Click
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {a.due_at && !a.completed && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 mt-1.5 bg-amber-500/10 border border-amber-200/20 px-1.5 py-0.5 rounded">
                      <Clock size={9} /> Scadenza il {formatDate(a.due_at)}
                    </span>
                  )}
                </div>
                <time className="text-[10px] text-surface-400 shrink-0">{formatDate(a.created_at)}</time>
              </div>
            </li>
          ))}
        </ol>
      )}

      {selectedTrackActivity && (
        <QiTrackDetailsModal 
          activity={selectedTrackActivity} 
          onClose={() => setSelectedTrackActivity(null)} 
        />
      )}
    </div>
  );
}
